
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ShieldCheck, 
  Wrench,
  Loader2,
  FileBadge,
  CreditCard,
  DollarSign,
  TrendingUp,
  Power,
  RefreshCcw,
  Zap,
  ShieldAlert,
  Package,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  X,
  ExternalLink,
  MapPin,
  Clock,
  AlertCircle,
  Building2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Equipment, ServiceLog, MaintenanceContract, PaymentReminder } from '../types';

const StatSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {children}
    </div>
  </div>
);

const ModernStatCard: React.FC<{ 
  label: string; 
  value: string | number; 
  count?: number;
  icon: React.ReactNode; 
  colorClass: string;
  subLabel?: string;
  trend?: string;
  onClick?: () => void;
}> = ({ label, value, count, icon, colorClass, subLabel, trend, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col h-full justify-between group ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}`}
  >
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10 flex items-center justify-center`}>
          {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md flex items-center">
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-slate-500 mb-0.5">{label}</p>
      <div className="flex items-baseline space-x-1.5">
        <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{value}</h4>
        {count !== undefined && count > 0 && (
          <span className="text-sm font-bold text-slate-400">({count})</span>
        )}
      </div>
    </div>
    {subLabel && (
      <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subLabel}</span>
        <ArrowUpRight size={12} className="text-slate-200 group-hover:text-blue-500 transition-colors" />
      </div>
    )}
  </div>
);

