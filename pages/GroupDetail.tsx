
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Loader2, Layers, Stethoscope, Search, Edit2, Trash2, Calendar, MapPin
} from 'lucide-react';
import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Equipment } from '../types';

const GroupDetail: React.FC = () => {
  const { groupName } = useParams<{ groupName: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    if (!groupName) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'equipment'), where('groupName', '==', decodeURIComponent(groupName)));
      const snap = await getDocs(q);
      setEquipment(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [groupName]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Permanently delete this machine?")) {
      await deleteDoc(doc(db, 'equipment', id));
      fetchData();
    }
  };

  const filtered = equipment.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col h-screen items-center justify-center">
      <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Opening Group Folder...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button onClick={() => navigate('/equipment')} className="p-3 bg-white rounded-2xl border border-slate-200 text-slate-400 hover:text-blue-600 transition-all shadow-sm">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center space-x-4">
             <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
               <Layers size={28} />
             </div>
             <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">{decodeURIComponent(groupName || '')}</h1>
               <p className="text-slate-500 font-medium">{equipment.length} assets connected in this collection</p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group">
        <Search className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Filter machines in this group..." 
          className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-semibold"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filtered.map((item) => (
          <div 
            key={item.id} 
            onClick={() => navigate(`/equipment/${item.id}`)}
            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden group"
          >
            <div className={`h-2 w-full ${item.status === 'Operational' ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.status === 'Operational' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{item.status}</span>
                <button onClick={(e) => handleDelete(item.id, e)} className="p-2 text-slate-200 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
              </div>
              
              <h3 className="font-black text-slate-900 truncate text-xl mb-1">{item.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{item.brand} • {item.model}</p>
              
              <div className="space-y-4 pt-6 border-t border-slate-50">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400 flex items-center uppercase"><MapPin size={12} className="mr-1.5"/> Dept</span>
                  <span className="text-slate-700">{item.location}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400 flex items-center uppercase"><Calendar size={12} className="mr-1.5"/> Purchased</span>
                  <span className="text-slate-700">{item.purchaseDate}</span>
                </div>
              </div>

              <div className="mt-8 text-right">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:underline">View Profile →</span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
            <Stethoscope size={48} className="text-slate-200 mb-6" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No machines found in this group matching filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetail;
