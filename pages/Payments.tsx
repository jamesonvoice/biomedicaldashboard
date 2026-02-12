
import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Building2,
  Calendar,
  X,
  Plus,
  FileText,
  Stethoscope,
  Wrench,
  Bell,
  Clock,
  Trash2,
  CalendarDays,
  DollarSign,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceLog, Equipment, PaymentRecord, PaymentReminder } from '../types';

type OutstandingItem = {
  id: string;
  source: 'service' | 'equipment';
  name: string;
  provider: string;
  totalCost: number;
  paid: number;
  remaining: number;
  originalData: ServiceLog | Equipment;
};

const Payments: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'outstanding' | 'reminders'>('outstanding');
  const [items, setItems] = useState<OutstandingItem[]>([]);
  const [reminders, setReminders] = useState<PaymentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<OutstandingItem | null>(null);
  
  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentRecord['method']>('Cash');
  const [paymentNote, setPaymentNote] = useState<string>('');
  
  // Reminder Form State
  const [reminderAmount, setReminderAmount] = useState<number>(0);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [leadDays, setLeadDays] = useState<number>(3);
  const [reminderNotes, setReminderNotes] = useState<string>('');

  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsSnap, eqSnap, remSnap] = await Promise.all([
        getDocs(collection(db, 'serviceLogs')),
        getDocs(collection(db, 'equipment')),
        getDocs(query(collection(db, 'paymentReminders'), orderBy('scheduledDate', 'asc')))
      ]);

      const serviceItems: OutstandingItem[] = logsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as ServiceLog))
        .filter(l => (l.remainingAmount || 0) > 0)
        .map(l => ({
          id: l.id,
          source: 'service',
          name: l.equipmentName,
          provider: l.companyName || 'Unknown Vendor',
          totalCost: l.cost,
          paid: l.paidAmount,
          remaining: l.remainingAmount,
          originalData: l
        }));

      const equipmentItems: OutstandingItem[] = eqSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Equipment))
        .filter(e => (e.remainingAmount || 0) > 0)
        .map(e => ({
          id: e.id,
          source: 'equipment',
          name: e.name,
          provider: e.supplierName || 'Unknown Vendor',
          totalCost: e.purchasePrice,
          paid: e.paidAmount || 0,
          remaining: e.remainingAmount,
          originalData: e
        }));

      setItems([...serviceItems, ...equipmentItems].sort((a,b) => b.remaining - a.remaining));
      setReminders(remSnap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentReminder)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || paymentAmount <= 0) return;
    
    setSaving(true);
    try {
      const newPaid = (selectedItem.paid || 0) + paymentAmount;
      const newRemaining = Math.max(0, selectedItem.totalCost - newPaid);
      
      const newPayment: PaymentRecord = {
        id: crypto.randomUUID(),
        amount: paymentAmount,
        date: paymentDate,
        method: paymentMethod,
        note: paymentNote,
        createdAt: new Date().toISOString()
      };

      const updatedHistory = [...(selectedItem.originalData.paymentHistory || []), newPayment];
      const collectionName = selectedItem.source === 'service' ? 'serviceLogs' : 'equipment';
      
      await updateDoc(doc(db, collectionName, selectedItem.id), {
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        paymentHistory: updatedHistory,
        updatedAt: new Date().toISOString()
      });
      
      setShowPayModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      alert("Payment update failed: " + err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || reminderAmount <= 0 || !scheduledDate) return;
    
    setSaving(true);
    try {
      await addDoc(collection(db, 'paymentReminders'), {
        sourceId: selectedItem.id,
        sourceType: selectedItem.source,
        name: selectedItem.name,
        provider: selectedItem.provider,
        amountToPay: reminderAmount,
        scheduledDate: scheduledDate,
        leadDays: leadDays,
        notes: reminderNotes,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      setShowReminderModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (err) {
      alert("Failed to set reminder: " + err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReminder = async (id: string) => {
    if (confirm("Delete this reminder?")) {
      await deleteDoc(doc(db, 'paymentReminders', id));
      fetchData();
    }
  };

  const filteredItems = items.filter(l => 
    l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.provider?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReminders = reminders.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.provider?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = items.reduce((acc, curr) => acc + (curr.remaining || 0), 0);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Finance Control Center</h1>
          <p className="text-sm text-slate-500 font-medium tracking-tight uppercase">Capital Acquisition & Maintenance Liability</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-stretch md:self-auto">
          <button 
            onClick={() => setActiveTab('outstanding')} 
            className={`flex-1 md:w-48 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'outstanding' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Accounts Payable
          </button>
          <button 
            onClick={() => setActiveTab('reminders')} 
            className={`flex-1 md:w-48 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'reminders' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Payment Reminders
          </button>
        </div>
      </div>

      {activeTab === 'outstanding' && (
        <div className="bg-red-50 border border-red-100 px-10 py-6 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
             <div className="p-3 bg-red-600 text-white rounded-2xl shadow-lg shadow-red-200">
                <AlertTriangle size={24} />
             </div>
             <div>
                <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Total Cumulative Liability</p>
                <p className="text-sm font-bold text-red-700">Accounts needing settlement attention</p>
             </div>
          </div>
          <p className="text-4xl font-black text-red-600 tracking-tighter">BDT {(totalOutstanding || 0).toLocaleString()}</p>
        </div>
      )}

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center relative group">
        <Search className="absolute left-8 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input 
          type="text" 
          placeholder={activeTab === 'outstanding' ? "Search machine, service or vendor..." : "Search scheduled reminders..."} 
          className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-semibold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" size={48} /></div>
        ) : activeTab === 'outstanding' ? (
          filteredItems.length > 0 ? filteredItems.map((item) => (
            <div key={`${item.source}-${item.id}`} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 flex flex-col hover:shadow-2xl hover:-translate-y-1 transition-all relative group">
               <div className="flex justify-between items-start mb-8">
                 <div className={`p-4 rounded-2xl shadow-sm ${item.source === 'equipment' ? 'bg-indigo-50 text-indigo-600 shadow-indigo-100' : 'bg-blue-50 text-blue-600 shadow-blue-100'}`}>
                   {item.source === 'equipment' ? <Stethoscope size={28} /> : <Wrench size={28} />}
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="px-3 py-1 bg-red-50 text-red-600 text-[9px] font-black uppercase rounded-full border border-red-100 mb-1 tracking-widest">Pending</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-tighter ${item.source === 'equipment' ? 'bg-indigo-600 text-white' : 'bg-blue-600 text-white'}`}>
                      {item.source === 'equipment' ? 'Capital Purchase' : 'Service Entry'}
                    </span>
                 </div>
               </div>
               
               <h3 className="font-black text-slate-900 text-xl mb-1 leading-tight group-hover:text-blue-600 transition-colors">{item.name}</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{item.provider}</p>
               
               <div className="space-y-4 mb-8 flex-1">
                 <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2"><span className="text-slate-400 uppercase tracking-tighter">Total Bill</span><span className="text-slate-900">BDT {(item.totalCost || 0).toLocaleString()}</span></div>
                 <div className="flex justify-between text-xs font-bold border-b border-slate-50 pb-2"><span className="text-slate-400 uppercase tracking-tighter">Amount Paid</span><span className="text-emerald-600">BDT {(item.paid || 0).toLocaleString()}</span></div>
                 <div className="pt-2 flex justify-between items-end">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Balance Due</span>
                    <span className="text-2xl font-black text-red-600 tracking-tighter">BDT {(item.remaining || 0).toLocaleString()}</span>
                 </div>
               </div>

               <div className="flex space-x-3">
                 <button 
                   onClick={() => { 
                     setSelectedItem(item); 
                     setPaymentAmount(item.remaining); 
                     setPaymentDate(new Date().toISOString().split('T')[0]);
                     setShowPayModal(true); 
                   }}
                   className={`flex-[3] py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 text-white ${item.source === 'equipment' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-blue-600 shadow-slate-200'}`}
                 >
                   Settle Account
                 </button>
                 <button 
                   onClick={() => {
                     setSelectedItem(item);
                     setReminderAmount(item.remaining);
                     setScheduledDate('');
                     setShowReminderModal(true);
                   }}
                   title="Set Reminder"
                   className="flex-1 py-4 bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all border border-slate-100"
                 >
                   <Bell size={18} className="mx-auto" />
                 </button>
               </div>
            </div>
          )) : (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
              <CheckCircle2 size={56} className="text-emerald-200 mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-sm">All financial accounts are settled.</p>
            </div>
          )
        ) : (
          filteredReminders.length > 0 ? filteredReminders.map((rem) => {
            const date = new Date(rem.scheduledDate);
            const now = new Date();
            now.setHours(0,0,0,0);
            const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isAlertActive = diff <= rem.leadDays;
            
            return (
              <div key={rem.id} className={`bg-white rounded-[2.5rem] border shadow-sm p-8 flex flex-col hover:shadow-2xl transition-all relative overflow-hidden group ${isAlertActive ? 'border-indigo-300' : 'border-slate-100'}`}>
                {isAlertActive && (
                  <div className="absolute top-0 right-0 p-1">
                    <div className="bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-md">Active Alert</div>
                  </div>
                )}
                
                <div className="absolute top-0 right-0 w-24 h-24 flex items-center justify-center translate-x-8 -translate-y-8 rotate-12 transition-transform group-hover:scale-125">
                  <Bell size={48} className={`opacity-10 ${isAlertActive ? 'text-indigo-600' : 'text-slate-300'}`} />
                </div>
                
                <div className="flex justify-between items-start mb-8">
                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${diff < 0 ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' : diff === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {diff < 0 ? 'Overdue' : diff === 0 ? 'Settlement Due Today' : `Settlement in ${diff} days`}
                  </div>
                  <button onClick={() => handleDeleteReminder(rem.id)} className="p-2 text-slate-300 hover:text-red-600 transition-colors bg-slate-50 rounded-xl"><Trash2 size={16} /></button>
                </div>

                <h3 className="font-black text-slate-900 text-xl mb-1 leading-tight">{rem.name}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">{rem.provider}</p>

                <div className="bg-slate-50 p-6 rounded-3xl space-y-4 mb-8 border border-slate-100">
                   <div className="flex justify-between items-center text-xs">
                     <span className="text-slate-400 font-bold flex items-center uppercase tracking-tighter"><DollarSign size={14} className="mr-1 text-indigo-600" /> Target Payment</span>
                     <span className="text-slate-900 font-black">BDT {(rem.amountToPay || 0).toLocaleString()}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs pt-4 border-t border-slate-200/50">
                     <span className="text-slate-400 font-bold flex items-center uppercase tracking-tighter"><Calendar size={14} className="mr-1 text-indigo-600" /> Planned Date</span>
                     <span className="text-slate-900 font-black">{rem.scheduledDate}</span>
                   </div>
                </div>

                {rem.notes && <p className="text-[11px] text-slate-500 font-medium italic mb-8 line-clamp-2 leading-relaxed">"{rem.notes}"</p>}

                <button 
                  onClick={() => {
                    const matchedItem = items.find(i => i.id === rem.sourceId);
                    if (matchedItem) {
                      setSelectedItem(matchedItem);
                      setPaymentAmount(rem.amountToPay);
                      setPaymentDate(new Date().toISOString().split('T')[0]);
                      setShowPayModal(true);
                    } else {
                      alert("Original financial record not found or already settled.");
                    }
                  }}
                  className={`w-full py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center ${isAlertActive ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700' : 'bg-slate-900 text-white shadow-slate-100 hover:bg-blue-600'}`}
                >
                  Confirm & Pay <ArrowUpRight size={14} className="ml-2" />
                </button>
              </div>
            );
          }) : (
            <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
              <CalendarDays size={56} className="text-slate-100 mb-6" />
              <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No scheduled payment reminders found.</p>
            </div>
          )
        )}
      </div>

      {/* Payment Settlement Modal */}
      {showPayModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-xl my-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[3rem]">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Settle Payment</h2>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">Transaction Identity: {selectedItem.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setShowPayModal(false)} className="p-3 hover:bg-white rounded-full transition-all text-slate-400 shadow-sm border border-slate-100"><X size={24}/></button>
            </div>
            
            <form onSubmit={handlePayment} className="p-10 space-y-8">
              <div className={`p-8 rounded-[2.5rem] text-white shadow-xl mb-4 relative overflow-hidden ${selectedItem.source === 'equipment' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-blue-600 shadow-blue-100'}`}>
                 <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
                   {selectedItem.source === 'equipment' ? <Stethoscope size={100} /> : <Wrench size={100} />}
                 </div>
                 <p className="text-[10px] font-black uppercase text-white/60 mb-2 tracking-widest">Clinical Account</p>
                 <h4 className="text-2xl font-black mb-1 leading-tight">{selectedItem.name}</h4>
                 <p className="text-xs font-bold text-white/80">{selectedItem.provider}</p>
                 <div className="mt-6 pt-6 border-t border-white/10 flex justify-between items-end">
                    <div>
                       <p className="text-[9px] font-black uppercase text-white/60">Outstanding Balance</p>
                       <p className="text-xl font-black">BDT {(selectedItem.remaining || 0).toLocaleString()}</p>
                    </div>
                    <span className="text-[8px] font-black uppercase bg-white/20 px-2 py-1 rounded">Locked Entry</span>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <DollarSign size={14} className="mr-2 text-blue-600" /> Amount to Transact
                  </label>
                  <div className="relative">
                    <input required type="number" step="0.01" max={selectedItem.remaining} min="0.01" value={paymentAmount} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-xl font-black" onChange={(e) => setPaymentAmount(Number(e.target.value))} />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">BDT</div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <Calendar size={14} className="mr-2 text-blue-600" /> Transaction Date
                  </label>
                  <input required type="date" value={paymentDate} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold text-sm" onChange={(e) => setPaymentDate(e.target.value)} />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <CreditCard size={14} className="mr-2 text-blue-600" /> Settlement Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {['Cash', 'Check', 'Bank Transfer', 'Mobile Banking'].map((m) => (
                      <button key={m} type="button" onClick={() => setPaymentMethod(m as any)} className={`py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all ${paymentMethod === m ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}>{m}</button>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <FileText size={14} className="mr-2 text-blue-600" /> Payment Reference / Notes
                  </label>
                  <textarea rows={3} placeholder="Check numbers, transaction IDs, or internal notes..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm resize-none font-medium transition-all" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                 <button type="button" onClick={() => setShowPayModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Discard</button>
                 <button disabled={saving} type="submit" className="flex-[2] bg-blue-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-200 active:scale-95 disabled:opacity-50">{saving ? 'Processing...' : 'Confirm Settlement'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Reminder Enrollment Modal */}
      {showReminderModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl my-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[3rem]">
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Set Payments Reminder</h2>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1 tracking-wider">Account: {selectedItem.name}</p>
              </div>
              <button onClick={() => setShowReminderModal(false)} className="p-3 hover:bg-white rounded-full transition-all text-slate-400 border border-slate-100"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSaveReminder} className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <DollarSign size={14} className="mr-2 text-indigo-600" /> Future Payment Amount
                  </label>
                  <div className="relative">
                    <input required type="number" max={selectedItem.remaining} value={reminderAmount} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 font-black text-xl" onChange={(e) => setReminderAmount(Number(e.target.value))} />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">BDT</div>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                    <Calendar size={14} className="mr-2 text-indigo-600" /> Target Settlement Date
                  </label>
                  <input required type="date" value={scheduledDate} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 font-black text-sm" onChange={(e) => setScheduledDate(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                      <Clock size={14} className="mr-2 text-indigo-600" /> Advance Alert Lead Time
                    </label>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{leadDays} Days Before</span>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                    <input type="range" min="1" max="30" value={leadDays} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" onChange={(e) => setLeadDays(Number(e.target.value))} />
                    <div className="flex justify-between mt-4">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Immediate</span>
                       <span className="text-[9px] font-black text-slate-400 uppercase">1 Month Lead</span>
                    </div>
                  </div>
                  <p className="mt-4 text-[11px] text-slate-500 font-medium bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 leading-relaxed italic">
                    "The system will trigger a high-priority dashboard alert and visual indicators starting {leadDays} days before the targeted date ({scheduledDate || '---'})."
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Scheduling Notes (Internal)</label>
                  <textarea rows={3} placeholder="Why is this payment scheduled for this date? (e.g. Budget release, milestone achieved...)" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 text-sm resize-none font-medium transition-all" value={reminderNotes} onChange={(e) => setReminderNotes(e.target.value)} />
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                 <button type="button" onClick={() => setShowReminderModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                 <button disabled={saving} type="submit" className="flex-[2] bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-indigo-200 active:scale-95 disabled:opacity-50">{saving ? 'Registering...' : 'Activate Reminder'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
