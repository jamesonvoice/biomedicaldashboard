
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Star, Mail, MapPin, X, Loader2, User, 
  ChevronDown, ChevronUp, Trash2, Edit2, Wrench, Globe, Info, Tag 
} from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Vendor, Engineer, VendorMachine } from '../types';

const Vendors: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Vendor>>({ 
    rating: 5,
    machines: [] 
  });
  const [expandedVendor, setExpandedVendor] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vendSnap, engSnap] = await Promise.all([
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'engineers'))
      ]);
      setVendors(vendSnap.docs.map(d => ({ id: d.id, ...d.data() } as Vendor)));
      setEngineers(engSnap.docs.map(d => ({ id: d.id, ...d.data() } as Engineer)));
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { 
        ...formData, 
        rating: Number(formData.rating),
        machines: formData.machines || []
      };
      
      if (editingId) {
        await updateDoc(doc(db, 'vendors', editingId), payload);
      } else {
        await addDoc(collection(db, 'vendors'), payload);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ rating: 5, machines: [] });
      fetchData();
    } catch (err) { 
      alert("Error saving: " + err); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure? This will delete the company and its machine records.")) {
      try {
        await deleteDoc(doc(db, 'vendors', id));
        setVendors(prev => prev.filter(v => v.id !== id));
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Delete failed. Please check permissions.");
      }
    }
  };

  const addMachineField = () => {
    const machines = [...(formData.machines || [])];
    machines.push({ name: '', brand: '', origin: '', description: '' });
    setFormData({ ...formData, machines });
  };

  const updateMachineField = (index: number, field: keyof VendorMachine, value: string) => {
    const machines = [...(formData.machines || [])];
    machines[index] = { ...machines[index], [field]: value };
    setFormData({ ...formData, machines });
  };

  const removeMachineField = (index: number) => {
    const machines = formData.machines?.filter((_, i) => i !== index);
    setFormData({ ...formData, machines });
  };

  const filteredVendors = vendors.filter(v => 
    v.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.machines?.some(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Company & Machine Database</h1>
          <p className="text-sm text-slate-500 font-medium">Tracking {vendors.length} vendor profiles</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setFormData({ rating: 5, machines: [] }); setShowModal(true); }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>Add New Vendor</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center relative">
        <Search className="absolute left-7 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Search by vendor name, machine model, or email..." 
          className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="animate-spin inline text-blue-600" /></div>
        ) : filteredVendors.length > 0 ? (
          filteredVendors.map((vendor) => (
            <div key={vendor.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden group hover:shadow-md transition-all">
              <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center space-x-5">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shadow-blue-100">
                    {vendor.companyName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{vendor.companyName}</h3>
                    <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1 font-medium">
                      <span className="flex items-center text-amber-500 font-bold"><Star size={14} fill="currentColor" className="mr-1" /> {vendor.rating}.0</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-blue-600 font-bold uppercase tracking-wider">{vendor.machines?.length || 0} Machines Managed</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="flex items-center space-x-2"><Mail size={16} className="text-slate-400"/><span>{vendor.email}</span></div>
                  <div className="flex items-center space-x-2"><MapPin size={16} className="text-slate-400"/><span className="truncate">{vendor.address}</span></div>
                </div>

                <div className="flex items-center space-x-3 self-end md:self-center">
                  <button 
                    onClick={() => setExpandedVendor(expandedVendor === vendor.id ? null : vendor.id)}
                    className={`px-4 py-2 rounded-xl text-sm flex items-center space-x-2 font-bold transition-all ${expandedVendor === vendor.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <Wrench size={16} />
                    <span>Details & Team</span>
                    {expandedVendor === vendor.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                  </button>
                  <div className="flex bg-slate-50 p-1 rounded-xl">
                    <button onClick={() => { setEditingId(vendor.id); setFormData(vendor); setShowModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={18}/></button>
                    <button onClick={() => handleDelete(vendor.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
              </div>

              {expandedVendor === vendor.id && (
                <div className="bg-slate-50/70 p-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300 space-y-8">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                      <Wrench size={14} className="mr-2"/> Equipment Portfolio
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {vendor.machines?.map((m, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 transition-all group/card">
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="font-bold text-slate-900 group-hover/card:text-blue-600 transition-colors">{m.name}</h5>
                            <Tag size={14} className="text-slate-300" />
                          </div>
                          <div className="space-y-2 mb-3">
                            {m.brand && (
                              <div className="flex items-center text-xs text-slate-500">
                                <span className="font-bold mr-2 text-slate-400">BRAND:</span> {m.brand}
                              </div>
                            )}
                            {m.origin && (
                              <div className="flex items-center text-xs text-slate-500">
                                <span className="font-bold mr-2 text-slate-400">ORIGIN:</span> {m.origin}
                              </div>
                            )}
                          </div>
                          {m.description && <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">{m.description}</p>}
                        </div>
                      ))}
                      {(!vendor.machines || vendor.machines.length === 0) && (
                        <p className="col-span-full text-center py-6 text-slate-400 text-sm italic">No machines registered for this vendor.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center">
                      <User size={14} className="mr-2"/> Service Engineers
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {engineers.filter(e => e.companyId === vendor.id).map(eng => (
                        <div key={eng.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">{eng.name.charAt(0)}</div>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-slate-900 truncate">{eng.name}</p>
                            <p className="text-xs text-slate-500 truncate">{eng.phone}</p>
                          </div>
                        </div>
                      ))}
                      {engineers.filter(e => e.companyId === vendor.id).length === 0 && (
                        <p className="col-span-full text-center py-6 text-slate-400 text-sm italic">No assigned engineers.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">No results found.</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl my-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-900">{editingId ? 'Edit Vendor Profile' : 'New Vendor Registration'}</h2>
                <p className="text-sm text-slate-500 font-medium">Capture comprehensive supplier and machine details</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Company Name</label>
                  <input required type="text" value={formData.companyName || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm font-medium" onChange={(e) => setFormData({...formData, companyName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input required type="email" value={formData.email || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm font-medium" onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Office Address</label>
                  <input required type="text" value={formData.address || ''} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all text-sm font-medium" onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                    <Wrench size={16} className="mr-2 text-blue-600"/> Machine Expertise
                  </h3>
                  <button type="button" onClick={addMachineField} className="text-blue-600 hover:text-blue-700 text-xs font-black flex items-center uppercase tracking-widest px-3 py-1.5 bg-blue-50 rounded-lg transition-all">
                    <Plus size={14} className="mr-1" /> Add Machine
                  </button>
                </div>
                
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                  {formData.machines?.map((machine, index) => (
                    <div key={index} className="p-6 bg-slate-50 border border-slate-200 rounded-3xl relative animate-in slide-in-from-right-2">
                      <button type="button" onClick={() => removeMachineField(index)} className="absolute top-4 right-4 text-slate-300 hover:text-red-600 transition-all"><X size={18}/></button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Machine Name *</label>
                          <input required type="text" placeholder="e.g. ICU Ventilator V500" value={machine.name} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" onChange={(e) => updateMachineField(index, 'name', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Brand</label>
                          <input type="text" placeholder="e.g. Dräger" value={machine.brand} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" onChange={(e) => updateMachineField(index, 'brand', e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Origin</label>
                          <input type="text" placeholder="e.g. Germany" value={machine.origin} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm" onChange={(e) => updateMachineField(index, 'origin', e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Brief Description</label>
                          <textarea rows={2} placeholder="Brief capabilities or model notes..." value={machine.description} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm resize-none" onChange={(e) => updateMachineField(index, 'description', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!formData.machines || formData.machines.length === 0) && (
                    <div className="py-10 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                      <Wrench size={32} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-slate-400 text-sm font-medium">No machines listed. Click "Add Machine" to start.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                 <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Cancel</button>
                 <button disabled={saving} type="submit" className="flex-[2] bg-blue-600 text-white py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-200 disabled:opacity-50 transition-all active:scale-95">
                  {saving ? 'Processing...' : (editingId ? 'Update Profile' : 'Complete Registration')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
