
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UptimeManager from './pages/UptimeManager';
import EquipmentList from './pages/EquipmentList';
import EquipmentDetail from './pages/EquipmentDetail';
import GroupDetail from './pages/GroupDetail';
import ServiceLogs from './pages/ServiceLogs';
import SpareParts from './pages/SpareParts';
import Vendors from './pages/Vendors';
import Engineers from './pages/Engineers';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Licenses from './pages/Licenses';
import MaintenanceContracts from './pages/MaintenanceContracts';
import Payments from './pages/Payments';
import About from './pages/About';
import Layout from './components/Layout';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-500 font-medium">Loading BioMed Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        
        <Route 
          path="/" 
          element={user ? <Layout /> : <Navigate to="/login" />}
        >
          <Route index element={<Dashboard />} />
          <Route path="uptime-manager" element={<UptimeManager />} />
          <Route path="equipment" element={<EquipmentList />} />
          <Route path="equipment/:id" element={<EquipmentDetail />} />
          <Route path="equipment/group/:groupName" element={<GroupDetail />} />
          <Route path="maintenance-contracts" element={<MaintenanceContracts />} />
          <Route path="licenses" element={<Licenses />} />
          <Route path="service" element={<ServiceLogs />} />
          <Route path="payments" element={<Payments />} />
          <Route path="spare-parts" element={<SpareParts />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="engineers" element={<Engineers />} />
          <Route path="documents" element={<Documents />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
          <Route path="about" element={<About />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
