
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, FileBadge, Calendar, Building2, UserCheck, 
  Trash2, Edit2, X, Loader2, Info, AlertCircle, Clock, 
  ArrowRight, DollarSign, FileText, CheckCircle2, ShieldAlert,
  ChevronDown, Check
} from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { MaintenanceContract, Equipment, Vendor, Engineer } from '../types';

// Reusable Searchable Select Component
const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  isMulti = false,
  label
}: { 
  options: {id: string, name: string, sub?: string}[], 
  value: any, 
  onChange: (val: any) => void, 
  placeholder: string,
  isMulti?: boolean,
  label: string
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

  const toggleOption = (id: string) => {
    if (isMulti) {
      const current = Array.isArray(value) ? value : [];
      if (current.includes(id)) {
        onChange(current.filter(i => i !== id));
      } else {
        onChange([...current, id]);
      }
    } else {
      onChange(id);
      setIsOpen(false);
    }
  };

  const selectedText = isMulti 
    ? (Array.isArray(value) && value.length > 0 ? `${value.length} selected` : placeholder)
    : (options.find(o => o.id === value)?.name || placeholder);

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
                placeholder="Search..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? filteredOptions.map(opt => (
              <div 
                key={opt.id}
                onClick={(e) => { e.stopPropagation(); toggleOption(opt.id); }}
                className="flex items-center justify-between px-5 py-3 hover:bg-blue-50 cursor-pointer group transition-colors"
              >
                <div>
                  <p className="text-sm font-bold text-slate-800">{opt.name}</p>
                  {opt.sub && <p className="text-[10px] text-slate-400 font-bold uppercase">{opt.sub}</p>}
                </div>
                {(isMulti ? value?.includes(opt.id) : value === opt.id) && (
                  <Check size={16} className="text-blue-600" />
                )}
              </div>
            )) : (
              <p className="p-4 text-center text-xs text-slate-400 italic">No results found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MaintenanceContracts: React.FC = () => {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<MaintenanceContract>>({
    startDate: new Date().toISOString().split('T')[0],
    amount: 0,
    engineerIds: [],
    type: 'AMC'
  });

  // Derived State for Enrollment logic
  const [selectedMachine, setSelectedMachine] = useState<Equipment | null>(null);
  const [machineHistory, setMachineHistory] = useState<any[]>([]);
  const [coverageWarning, setCoverageWarning] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mcSnap, eqSnap, vSnap, eSnap] = await Promise.all([
        getDocs(collection(db, 'maintenanceContracts')),
        getDocs(collection(db, 'equipment')),
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'engineers'))
      ]);

      setContracts(mcSnap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceContract)));
      setEquipment(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipment)));
      setVendors(vSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
      setEngineers(eSnap.docs.map(d => ({ id: d.id, ...d.data() } as Engineer)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleMachineSelection = (id: string) => {
    const eq = equipment.find(e => e.id === id) || null;
    setSelectedMachine(eq);
    setCoverageWarning(null);

    if (eq) {
      // 1. Check for Active Warranty
      const now = new Date();
      if (eq.hasWarranty && eq.warrantyExpiryDate) {
        const expiry = new Date(eq.warrantyExpiryDate);
        if (expiry >= now) {
          setCoverageWarning(`Machine is currently under Warranty until ${eq.warrantyExpiryDate}.`);
        }
      }

      // 2. Check for Active Contract
      const activeContract = contracts.find(c => c.equipmentId === eq.id && new Date(c.endDate) >= now);
      if (activeContract) {
         setCoverageWarning(`Machine already has an active Maintenance Contract until ${activeContract.endDate}.`);
      }

      // 3. Auto-fill Company
      setFormData(prev => ({
        ...prev,
        equipmentId: eq.id,
        equipmentName: eq.name,
        companyId: eq.supplierId,
        companyName: eq.supplierName,
        engineerIds: eq.contractorIds || []
      }));

      // 4. Load History (Warranty + Previous Contracts)
      const prevContracts = contracts.filter(c => c.equipmentId === eq.id);
      setMachineHistory(prevContracts);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentId || !formData.endDate || !formData.type) return;
    setSaving(true);
    try {
      const payload = {
        ...formData,
        status: new Date(formData.endDate!) >= new Date() ? 'Active' : 'Expired',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'maintenanceContracts', editingId), payload);
      } else {
        await addDoc(collection(db, 'maintenanceContracts'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ startDate: new Date().toISOString().split('T')[0], amount: 0, engineerIds: [], type: 'AMC' });
      fetchData();
    } catch (err) {
      alert("Error saving contract: " + err);
    } finally {
      setSaving(false);
    }
  };

  const calculateDaysLeft = (targetDate: string) => {
    const expiry = new Date(targetDate);
    const now = new Date();
    // Set both to midnight to ignore time part for accurate daily difference
    expiry.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getContractStatus = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const thirtyDays = new Date();
    thirtyDays.setDate(now.getDate() + 30);

    if (end < now) return { label: 'Expired', color: 'bg-red-50 text-red-600 border-red-100', dot: 'bg-red-600' };
    if (end <= thirtyDays) return { label: 'Expiring Soon', color: 'bg-amber-50 text-amber-600 border-amber-100', dot: 'bg-amber-600' };
    return { label: 'Active', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', dot: 'bg-emerald-600' };
  };

  const filteredContracts = contracts.filter(c => 
    c.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Maintenance Agreements</h1>
          <p className="text-slate-500 font-medium">Overseeing {contracts.length} professional service contracts</p>
        </div>
        <button 
          onClick={() => { 
            setEditingId(null); 
            setSelectedMachine(null);
            setMachineHistory([]);
            setCoverageWarning(null);
            setFormData({ startDate: new Date().toISOString().split('T')[0], amount: 0, engineerIds: [], type: 'AMC' }); 
            setShowModal(true); 
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-100 transition-all active:scale-95 flex items-center"
        >
          <Plus size={20} className="mr-2" /> New Contract
        </button>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group">
        <Search className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Search by equipment or service provider..." 
          className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-semibold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-6">Machine Details</th>
                <th className="px-8 py-6">Type</th>
                <th className="px-8 py-6">Provider</th>
                <th className="px-8 py-6">Validity Period</th>
                <th className="px-8 py-6">Support Team</th>
                <th className="px-8 py-6">Contract Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-8 py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" size={32} /></td></tr>
              ) : filteredContracts.length > 0 ? (
                filteredContracts.map((c) => {
                  const status = getContractStatus(c.endDate);
                  const daysLeft = calculateDaysLeft(c.endDate);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900 text-sm">{c.equipmentName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {c.id.slice(0, 8)}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black border ${c.type === 'CMC' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {c.type}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center text-xs font-bold text-slate-700">
                          <Building2 size={14} className="mr-2 text-blue-400" /> {c.companyName}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-[11px] font-bold text-slate-600">
                          <div className="flex items-center"><Clock size={12} className="mr-2 text-slate-300"/> {c.startDate}</div>
                          <div className="flex items-center text-slate-900 font-black mb-1"><ArrowRight size={12} className="mr-2 text-slate-300"/> {c.endDate}</div>
                          <div className={`text-[10px] font-black uppercase tracking-tighter ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 30 ? 'text-amber-500' : 'text-blue-500'}`}>
                            {daysLeft < 0 ? 'Contract Expired' : daysLeft === 0 ? 'Expires Today' : `${daysLeft} days left`}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex -space-x-2">
                          {c.engineerIds?.slice(0, 3).map((id, i) => (
                            <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[9px] font-bold" title={engineers.find(e => e.id === id)?.name}>
                              {engineers.find(e => e.id === id)?.name.charAt(0)}
                            </div>
                          ))}
                          {(c.engineerIds?.length || 0) > 3 && <div className="w-7 h-7 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[9px] font-bold text-blue-600">+{c.engineerIds!.length - 3}</div>}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase w-fit ${status.color}`}>
                          <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
                          <span>{status.label}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingId(c.id); setFormData(c); handleMachineSelection(c.equipmentId); setShowModal(true); }} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-xl shadow-sm transition-all"><Edit2 size={16}/></button>
                          <button onClick={async () => { if (confirm("Delete this contract?")) { await deleteDoc(doc(db, 'maintenanceContracts', c.id)); fetchData(); } }} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-red-600 rounded-xl shadow-sm transition-all"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-400 italic">No maintenance agreements found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[60] p-4 backdrop-blur-xl overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-5xl my-auto shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            {/* Left: Form Area */}
            <div className="flex-1 p-10 overflow-y-auto border-r border-slate-100">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingId ? 'Edit Contract' : 'Enroll Maintenance'}</h2>
                  <p className="text-sm text-slate-500 font-medium">Define the scope and timeline of service</p>
                </div>
                <button onClick={() => setShowModal(false)} className="md:hidden p-4"><X size={24}/></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Clinical Asset</label>
                  <select 
                    required 
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-sm"
                    value={formData.equipmentId || ''}
                    onChange={(e) => handleMachineSelection(e.target.value)}
                  >
                    <option value="">Search Assets...</option>
                    {equipment.map(e => <option key={e.id} value={e.id}>{e.name} ({e.serialNumber})</option>)}
                  </select>
                </div>

                {coverageWarning && (
                  <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-start space-x-4 animate-in shake duration-300">
                    <ShieldAlert className="text-red-600 shrink-0" size={20} />
                    <div>
                      <p className="text-xs font-black text-red-600 uppercase mb-1">Coverage Conflict Detected</p>
                      <p className="text-sm text-red-500 font-medium">{coverageWarning}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contract Scope (Maintenance Type)</label>
                    <div className="flex space-x-3">
                      {['AMC', 'CMC'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: t as any })}
                          className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border-2 ${
                            formData.type === t 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                              : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'
                          }`}
                        >
                          {t === 'AMC' ? 'Annual (AMC)' : 'Comprehensive (CMC)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <SearchableSelect 
                    label="Service Provider (Company)"
                    placeholder="Select company..."
                    options={vendors.map(v => ({ id: v.id, name: v.companyName, sub: v.email }))}
                    value={formData.companyId || ''}
                    onChange={(val) => {
                      const v = vendors.find(vend => vend.id === val);
                      setFormData({...formData, companyId: val, companyName: v?.companyName || ''});
                    }}
                  />
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Amount (BDT)</label>
                    <div className="relative">
                      <input required type="number" placeholder="Enter amount..." value={formData.amount || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})} />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">BDT</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contract Start Date</label>
                    <input required type="date" value={formData.startDate} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contract End Date</label>
                    <input required type="date" value={formData.endDate || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                  </div>
                </div>

                <SearchableSelect 
                  isMulti
                  label="Authorized Engineers"
                  placeholder="Select one or more engineers..."
                  options={engineers.map(e => ({ id: e.id, name: e.name, sub: e.companyName }))}
                  value={formData.engineerIds || []}
                  onChange={(val) => setFormData({...formData, engineerIds: val})}
                />

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Terms & Description</label>
                  <textarea rows={4} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm resize-none font-medium" placeholder="Describe inclusions (Preventive frequency, response time, etc...)" value={formData.description || ''} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Cancel</button>
                  <button disabled={saving} type="submit" className="flex-[2] bg-blue-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
                    {saving ? <Loader2 size={18} className="animate-spin inline" /> : <span>{editingId ? 'Update Agreement' : 'Register Contract'}</span>}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Contextual History Panel */}
            <div className="hidden md:flex w-80 bg-slate-50/50 p-10 flex-col overflow-y-auto">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center">
                <FileText size={16} className="mr-2 text-blue-600" /> Coverage Intelligence
              </h3>

              {!selectedMachine ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="p-6 bg-white rounded-full text-slate-200 border-4 border-dashed border-slate-100"><Info size={40} /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select an asset to view historical lifecycle</p>
                </div>
              ) : (
                <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
                   <section>
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Original Warranty</h4>
                      <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center space-x-3 mb-4">
                          <CheckCircle2 className={selectedMachine.hasWarranty ? 'text-emerald-500' : 'text-slate-200'} size={18} />
                          <p className="text-sm font-black text-slate-800">{selectedMachine.hasWarranty ? 'Registered' : 'No Warranty'}</p>
                        </div>
                        {selectedMachine.hasWarranty && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Expires on</p>
                            <p className="text-xs font-black text-blue-600">{selectedMachine.warrantyExpiryDate}</p>
                          </div>
                        )}
                      </div>
                   </section>

                   <section className="space-y-4">
                      <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Contract Timeline</h4>
                      {machineHistory.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No previous agreements found for this asset.</p>
                      ) : (
                        <div className="space-y-4 relative before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                          {machineHistory.map((h, i) => (
                            <div key={i} className="pl-8 relative">
                              <div className="absolute left-0 top-1 w-5 h-5 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"/></div>
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">{h.companyName}</p>
                              <p className="text-[9px] text-slate-400 font-bold">{h.startDate} - {h.endDate}</p>
                            </div>
                          ))}
                        </div>
                      )}
                   </section>

                   <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
                      <p className="text-[9px] font-black uppercase text-slate-400 mb-2">Total Service Investment</p>
                      <p className="text-2xl font-black">BDT {machineHistory.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toLocaleString()}</p>
                   </div>
                </div>
              )}

              <button onClick={() => setShowModal(false)} className="mt-auto pt-10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">Close Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceContracts;
