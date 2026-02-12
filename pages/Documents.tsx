
import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  Search, 
  Plus, 
  Grid, 
  List, 
  MoreVertical,
  Download,
  Trash2,
  Filter,
  X,
  Loader2
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { storage, db } from '../firebase';
import { Document } from '../types';

const Documents: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Document['category']>('Manual');

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'documents'));
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Document)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `documents/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadResult.ref);

      await addDoc(collection(db, 'documents'), {
        name: file.name,
        category,
        url,
        uploadDate: new Date().toISOString(),
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
      });

      setShowUpload(false);
      setFile(null);
      fetchDocs();
    } catch (err) {
      alert("Upload failed: " + err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this document?")) {
      await deleteDoc(doc(db, 'documents', id));
      fetchDocs();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Document Repository</h1>
        <button 
          onClick={() => setShowUpload(true)}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-200"
        >
          <Plus size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search repository..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <div className="col-span-full py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
          ) : documents.length > 0 ? (
            documents.map((doc) => (
              <div key={doc.id} className="border border-slate-100 p-4 rounded-xl hover:bg-slate-50 transition-colors relative group">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><File size={24} /></div>
                </div>
                <h4 className="text-sm font-bold text-slate-800 line-clamp-1 mb-1">{doc.name}</h4>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">{doc.category} • {new Date(doc.uploadDate).toLocaleDateString()}</p>
                
                <div className="absolute inset-0 bg-slate-900/80 rounded-xl flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100 transition-all">
                  <a href={doc.url} target="_blank" rel="noreferrer" className="p-2 bg-white rounded-full text-blue-600"><Download size={20} /></a>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 bg-white rounded-full text-red-600"><Trash2 size={20} /></button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-slate-400">No documents found.</div>
          )}
        </div>
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Upload to Storage</h2>
              <button onClick={() => setShowUpload(false)}><X size={20}/></button>
            </div>
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Category</label>
                <select value={category} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none" onChange={(e) => setCategory(e.target.value as any)}>
                  <option value="Manual">User Manual</option>
                  <option value="Certificate">Certificate</option>
                  <option value="Bill">Bill/Invoice</option>
                  <option value="Quotation">Quotation</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select File</label>
                <input required type="file" className="w-full" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <button disabled={uploading} type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg disabled:opacity-50">
                {uploading ? 'Processing...' : 'Upload to Cloud'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;
