
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  PieChart as ChartIcon, 
  ArrowRight, 
  TrendingUp, 
  DollarSign, 
  Printer, 
  X, 
  Loader2, 
  Stethoscope, 
  Check, 
  ChevronDown, 
  Search, 
  Layers, 
  Circle, 
  ShieldCheck, 
  Package, 
  Zap, 
  ShieldAlert,
  FileBadge,
  Wrench,
  AlertTriangle,
  History,
  Activity,
  CheckCircle2,
  MapPin,
  Calendar,
  Building2,
  Tag,
  Clock,
  ExternalLink,
  Info,
  CreditCard
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Equipment, ServiceLog, MaintenanceContract, SparePart } from '../types';

const Reports: React.FC = () => {
  // Modal Visibility States
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Data States
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [serviceLogs, setServiceLogs] = useState<ServiceLog[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [maintenanceContracts, setMaintenanceContracts] = useState<MaintenanceContract[]>([]);
  const [loading, setLoading] = useState(false);

  // Selection & Search States
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Initial Fetch Helper
  const ensureBasicData = async () => {
    if (equipment.length === 0) {
      setLoading(true);
      try {
        const [eqSnap, logsSnap, partsSnap, contractsSnap] = await Promise.all([
          getDocs(collection(db, 'equipment')),
          getDocs(collection(db, 'serviceLogs')),
          getDocs(collection(db, 'spareParts')),
          getDocs(collection(db, 'maintenanceContracts'))
        ]);
        setEquipment(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipment)));
        setServiceLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceLog)));
        setSpareParts(partsSnap.docs.map(d => ({ id: d.id, ...d.data() } as SparePart)));
        setMaintenanceContracts(contractsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceContract)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOpenReport = async (type: string) => {
    await ensureBasicData();
    // For Individual Machine Report, we default to no selection to force search if preferred, 
    // or we can select all. Let's select all by default but make the selection prominent.
    if (selectedMachineIds.length === 0) {
      setSelectedMachineIds(equipment.map(e => e.id));
    }
    setActiveModal(type);
  };

  const handlePrint = () => {
    window.print();
  };

  // Grouping & Filtering Logic
  const assetGroups = useMemo(() => {
    const groups: Record<string, Equipment[]> = {};
    equipment.forEach(e => {
      const gName = e.groupName || 'Standalone Assets';
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(e);
    });
    return groups;
  }, [equipment]);

  const toggleGroupSelection = (groupName: string) => {
    const groupMachines = assetGroups[groupName] || [];
    const groupMachineIds = groupMachines.map(m => m.id);
    const allSelected = groupMachineIds.every(id => selectedMachineIds.includes(id));
    if (allSelected) {
      setSelectedMachineIds(prev => prev.filter(id => !groupMachineIds.includes(id)));
    } else {
      setSelectedMachineIds(prev => [...new Set([...prev, ...groupMachineIds])]);
    }
  };

  const filteredGroupsForDropdown = useMemo(() => {
    if (!dropdownSearch) return assetGroups;
    const result: Record<string, Equipment[]> = {};
    const searchLower = dropdownSearch.toLowerCase();
    Object.keys(assetGroups).forEach(groupName => {
      const groupMatches = groupName.toLowerCase().includes(searchLower);
      const matchingMachines = assetGroups[groupName].filter(m => 
        m.name.toLowerCase().includes(searchLower) || m.serialNumber?.toLowerCase().includes(searchLower)
      );
      if (groupMatches || matchingMachines.length > 0) {
        result[groupName] = groupMatches ? assetGroups[groupName] : matchingMachines;
      }
    });
    return result;
  }, [assetGroups, dropdownSearch]);

  // Derived Data for Reports
  const filteredEquipment = equipment.filter(e => selectedMachineIds.includes(e.id));
  
  const currentMonthLogs = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return serviceLogs.filter(log => {
      const logDate = new Date(log.date);
      return logDate >= startOfMonth && selectedMachineIds.includes(log.equipmentId);
    });
  }, [serviceLogs, selectedMachineIds]);

  const financialHistoryData = useMemo(() => {
    return filteredEquipment.map(e => ({
      ...e,
      totalSpent: (Number(e.purchasePrice) || 0) * (e.quantity || 1),
      paid: (Number(e.paidAmount) || 0),
      due: (Number(e.remainingAmount) || 0)
    }));
  }, [filteredEquipment]);

  const costAnalysisData = useMemo(() => {
    return filteredEquipment.map(e => {
      const logs = serviceLogs.filter(l => l.equipmentId === e.id);
      const totalServiceCost = logs.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
      const purchaseTotal = (Number(e.purchasePrice) || 0) * (e.quantity || 1);
      return {
        ...e,
        purchaseTotal,
        totalServiceCost,
        grandTotal: purchaseTotal + totalServiceCost
      };
    }).sort((a, b) => b.grandTotal - a.grandTotal);
  }, [filteredEquipment, serviceLogs]);

  const breakdownFrequencyData = useMemo(() => {
    return filteredEquipment.map(e => {
      const logs = serviceLogs.filter(l => l.equipmentId === e.id);
      const breakdownCount = logs.filter(l => l.type === 'Corrective').length;
      const pmCount = logs.filter(l => l.type === 'Preventive').length;
      return { ...e, breakdownCount, pmCount };
    }).sort((a, b) => b.breakdownCount - a.breakdownCount);
  }, [filteredEquipment, serviceLogs]);

  const sparePartUsageData = useMemo(() => {
    const usageMap: Record<string, { count: number, machines: Set<string> }> = {};
    serviceLogs.forEach(log => {
      if (selectedMachineIds.includes(log.equipmentId)) {
        log.partsReplaced?.forEach(partName => {
          if (!usageMap[partName]) usageMap[partName] = { count: 0, machines: new Set() };
          usageMap[partName].count += 1;
          usageMap[partName].machines.add(log.equipmentName);
        });
      }
    });
    return Object.entries(usageMap).map(([name, data]) => {
      const partInfo = spareParts.find(p => p.name === name);
      return { name, count: data.count, machineCount: data.machines.size, stock: partInfo?.quantity || 0, price: partInfo?.price || 0 };
    }).sort((a, b) => b.count - a.count);
  }, [serviceLogs, spareParts, selectedMachineIds]);

  const warrantyReportData = useMemo(() => {
    return filteredEquipment.map(e => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const hasWarranty = !!e.hasWarranty;
      const warrantyExpiry = e.warrantyExpiryDate ? new Date(e.warrantyExpiryDate) : null;
      const isWarrantyActive = hasWarranty && warrantyExpiry && warrantyExpiry >= now;
      const activeContract = maintenanceContracts
        .filter(c => c.equipmentId === e.id)
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0];
      const contractExpiry = activeContract ? new Date(activeContract.endDate) : null;
      const isContractActive = activeContract && contractExpiry && contractExpiry >= now;
      const daysRemaining = contractExpiry 
        ? Math.ceil((contractExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
        : null;
      return {
        ...e,
        hasWarranty,
        isWarrantyActive,
        warrantyExpiry: e.warrantyExpiryDate,
        activeContract,
        isContractActive,
        contractExpiry: activeContract?.endDate,
        daysRemaining
      };
    });
  }, [filteredEquipment, maintenanceContracts]);

  const reportTypes = [
    { title: 'Individual Machine Report', description: 'Complete 360° lifecycle dossier for specific assets: Full technical profile, comprehensive payment history, service logs, and compliance audit.', icon: <Stethoscope className="text-blue-600" />, action: () => handleOpenReport('Individual Machine Report') },
    { title: 'Financial History', description: 'Comprehensive audit of machine acquisitions, payments, and outstanding liabilities.', icon: <DollarSign className="text-indigo-600" />, action: () => handleOpenReport('Financial History') },
    { title: 'Warranty & Coverage Report', description: 'Track active manufacturer warranties and third-party maintenance contracts across the fleet.', icon: <ShieldCheck className="text-emerald-600" />, action: () => handleOpenReport('Warranty & Coverage Report') },
    { title: 'Monthly Maintenance Summary', description: 'Overview of all PM and CM activities for the current month.', icon: <FileText className="text-blue-500" />, action: () => handleOpenReport('Monthly Maintenance Summary') },
    { title: 'Equipment Cost Analysis', description: 'Detailed breakdown of purchase, maintenance, and parts costs.', icon: <TrendingUp className="text-orange-600" />, action: () => handleOpenReport('Equipment Cost Analysis') },
    { title: 'Breakdown Frequency', description: 'Identify problematic equipment with high failure rates.', icon: <Zap className="text-red-600" />, action: () => handleOpenReport('Breakdown Frequency') },
    { title: 'Spare Parts Usage', description: 'Track consumption of consumables and spare parts.', icon: <Package className="text-purple-600" />, action: () => handleOpenReport('Spare Parts Usage') },
  ];

  const SelectionDropdown = () => (
    <div className="relative no-print">
      <button 
        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
        className="flex items-center justify-between space-x-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:border-blue-400 transition-all min-w-[280px]"
      >
        <div className="flex items-center">
          <Search size={14} className="mr-2 text-slate-400" />
          <span>{selectedMachineIds.length === equipment.length ? 'All Assets Selected' : `${selectedMachineIds.length} Assets Selected`}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showFilterDropdown && (
        <div className="absolute right-0 z-[80] mt-2 w-full md:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl animate-in fade-in slide-in-from-top-2 overflow-hidden flex flex-col max-h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                autoFocus
                type="text" 
                placeholder="Search machine name, SN or group..." 
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                value={dropdownSearch}
                onChange={(e) => setDropdownSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-4">
            {Object.keys(filteredGroupsForDropdown).map(groupName => {
              const groupMachines = filteredGroupsForDropdown[groupName];
              const groupIds = groupMachines.map(m => m.id);
              const isGroupFull = groupIds.every(id => selectedMachineIds.includes(id));
              const isGroupPartial = !isGroupFull && groupIds.some(id => selectedMachineIds.includes(id));
              return (
                <div key={groupName} className="space-y-1">
                  <div onClick={() => toggleGroupSelection(groupName)} className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all ${isGroupFull ? 'bg-blue-50 text-blue-700 font-black' : 'hover:bg-slate-50 text-slate-400 font-bold'}`}>
                    <div className="flex items-center space-x-2">
                      <Layers size={14} className={isGroupFull || isGroupPartial ? 'text-blue-600' : 'text-slate-300'} />
                      <span className="text-[10px] uppercase tracking-wider truncate max-w-[200px]">{groupName}</span>
                    </div>
                    {isGroupFull ? <Check size={14} /> : isGroupPartial ? <Circle size={10} fill="currentColor" className="text-blue-300" /> : null}
                  </div>
                  <div className="pl-6 space-y-0.5">
                    {groupMachines.map(e => (
                      <div key={e.id} onClick={() => setSelectedMachineIds(prev => prev.includes(e.id) ? prev.filter(i => i !== e.id) : [...prev, e.id])} className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${selectedMachineIds.includes(e.id) ? 'bg-blue-50/50 text-blue-600 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
                        <span className="text-[11px] truncate mr-2">{e.name}</span>
                        {selectedMachineIds.includes(e.id) && <Check size={12} />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {Object.keys(filteredGroupsForDropdown).length === 0 && (
              <p className="py-10 text-center text-slate-400 text-xs italic font-bold">No assets match your search.</p>
            )}
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-between">
            <button onClick={() => setSelectedMachineIds([])} className="text-[9px] font-black uppercase text-red-600 hover:underline">Clear Selection</button>
            <button onClick={() => setSelectedMachineIds(equipment.map(e => e.id))} className="text-[9px] font-black uppercase text-blue-600 hover:underline">Select All Assets</button>
          </div>
        </div>
      )}
    </div>
  );

  const ReportModal = ({ title, children, icon: Icon }: any) => (
    <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[70] p-4 backdrop-blur-2xl overflow-y-auto no-print">
      <div className="bg-white rounded-[3rem] w-full max-w-6xl my-auto shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 rounded-t-[3rem] gap-6 sticky top-0 z-[81]">
          <div className="flex items-center space-x-4">
             <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                <Icon size={24} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">{title}</h2>
                <p className="text-sm text-slate-500 font-medium">Internal Intelligence Dossier</p>
             </div>
          </div>
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <SelectionDropdown />
            <button onClick={handlePrint} className="flex items-center justify-center space-x-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"><Printer size={16} /><span>Print Dossier</span></button>
            <button onClick={() => setActiveModal(null)} className="p-3 hover:bg-white rounded-full text-slate-400 border border-slate-100"><X size={24}/></button>
          </div>
        </div>
        <div id="printable-report" className="p-10 md:p-16">
           <div className="hidden print:flex justify-between items-end border-b-8 border-slate-900 pb-8 mb-12">
              <div>
                 <p className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Institutional Asset Intelligence</p>
                 <h1 className="text-4xl font-black text-slate-900 uppercase leading-none">{title}</h1>
                 <p className="text-slate-500 font-bold mt-2 uppercase tracking-widest">BioMed Pro Infrastructure • Audit Ref: BDP-{new Date().getFullYear()}-{Math.floor(Math.random() * 1000)}</p>
              </div>
              <div className="text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Generated date</p>
                 <p className="text-sm font-black text-slate-900">{new Date().toLocaleString()}</p>
                 <div className="mt-2 flex justify-end items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="text-[9px] font-black uppercase text-slate-400">Validated Production Sync</span>
                 </div>
              </div>
           </div>
           {children}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Intelligence Command</h1>
          <p className="text-sm text-slate-500 font-medium tracking-tight">Extract institutional dossiers and analyze financial liabilities</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        {reportTypes.map((report, idx) => (
          <div 
            key={idx} 
            onClick={() => report.action()}
            className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-start space-x-6 hover:shadow-xl hover:-translate-y-1 transition-all group relative cursor-pointer"
          >
            <div className="bg-slate-50 p-5 rounded-2xl group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
              {report.icon}
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-1 text-lg">{report.title}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2 leading-relaxed">{report.description}</p>
              <div className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
                Execute Data Generation <ArrowRight size={14} className="ml-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 1. Individual Machine Report - HIGHLY ENHANCED */}
      {activeModal === 'Individual Machine Report' && (
        <ReportModal title="Asset Clinical Dossier" icon={Stethoscope}>
          <div className="space-y-16">
            {filteredEquipment.length > 0 ? filteredEquipment.map(e => {
              const logs = serviceLogs.filter(l => l.equipmentId === e.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const activeContract = maintenanceContracts.find(c => c.equipmentId === e.id && new Date(c.endDate) >= new Date());
              
              // Calculate cumulative maintenance cost
              const totalServiceInvestment = logs.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);
              const acquisitionTotal = (Number(e.purchasePrice) || 0) * (e.quantity || 1);
              
              // Aggregate all payments (Acquisition + Service)
              const acquisitionPayments = e.paymentHistory || [];
              const servicePayments = logs.flatMap(l => l.paymentHistory || []).map(p => ({ ...p, type: 'Service Activity' }));
              const fullPaymentTimeline = [
                ...acquisitionPayments.map(p => ({ ...p, type: 'Acquisition Settlement' })),
                ...servicePayments
              ].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <div key={e.id} className="page-break-after border-b-2 border-slate-100 last:border-0 pb-16">
                  {/* Part 1: Identity & Header */}
                  <div className="flex flex-col md:flex-row justify-between gap-10 mb-12">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3">
                         <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Stethoscope size={24}/></div>
                         <div>
                            <h2 className="text-3xl font-black text-slate-900 leading-tight">{e.name}</h2>
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Clinical Identification Profile</p>
                         </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1.5 bg-slate-900 text-white text-[9px] font-black uppercase rounded-lg tracking-widest">SN: {e.serialNumber}</span>
                        <span className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-lg border border-blue-100">Model: {e.model}</span>
                        <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase rounded-lg border border-indigo-100">Dept: {e.location}</span>
                        <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border ${e.status === 'Operational' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{e.status}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:text-right">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration Date</p>
                          <p className="text-sm font-black text-slate-900">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : 'Historical Entry'}</p>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Manufacturer</p>
                          <p className="text-sm font-black text-slate-900">{e.manufacturer || 'OEM Specified'}</p>
                       </div>
                    </div>
                  </div>

                  {/* Part 2: Technical & Protection Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                     <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><Info size={14} className="mr-2" /> Technical Information</h4>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold">Installation</span>
                              <span className="text-slate-900 font-black">{e.installationDate || e.purchaseDate}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold">Lifecycle</span>
                              <span className="text-slate-900 font-black">{e.expectedLifecycle || 'N/A'} Years</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold">Group</span>
                              <span className="text-slate-900 font-black">{e.groupName || 'Standalone'}</span>
                           </div>
                        </div>
                     </div>

                     <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><ShieldCheck size={14} className="mr-2" /> Warranty & License</h4>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold">OEM Warranty</span>
                              <span className={`font-black ${e.hasWarranty ? 'text-emerald-600' : 'text-slate-400'}`}>{e.hasWarranty ? (e.warrantyExpiryDate || 'Active') : 'No coverage'}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold">License Reqd</span>
                              <span className="text-slate-900 font-black">{e.licenseRequired ? 'YES' : 'NO'}</span>
                           </div>
                           {e.licenseRequired && (
                             <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                                <span className="text-slate-500 font-bold truncate max-w-[100px]">{e.licenseInfo?.name}</span>
                                <span className="text-blue-600 font-black">{e.licenseInfo?.expiryDate}</span>
                             </div>
                           )}
                        </div>
                     </div>

                     <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center"><FileBadge size={14} className="mr-2" /> Active Agreement</h4>
                        {activeContract ? (
                          <div className="space-y-4">
                             <div className="flex items-center space-x-3 mb-2">
                               <div className="px-2 py-0.5 bg-blue-600 text-white text-[8px] font-black uppercase rounded">{activeContract.type}</div>
                               <p className="text-sm font-black text-slate-900 truncate">{activeContract.companyName}</p>
                             </div>
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold">Valid Until</span>
                                <span className="text-slate-900 font-black">{activeContract.endDate}</span>
                             </div>
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500 font-bold">Contract Value</span>
                                <span className="text-slate-900 font-black">BDT {(activeContract.amount || 0).toLocaleString()}</span>
                             </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center py-4">
                             <p className="text-[10px] font-black text-slate-400 uppercase italic">No Active Service Contract</p>
                          </div>
                        )}
                     </div>
                  </div>

                  {/* Part 3: Financial Summary & Ledger */}
                  <div className="mb-12">
                     <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-600 pl-4 mb-6">Financial Audit & Liabilities</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                           <DollarSign className="absolute -right-4 -bottom-4 w-32 h-32 text-white opacity-[0.03]" />
                           <div className="grid grid-cols-2 gap-10">
                              <div>
                                 <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Acquisition Cost</p>
                                 <p className="text-2xl font-black">BDT {acquisitionTotal.toLocaleString()}</p>
                              </div>
                              <div>
                                 <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Lifetime Maint.</p>
                                 <p className="text-2xl font-black text-blue-400">BDT {totalServiceInvestment.toLocaleString()}</p>
                              </div>
                              <div className="col-span-2 pt-6 border-t border-white/10 flex justify-between items-end">
                                 <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Aggregate Outstanding Due</p>
                                    <p className="text-4xl font-black text-red-500 tracking-tighter">BDT {(e.remainingAmount + logs.reduce((a,c) => a + (Number(c.remainingAmount) || 0), 0)).toLocaleString()}</p>
                                 </div>
                                 <span className="text-[9px] font-black bg-white/10 px-3 py-1.5 rounded-full uppercase tracking-widest text-slate-400">Financial Liability</span>
                              </div>
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><CreditCard size={14} className="mr-2" /> Recent Settlement Timeline</h4>
                           <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2">
                             {fullPaymentTimeline.length > 0 ? fullPaymentTimeline.map((pay, pIdx) => (
                               <div key={pIdx} className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center hover:bg-slate-50 transition-colors">
                                  <div>
                                     <p className="text-xs font-black text-slate-900">BDT {(pay.amount || 0).toLocaleString()}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase">{pay.date} • {pay.method}</p>
                                  </div>
                                  <div className="text-right">
                                     <span className="text-[8px] font-black bg-slate-100 px-2 py-1 rounded-full uppercase tracking-tighter text-slate-500">{pay.type}</span>
                                  </div>
                               </div>
                             )) : (
                               <p className="text-xs text-slate-400 italic py-10 text-center">No payment history found in system records.</p>
                             )}
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Part 4: Service Chronology */}
                  <div className="mb-12">
                     <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest border-l-4 border-blue-600 pl-4 mb-6">Service Maintenance Chronology</h3>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                           <thead>
                              <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                                 <th className="px-6 py-4">Event Date</th>
                                 <th className="px-6 py-4">Service Type</th>
                                 <th className="px-6 py-4">Eng / Company</th>
                                 <th className="px-6 py-4">Brief Work Description</th>
                                 <th className="px-6 py-4 text-right">Cost (BDT)</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {logs.length > 0 ? logs.map(log => (
                                <tr key={log.id} className="bg-white hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 text-xs font-bold text-slate-600 whitespace-nowrap">{log.date}</td>
                                  <td className="px-6 py-4">
                                     <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.type === 'Preventive' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{log.type}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                     <p className="text-xs font-black text-slate-900 leading-tight">{log.technicianName}</p>
                                     <p className="text-[9px] font-bold text-slate-400 uppercase truncate max-w-[120px]">{log.companyName || 'Individual'}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                     <p className="text-xs text-slate-600 line-clamp-2 italic leading-relaxed">"{log.description}"</p>
                                  </td>
                                  <td className="px-6 py-4 text-right text-xs font-black">{(Number(log.cost) || 0).toLocaleString()}</td>
                                </tr>
                              )) : (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-400 italic">No maintenance history recorded for this clinical asset.</td></tr>
                              )}
                           </tbody>
                        </table>
                     </div>
                  </div>

                  {/* Part 5: Internal Remarks & Footer */}
                  <div className="p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100/50 flex items-start space-x-6">
                    <div className="p-3 bg-white rounded-2xl border border-blue-200 text-blue-600 shadow-sm"><Info size={20}/></div>
                    <div>
                       <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Administrative Remarks</h4>
                       <p className="text-sm text-slate-600 font-medium leading-relaxed">{e.notes || "No special administrative or technical notes provided for this machine."}</p>
                    </div>
                  </div>

                  <div className="mt-12 flex justify-between items-center text-[9px] font-black text-slate-300 uppercase tracking-[0.4em]">
                     <span>Asset ID: {e.id}</span>
                     <span>Institutional Record Locked • BioMed Pro Systems</span>
                  </div>
                </div>
              )
            }) : (
              <div className="py-40 text-center flex flex-col items-center">
                 <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border-4 border-dashed border-slate-100"><Stethoscope size={40} /></div>
                 <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Search or select assets to generate dossiers.</p>
              </div>
            )}
          </div>
        </ReportModal>
      )}

      {/* 2. Financial History Report */}
      {activeModal === 'Financial History' && (
        <ReportModal title="Capital Asset Financial Audit" icon={DollarSign}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-indigo-600 p-8 rounded-[2rem] text-white shadow-xl shadow-indigo-100">
               <DollarSign className="mb-4 opacity-50" size={32} />
               <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Total Portfolio Value</p>
               <p className="text-3xl font-black">BDT {financialHistoryData.reduce((acc, curr) => acc + curr.totalSpent, 0).toLocaleString()}</p>
            </div>
            <div className="bg-emerald-500 p-8 rounded-[2rem] text-white shadow-xl shadow-emerald-100">
               <CheckCircle2 className="mb-4 opacity-50" size={32} />
               <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Cumulative Settled</p>
               <p className="text-3xl font-black">BDT {financialHistoryData.reduce((acc, curr) => acc + curr.paid, 0).toLocaleString()}</p>
            </div>
            <div className="bg-red-600 p-8 rounded-[2rem] text-white shadow-xl shadow-red-100">
               <AlertTriangle className="mb-4 opacity-50" size={32} />
               <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Outstanding Liabilities</p>
               <p className="text-3xl font-black">BDT {financialHistoryData.reduce((acc, curr) => acc + curr.due, 0).toLocaleString()}</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-sm">
             <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                   <th className="px-6 py-4">Clinical Asset</th>
                   <th className="px-6 py-4">Vendor</th>
                   <th className="px-6 py-4 text-right">Total (Qty x Price)</th>
                   <th className="px-6 py-4 text-right">Paid</th>
                   <th className="px-6 py-4 text-right">Remaining Due</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {financialHistoryData.map(item => (
                  <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                       <p className="text-xs font-black text-slate-900">{item.name}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase">Qty: {item.quantity}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-600">{item.supplierName}</td>
                    <td className="px-6 py-4 text-right text-xs font-black">BDT {item.totalSpent.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-xs font-black text-emerald-600">BDT {item.paid.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-xs font-black text-red-600">BDT {item.due.toLocaleString()}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </ReportModal>
      )}

      {/* 3. Warranty & Coverage Report */}
      {activeModal === 'Warranty & Coverage Report' && (
        <ReportModal title="Warranty & Coverage Audit" icon={ShieldCheck}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center space-x-4">
              <ShieldCheck className="text-emerald-600" size={28} />
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Manufacturer Warranties</p>
                <p className="text-2xl font-black text-slate-900">{warrantyReportData.filter(d => d.isWarrantyActive).length}</p>
              </div>
            </div>
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center space-x-4">
              <FileBadge className="text-blue-600" size={28} />
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Service Contracts</p>
                <p className="text-2xl font-black text-slate-900">{warrantyReportData.filter(d => d.isContractActive).length}</p>
              </div>
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100 flex items-center space-x-4">
              <ShieldAlert className="text-red-600" size={28} />
              <div>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Assets Without Coverage</p>
                <p className="text-2xl font-black text-slate-900">{warrantyReportData.filter(d => !d.isWarrantyActive && !d.isContractActive).length}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
               <thead>
                  <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                     <th className="px-6 py-4">Machine Identification</th>
                     <th className="px-6 py-4">OEM Warranty Profile</th>
                     <th className="px-6 py-4">Maintenance Agreement</th>
                     <th className="px-6 py-4 text-center">Coverage Health</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {warrantyReportData.map(item => (
                    <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-slate-900">{item.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">SN: {item.serialNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        {item.hasWarranty ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                               <span className={`w-2 h-2 rounded-full ${item.isWarrantyActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                               <p className="text-[10px] font-bold text-slate-700 uppercase">{item.isWarrantyActive ? 'Active OEM' : 'Expired OEM'}</p>
                            </div>
                            <p className="text-[9px] text-slate-500">Exp: {item.warrantyExpiry || '---'}</p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">No OEM Warranty</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.activeContract ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                               <span className={`w-2 h-2 rounded-full ${item.isContractActive ? 'bg-blue-500' : 'bg-slate-400'}`} />
                               <p className="text-[10px] font-black text-slate-900 uppercase">{item.activeContract.type} ({item.activeContract.companyName})</p>
                            </div>
                            <p className={`text-[9px] font-black uppercase ${item.daysRemaining !== null && item.daysRemaining <= 30 ? 'text-red-500' : 'text-blue-500'}`}>
                               {item.isContractActive ? `${item.daysRemaining} days left` : 'Expired'}
                            </p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">No Contract Active</p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                           item.isWarrantyActive || item.isContractActive 
                             ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                             : 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                         }`}>
                           {item.isWarrantyActive || item.isContractActive ? 'COVERED' : 'EXPOSED'}
                         </span>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
        </ReportModal>
      )}

      {/* 4. Monthly Maintenance Summary */}
      {activeModal === 'Monthly Maintenance Summary' && (
        <ReportModal title="Monthly Maintenance Summary" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Logs</p>
              <p className="text-2xl font-black text-slate-900">{currentMonthLogs.length}</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Preventive (PM)</p>
              <p className="text-2xl font-black text-blue-600">{currentMonthLogs.filter(l => l.type === 'Preventive').length}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-3xl border border-red-100">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Corrective (CM)</p>
              <p className="text-2xl font-black text-red-600">{currentMonthLogs.filter(l => l.type === 'Corrective').length}</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Spent (BDT)</p>
              <p className="text-2xl font-black text-emerald-600">{(currentMonthLogs.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0)).toLocaleString()}</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
             <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                   <th className="px-6 py-4">Date</th>
                   <th className="px-6 py-4">Equipment</th>
                   <th className="px-6 py-4">Type</th>
                   <th className="px-6 py-4">Company</th>
                   <th className="px-6 py-4 text-right">Cost (BDT)</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {currentMonthLogs.map(log => (
                  <tr key={log.id} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-bold text-slate-700">{log.date}</td>
                    <td className="px-6 py-4 text-xs font-black text-slate-900">{log.equipmentName}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${log.type === 'Preventive' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>{log.type}</span></td>
                    <td className="px-6 py-4 text-xs text-slate-500">{log.companyName || 'Internal'}</td>
                    <td className="px-6 py-4 text-right text-xs font-black">{(Number(log.cost) || 0).toLocaleString()}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </ReportModal>
      )}

      {/* 5. Equipment Cost Analysis */}
      {activeModal === 'Equipment Cost Analysis' && (
        <ReportModal title="Total Cost of Ownership Analysis" icon={TrendingUp}>
          <div className="bg-slate-900 p-8 rounded-[2rem] text-white mb-12 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Aggregated Fleet Investment</p>
              <p className="text-4xl font-black">BDT {costAnalysisData.reduce((acc, curr) => acc + curr.grandTotal, 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg Cost per Asset</p>
              <p className="text-2xl font-black">BDT {Math.round(costAnalysisData.reduce((acc, curr) => acc + curr.grandTotal, 0) / (costAnalysisData.length || 1)).toLocaleString()}</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-sm">
             <thead>
                <tr className="bg-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-widest">
                   <th className="px-6 py-4">Machine Details</th>
                   <th className="px-6 py-4 text-right">Purchase Total</th>
                   <th className="px-6 py-4 text-right">Lifetime Maintenance</th>
                   <th className="px-6 py-4 text-right">Total Ownership Cost</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {costAnalysisData.map(item => (
                  <tr key={item.id} className="bg-white">
                    <td className="px-6 py-4">
                       <p className="text-xs font-black text-slate-900">{item.name}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase">{item.brand} • {item.model}</p>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-bold">BDT {item.purchaseTotal.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-xs font-bold">BDT {item.totalServiceCost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right text-xs font-black text-blue-600">BDT {item.grandTotal.toLocaleString()}</td>
                  </tr>
                ))}
             </tbody>
          </table>
        </ReportModal>
      )}

      {/* 6. Breakdown Frequency Report */}
      {activeModal === 'Breakdown Frequency' && (
        <ReportModal title="Failure Rate & Reliability Audit" icon={Zap}>
          <div className="bg-red-50 border border-red-100 p-8 rounded-[2rem] mb-12">
            <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-4 flex items-center"><AlertTriangle size={18} className="mr-2" /> High-Risk Assets (Top 3 Failures)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {breakdownFrequencyData.slice(0, 3).map(e => (
                <div key={e.id} className="bg-white p-5 rounded-2xl shadow-sm border border-red-100">
                   <p className="text-xs font-black text-slate-900 truncate">{e.name}</p>
                   <p className="text-2xl font-black text-red-600 mt-2">{e.breakdownCount} <span className="text-xs uppercase font-bold text-red-400">Fixes</span></p>
                </div>
              ))}
            </div>
          </div>
          <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-sm">
             <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                   <th className="px-6 py-4">Clinical Asset</th>
                   <th className="px-6 py-4 text-center">Preventive (PM)</th>
                   <th className="px-6 py-4 text-center">Corrective (CM/Repair)</th>
                   <th className="px-6 py-4 text-center">Reliability Index</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {breakdownFrequencyData.map(item => {
                  const ratio = item.pmCount / (item.breakdownCount || 1);
                  return (
                    <tr key={item.id} className="bg-white">
                      <td className="px-6 py-4">
                         <p className="text-xs font-black text-slate-900">{item.name}</p>
                         <p className="text-[9px] text-slate-400 font-bold uppercase">{item.location}</p>
                      </td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-blue-600">{item.pmCount}</td>
                      <td className="px-6 py-4 text-center text-xs font-bold text-red-600">{item.breakdownCount}</td>
                      <td className="px-6 py-4 text-center">
                         <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${ratio >= 2 ? 'bg-emerald-50 text-emerald-600' : ratio >= 1 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                           {ratio >= 2 ? 'Stable' : ratio >= 1 ? 'Needs PM' : 'Unreliable'}
                         </span>
                      </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
        </ReportModal>
      )}

      {/* 7. Spare Parts Usage Report */}
      {activeModal === 'Spare Parts Usage' && (
        <ReportModal title="Consumables & Parts Analytics" icon={Package}>
          <div className="bg-blue-50 border border-blue-100 p-8 rounded-[2rem] mb-12 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg"><Activity size={24} /></div>
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Aggregate Replacement Volume</p>
                <p className="text-3xl font-black text-slate-900">{sparePartUsageData.reduce((acc, curr) => acc + curr.count, 0)} Units Consumed</p>
              </div>
            </div>
            <div className="text-right">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Parts Cost</p>
               <p className="text-2xl font-black text-slate-900">BDT {sparePartUsageData.reduce((acc, curr) => acc + (curr.count * curr.price), 0).toLocaleString()}</p>
            </div>
          </div>
          <table className="w-full text-left border-collapse rounded-3xl overflow-hidden shadow-sm">
             <thead>
                <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest">
                   <th className="px-6 py-4">Spare Part / Component</th>
                   <th className="px-6 py-4 text-center">Frequency of Use</th>
                   <th className="px-6 py-4 text-center">Unique Machines</th>
                   <th className="px-6 py-4 text-center">Current Inventory</th>
                   <th className="px-6 py-4 text-right">Est. Lifetime Spent</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {sparePartUsageData.map((part, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="px-6 py-4">
                       <p className="text-xs font-black text-slate-900">{part.name}</p>
                    </td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{part.count} Times</td>
                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-600">{part.machineCount}</td>
                    <td className="px-6 py-4 text-center text-xs font-bold">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black ${part.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
                         {part.stock} in stock
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right text-xs font-black text-blue-600">BDT {(part.count * part.price).toLocaleString()}</td>
                  </tr>
                ))}
                {sparePartUsageData.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 italic">No spare part consumption recorded in service logs.</td></tr>
                )}
             </tbody>
          </table>
        </ReportModal>
      )}

      <style>{`
        @media print {
            @page {
                size: A4;
                margin: 20mm;
            }
            body * { visibility: hidden; }
            .no-print, .no-print * { display: none !important; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report {
                position: absolute;
                left: 0; top: 0;
                width: 100%;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
            }
            .page-break-after { 
                page-break-after: always; 
                border-bottom: none !important;
                margin-bottom: 0 !important;
                padding-bottom: 0 !important;
            }
            .rounded-3xl, .rounded-2xl, .rounded-[2.5rem], .rounded-[3rem] {
                border-radius: 12px !important;
            }
            .bg-slate-50, .bg-slate-100 {
                background-color: #f8fafc !important;
                -webkit-print-color-adjust: exact;
            }
            .bg-slate-900 {
                background-color: #0f172a !important;
                -webkit-print-color-adjust: exact;
            }
            .text-white {
                color: #ffffff !important;
                -webkit-print-color-adjust: exact;
            }
        }
      `}</style>
    </div>
  );
};

export default Reports;
