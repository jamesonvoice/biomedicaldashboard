
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  AlertTriangle, 
  Trash2, 
  ShoppingBag,
  X,
  Loader2,
  Stethoscope,
  Building2,
  Package
} from 'lucide-react';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { SparePart, Vendor, Equipment } from '../types';

const SpareParts: React.FC = () => {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<SparePart>>({
    quantity: 0,
    minQuantity: 5,
    price: 0,
    compatibility: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partsSnap, vendSnap, eqSnap] = await Promise.all([
        getDocs(collection(db, 'spareParts')),
        getDocs(collection(db, 'vendors')),
        getDocs(collection(db, 'equipment'))
      ]);
      
      setParts(partsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SparePart)));
      setVendors(vendSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor)));
      setEquipment(eqSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipment)));
    } catch (err) {
      console.error("Error fetching inventory data:", err);
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
      await addDoc(collection(db, 'spareParts'), {
        ...formData,
        quantity: Number(formData.quantity),
        minQuantity: Number(formData.minQuantity),
        price: Number(formData.price),
        createdAt: new Date().toISOString()
      });
      setShowModal(false);
      setFormData({ quantity: 0, minQuantity: 5, price: 0, compatibility: [] });
      fetchData();
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Permanently remove this part from the inventory?")) {
      try {
        await deleteDoc(doc(db, 'spareParts', id));
        setParts(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error("Delete failed:", err);
        alert("Failed to delete. Error: " + err);
      }
    }
  };

  const handleCompatibilityChange = (machineName: string) => {
    const current = formData.compatibility || [];
    if (current.includes(machineName)) {
      setFormData({...formData, compatibility: current.filter(name => name !== machineName)});
    } else {
      setFormData({...formData, compatibility: [...current, machineName]});
    }
  };

  const filteredParts = parts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500 font-medium">Tracking {parts.length} specialized components</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={18} />
          <span>New Inventory Item</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600"><ShoppingBag size={24} /></div>
          <div><h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">In Stock</h4><p className="text-3xl font-black text-slate-900">{filteredParts.length}</p></div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-red-50 shadow-sm flex items-center space-x-4">
          <div className="bg-red-50 p-4 rounded-2xl text-red-600"><AlertTriangle size={24} /></div>
          <div><h4 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Low Level</h4><p className="text-3xl font-black text-red-600">{filteredParts.filter(p => p.quantity <= p.minQuantity).length}</p></div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center relative">
        <Search className="absolute left-7 text-slate-300" size={18} />
        <input 
          type="text" 
          placeholder="Filter parts by specification or supplier..." 
          className="w-full pl-12 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="px-8 py-5">Part Details</th>
                <th className="px-8 py-5">Availability</th>
                <th className="px-8 py-5">Cost</th>
                <th className="px-8 py-5">Vendor</th>
                <th className="px-8 py-5">Compatible Assets</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" size={32} /></td></tr>
              ) : filteredParts.length > 0 ? (
                filteredParts.map((part) => (
                  <tr key={part.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <p className="font-bold text-slate-900 text-sm">{part.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">ID: {part.id.slice(0, 8)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-3">
                        <span className={`text-xl font-black ${part.quantity <= part.minQuantity ? 'text-red-600' : 'text-slate-900'}`}>
                          {part.quantity}
                        </span>
                        {part.quantity <= part.minQuantity && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[8px] font-black uppercase rounded-full">Replenish</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-slate-900 font-black text-sm">BDT {(part.price || 0).toLocaleString()}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center text-xs text-slate-600 font-bold">
                        <Building2 size={14} className="mr-1.5 text-slate-300" />
                        {part.supplier}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {part.compatibility?.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded border border-blue-100">
                            {c}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => handleDelete(part.id)} className="text-slate-200 hover:text-red-600 transition-all p-2 bg-slate-50 rounded-xl group-hover:bg-red-50 shadow-sm">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">No parts found matching your criteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg my-auto shadow-2xl animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Add Spare Part</h2>
                <p className="text-sm text-slate-500 font-medium">Link this component to existing assets</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-white hover:shadow-md rounded-full transition-all text-slate-400"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Part Specification Name</label>
                <input required type="text" placeholder="e.g. Oxygen Sensor Cell" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold" onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Current Quantity</label>
                  <input required type="number" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Min Alert Level</label>
                  <input required type="number" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" onChange={(e) => setFormData({...formData, minQuantity: Number(e.target.value)})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Unit Price (BDT)</label>
                  <input required type="number" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Authorized Supplier</label>
                  <select 
                    required 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-bold text-sm shadow-sm" 
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  >
                    <option value="">Choose Supplier...</option>
                    {vendors.map(v => <option key={v.id} value={v.companyName}>{v.companyName}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                  <Stethoscope size={14} className="mr-2 text-blue-600" /> Compatible Equipment List
                </label>
                <div className="max-h-44 overflow-y-auto p-5 bg-slate-50 border border-slate-200 rounded-3xl grid grid-cols-1 gap-2 shadow-inner">
                  {equipment.map(eq => (
                    <label key={eq.id} className={`flex items-center space-x-3 p-3 rounded-2xl border transition-all cursor-pointer ${formData.compatibility?.includes(eq.name) ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-transparent hover:border-slate-200'}`}>
                      <input 
                        type="checkbox" 
                        className="hidden"
                        checked={formData.compatibility?.includes(eq.name)}
                        onChange={() => handleCompatibilityChange(eq.name)}
                      />
                      <Package size={16} className={formData.compatibility?.includes(eq.name) ? 'text-white' : 'text-slate-300'} />
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold">{eq.name}</span>
                        <span className={`text-[9px] uppercase font-black ${formData.compatibility?.includes(eq.name) ? 'text-blue-100' : 'text-slate-400'}`}>{eq.model}</span>
                      </div>
                    </label>
                  ))}
                  {equipment.length === 0 && <p className="text-slate-400 text-xs italic p-2 text-center">No assets found in database.</p>}
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                 <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all">Cancel</button>
                 <button disabled={saving} type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 disabled:opacity-50 transition-all active:scale-95">
                  {saving ? 'Registering...' : 'Register to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpareParts;
