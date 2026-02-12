
import React, { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, X, Loader2, Trash2, Edit2, Wrench } from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Engineer, Vendor } from '../types';

const Engineers: React.FC = () => {
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Engineer>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const engSnap = await getDocs(collection(db, 'engineers'));
      setEngineers(engSnap.docs.map(d => ({ id: d.id, ...d.data() } as Engineer)));
      const vendSnap = await getDocs(collection(db, 'vendors'));
      setVendors(vendSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedVendor = vendors.find(v => v.id === formData.companyId);
      const payload = {
        ...formData,
        companyName: selectedVendor?.companyName || 'Unknown'
      };

      if (editingId) {
        await updateDoc(doc(db, 'engineers', editingId), payload);
      } else {
        await addDoc(collection(db, 'engineers'), payload);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({});
      fetchData();
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Remove this engineer permanently?")) {
      try {
        await deleteDoc(doc(db, 'engineers', id));
        fetchData();
      } catch (err) {
        alert("Delete failed: " + err);
      }
    }
  };

  const filteredEngineers = engineers.filter(eng => 
    eng.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eng.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    eng.specialties?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Engineer Directory</h1>
        <button 
          onClick={() => { setEditingId(null); setFormData({}); setShowModal(true); }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-200"
        >
          <Plus size={18} />
          <span>Add Engineer</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center relative">
        <Search className="absolute left-7 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search engineers by name, company, or specialty..." 
          className="w-full pl-12 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center"><Loader2 className="animate-spin inline text-blue-600" /></div>
        ) : filteredEngineers.length > 0 ? (
          filteredEngineers.map((eng) => (
            <div key={eng.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow group relative">
              <div className="flex justify-between items-start mb-4">
                <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-blue-600 font-bold text-xl">{eng.name.charAt(0)}</div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(eng.id); setFormData(eng); setShowModal(true); }} className="p-1 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                  <button onClick={() => handleDelete(eng.id)} className="p-1 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{eng.name}</h3>
              <p className="text-xs font-bold text-blue-600 uppercase mb-4">{eng.companyName}</p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-3 text-sm text-slate-600"><Mail size={16} /><span>{eng.email}</span></div>
                <div className="flex items-center space-x-3 text-sm text-slate-600"><Phone size={16} /><span>{eng.phone}</span></div>
                <div className="flex items-start space-x-3 text-sm text-slate-600"><Wrench size={16} className="mt-1" /><span className="line-clamp-2">Expertise: {eng.specialties || 'Not specified'}</span></div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">No engineers found matching search.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">{editingId ? 'Edit Engineer' : 'New Engineer'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input required type="text" value={formData.name || ''} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Affiliated Company</label>
                <select required value={formData.companyId || ''} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" onChange={(e) => setFormData({...formData, companyId: e.target.value})}>
                  <option value="">Select Company...</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                  <input required type="email" value={formData.email || ''} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone</label>
                  <input required type="text" value={formData.phone || ''} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Machine Specialization</label>
                <textarea className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" value={formData.specialties || ''} placeholder="e.g. MRI, Ventilators, X-Ray" onChange={(e) => setFormData({...formData, specialties: e.target.value})} />
              </div>
              <button disabled={saving} type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50">
                {saving ? 'Processing...' : (editingId ? 'Update Engineer' : 'Save Engineer')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Engineers;
