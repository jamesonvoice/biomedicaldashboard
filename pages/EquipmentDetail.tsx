
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, Stethoscope, Wrench, ShieldCheck, 
  Package, Calendar, Info, Edit, Trash2, Clock, MapPin, Tag, 
  User, CheckCircle2, AlertCircle, Save, X, ShieldAlert, Layers, UserCheck,
  Building2, FileText, FileBadge, ArrowRight, Edit2, ChevronDown, Check,
  Search, CreditCard, ChevronUp, Plus, Bell
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Equipment, ServiceLog, SparePart, Engineer, LicenseInfo, MaintenanceContract, Vendor, PaymentReminder } from '../types';

// Reusable Searchable Select Component for Modals
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

const EquipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [contracts, setContracts] = useState<MaintenanceContract[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [paymentReminders, setPaymentReminders] = useState<PaymentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'coverage' | 'license' | 'service' | 'parts'>('overview');
  
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Edit states
  const [editingLicense, setEditingLicense] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [savingContract, setSavingContract] = useState(false);

  const [contractForm, setContractForm] = useState<Partial<MaintenanceContract>>({
    type: 'AMC',
    startDate: new Date().toISOString().split('T')[0],
    amount: 0,
    engineerIds: []
  });

  const [licenseForm, setLicenseForm] = useState<LicenseInfo>({
    name: '',
    number: '',
    issueDate: '',
    expiryDate: '',
    renewalLeadDays: 30,
    renewalSource: '',
    notes: ''
  });

  const [warrantyForm, setWarrantyForm] = useState({
    hasWarranty: false,
    warrantyDurationDays: 0,
    warrantyExpiryDate: '',
    purchaseDate: ''
  });

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docRef = doc(db, 'equipment', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const eqData = { id: docSnap.id, ...docSnap.data() } as Equipment;
        setEquipment(eqData);
        if (eqData.licenseInfo) {
          setLicenseForm(eqData.licenseInfo);
        }
        setWarrantyForm({
          hasWarranty: eqData.hasWarranty || false,
          warrantyDurationDays: eqData.warrantyDurationDays || 0,
          warrantyExpiryDate: eqData.warrantyExpiryDate || '',
          purchaseDate: eqData.purchaseDate || ''
        });

        const [logsSnap, partsSnap, engSnap, contractsSnap, vendorsSnap, remSnap] = await Promise.all([
          getDocs(query(collection(db, 'serviceLogs'), where('equipmentId', '==', id))),
          getDocs(collection(db, 'spareParts')),
          getDocs(collection(db, 'engineers')),
          getDocs(query(collection(db, 'maintenanceContracts'), where('equipmentId', '==', id))),
          getDocs(collection(db, 'vendors')),
          getDocs(query(collection(db, 'paymentReminders'), where('sourceId', '==', id)))
        ]);

        setServiceLogs(logsSnap.docs.map(d => ({id: d.id, ...d.data()} as ServiceLog)));
        setSpareParts(partsSnap.docs.map(d => ({id: d.id, ...d.data()} as SparePart)).filter(p => p.compatibility?.includes(eqData.name)));
        setEngineers(engSnap.docs.map(d => ({id: d.id, ...d.data()} as Engineer)));
        setContracts(contractsSnap.docs.map(d => ({id: d.id, ...d.data()} as MaintenanceContract)));
        setVendors(vendorsSnap.docs.map(d => ({id: d.id, ...d.data()} as Vendor)));
        
        // Include reminders for the asset itself AND its service logs
        const serviceLogIds = logsSnap.docs.map(d => d.id);
        const allRelevantReminders = remSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentReminder));
        
        // Also fetch reminders linked to service logs of this asset
        if (serviceLogIds.length > 0) {
          const logRemSnap = await getDocs(query(collection(db, 'paymentReminders'), where('sourceId', 'in', serviceLogIds)));
          allRelevantReminders.push(...logRemSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentReminder)));
        }
        setPaymentReminders(allRelevantReminders);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdateLicense = async () => {
    if (!equipment || !id) return;
    try {
      await updateDoc(doc(db, 'equipment', id), { licenseInfo: licenseForm });
      setEquipment({...equipment, licenseInfo: licenseForm});
      setEditingLicense(false);
    } catch (err) { alert("Error updating license: " + err); }
  };

  const handleUpdateWarranty = async () => {
    if (!equipment || !id) return;
    try {
      await updateDoc(doc(db, 'equipment', id), { 
        hasWarranty: warrantyForm.hasWarranty,
        warrantyDurationDays: warrantyForm.warrantyDurationDays,
        warrantyExpiryDate: warrantyForm.warrantyExpiryDate
      });
      setEquipment({...equipment, ...warrantyForm});
      setEditingWarranty(false);
    } catch (err) { alert("Error updating warranty: " + err); }
  };

  const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !equipment) return;
    setSavingContract(true);
    try {
      const payload = {
        ...contractForm,
        equipmentId: id,
        equipmentName: equipment.name,
        status: new Date(contractForm.endDate!) >= new Date() ? 'Active' : 'Expired',
        updatedAt: new Date().toISOString()
      };

      if (editingContractId) {
        await updateDoc(doc(db, 'maintenanceContracts', editingContractId), payload);
      } else {
        await addDoc(collection(db, 'maintenanceContracts'), {
          ...payload,
          createdAt: new Date().toISOString()
        });
      }
      setShowContractModal(false);
      fetchData();
    } catch (err) {
      alert("Error saving contract: " + err);
    } finally {
      setSavingContract(false);
    }
  };

  const calculateDaysLeft = (targetDate?: string) => {
    if (!targetDate) return null;
    const expiry = new Date(targetDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getActiveCoverageStatus = () => {
    const now = new Date();
    // Check Warranty
    if (equipment?.hasWarranty && equipment.warrantyExpiryDate) {
      if (new Date(equipment.warrantyExpiryDate) >= now) {
        return { type: 'Warranty', date: equipment.warrantyExpiryDate, days: calculateDaysLeft(equipment.warrantyExpiryDate) };
      }
    }
    // Check Contracts
    const activeContract = contracts.find(c => new Date(c.endDate) >= now);
    if (activeContract) {
      return { type: activeContract.type, date: activeContract.endDate, days: calculateDaysLeft(activeContract.endDate) };
    }
    return null;
  };

  const isLicenseRenewalDue = () => {
    if (!equipment?.licenseRequired || !equipment.licenseInfo?.expiryDate) return false;
    const expiry = new Date(equipment.licenseInfo.expiryDate);
    const now = new Date();
    const leadTime = equipment.licenseInfo.renewalLeadDays || 30;
    const alertDate = new Date(expiry);
    alertDate.setDate(expiry.getDate() - leadTime);
    return now >= alertDate;
  };

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-blue-600" size={48} />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Profile...</p>
    </div>
  );

  if (!equipment) return <div>Asset not found.</div>;
  const coverageStatus = getActiveCoverageStatus();
  const renewalDue = isLicenseRenewalDue();

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate('/equipment')} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-blue-600 shadow-sm transition-all"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{equipment.name}</h1>
          <p className="text-slate-500 font-medium">Model: {equipment.model} • SN: {equipment.serialNumber}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 flex flex-col items-center text-center">
             <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-6 shadow-xl shadow-blue-100"><Stethoscope size={40} /></div>
             <div className="flex flex-col gap-2 mb-4 w-full items-center">
               <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${equipment.status === 'Operational' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{equipment.status}</div>
               {coverageStatus ? (
                 <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 flex items-center`}>
                   <ShieldCheck size={12} className="mr-1.5" /> Covered: {coverageStatus.type}
                 </div>
               ) : (
                 <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500">No Active Coverage</div>
               )}
               {renewalDue && (
                 <div className="px-4 py-1.5 bg-red-600 text-white rounded-full text-[10px] font-black uppercase flex items-center animate-pulse">
                   <AlertCircle size={12} className="mr-1.5"/> License Renewal Due
                 </div>
               )}
             </div>
             <div className="w-full space-y-3 pt-6 border-t border-slate-50">
               <div className="flex justify-between text-xs font-bold"><span className="text-slate-400 uppercase tracking-tighter">Vendor</span><span className="text-slate-800">{equipment.supplierName}</span></div>
               <div className="flex justify-between text-xs font-bold"><span className="text-slate-400 uppercase tracking-tighter">Unit Price</span><span className="text-slate-800">BDT {(equipment.purchasePrice || 0).toLocaleString()}</span></div>
               <div className="flex justify-between text-xs font-bold"><span className="text-slate-400 uppercase tracking-tighter">Total Value</span><span className="text-slate-800 font-black">BDT {((equipment.purchasePrice || 0) * (equipment.quantity || 1)).toLocaleString()}</span></div>
             </div>
          </div>

          {coverageStatus && (
            <div className={`rounded-3xl p-8 text-white shadow-xl ${coverageStatus.days !== null && coverageStatus.days > 30 ? 'bg-indigo-600 shadow-indigo-200' : 'bg-red-600 shadow-red-200 animate-pulse'}`}>
              <ShieldAlert className="mb-4 opacity-50" size={32} />
              <h4 className="text-xs font-black uppercase text-white/60 mb-2">Coverage Countdown</h4>
              {coverageStatus.days !== null && coverageStatus.days > 0 ? (
                <>
                  <p className="text-3xl font-black mb-2">{coverageStatus.days}</p>
                  <p className="text-[10px] font-black uppercase opacity-60">Days Remaining ({coverageStatus.type})</p>
                </>
              ) : <p className="text-lg font-black uppercase">Expired</p>}
            </div>
          )}

          <div className="bg-slate-900 rounded-3xl p-8 text-white">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center"><UserCheck size={14} className="mr-2" /> Support Team</h4>
            <div className="space-y-4">
              {equipment.contractorIds?.map(id => {
                const eng = engineers.find(e => e.id === id);
                return eng ? (
                  <div key={id} className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">{eng.name.charAt(0)}</div>
                    <div className="overflow-hidden"><p className="text-xs font-bold truncate">{eng.name}</p></div>
                  </div>
                ) : null;
              })}
              {(!equipment.contractorIds || equipment.contractorIds.length === 0) && (
                <p className="text-[10px] text-slate-500 font-bold uppercase text-center italic">No engineers assigned</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          <div className="flex space-x-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto scrollbar-hide">
            {[
              {id: 'overview', label: 'Overview'},
              {id: 'coverage', label: 'Warranty/Contracts'},
              {id: 'license', label: 'License'},
              {id: 'service', label: 'Service Log'},
              {id: 'parts', label: 'Inventory'}
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>{tab.label}</button>
            ))}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 min-h-[500px]">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in">
                <section className="space-y-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Technical Data</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Asset Name</p><p className="text-lg font-black text-slate-900">{equipment.name}</p></div>
                    <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Serial</p><p className="text-sm font-bold text-slate-900">{equipment.serialNumber}</p></div>
                    <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Purchase Date</p><p className="text-sm font-bold text-slate-900">{equipment.purchaseDate}</p></div>
                    <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Brand</p><p className="text-sm font-bold text-slate-900">{equipment.brand}</p></div>
                    <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Location</p><p className="text-sm font-bold text-slate-900">{equipment.location}</p></div>
                  </div>

                  {paymentReminders.length > 0 && (
                    <div className="pt-8">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                        <Bell size={14} className="mr-2 text-indigo-600" /> Payment Reminders
                      </h4>
                      <div className="space-y-3">
                        {paymentReminders.map(rem => {
                          const date = new Date(rem.scheduledDate);
                          const now = new Date();
                          now.setHours(0,0,0,0);
                          const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                          return (
                            <div key={rem.id} onClick={() => navigate('/payments')} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl cursor-pointer hover:bg-indigo-50 transition-colors flex justify-between items-center group">
                               <div>
                                  <p className="text-xs font-black text-indigo-700">{rem.sourceType === 'equipment' ? 'Asset Final Payment' : 'Service Settlement'}</p>
                                  <p className="text-[10px] font-bold text-indigo-500 uppercase">BDT {(rem.amountToPay || 0).toLocaleString()} • {rem.scheduledDate}</p>
                               </div>
                               <div className={`px-2 py-1 rounded text-[8px] font-black uppercase ${diff <= 0 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                 {diff < 0 ? 'Overdue' : diff === 0 ? 'Due Today' : `${diff}d left`}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
                
                <section className="space-y-8">
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Financial Status</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-400">Total Account Payable</span>
                        <span className="text-slate-900 font-black">BDT {(equipment.purchasePrice || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-slate-400">Settled Amount</span>
                        <span className="text-emerald-600 font-black">BDT {(equipment.paidAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-bold pt-4 border-t border-slate-200">
                        <span className="text-slate-400">Balance Due</span>
                        <span className={`font-black ${equipment.remainingAmount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          BDT {(equipment.remainingAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      {equipment.remainingAmount > 0 && (
                        <button onClick={() => navigate('/payments')} className="w-full mt-2 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                          Pay Balance
                        </button>
                      )}
                    </div>
                  </div>

                  {equipment.paymentHistory && equipment.paymentHistory.length > 0 && (
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center ml-2">
                        <CreditCard size={14} className="mr-2 text-blue-600" /> Payment History
                       </h4>
                       <div className="space-y-2">
                         {equipment.paymentHistory.map(pay => (
                           <div key={pay.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                              <div>
                                <p className="text-xs font-black text-slate-900">BDT {(pay.amount || 0).toLocaleString()}</p>
                                <p className="text-[9px] font-black text-slate-400 uppercase">{pay.date} • {pay.method}</p>
                              </div>
                              {pay.note && <p className="text-[9px] text-slate-500 italic max-w-[150px] truncate" title={pay.note}>{pay.note}</p>}
                           </div>
                         ))}
                       </div>
                    </div>
                  )}

                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Engineer Notes</h3>
                    <p className="text-sm text-slate-600 italic leading-relaxed">{equipment.notes || 'No technical notes recorded.'}</p>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'coverage' && (
              <div className="space-y-12 animate-in fade-in">
                {/* Section 1: Original Warranty */}
                <section className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 flex items-center">
                      <ShieldCheck className="text-blue-600 mr-3" size={24} /> Original Warranty Profile
                    </h3>
                    <button onClick={() => setEditingWarranty(!editingWarranty)} className="text-[10px] font-black uppercase text-blue-600 hover:underline">{editingWarranty ? 'Cancel' : 'Update Warranty'}</button>
                  </div>

                  {editingWarranty ? (
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4">
                      <div className="col-span-2 flex items-center space-x-4 mb-4">
                        <label className="text-sm font-bold text-slate-700">Has Warranty?</label>
                        <div className="flex bg-white p-1 rounded-xl border border-slate-200">
                          <button type="button" onClick={() => setWarrantyForm({...warrantyForm, hasWarranty: true})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${warrantyForm.hasWarranty ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>YES</button>
                          <button type="button" onClick={() => setWarrantyForm({...warrantyForm, hasWarranty: false})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${!warrantyForm.hasWarranty ? 'bg-slate-200 text-slate-600 shadow-sm' : 'text-slate-400'}`}>NO</button>
                        </div>
                      </div>
                      {warrantyForm.hasWarranty && (
                        <>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Duration (Days)</label>
                            <input type="number" value={warrantyForm.warrantyDurationDays} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl outline-none font-bold" onChange={e => {
                               const days = Number(e.target.value);
                               const expiry = new Date(warrantyForm.purchaseDate);
                               expiry.setDate(expiry.getDate() + days);
                               setWarrantyForm({...warrantyForm, warrantyDurationDays: days, warrantyExpiryDate: expiry.toISOString().split('T')[0]});
                            }} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Expiry Date (Calculated)</label>
                            <input type="date" value={warrantyForm.warrantyExpiryDate} className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold" onChange={e => setWarrantyForm({...warrantyForm, warrantyExpiryDate: e.target.value})} />
                          </div>
                        </>
                      )}
                      <div className="col-span-2 pt-4">
                        <button onClick={handleUpdateWarranty} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-100">Save Warranty Profile</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className={`p-2 rounded-lg ${equipment.hasWarranty ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                            {equipment.hasWarranty ? <CheckCircle2 size={20} /> : <X size={20} />}
                          </div>
                          <p className="font-black text-slate-800 uppercase tracking-widest text-xs">{equipment.hasWarranty ? 'Registered Warranty' : 'No Warranty Registered'}</p>
                        </div>
                        {equipment.hasWarranty && (
                          <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1">Duration</p><p className="text-sm font-bold text-slate-900">{equipment.warrantyDurationDays} Days</p></div>
                            <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1">Valid Until</p><p className="text-sm font-bold text-slate-900">{equipment.warrantyExpiryDate}</p></div>
                          </div>
                        )}
                      </div>
                      {equipment.hasWarranty && (
                        <div className={`p-8 rounded-[2rem] flex flex-col justify-center items-center text-center text-white shadow-xl ${calculateDaysLeft(equipment.warrantyExpiryDate)! > 0 ? 'bg-indigo-600 shadow-indigo-100' : 'bg-slate-800'}`}>
                          <Clock className="mb-2 opacity-50" size={24} />
                          <h4 className="text-[10px] font-black uppercase text-white/60 mb-1">Warranty Days Remaining</h4>
                          <p className="text-3xl font-black">{Math.max(0, calculateDaysLeft(equipment.warrantyExpiryDate) || 0)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Section 2: Maintenance Contracts History */}
                <section className="space-y-6">
                   <div className="flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 flex items-center">
                      <FileBadge className="text-blue-600 mr-3" size={24} /> Professional Contracts (AMC/CMC)
                    </h3>
                    <button 
                      onClick={() => {
                        setEditingContractId(null);
                        setContractForm({ type: 'AMC', startDate: new Date().toISOString().split('T')[0], amount: 0, engineerIds: [] });
                        setShowContractModal(true);
                      }} 
                      className="text-[10px] font-black uppercase text-blue-600 hover:underline"
                    >
                      + New Agreement
                    </button>
                  </div>

                  <div className="space-y-4">
                    {contracts.length > 0 ? contracts.sort((a,b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()).map(c => {
                      const daysLeft = calculateDaysLeft(c.endDate);
                      const isActive = daysLeft !== null && daysLeft >= 0;
                      return (
                        <div key={c.id} className={`p-8 bg-white border rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-6 group hover:shadow-lg transition-all ${isActive ? 'border-blue-200' : 'border-slate-100 opacity-60'}`}>
                           <div className="flex items-center space-x-6">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shadow-sm ${c.type === 'CMC' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                {c.type}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{c.companyName}</p>
                                <div className="flex items-center space-x-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                  <span>{c.startDate}</span>
                                  <ArrowRight size={12} className="text-slate-300"/>
                                  <span className={isActive ? 'text-slate-800' : ''}>{c.endDate}</span>
                                </div>
                              </div>
                           </div>
                           <div className="flex items-center space-x-8">
                              <div className="text-right">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                                 <p className="text-sm font-black text-slate-900">BDT {(c.amount || 0).toLocaleString()}</p>
                              </div>
                              <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${isActive ? (daysLeft! <= 30 ? 'bg-red-600 text-white animate-pulse' : 'bg-emerald-100 text-emerald-600') : 'bg-slate-100 text-slate-400'}`}>
                                 {isActive ? (daysLeft! <= 30 ? `Renew ASAP (${daysLeft}d)` : `Active (${daysLeft}d left)`) : 'Historical'}
                              </div>
                              <button 
                                onClick={() => {
                                  setEditingContractId(c.id);
                                  setContractForm(c);
                                  setShowContractModal(true);
                                }}
                                className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all"
                              >
                                <Edit2 size={16} />
                              </button>
                           </div>
                        </div>
                      )
                    }) : (
                      <div className="py-20 text-center text-slate-400 text-xs font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2rem]">No maintenance contracts registered for this asset.</div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'license' && (
              <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center"><ShieldCheck className="text-blue-600 mr-3" size={32} /> License Profile</h2>
                  <button onClick={() => setEditingLicense(true)} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-blue-700 transition-all">Edit License</button>
                </div>
                {!equipment.licenseRequired ? <div className="py-20 text-center text-slate-400 uppercase font-black text-xs">No regulatory license required for this machine.</div> : (
                  editingLicense ? (
                    <div className="space-y-8 animate-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">License Name</label>
                          <div className="relative">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="text" placeholder="e.g. AERB Operating License" value={licenseForm.name} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold" onChange={e => setLicenseForm({...licenseForm, name: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">License/Reg Number</label>
                          <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="text" placeholder="Alpha-Numeric ID" value={licenseForm.number} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={e => setLicenseForm({...licenseForm, number: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Issue Date</label>
                          <input type="date" value={licenseForm.issueDate} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={e => setLicenseForm({...licenseForm, issueDate: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Expiration Date</label>
                          <input type="date" value={licenseForm.expiryDate} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={e => setLicenseForm({...licenseForm, expiryDate: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Renew Advance Alert (Days)</label>
                          <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="number" placeholder="How many days before expiry?" value={licenseForm.renewalLeadDays} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={e => setLicenseForm({...licenseForm, renewalLeadDays: Number(e.target.value)})} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Renewal Source / Agency</label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input type="text" placeholder="Where to renew?" value={licenseForm.renewalSource} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={e => setLicenseForm({...licenseForm, renewalSource: e.target.value})} />
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Renewal Notes</label>
                          <textarea rows={3} placeholder="Any specific requirements or documentation needed for renewal..." value={licenseForm.notes} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm resize-none" onChange={e => setLicenseForm({...licenseForm, notes: e.target.value})} />
                        </div>
                      </div>
                      <div className="flex space-x-6">
                        <button onClick={() => setEditingLicense(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Cancel</button>
                        <button onClick={handleUpdateLicense} className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all">Save License Profile</button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-2 space-y-6">
                        <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 grid grid-cols-2 gap-y-8 gap-x-12">
                           <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1">License Designation</p><p className="text-lg font-black text-slate-900">{equipment.licenseInfo?.name || '---'}</p></div>
                           <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1">ID / Number</p><p className="text-lg font-bold text-blue-600">{equipment.licenseInfo?.number || '---'}</p></div>
                           <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1">Issuance Date</p><p className="text-sm font-bold text-slate-700">{equipment.licenseInfo?.issueDate || '---'}</p></div>
                           <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1">Validity Expiry</p><p className="text-sm font-bold text-slate-700">{equipment.licenseInfo?.expiryDate || '---'}</p></div>
                           <div className="col-span-2"><p className="text-[10px] text-slate-400 font-black uppercase mb-1">Renewal Source</p><p className="text-sm font-bold text-slate-700 flex items-center"><Building2 size={14} className="mr-2 text-blue-400"/> {equipment.licenseInfo?.renewalSource || 'Not Specified'}</p></div>
                        </div>

                        {equipment.licenseInfo?.notes && (
                           <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100/50">
                             <p className="text-[10px] text-blue-400 font-black uppercase mb-3">Engineer's Renewal Notes</p>
                             <p className="text-sm text-slate-600 leading-relaxed italic">"{equipment.licenseInfo.notes}"</p>
                           </div>
                        )}
                      </div>

                      <div className="space-y-6">
                         <div className={`p-8 rounded-[2rem] text-white flex flex-col items-center text-center shadow-xl ${renewalDue ? 'bg-red-600 shadow-red-200' : 'bg-emerald-600 shadow-emerald-200'}`}>
                           {renewalDue ? <AlertCircle size={40} className="mb-4 animate-bounce" /> : <CheckCircle2 size={40} className="mb-4" />}
                           <h4 className="text-[10px] font-black uppercase text-white/60 mb-2">Compliance Alert</h4>
                           <p className="text-xl font-black">{renewalDue ? 'Renewal Action Required' : 'Asset Compliant'}</p>
                           <div className="mt-6 pt-6 border-t border-white/10 w-full">
                             <p className="text-[9px] font-black uppercase opacity-60 mb-1">Alerting threshold</p>
                             <p className="text-xs font-bold">{equipment.licenseInfo?.renewalLeadDays || 30} Days Before Expiry</p>
                           </div>
                         </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
            
            {activeTab === 'service' && (
              <div className="space-y-8 animate-in fade-in">
                 <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-black text-slate-900 flex items-center"><Wrench className="text-blue-600 mr-3" size={32} /> Maintenance & Payment History</h2>
                   <button onClick={() => navigate('/payments')} className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Manage Balances →</button>
                 </div>
                 <div className="space-y-6">
                   {serviceLogs.length > 0 ? serviceLogs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                     <div key={log.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col overflow-hidden group transition-all hover:bg-white hover:shadow-md">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex items-center space-x-6">
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><Calendar size={20} className="text-slate-400"/></div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{log.type} Service</p>
                              <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">{log.date} • {log.technicianName}</p>
                              <div className="flex items-center text-[9px] font-black text-slate-400 uppercase">
                                <Building2 size={12} className="mr-1" /> {log.companyName || 'Not Specified'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-8 w-full md:w-auto">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Investment</p>
                                <p className="text-sm font-black text-slate-900">BDT {(log.cost || 0).toLocaleString()}</p>
                            </div>
                            <div className="text-right border-l border-slate-200 pl-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Balance</p>
                                <p className={`text-sm font-black ${Number(log.remainingAmount || 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {Number(log.remainingAmount || 0) > 0 ? `BDT ${(log.remainingAmount || 0).toLocaleString()}` : 'SETTLED'}
                                </p>
                            </div>
                            <button 
                              onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                              className={`p-3 rounded-xl transition-all shadow-sm ${expandedLogId === log.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:text-blue-600'}`}
                            >
                              {expandedLogId === log.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>

                        {expandedLogId === log.id && (
                          <div className="mt-8 pt-8 border-t border-slate-100 animate-in slide-in-from-top-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                              <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                                  <FileText size={14} className="mr-2 text-blue-600" /> Work Description
                                </h4>
                                <p className="text-sm text-slate-600 leading-relaxed italic">"{log.description}"</p>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                                  <CreditCard size={14} className="mr-2 text-blue-600" /> Payment Timeline
                                </h4>
                                <div className="space-y-3">
                                  {log.paymentHistory && log.paymentHistory.length > 0 ? log.paymentHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((pay, pIdx) => (
                                    <div key={pay.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                                      <div>
                                        <p className="text-xs font-black text-slate-900">BDT {(pay.amount || 0).toLocaleString()}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase">{pay.date} • {pay.method}</p>
                                      </div>
                                      {pay.note && (
                                        <div className="max-w-[150px] text-right">
                                          <p className="text-[9px] text-slate-500 font-medium italic truncate" title={pay.note}>{pay.note}</p>
                                        </div>
                                      )}
                                    </div>
                                  )) : (
                                    <p className="text-xs text-slate-400 italic">No detailed payment records found.</p>
                                  )}
                                  {Number(log.remainingAmount || 0) > 0 && (
                                    <button 
                                      onClick={() => navigate('/payments')}
                                      className="w-full mt-4 py-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center"
                                    >
                                      <Plus size={14} className="mr-2" /> Record New Payment
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                     </div>
                   )) : (
                     <div className="py-20 text-center text-slate-400 text-xs font-black uppercase tracking-widest">No maintenance history recorded yet.</div>
                   )}
                 </div>
              </div>
            )}

            {activeTab === 'parts' && (
              <div className="space-y-8 animate-in fade-in">
                 <div className="flex justify-between items-center">
                   <h2 className="text-2xl font-black text-slate-900 flex items-center"><Package className="text-blue-600 mr-3" size={32} /> Support Inventory</h2>
                   <button onClick={() => navigate('/spare-parts')} className="text-xs font-black uppercase tracking-widest text-blue-600 hover:underline">Manage Stock →</button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {spareParts.length > 0 ? spareParts.map(part => (
                     <div key={part.id} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center space-x-4">
                           <div className="bg-white p-3 rounded-xl border border-slate-200"><Package size={18} className="text-slate-400"/></div>
                           <div>
                             <p className="text-sm font-bold text-slate-900">{part.name}</p>
                             <p className="text-[10px] text-slate-500 font-bold uppercase">Stock: {part.quantity} units • BDT {(part.price || 0).toLocaleString()}</p>
                           </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${part.quantity <= part.minQuantity ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                           {part.quantity <= part.minQuantity ? 'LOW' : 'IN STOCK'}
                        </span>
                     </div>
                   )) : (
                     <div className="col-span-full py-20 text-center text-slate-400 text-xs font-black uppercase tracking-widest">No compatible parts found in inventory.</div>
                   )}
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contract Edit/Add Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-slate-900/70 flex items-center justify-center z-[70] p-4 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 p-10">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{editingContractId ? 'Update Agreement' : 'Register Agreement'}</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Asset: {equipment.name}</p>
              </div>
              <button onClick={() => setShowContractModal(false)} className="p-3 bg-slate-50 rounded-full"><X size={20}/></button>
            </div>
            
            <form onSubmit={handleContractSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Agreement Scope</label>
                  <div className="flex space-x-3">
                    {['AMC', 'CMC'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setContractForm({ ...contractForm, type: t as any })}
                        className={`flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all border-2 ${
                          contractForm.type === t 
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
                  label="Provider (Company)"
                  placeholder="Select company..."
                  options={vendors.map(v => ({ id: v.id, name: v.companyName, sub: v.email }))}
                  value={contractForm.companyId || ''}
                  onChange={(val) => {
                    const v = vendors.find(vend => vend.id === val);
                    setContractForm({...contractForm, companyId: val, companyName: v?.companyName || ''});
                  }}
                />
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Cost (BDT)</label>
                  <input required type="number" placeholder="BDT 0.00" value={contractForm.amount || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={(e) => setContractForm({...contractForm, amount: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Starts</label>
                  <input required type="date" value={contractForm.startDate} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={(e) => setContractForm({...contractForm, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ends</label>
                  <input required type="date" value={contractForm.endDate || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" onChange={(e) => setContractForm({...contractForm, endDate: e.target.value})} />
                </div>
              </div>

              <SearchableSelect 
                isMulti
                label="Assign Engineers"
                placeholder="Search engineers..."
                options={engineers.map(e => ({ id: e.id, name: e.name, sub: e.companyName }))}
                value={contractForm.engineerIds || []}
                onChange={(val) => setContractForm({...contractForm, engineerIds: val})}
              />

              <div className="flex space-x-4 pt-6">
                <button type="button" onClick={() => setShowContractModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs">Cancel</button>
                <button disabled={savingContract} type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-3xl font-black uppercase text-xs shadow-xl active:scale-95">
                  {savingContract ? 'Saving...' : 'Confirm Agreement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentDetail;
