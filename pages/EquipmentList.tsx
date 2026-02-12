
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Search, Edit2, Trash2, X, Loader2, Stethoscope, Package, 
  ShieldCheck, User, Calendar, DollarSign, ChevronDown, Check,
  AlertCircle, ShieldAlert, Clock, Layers, Hash, Building2, UserCheck, FolderOpen, List,
  CreditCard, FileText, Zap
} from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Equipment, Vendor, Engineer, SparePart, PaymentRecord } from '../types';

// Utility to calculate date
const addDaysToDate = (dateStr: string, days: number): string => {
  if (!dateStr || isNaN(days)) return '';
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Custom Searchable Dropdown Component
const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  isMulti = false,
  label,
  allowCustom = false
}: { 
  options: {id: string, name: string, sub?: string}[], 
  value: any, 
  onChange: (val: any) => void, 
  placeholder: string,
  isMulti?: boolean,
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
    : (options.find(o => o.id === value)?.name || value || placeholder);

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-all shadow-sm"
      >
        <span className={`text-sm font-medium ${selectedText === placeholder ? 'text-slate-400' : 'text-slate-900'}`}>
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
            )) : allowCustom && search ? (
               <div 
                onClick={(e) => { e.stopPropagation(); onChange(search); setIsOpen(false); }}
                className="flex items-center justify-between px-5 py-3 hover:bg-blue-50 cursor-pointer group transition-colors"
              >
                <p className="text-xs font-bold text-blue-600">Create new group: "{search}"</p>
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

const AssetCard: React.FC<{ 
  item: Equipment; 
  navigate: any; 
  onEdit: any; 
  onDelete: any; 
}> = ({ item, navigate, onEdit, onDelete }) => (
  <div 
    onClick={() => navigate(`/equipment/${item.id}`)}
    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden group"
  >
    <div className={`h-2 w-full ${item.status === 'Operational' ? 'bg-emerald-500' : 'bg-red-500'}`} />
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-wrap gap-2">
          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.status === 'Operational' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{item.status}</span>
          {item.quantity > 1 && <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-[9px] font-black uppercase flex items-center shadow-lg shadow-blue-100">Qty: {item.quantity}</span>}
        </div>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={(e) => onEdit(item, e)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-xl transition-colors"><Edit2 size={14}/></button>
          <button onClick={(e) => onDelete(item.id, e)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-xl transition-colors"><Trash2 size={14}/></button>
        </div>
      </div>
      <h3 className="font-black text-slate-900 truncate text-lg mb-1">{item.name}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.brand} • {item.model}</p>
      
      <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400">
        <span>{item.location}</span>
        <span className="text-blue-600">PROFILE →</span>
      </div>
    </div>
  </div>
);

const EquipmentList: React.FC = () => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'group'>('group');
  
  // Payment specifics for initial machine purchase
  const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentRecord['method']>('Cash');
  const [initialPaymentNote, setInitialPaymentNote] = useState('');

  const [formData, setFormData] = useState<Partial<Equipment>>({
    status: 'Operational',
    amcType: 'None',
    contractorIds: [],
    licenseRequired: false,
    hasWarranty: false,
    purchaseDate: new Date().toISOString().split('T')[0],
    warrantyDurationDays: 0,
    quantity: 1,
    purchasePrice: 0,
    paidAmount: 0,
    remainingAmount: 0,
    groupName: ''
  });

  // Automatically calculate remaining amount
  useEffect(() => {
    const price = Number(formData.purchasePrice) || 0;
    const paid = Number(formData.paidAmount) || 0;
    const remaining = price - paid;
    if (formData.remainingAmount !== remaining) {
      setFormData(prev => ({ ...prev, remainingAmount: remaining }));
    }
  }, [formData.purchasePrice, formData.paidAmount]);

  // Automatically calculate warranty expiry date whenever purchaseDate or days change
  useEffect(() => {
    if (formData.purchaseDate && formData.hasWarranty && formData.warrantyDurationDays !== undefined) {
      const calculatedExpiry = addDaysToDate(formData.purchaseDate, formData.warrantyDurationDays);
      if (calculatedExpiry !== formData.warrantyExpiryDate) {
        setFormData(prev => ({ ...prev, warrantyExpiryDate: calculatedExpiry }));
      }
    }
  }, [formData.purchaseDate, formData.hasWarranty, formData.warrantyDurationDays]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eqSnap, vendSnap, engSnap, partsSnap] = await Promise.all([
        getDocs(collection(db, 'equipment')),
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'engineers')),
        getDocs(collection(db, 'spareParts'))
      ]);
      
      setEquipment(eqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
      setVendors(vendSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
      setEngineers(engSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Engineer)));
      setSpareParts(partsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SparePart)));
    } catch (err) { 
      console.error("Error fetching equipment:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedSupplier = vendors.find(v => v.id === formData.supplierId);
      
      if (formData.groupName) {
        const machineToUpdate = equipment.find(item => item.name === formData.groupName && !item.groupName);
        if (machineToUpdate && machineToUpdate.id !== editingId) {
          await updateDoc(doc(db, 'equipment', machineToUpdate.id), {
            groupName: machineToUpdate.name
          });
        }
      }

      // Initialize payment history for new assets
      let paymentHistory = formData.paymentHistory || [];
      if (!editingId && (formData.paidAmount || 0) > 0) {
        paymentHistory = [{
          id: crypto.randomUUID(),
          amount: Number(formData.paidAmount),
          date: formData.purchaseDate || new Date().toISOString().split('T')[0],
          method: initialPaymentMethod,
          note: initialPaymentNote || 'Initial purchase payment',
          createdAt: new Date().toISOString()
        }];
      }

      const payload = {
        ...formData,
        supplierName: selectedSupplier?.companyName || 'Unknown',
        paymentHistory,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'equipment', editingId), payload);
      } else {
        await addDoc(collection(db, 'equipment'), { ...payload, createdAt: new Date().toISOString() });
      }
      
      setShowModal(false);
      setEditingId(null);
      setFormData({ status: 'Operational', amcType: 'None', contractorIds: [], licenseRequired: false, hasWarranty: false, warrantyDurationDays: 0, quantity: 1, purchasePrice: 0, paidAmount: 0, remainingAmount: 0, groupName: '' });
      setInitialPaymentNote('');
      setInitialPaymentMethod('Cash');
      fetchData();
    } catch (err) { 
      alert("Error saving: " + err); 
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this machine?")) {
      await deleteDoc(doc(db, 'equipment', id));
      fetchData();
    }
  };

  const handleEdit = (item: Equipment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(item.id);
    setFormData(item);
    setShowModal(true);
  };

  const existingGroupNames: string[] = Array.from(new Set(equipment.filter(e => e.groupName).map(e => e.groupName!)));
  const machinesNotInGroups: string[] = Array.from(new Set(equipment.filter(e => !e.groupName).map(e => e.name)));
  const groupSuggestions = [
    ...existingGroupNames.map(name => ({ id: name, name, sub: 'EXISTING GROUP' })),
    ...machinesNotInGroups.map(name => ({ id: name, name, sub: 'INDIVIDUAL MACHINE' }))
  ];

  const groups = equipment.reduce((acc, eq) => {
    if (eq.groupName) {
      if (!acc[eq.groupName]) acc[eq.groupName] = [];
      acc[eq.groupName].push(eq);
    }
    return acc;
  }, {} as Record<string, Equipment[]>);

  const standaloneAssets = equipment.filter(eq => !eq.groupName);

  const filteredStandalone = standaloneAssets.filter(e => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.brand?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = Object.keys(groups).filter(g => 
    g.toLowerCase().includes(searchTerm.toLowerCase()) ||
    groups[g].some(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Clinical Asset Management</h1>
          <p className="text-slate-500 font-medium">Monitoring {equipment.length} assets across {Object.keys(groups).length} groups</p>
        </div>
        <div className="flex space-x-4">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
             <button onClick={() => setViewMode('group')} title="Group View" className={`p-2.5 rounded-xl transition-all ${viewMode === 'group' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-blue-600'}`}>
               <FolderOpen size={20} />
             </button>
             <button onClick={() => setViewMode('standard')} title="List View" className={`p-2.5 rounded-xl transition-all ${viewMode === 'standard' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-blue-600'}`}>
               <List size={20} />
             </button>
          </div>
          <button 
            onClick={() => navigate('/uptime-manager')} 
            className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center"
          >
            <Zap size={16} className="mr-2" /> Uptime Manager
          </button>
          <button onClick={() => { setEditingId(null); setFormData({ status: 'Operational', amcType: 'None', contractorIds: [], licenseRequired: false, hasWarranty: false, purchaseDate: new Date().toISOString().split('T')[0], warrantyDurationDays: 0, quantity: 1, purchasePrice: 0, paidAmount: 0, remainingAmount: 0, groupName: '' }); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-200 transition-all active:scale-95 flex items-center">
            <Plus size={20} className="mr-2" /> Enroll Asset
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group">
        <Search className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input type="text" placeholder="Filter by name, group, serial or brand..." className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-semibold" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="space-y-12">
        {loading ? (
          <div className="py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" size={48} /></div>
        ) : viewMode === 'group' ? (
          <>
            {filteredGroups.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center"><FolderOpen size={16} className="mr-2" /> Asset Groups</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {filteredGroups.map(groupName => (
                    <div key={groupName} onClick={() => navigate(`/equipment/group/${encodeURIComponent(groupName)}`)} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden group p-8 flex flex-col items-center text-center">
                      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6 border-4 border-white shadow-xl shadow-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all"><Layers size={32} /></div>
                      <h3 className="font-black text-slate-900 text-xl leading-tight mb-2">{groupName}</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-6">{groups[groupName].length} Assets</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {filteredStandalone.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center"><Stethoscope size={16} className="mr-2" /> Individual Assets</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {filteredStandalone.map(item => <AssetCard key={item.id} item={item} navigate={navigate} onEdit={handleEdit} onDelete={handleDelete} />)}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {equipment.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => <AssetCard key={item.id} item={item} navigate={navigate} onEdit={handleEdit} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[60] p-4 backdrop-blur-xl overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl my-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[3rem]">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{editingId ? 'Edit Profile' : 'Register Asset'}</h2>
                <p className="text-sm text-slate-500 font-medium">Define technical specs, financial details and support criteria</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-4 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400"><X size={28}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-3">
                   <SearchableSelect allowCustom label="Parent Group" options={groupSuggestions} value={formData.groupName} onChange={(val) => setFormData({...formData, groupName: val})} placeholder="Search or type group..." />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Machine Detail Name</label>
                  <input required type="text" placeholder="e.g. ICU Ventilator Puritan Bennett 980" value={formData.name || ''} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Brand</label>
                  <input required type="text" value={formData.brand || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" onChange={(e) => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Model</label>
                  <input required type="text" value={formData.model || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" onChange={(e) => setFormData({...formData, model: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Serial Number</label>
                  <input required type="text" value={formData.serialNumber || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" onChange={(e) => setFormData({...formData, serialNumber: e.target.value})} />
                </div>
                
                <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Hash size={10} className="mr-1"/> Quantity</label>
                  <input required type="number" min="1" value={formData.quantity || 1} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Calendar size={10} className="mr-1"/> Purchase Date</label>
                  <input required type="date" value={formData.purchaseDate} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})} />
                </div>
                <div className="">
                  <SearchableSelect label="Purchased From" options={vendors.map(v => ({ id: v.id, name: v.companyName, sub: v.email }))} value={formData.supplierId} onChange={(val) => setFormData({...formData, supplierId: val})} placeholder="Search vendor..." />
                </div>

                <div className="md:col-span-3">
                   <SearchableSelect isMulti label="Assigned Engineers / Contacts" options={engineers.map(e => ({ id: e.id, name: e.name, sub: e.companyName }))} value={formData.contractorIds} onChange={(val) => setFormData({...formData, contractorIds: val})} placeholder="Select one or more..." />
                </div>
              </div>

              {/* Purchase Payment Section */}
              <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-6">
                <div className="flex items-center space-x-3 mb-2">
                  <CreditCard className="text-blue-600" size={20} />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Financial Acquisition Details</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 ml-1">Total Purchase Price (BDT)</label>
                    <input required type="number" placeholder="0.00" value={formData.purchasePrice || ''} className="w-full px-5 py-3.5 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold" onChange={(e) => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 ml-1">Paid Increment (BDT)</label>
                    <input required type="number" placeholder="0.00" value={formData.paidAmount || ''} className="w-full px-5 py-3.5 bg-white border border-blue-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold" onChange={(e) => setFormData({...formData, paidAmount: Number(e.target.value)})} />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex justify-between items-center">
                       <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Balance Due</span>
                       <span className="text-lg font-black text-red-600">BDT {(formData.remainingAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!editingId && (formData.paidAmount || 0) > 0 && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                      <div>
                        <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3 ml-1">Initial Payment Method</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Cash', 'Check', 'Bank Transfer', 'Mobile Banking'].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setInitialPaymentMethod(m as any)}
                              className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${
                                initialPaymentMethod === m 
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                  : 'bg-white border-blue-100 text-blue-400 hover:border-blue-200'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 ml-1">Payment Note / Reference</label>
                        <textarea rows={2} placeholder="Add payment details, check numbers etc..." value={initialPaymentNote} className="w-full px-4 py-3 bg-white border border-blue-100 rounded-2xl outline-none text-xs font-medium resize-none" onChange={(e) => setInitialPaymentNote(e.target.value)} />
                      </div>
                   </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center"><ShieldCheck className="text-blue-600 mr-2" size={16} /> Statutory Info</h4>
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-sm font-bold text-slate-700">License Required?</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                      <button type="button" onClick={() => setFormData({...formData, licenseRequired: true})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${formData.licenseRequired ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>YES</button>
                      <button type="button" onClick={() => setFormData({...formData, licenseRequired: false})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${!formData.licenseRequired ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400'}`}>NO</button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center"><ShieldAlert className="text-indigo-600 mr-2" size={16} /> Support Coverage</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-sm font-bold text-slate-700">Has Warranty?</span>
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setFormData({...formData, hasWarranty: true})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${formData.hasWarranty ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>YES</button>
                        <button type="button" onClick={() => setFormData({...formData, hasWarranty: false})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${!formData.hasWarranty ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400'}`}>NO</button>
                      </div>
                    </div>
                    {formData.hasWarranty && (
                      <div className="animate-in slide-in-from-top-2 space-y-4">
                        <div>
                          <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1 ml-2">Warranty Duration (Days)</label>
                          <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-300" size={16} />
                            <input required type="number" placeholder="Enter days..." value={formData.warrantyDurationDays || ''} className="w-full pl-12 pr-5 py-3.5 bg-white border border-indigo-200 rounded-2xl outline-none font-bold" onChange={(e) => setFormData({...formData, warrantyDurationDays: Number(e.target.value)})} />
                          </div>
                        </div>
                        {formData.warrantyExpiryDate && (
                          <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Calculated Expiry</p>
                            <p className="text-lg font-black">{formData.warrantyExpiryDate}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs">Cancel</button>
                <button disabled={saving} type="submit" className="flex-[2] bg-blue-600 text-white py-5 rounded-3xl font-black uppercase text-xs shadow-2xl active:scale-95">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <span>{editingId ? 'Update Asset' : 'Complete Enrollment'}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;
