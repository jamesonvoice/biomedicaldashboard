
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Power, 
  RefreshCcw, 
  Loader2, 
  Search, 
  ArrowLeft, 
  Stethoscope, 
  LayoutGrid,
  List,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Equipment } from '../types';

const UptimeManager: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Operational' | 'Down' | 'Under Maintenance'>('All');

  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'equipment'));
      setEquipment(snap.docs.map(d => ({id: d.id, ...d.data()} as Equipment)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleStatus = async (id: string, newStatus: Equipment['status']) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, 'equipment', id), { status: newStatus });
      setEquipment(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredEquipment = equipment.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          e.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' || e.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return (
    <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-blue-600" size={48} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading Asset Register...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="flex items-center space-x-6">
           <button onClick={() => navigate('/')} className="p-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-blue-600 shadow-sm transition-all">
             <ArrowLeft size={24} />
           </button>
           <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Uptime Manager</h1>
              <p className="text-sm text-slate-500 font-medium">Global machine health & clinical availability toggles</p>
           </div>
        </div>
        <div className="flex space-x-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
           {['All', 'Operational', 'Under Maintenance', 'Down'].map((f) => (
             <button 
               key={f}
               onClick={() => setFilter(f as any)}
               className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
             >
               {f === 'Under Maintenance' ? 'Service' : f === 'Operational' ? 'Running' : f === 'Down' ? 'Stopped' : f}
             </button>
           ))}
        </div>
      </header>

      <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative group">
        <Search className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Filter by asset name, model or serial number..." 
          className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-semibold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map(e => (
          <div key={e.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all overflow-hidden group">
             <div className="p-8">
               <div className="flex justify-between items-start mb-6">
                  <div className="p-3 rounded-2xl bg-blue-50 text-blue-600"><Stethoscope size={24} /></div>
                  <div className="flex flex-col items-end">
                    {updatingId === e.id ? (
                      <Loader2 className="animate-spin text-blue-500" size={18} />
                    ) : (
                      <div className="flex items-center space-x-2">
                         <span className={`text-[9px] font-black uppercase tracking-widest ${e.status === 'Operational' ? 'text-emerald-500' : e.status === 'Down' ? 'text-red-500' : 'text-amber-500'}`}>{e.status}</span>
                         <div className={`w-3 h-3 rounded-full shadow-sm ${e.status === 'Operational' ? 'bg-emerald-500' : e.status === 'Down' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      </div>
                    )}
                  </div>
               </div>

               <h3 className="text-xl font-black text-slate-900 mb-1 truncate">{e.name}</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">{e.model} • SN: {e.serialNumber}</p>

               <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-50 rounded-[1.5rem]">
                  <button 
                    onClick={() => toggleStatus(e.id, 'Operational')}
                    disabled={e.status === 'Operational' || updatingId === e.id}
                    className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${e.status === 'Operational' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white hover:text-emerald-600'}`}
                  >
                    RUN
                  </button>
                  <button 
                    onClick={() => toggleStatus(e.id, 'Under Maintenance')}
                    disabled={e.status === 'Under Maintenance' || updatingId === e.id}
                    className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${e.status === 'Under Maintenance' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white hover:text-amber-600'}`}
                  >
                    SVC
                  </button>
                  <button 
                    onClick={() => toggleStatus(e.id, 'Down')}
                    disabled={e.status === 'Down' || updatingId === e.id}
                    className={`py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${e.status === 'Down' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-white hover:text-slate-900'}`}
                  >
                    STOP
                  </button>
               </div>

               <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{e.location}</span>
                  <button onClick={() => navigate(`/equipment/${e.id}`)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center">
                    Full Profile <ChevronRight size={12} className="ml-1" />
                  </button>
               </div>
             </div>
          </div>
        ))}

        {filteredEquipment.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
             <AlertCircle size={48} className="text-slate-100 mb-6" />
             <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No clinical assets found matching criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UptimeManager;