interface ModalConfig {
  title: string;
  subtitle: string;
  type: string;
  items: any[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalConfig | null>(null);

  const [rawItems, setRawItems] = useState({
    equipment: [] as Equipment[],
    logs: [] as ServiceLog[],
    contracts: [] as MaintenanceContract[],
    reminders: [] as PaymentReminder[]
  });

  const [stats, setStats] = useState({
    totalUnits: 0,
    running: 0,
    stopped: 0,
    needsService: 0,
    totalOutstanding: 0,
    totalOutstandingCount: 0,
    purchaseOutstanding: 0,
    purchaseOutstandingCount: 0,
    serviceOutstanding: 0,
    serviceOutstandingCount: 0,
    scheduledCount: 0,
    warrantyCount: 0,
    contractCount: 0,
    noCoverageCount: 0,
    chartData: [] as any[]
  });

  const fetchData = async () => {
    try {
      const [eqSnap, logSnap, mcSnap, remSnap] = await Promise.all([
        getDocs(collection(db, 'equipment')),
        getDocs(collection(db, 'serviceLogs')),
        getDocs(collection(db, 'maintenanceContracts')),
        getDocs(collection(db, 'paymentReminders'))
      ]);

      const equipment = eqSnap.docs.map(d => ({id: d.id, ...d.data()} as Equipment));
      const logs = logSnap.docs.map(d => ({id: d.id, ...d.data()} as ServiceLog));
      const contracts = mcSnap.docs.map(d => ({id: d.id, ...d.data()} as MaintenanceContract));
      const reminders = remSnap.docs.map(d => ({id: d.id, ...d.data()} as PaymentReminder));

      setRawItems({ equipment, logs, contracts, reminders });

      const now = new Date();
      const activeContracts = contracts.filter(c => new Date(c.endDate) >= now);

      const totalUnits = equipment.reduce((sum, e) => sum + (e.quantity || 1), 0);
      const running = equipment.filter(e => e.status === 'Operational').reduce((sum, e) => sum + (e.quantity || 1), 0);
      const stopped = equipment.filter(e => e.status === 'Down').reduce((sum, e) => sum + (e.quantity || 1), 0);
      const needsService = equipment.filter(e => e.status === 'Under Maintenance').reduce((sum, e) => sum + (e.quantity || 1), 0);

      const purchaseDebtItems = equipment.filter(e => (e.remainingAmount || 0) > 0);
      const serviceDebtItems = logs.filter(l => (l.remainingAmount || 0) > 0);

      const purchaseOut = purchaseDebtItems.reduce((sum, e) => sum + (e.remainingAmount || 0), 0);
      const serviceOut = serviceDebtItems.reduce((sum, l) => sum + (l.remainingAmount || 0), 0);
      
      const totalOut = purchaseOut + serviceOut;
      const scheduledCount = reminders.filter(r => r.status === 'Pending').length;

      const warrantyCount = equipment.filter(e => e.hasWarranty && e.warrantyExpiryDate && new Date(e.warrantyExpiryDate) >= now).length;
      const equipWithContracts = new Set(activeContracts.map(c => c.equipmentId));
      const contractCount = equipWithContracts.size;
      const noCoverage = equipment.filter(e => {
        const hasActiveWarranty = e.hasWarranty && e.warrantyExpiryDate && new Date(e.warrantyExpiryDate) >= now;
        const hasActiveContract = equipWithContracts.has(e.id);
        return !hasActiveWarranty && !hasActiveContract;
      }).length;

      setStats({
        totalUnits, running, stopped, needsService,
        totalOutstanding: totalOut,
        totalOutstandingCount: purchaseDebtItems.length + serviceDebtItems.length,
        purchaseOutstanding: purchaseOut,
        purchaseOutstandingCount: purchaseDebtItems.length,
        serviceOutstanding: serviceOut,
        serviceOutstandingCount: serviceDebtItems.length,
        scheduledCount,
        warrantyCount,
        contractCount,
        noCoverageCount: noCoverage,
        chartData: [
          { name: 'Assets', val: totalUnits, color: '#3b82f6' },
          { name: 'Protected', val: warrantyCount + contractCount, color: '#10b981' },
          { name: 'Gap', val: noCoverage, color: '#ef4444' }
        ]
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return (
    <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center space-y-2">
      <Loader2 className="animate-spin text-blue-600" size={32} />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Registry</p>
    </div>
  );

  const coveragePercent = stats.totalUnits > 0 ? Math.round(((stats.totalUnits - stats.noCoverageCount) / stats.totalUnits) * 100) : 0;

  const openList = (title: string, subtitle: string, type: string, items: any[]) => {
    setActiveModal({ title, subtitle, type, items });
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 animate-in fade-in duration-300">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Operational Command</h1>
          <p className="text-xs font-medium text-slate-500">Fleet health and fiscal liability oversight</p>
        </div>
        <button 
          onClick={() => navigate('/uptime-manager')} 
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-black transition-all flex items-center shadow-sm active:scale-95"
        >
          <Zap size={14} className="mr-2 fill-current" /> Manage Uptime
        </button>
      </header>

      {/* Tier 1: Asset Lifecycle */}
      <StatSection title="Asset Lifecycle">
        <ModernStatCard 
          label="Total Units" 
          value={stats.totalUnits} 
          icon={<Activity className="text-blue-600" />} 
          colorClass="bg-blue-600" 
          subLabel="Registry"
          onClick={() => openList("Total Units", "Complete clinical asset inventory", "equipment", rawItems.equipment)}
        />
        <ModernStatCard 
          label="Operational" 
          value={stats.running} 
          icon={<Zap className="text-emerald-600" />} 
          colorClass="bg-emerald-600" 
          subLabel="Online" 
          trend="Stable"
          onClick={() => openList("Operational Assets", "Active and running clinical units", "equipment", rawItems.equipment.filter(e => e.status === 'Operational'))}
        />
        <ModernStatCard 
          label="Stopped" 
          value={stats.stopped} 
          icon={<Power className="text-slate-600" />} 
          colorClass="bg-slate-600" 
          subLabel="Offline"
          onClick={() => openList("Stopped Assets", "Units currently powered down or inactive", "equipment", rawItems.equipment.filter(e => e.status === 'Down'))}
        />
        <ModernStatCard 
          label="Service Due" 
          value={stats.needsService} 
          icon={<RefreshCcw className="text-amber-600" />} 
          colorClass="bg-amber-600" 
          subLabel="Maintenance"
          onClick={() => openList("Assets Needing Service", "Machines currently under maintenance protocol", "equipment", rawItems.equipment.filter(e => e.status === 'Under Maintenance'))}
        />
      </StatSection>

      {/* Tier 2: Settlement & Debt */}
      <StatSection title="Settlement & Debt">
        <ModernStatCard 
          label="Total Outstanding" 
          value={`৳${stats.totalOutstanding.toLocaleString()}`} 
          count={stats.totalOutstandingCount}
          icon={<DollarSign className="text-red-600" />} 
          colorClass="bg-red-600" 
          subLabel="Liability"
          onClick={() => {
            const eqDebt = rawItems.equipment.filter(e => e.remainingAmount > 0).map(e => ({ ...e, type: 'Acquisition' }));
            const logDebt = rawItems.logs.filter(l => l.remainingAmount > 0).map(l => ({ ...l, type: 'Service' }));
            openList("Total Outstanding", "Combined acquisition and service liabilities", "debt_all", [...eqDebt, ...logDebt]);
          }}
        />
        <ModernStatCard 
          label="Acquisition" 
          value={`৳${stats.purchaseOutstanding.toLocaleString()}`} 
          count={stats.purchaseOutstandingCount}
          icon={<Package className="text-indigo-600" />} 
          colorClass="bg-indigo-600" 
          subLabel="CapEx"
          onClick={() => openList("Acquisition Debt", "Pending payments for equipment purchases", "debt_eq", rawItems.equipment.filter(e => e.remainingAmount > 0))}
        />
        <ModernStatCard 
          label="Service Debt" 
          value={`৳${stats.serviceOutstanding.toLocaleString()}`} 
          count={stats.serviceOutstandingCount}
          icon={<Wrench className="text-purple-600" />} 
          colorClass="bg-purple-600" 
          subLabel="OpEx"
          onClick={() => openList("Service Debt", "Outstanding bills for maintenance activities", "debt_logs", rawItems.logs.filter(l => l.remainingAmount > 0))}
        />
        <ModernStatCard 
          label="Scheduled" 
          value={stats.scheduledCount} 
          icon={<CreditCard className="text-slate-900" />} 
          colorClass="bg-slate-900" 
          subLabel="Payments"
          onClick={() => openList("Scheduled Payments", "Planned future settlement reminders", "reminders", rawItems.reminders.filter(r => r.status === 'Pending'))}
        />
      </StatSection>

      {/* Tier 3: Coverage Gap */}
      <StatSection title="Coverage & Compliance">
        <ModernStatCard 
          label="OEM Warranty" 
          value={stats.warrantyCount} 
          icon={<ShieldCheck className="text-emerald-600" />} 
          colorClass="bg-emerald-600" 
          subLabel="Manufacturer"
          onClick={() => {
            const now = new Date();
            openList("OEM Warranty Status", "Assets under manufacturer protection", "warranty", rawItems.equipment.filter(e => e.hasWarranty && e.warrantyExpiryDate && new Date(e.warrantyExpiryDate) >= now));
          }}
        />
        <ModernStatCard 
          label="Agreements" 
          value={stats.contractCount} 
          icon={<FileBadge className="text-blue-600" />} 
          colorClass="bg-blue-600" 
          subLabel="AMC / CMC"
          onClick={() => {
             const now = new Date();
             openList("Active Maintenance Contracts", "Valid third-party service agreements", "contracts", rawItems.contracts.filter(c => new Date(c.endDate) >= now));
          }}
        />
        <ModernStatCard 
          label="Coverage Gap" 
          value={stats.noCoverageCount} 
          icon={<ShieldAlert className="text-red-600" />} 
          colorClass="bg-red-600" 
          subLabel="Risk Assets"
          onClick={() => {
            const now = new Date();
            const equipWithContracts = new Set(rawItems.contracts.filter(c => new Date(c.endDate) >= now).map(c => c.equipmentId));
            const gaps = rawItems.equipment.filter(e => {
              const hasActiveWarranty = e.hasWarranty && e.warrantyExpiryDate && new Date(e.warrantyExpiryDate) >= now;
              const hasActiveContract = equipWithContracts.has(e.id);
              return !hasActiveWarranty && !hasActiveContract;
            });
            openList("Protection Gap Audit", "Assets currently without any professional coverage", "equipment", gaps);
          }}
        />
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm h-full flex flex-col justify-between group overflow-hidden relative">
          <TrendingUp className="absolute -right-2 -bottom-2 text-white opacity-[0.03] w-20 h-20 rotate-12" />
          <div>
            <p className="text-[10px] font-bold text-slate-400 mb-0.5 uppercase tracking-wider">Aggregate Index</p>
            <h4 className="text-2xl font-bold text-white tracking-tight">{coveragePercent}%</h4>
          </div>
          <div className="mt-2">
            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mb-1.5">
              <div 
                className="bg-blue-500 h-full transition-all duration-1000" 
                style={{ width: `${coveragePercent}%` }} 
              />
            </div>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Institution Health</span>
          </div>
        </div>
      </StatSection>

      {/* Analytics & Advisory Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pb-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center uppercase tracking-wider">
              <TrendingUp className="text-blue-600 mr-2" size={14} /> Security Distribution
            </h3>
            <button onClick={() => navigate('/reports')} className="text-[10px] font-bold text-blue-600 hover:underline flex items-center uppercase tracking-widest">
              Report <ChevronRight size={12} className="ml-1" />
            </button>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer>
              <BarChart data={stats.chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#cbd5e1'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px'}} 
                />
                <Bar dataKey="val" radius={[4, 4, 0, 0]} barSize={32}>
                  {stats.chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Pulse</h3>
            <div className="grid grid-cols-1 gap-2">
              {stats.noCoverageCount > 0 && (
                <div onClick={() => {
                  const now = new Date();
                  const equipWithContracts = new Set(rawItems.contracts.filter(c => new Date(c.endDate) >= now).map(c => c.equipmentId));
                  const gaps = rawItems.equipment.filter(e => {
                    const hasActiveWarranty = e.hasWarranty && e.warrantyExpiryDate && new Date(e.warrantyExpiryDate) >= now;
                    const hasActiveContract = equipWithContracts.has(e.id);
                    return !hasActiveWarranty && !hasActiveContract;
                  });
                  openList("Protection Gap Audit", "Assets without coverage", "equipment", gaps);
                }} className="flex items-center p-2 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors group">
                  <ShieldAlert className="text-red-500 mr-3 shrink-0" size={16} />
                  <p className="text-[11px] font-medium text-red-800 leading-snug">
                    <span className="font-bold">{stats.noCoverageCount} units</span> lack active coverage.
                  </p>
                </div>
              )}
              {stats.stopped > 0 && (
                <div onClick={() => openList("Stopped Assets", "Units currently offline", "equipment", rawItems.equipment.filter(e => e.status === 'Down'))} className="flex items-center p-2 bg-slate-900 rounded-lg text-white cursor-pointer hover:bg-black transition-colors group">
                  <Power className="text-slate-400 mr-3 shrink-0" size={16} />
                  <p className="text-[11px] font-medium leading-snug">
                    <span className="font-bold text-blue-400">{stats.stopped} machines</span> are deactivated.
                  </p>
                </div>
              )}
              {stats.needsService > 0 && (
                <div onClick={() => openList("Maintenance Log", "Under maintenance", "equipment", rawItems.equipment.filter(e => e.status === 'Under Maintenance'))} className="flex items-center p-2 bg-amber-50 border border-amber-100 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors group">
                  <RefreshCcw className="text-amber-600 mr-3 shrink-0" size={16} />
                  <p className="text-[11px] font-medium text-amber-800 leading-snug">
                    Maintenance due for <span className="font-bold">{stats.needsService} assets</span>.
                  </p>
                </div>
              )}
              {!stats.noCoverageCount && !stats.stopped && !stats.needsService && (
                <div className="flex items-center p-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <CheckCircle2 className="text-emerald-500 mr-3 shrink-0" size={16} />
                  <p className="text-[11px] font-medium text-emerald-800 leading-snug">All systems reporting stable.</p>
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
            <span>Build v1.2.4-stable</span>
            <span className="text-emerald-600 flex items-center">
              <div className="w-1 h-1 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
              Authenticated
            </span>
          </div>
        </div>
      </div>

      {/* Logic for Modal Content Rendering */}
      {activeModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[70] p-4 backdrop-blur-md overflow-y-auto">
           <div className="bg-white rounded-3xl w-full max-w-4xl my-auto shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                 <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">{activeModal.title}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase mt-0.5 tracking-wider">{activeModal.subtitle}</p>
                 </div>
                 <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-white rounded-full text-slate-400 transition-all border border-slate-100 shadow-sm">
                   <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                 {activeModal.items.length > 0 ? (
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            {activeModal.type === 'equipment' || activeModal.type === 'warranty' || activeModal.type === 'gap' ? (
                              <>
                                <th className="py-3 px-4">Identification</th>
                                <th className="py-3 px-4">Brand/Model</th>
                                <th className="py-3 px-4">{activeModal.type === 'warranty' ? 'Expiry' : 'Location'}</th>
                                <th className="py-3 px-4 text-right">Action</th>
                              </>
                            ) : activeModal.type === 'debt_eq' || activeModal.type === 'debt_logs' || activeModal.type === 'debt_all' ? (
                              <>
                                <th className="py-3 px-4">Source</th>
                                <th className="py-3 px-4">Provider</th>
                                <th className="py-3 px-4 text-right">Balance Due</th>
                                <th className="py-3 px-4 text-right">Action</th>
                              </>
                            ) : activeModal.type === 'reminders' ? (
                              <>
                                <th className="py-3 px-4">Beneficiary</th>
                                <th className="py-3 px-4">Scheduled Date</th>
                                <th className="py-3 px-4 text-right">Amount</th>
                                <th className="py-3 px-4 text-right">Action</th>
                              </>
                            ) : activeModal.type === 'contracts' ? (
                              <>
                                <th className="py-3 px-4">Provider</th>
                                <th className="py-3 px-4">Agreement</th>
                                <th className="py-3 px-4">Validity</th>
                                <th className="py-3 px-4 text-right">Action</th>
                              </>
                            ) : null}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {activeModal.items.map((item, idx) => (
                           <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                              {(activeModal.type === 'equipment' || activeModal.type === 'warranty' || activeModal.type === 'gap') && (
                                <>
                                  <td className="py-3 px-4">
                                     <p className="text-xs font-black text-slate-900">{item.name}</p>
                                     <p className="text-[9px] font-bold text-slate-400">SN: {item.serialNumber}</p>
                                  </td>
                                  <td className="py-3 px-4">
                                     <p className="text-xs font-medium text-slate-600">{item.brand} • {item.model}</p>
                                  </td>
                                  <td className="py-3 px-4">
                                     {activeModal.type === 'warranty' ? (
                                       <div className="flex items-center space-x-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                          <p className="text-xs font-black text-slate-700">{item.warrantyExpiryDate}</p>
                                       </div>
                                     ) : (
                                       <div className="flex items-center text-xs text-slate-500">
                                          <MapPin size={12} className="mr-1 opacity-40" /> {item.location}
                                       </div>
                                     )}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                     <button 
                                       onClick={() => { setActiveModal(null); navigate(`/equipment/${item.id}`); }}
                                       className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center"
                                     >
                                        <ExternalLink size={14} />
                                     </button>
                                  </td>
                                </>
                              )}

                              {(activeModal.type === 'debt_eq' || activeModal.type === 'debt_logs' || activeModal.type === 'debt_all') && (
                                <>
                                  <td className="py-3 px-4">
                                     <div className="flex items-center space-x-2">
                                       {item.type === 'Acquisition' || activeModal.type === 'debt_eq' ? <Package size={14} className="text-indigo-400"/> : <Wrench size={14} className="text-blue-400"/>}
                                       <p className="text-xs font-black text-slate-900">{item.name || item.equipmentName}</p>
                                     </div>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.type || (activeModal.type === 'debt_eq' ? 'Acquisition' : 'Service Settlement')}</p>
                                  </td>
                                  <td className="py-3 px-4">
                                     <p className="text-xs font-bold text-slate-600 flex items-center"><Building2 size={12} className="mr-1.5 opacity-40" /> {item.provider || item.supplierName || item.companyName}</p>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                     <p className="text-xs font-black text-red-600 tracking-tight">৳{item.remainingAmount?.toLocaleString()}</p>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                     <button 
                                       onClick={() => { setActiveModal(null); navigate(`/payments`); }}
                                       className="text-[9px] font-black uppercase text-blue-600 hover:underline"
                                     >
                                        Settle Account
                                     </button>
                                  </td>
                                </>
                              )}

                              {activeModal.type === 'reminders' && (
                                <>
                                  <td className="py-3 px-4">
                                     <p className="text-xs font-black text-slate-900">{item.name}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center mt-0.5"><Building2 size={10} className="mr-1"/> {item.provider}</p>
                                  </td>
                                  <td className="py-3 px-4">
                                     <div className="flex items-center text-xs text-slate-700 font-black">
                                        <Clock size={12} className="mr-1.5 text-indigo-400" /> {item.scheduledDate}
                                     </div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                     <p className="text-xs font-black text-slate-900">৳{item.amountToPay?.toLocaleString()}</p>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                     <button 
                                       onClick={() => { setActiveModal(null); navigate(`/payments`); }}
                                       className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center"
                                     >
                                        <ExternalLink size={14} />
                                     </button>
                                  </td>
                                </>
                              )}

                              {activeModal.type === 'contracts' && (
                                <>
                                  <td className="py-3 px-4">
                                     <p className="text-xs font-black text-slate-900">{item.companyName}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase">Target: {item.equipmentName}</p>
                                  </td>
                                  <td className="py-3 px-4">
                                     <span className={`px-2 py-0.5 rounded text-[8px] font-black border ${item.type === 'CMC' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                        {item.type}
                                     </span>
                                  </td>
                                  <td className="py-3 px-4">
                                     <p className="text-xs font-bold text-slate-700">{item.endDate}</p>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                     <button 
                                       onClick={() => { setActiveModal(null); navigate(`/equipment/${item.equipmentId}`); }}
                                       className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center"
                                     >
                                        <ExternalLink size={14} />
                                     </button>
                                  </td>
                                </>
                              )}
                           </tr>
                         ))}
                      </tbody>
                   </table>
                 ) : (
                   <div className="py-20 text-center flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4 border-4 border-dashed border-slate-100"><Activity size={32} /></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No active records found for this protocol.</p>
                   </div>
                 )}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex justify-center shrink-0">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <AlertCircle size={10} className="mr-1.5" /> Institutional Analytical Dataset • v1.2.4-stable
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
