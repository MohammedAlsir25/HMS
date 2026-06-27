import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import LiquidEther from '../background/LiquidEther';
import AppShell from '../components/layout/AppShell';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import LoginPage from '../features/auth/LoginPage';
import SettingsPage from '../features/settings/SettingsPage';
import DashboardRedirect from '../features/auth/DashboardRedirect';
import ReceptionPage from '../features/reception/ReceptionPage';
import WaitingRoomTV from '../features/reception/WaitingRoomTV';
import SurgeryGantt from '../features/surgery/SurgeryGantt';
import ReferralsPage from '../features/referral/ReferralsPage';
import PharmacyPOS from '../features/pos/PharmacyPOS';
import PharmacyProducts from '../features/pos/PharmacyProducts';
import OpticsPOS from '../features/pos/OpticsPOS';
import OpticsProducts from '../features/pos/OpticsProducts';
import LabDashboard from '../features/lab/LabDashboard';
import InventoryPage from '../features/inventory/InventoryPage';
import AccountingPage from '../features/accounting/AccountingPage';
import AdminPage from '../features/admin/AdminPage';
import HRPage from '../features/hr/HRPage';
import MedicineDashboard from '../features/clinics/MedicineDashboard';
import ENTDashboard from '../features/clinics/ENTDashboard';
import DentalDashboard from '../features/clinics/DentalDashboard';
import RetinaDashboard from '../features/clinics/RetinaDashboard';
import GlaucomaDashboard from '../features/clinics/GlaucomaDashboard';
import OrbitDashboard from '../features/clinics/OrbitDashboard';
import PedsOphthDashboard from '../features/clinics/PedsOphthDashboard';
import GenOphthDashboard from '../features/clinics/GenOphthDashboard';
import OptometryDashboard from '../features/clinics/OptometryDashboard';

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <AppShell><ErrorBoundary>{children}</ErrorBoundary></AppShell>;
}

function PublicRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-paper min-h-dvh`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="relative min-h-dvh">
        <div className={`fixed inset-0 z-0 pointer-events-none ${theme !== 'dark' ? 'opacity-[0.35]' : ''}`}>
          <LiquidEther
            baseColor="#2F293A"
            activeColor={theme === 'dark' ? '#5227FF' : '#91e0ff'}
          />
        </div>
        <div className="relative z-10">
          <Toaster position="top-right" toastOptions={{ className: '!bg-paper dark:!bg-obsidian !text-obsidian dark:!text-paper !shadow-lg !border !border-silver/20' }} />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/reception" element={<ProtectedRoute><ReceptionPage /></ProtectedRoute>} />
              <Route path="/waiting-room" element={<WaitingRoomTV />} />
              <Route path="/surgery" element={<ProtectedRoute><SurgeryGantt /></ProtectedRoute>} />
              <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
              <Route path="/pharmacy" element={<ProtectedRoute><PharmacyPOS /></ProtectedRoute>} />
              <Route path="/pharmacy/products" element={<ProtectedRoute><PharmacyProducts /></ProtectedRoute>} />
              <Route path="/optics" element={<ProtectedRoute><OpticsPOS /></ProtectedRoute>} />
              <Route path="/optics/products" element={<ProtectedRoute><OpticsProducts /></ProtectedRoute>} />
              <Route path="/lab" element={<ProtectedRoute><LabDashboard /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
              <Route path="/accounting" element={<ProtectedRoute><AccountingPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="/hr" element={<ProtectedRoute><HRPage /></ProtectedRoute>} />
              <Route path="/clinic/medicine" element={<ProtectedRoute><MedicineDashboard /></ProtectedRoute>} />
              <Route path="/clinic/ent" element={<ProtectedRoute><ENTDashboard /></ProtectedRoute>} />
              <Route path="/clinic/dental" element={<ProtectedRoute><DentalDashboard /></ProtectedRoute>} />
              <Route path="/clinic/retina" element={<ProtectedRoute><RetinaDashboard /></ProtectedRoute>} />
              <Route path="/clinic/glaucoma" element={<ProtectedRoute><GlaucomaDashboard /></ProtectedRoute>} />
              <Route path="/clinic/orbit" element={<ProtectedRoute><OrbitDashboard /></ProtectedRoute>} />
              <Route path="/clinic/pediatrics-ophth" element={<ProtectedRoute><PedsOphthDashboard /></ProtectedRoute>} />
              <Route path="/clinic/general-ophth" element={<ProtectedRoute><GenOphthDashboard /></ProtectedRoute>} />
              <Route path="/clinic/optometry" element={<ProtectedRoute><OptometryDashboard /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </div>
  );
}
