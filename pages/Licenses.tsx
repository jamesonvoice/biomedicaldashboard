
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Filter,
  Package
} from 'lucide-react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Equipment } from '../types';

const Licenses: React.FC = () => {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'equipment'), where('licenseRequired', '==', true));
        const snap = await getDocs(q);
        setEquipment(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getStatus = (expiryDate?: string) => {
    if (!expiryDate) return { label: 'Incomplete', color: 'bg-slate-100 text-slate-600', icon: <AlertCircle size={14}/> };
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiry < now) return { label: 'Expired', color: 'bg-red-100 text-red-700', icon: <AlertCircle size={14}/> };
    if (expiry <= thirtyDaysFromNow) return { label: 'Due Soon', color: 'bg-amber-100 text-amber-700', icon: <Clock size={14}/> };
    return { label: 'Valid', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={14}/> };
  };

  const filtered = equipment.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.licenseInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Statutory Licenses</h1>
          <p className="text-sm text-slate-500 font-medium">Tracking regulatory compliance for {equipment.length} assets</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
            {equipment.filter(e => getStatus(e.licenseInfo?.expiryDate).label === 'Valid').length} Verified
          </div>
          <div className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-100 animate-pulse">
            {equipment.filter(e => getStatus(e.licenseInfo?.expiryDate).label === 'Expired').length} Overdue
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center relative">
        <Search className="absolute left-7 text-slate-300" size={18} />
        <input 
          type="text" 
          placeholder="Search by machine name or license type..." 
          className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-6">Machine Name</th>
                <th className="px-8 py-6">License Identity</th>
                <th className="px-8 py-6">Number</th>
                <th className="px-8 py-6">Expiry</th>
                <th className="px-8 py-6">Compliance</th>
                <th className="px-8 py-6 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" size={32} /></td></tr>
              ) : filtered.length > 0 ? (
                filtered.map((item) => {
                  const status = getStatus(item.licenseInfo?.expiryDate);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.model}</p>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-slate-700">{item.licenseInfo?.name || 'NOT CONFIGURED'}</span>
                      </td>
                      <td className="px-8 py-6">
                        <code className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {item.licenseInfo?.number || 'PENDING'}
                        </code>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-700">{item.licenseInfo?.expiryDate || '---'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg w-fit text-[9px] font-black uppercase ${status.color}`}>
                          {status.icon}
                          <span>{status.label}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => navigate(`/equipment/${item.id}`)}
                          className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        >
                          <ExternalLink size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">No licensed assets found in the database.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
          <ShieldCheck className="text-blue-500/20 absolute -right-4 -bottom-4 w-32 h-32 rotate-12" />
          <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Audit Readiness</h4>
          <p className="text-2xl font-black mb-4">98%</p>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
             <div className="bg-blue-500 h-full w-[98%]"></div>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Upcoming Renewals (30d)</h4>
          <div className="space-y-4">
            {filtered.filter(e => getStatus(e.licenseInfo?.expiryDate).label === 'Due Soon').length === 0 ? (
              <p className="text-xs text-slate-400 italic">Clear for the next 30 days.</p>
            ) : (
              filtered.filter(e => getStatus(e.licenseInfo?.expiryDate).label === 'Due Soon').map(e => (
                <div key={e.id} className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{e.name}</span>
                  <span className="text-amber-600 font-black">{e.licenseInfo?.expiryDate}</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col justify-center text-center">
           <AlertCircle className="text-red-500 mx-auto mb-3" size={32} />
           <p className="text-lg font-black text-slate-900">Total Risk Alerts</p>
           <p className="text-sm text-slate-400 font-medium">{filtered.filter(e => getStatus(e.licenseInfo?.expiryDate).label === 'Expired').length} items need immediate attention</p>
        </div>
      </div>
    </div>
  );
};

export default Licenses;
