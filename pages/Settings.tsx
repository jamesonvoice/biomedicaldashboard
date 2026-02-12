
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Database, 
  Info, 
  Shield,
  Save,
  Key,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  Settings as SettingsIcon,
  Globe,
  HardDrive,
  Cpu,
  Smartphone
} from 'lucide-react';
import { updatePassword } from 'firebase/auth';
import { auth, DEFAULT_FIREBASE_CONFIG } from '../firebase';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'system'>('security');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  // System Configuration State
  const [configForm, setConfigForm] = useState(DEFAULT_FIREBASE_CONFIG);
  const [isConfigChanged, setIsConfigChanged] = useState(false);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('BIOMED_CUSTOM_CONFIG');
    if (saved) {
      setConfigForm(JSON.parse(saved));
    }
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords don't match!", type: 'error' });
      return;
    }
    if (!auth.currentUser) return;

    try {
      await updatePassword(auth.currentUser, newPassword);
      setMessage({ text: 'Password updated successfully!', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    }
  };

  const handleUpdateConfig = (key: keyof typeof DEFAULT_FIREBASE_CONFIG, value: string) => {
    setConfigForm(prev => ({ ...prev, [key]: value }));
    setIsConfigChanged(true);
  };

  const saveConfiguration = () => {
    localStorage.setItem('BIOMED_CUSTOM_CONFIG', JSON.stringify(configForm));
    setIsConfigChanged(false);
    setShowReloadPrompt(true);
  };

  const resetToDefaults = () => {
    if (confirm("Reset to factory defaults? This will clear your custom Firebase configuration.")) {
      localStorage.removeItem('BIOMED_CUSTOM_CONFIG');
      setConfigForm(DEFAULT_FIREBASE_CONFIG);
      setIsConfigChanged(false);
      setShowReloadPrompt(true);
    }
  };

  const reloadApp = () => {
    window.location.reload();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">System Parameters</h1>
           <p className="text-sm text-slate-500 font-medium">Manage security credentials and core infrastructure links</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-100">
        <button 
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <User size={18} /> <span>Admin Profile</span>
        </button>
        <button 
          onClick={() => setActiveTab('security')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Lock size={18} /> <span>Auth Security</span>
        </button>
        <button 
          onClick={() => setActiveTab('system')}
          className={`flex-1 flex items-center justify-center space-x-2 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'system' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Database size={18} /> <span>System Engine</span>
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
        {activeTab === 'security' && (
          <div className="p-10">
            <div className="flex items-center space-x-4 mb-10">
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl shadow-sm"><Shield size={28} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Access Integrity</h3>
                <p className="text-sm text-slate-500 font-medium">Rotate passwords regularly to maintain system security.</p>
              </div>
            </div>

            {message.text && (
              <div className={`mb-8 p-5 rounded-2xl text-sm font-bold flex items-center space-x-3 ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                {message.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Administrative Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold" placeholder="Minimum 8 characters" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold" placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" className="flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-200 active:scale-95"><Save size={18} /><span>Commit Updates</span></button>
            </form>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="p-10 space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-sm"><SettingsIcon size={28} /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">Engine Configuration</h3>
                  <p className="text-sm text-slate-500 font-medium">Link this interface to a specific Google Firebase environment.</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={resetToDefaults}
                  className="flex items-center space-x-2 px-6 py-3 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <RefreshCcw size={14} /> <span>Factory Reset</span>
                </button>
                <button 
                  onClick={saveConfiguration}
                  disabled={!isConfigChanged}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isConfigChanged ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                >
                  <Save size={14} /> <span>Apply Config</span>
                </button>
              </div>
            </div>

            {showReloadPrompt && (
              <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 animate-in slide-in-from-top-2">
                 <div className="flex items-center space-x-4">
                   <div className="p-3 bg-amber-200 text-amber-700 rounded-xl animate-pulse"><RefreshCcw size={20} /></div>
                   <p className="text-xs font-bold text-amber-800">System parameters updated. A complete application reload is required to establish a new database connection.</p>
                 </div>
                 <button onClick={reloadApp} className="px-6 py-3 bg-amber-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all">Reload Interface</button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center"><Key size={12} className="mr-1.5" /> API Key</label>
                   <input type="text" value={configForm.apiKey} onChange={e => handleUpdateConfig('apiKey', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center"><Globe size={12} className="mr-1.5" /> Auth Domain</label>
                   <input type="text" value={configForm.authDomain} onChange={e => handleUpdateConfig('authDomain', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center"><HardDrive size={12} className="mr-1.5" /> Project ID</label>
                   <input type="text" value={configForm.projectId} onChange={e => handleUpdateConfig('projectId', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center"><Database size={12} className="mr-1.5" /> Storage Bucket</label>
                   <input type="text" value={configForm.storageBucket} onChange={e => handleUpdateConfig('storageBucket', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                 </div>
               </div>
               
               <div className="space-y-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center"><Smartphone size={12} className="mr-1.5" /> Messaging Sender ID</label>
                   <input type="text" value={configForm.messagingSenderId} onChange={e => handleUpdateConfig('messagingSenderId', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center"><Cpu size={12} className="mr-1.5" /> App ID</label>
                   <input type="text" value={configForm.appId} onChange={e => handleUpdateConfig('appId', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center"><Info size={12} className="mr-1.5" /> Measurement ID</label>
                   <input type="text" value={configForm.measurementId} onChange={e => handleUpdateConfig('measurementId', e.target.value)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                 </div>
                 
                 <div className="p-6 bg-slate-900 rounded-3xl mt-8 text-white relative overflow-hidden">
                    <Shield className="absolute -right-4 -bottom-4 w-24 h-24 text-white opacity-[0.05]" />
                    <div className="relative z-10">
                      <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest mb-2">Technical Warning</p>
                      <p className="text-[11px] font-medium text-slate-300 leading-relaxed italic">
                        "Custom configurations are stored locally on this machine. If the provided credentials are invalid, the application may fail to authenticate or sync with the database."
                      </p>
                    </div>
                 </div>
               </div>
            </div>

            <div className="space-y-4 pt-10 border-t border-slate-50">
              <div className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-3"><Info className="text-slate-400" size={20} /><span className="text-slate-700 font-bold text-sm">System Build</span></div>
                <span className="text-slate-400 text-xs font-black uppercase">v1.2.4-stable</span>
              </div>
              <div className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center space-x-3"><Shield className="text-slate-400" size={20} /><span className="text-slate-700 font-bold text-sm">Real-time Connection Status</span></div>
                <span className="text-emerald-500 text-xs font-black uppercase tracking-widest flex items-center">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse" />
                  Authenticated & Live
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-10 text-center py-24 animate-in zoom-in-95 duration-500">
            <div className="h-32 w-32 bg-blue-100 rounded-[2.5rem] mx-auto flex items-center justify-center text-blue-600 text-4xl font-black mb-6 shadow-xl shadow-blue-50 border-4 border-white">
              {auth.currentUser?.email?.charAt(0).toUpperCase() || 'AD'}
            </div>
            <h3 className="text-2xl font-black text-slate-900">{auth.currentUser?.email || 'Administrator'}</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Authenticated Biomedical Engineer</p>
            <div className="mt-10 max-w-sm mx-auto p-6 bg-slate-50 rounded-3xl border border-slate-100">
               <p className="text-xs text-slate-500 leading-relaxed">System access is locked to this administrative profile. User roles and permissions can be managed via the primary Firebase console.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
