
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Wrench,
  X,
  Loader2,
  Trash2,
  Calendar,
  Building2,
  ChevronDown,
  Check
} from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceLog, Equipment, Vendor, PaymentRecord } from '../types';

// Reusable Searchable Select Component for Company
const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  label,
  allowCustom = false
}: { 
  options: {id: string, name: string, sub?: string}[], 
  value: any, 
  onChange: (val: any) => void, 
  placeholder: string,
  label: string,
  allowCustom?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(search.toLowerCase()) || 
    opt.sub?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (name: string) => {
    onChange(name);
    setIsOpen(false);
  };

  const selectedText = value || placeholder;

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-all shadow-sm"
      >
        <span className={`text-sm font-bold truncate ${selectedText === placeholder ? 'text-slate-400' : 'text-slate-900'}`}>
          {selectedText}
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                autoFocus
                type="text" 
                placeholder="Search or type new..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (allowCustom) onChange(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div 
                key={opt.id}
                onClick={(e) => { e.stopPropagation(); toggleOption(opt.name); }}
                className="flex items-center justify-between px-5 py-3 hover:bg-blue-50 cursor-pointer group transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">{opt.name}</p>
                  {opt.sub && <p className="text-[10px] text-slate-400 font-bold uppercase">{opt.sub}</p>}
                </div>
                {value === opt.name && (
                  <Check size={16} className="text-blue-600" />
                )}
              </div>
            )) : allowCustom && search ? (
              <div 
                onClick={(e) => { e.stopPropagation(); toggleOption(search); }}
                className="flex items-center justify-between px-5 py-3 hover:bg-blue-50 cursor-pointer group transition-colors"
              >
                <p className="text-xs font-bold text-blue-600">Use custom name: "{search}"</p>
              </div>
            ) : (
              <p className="p-4 text-center text-xs text-slate-400 italic">No results found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ServiceLogs: React.FC = () => {
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<Partial<ServiceLog>>({
    type: 'Preventive',
    date: new Date().toISOString().split('T')[0],
    cost: 0,
    paidAmount: 0,
    companyName: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const logsSnap = await getDocs(query(collection(db, 'serviceLogs'), orderBy('date', 'desc')));
      setLogs(logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceLog)));
      
      const eqSnap = await getDocs(collection(db, 'equipment'));
      setEquipment(eqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));

      const vendorsSnap = await getDocs(collection(db, 'vendors'));
      setVendors(vendorsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedEq = equipment.find(e => e.id === formData.equipmentId);
      const totalCost = Number(formData.cost) || 0;
      const paid = Number(formData.paidAmount) || 0;
      const remaining = totalCost - paid;

      const paymentHistory: PaymentRecord[] = [];
      if (paid > 0) {
        paymentHistory.push({
          id: crypto.randomUUID(),
          amount: paid,
          date: formData.date || new Date().toISOString().split('T')[0],
          method: 'Cash', // Default for initial log
          note: 'Initial payment upon service registration',
          createdAt: new Date().toISOString()
        });
      }

      await addDoc(collection(db, 'serviceLogs'), {
        ...formData,
        equipmentName: selectedEq?.name || 'Unknown',
        cost: totalCost,
        paidAmount: paid,
        remainingAmount: remaining,
        paymentHistory,
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setFormData({ type: 'Preventive', date: new Date().toISOString().split('T')[0], cost: 0, paidAmount: 0, companyName: '' });
      fetchData();
    } catch (err) {
      alert("Error saving log: " + err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently delete this service record?")) {
      try {
        await deleteDoc(doc(db, 'serviceLogs', id));
        fetchData();
      } catch (err) {
        alert("Delete failed: " + err);
      }
    }
  };

  const filteredLogs = logs.filter(log => 
    log.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.technicianName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Service & Maintenance Logs</h1>
          <p className="text-sm text-slate-500 font-medium">History of repairs, PMs, and calibrations</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>New Service Record</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by equipment, technician, description, or company..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5">Equipment</th>
                <th className="px-8 py-5">Company / Type</th>
                <th className="px-8 py-5">Date</th>
                <th className="px-8 py-5">Payment Status</th>
                <th className="px-8 py-5">Cost Details</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" size={32} /></td></tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900 text-sm">{log.equipmentName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">By: {log.technicianName}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700 mb-1 flex items-center">
                          <Building2 size={12} className="mr-1 text-slate-300" />
                          {log.companyName || 'Individual / Unknown'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase w-fit ${
                          log.type === 'Preventive' ? 'bg-blue-100 text-blue-700' : 
                          log.type === 'Corrective' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {log.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-600 text-sm whitespace-nowrap">{log.date}</td>
                    <td className="px-8 py-5">
                       <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                         (log.remainingAmount || 0) <= 0 
                           ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                           : 'bg-amber-50 text-amber-600 border-amber-100'
                       }`}>
                         {(log.remainingAmount || 0) <= 0 ? 'Fully Paid' : 'Due Balance'}
                       </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="text-xs font-bold text-slate-900">Total: BDT {(log.cost || 0).toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase">Paid: BDT {log.paidAmount?.toLocaleString() || 0}</div>
                      {Number(log.remainingAmount || 0) > 0 && (
                        <div className="text-[10px] text-red-500 font-black uppercase tracking-tighter">Due: BDT {(log.remainingAmount || 0).toLocaleString()}</div>
                      )}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleDelete(log.id)} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-600 rounded-xl shadow-sm transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium italic">No service records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl my-auto shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
              <div>
                <h2 className="text-2xl font-black text-slate-900">New Service Record</h2>
                <p className="text-sm text-slate-500 font-medium">Capture details for maintenance activity and payments</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400"><X size={24}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Clinical Asset</label>
                  <select 
                    required 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 transition-all font-bold text-sm"
                    onChange={(e) => setFormData({...formData, equipmentId: e.target.value})}
                  >
                    <option value="">Search Assets...</option>
                    {equipment.map(e => <option key={e.id} value={e.id}>{e.name} ({e.serialNumber})</option>)}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <SearchableSelect 
                    allowCustom
                    label="Service Provider (Company)"
                    placeholder="Search company or type new..."
                    options={vendors.map(v => ({ id: v.id, name: v.companyName, sub: v.email }))}
                    value={formData.companyName}
                    onChange={(val) => setFormData({...formData, companyName: val})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Service Category</label>
                  <select className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" onChange={(e) => setFormData({...formData, type: e.target.value as any})}>
                    <option value="Preventive">Preventive</option>
                    <option value="Corrective">Corrective</option>
                    <option value="Calibration">Calibration</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Activity Date</label>
                  <input required type="date" value={formData.date} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" onChange={(e) => setFormData({...formData, date: e.target.value})} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technician Identity</label>
                  <input required type="text" placeholder="Engineer Name" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" onChange={(e) => setFormData({...formData, technicianName: e.target.value})} />
                </div>
                
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Total Service Bill (BDT)</label>
                    <input required type="number" placeholder="0.00" className="w-full px-4 py-2 bg-white border border-blue-200 rounded-xl font-bold text-sm outline-none" onChange={(e) => setFormData({...formData, cost: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Amount Paid (BDT)</label>
                    <input required type="number" placeholder="0.00" className="w-full px-4 py-2 bg-white border border-blue-200 rounded-xl font-bold text-sm outline-none" onChange={(e) => setFormData({...formData, paidAmount: Number(e.target.value)})} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Work Description & Scope</label>
                <textarea required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl h-28 font-medium text-sm outline-none resize-none" placeholder="Describe findings, parts used, or calibration steps..." onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              
              <div className="flex space-x-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs">Cancel</button>
                <button disabled={saving} type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95 disabled:opacity-50">
                  {saving ? 'Processing...' : 'Commit Log Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceLogs;
