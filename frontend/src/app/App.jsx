import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import 'shepherd.js/dist/css/shepherd.css';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
import LiquidEther from '../background/LiquidEther';
import AppShell from '../components/layout/AppShell';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import LoginPage from '../features/auth/LoginPage';

const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const DashboardRedirect = lazy(() => import('../features/auth/DashboardRedirect'));
const ReceptionPage = lazy(() => import('../features/reception/ReceptionPage'));
const WaitingRoomTV = lazy(() => import('../features/reception/WaitingRoomTV'));
const SurgeryGantt = lazy(() => import('../features/surgery/SurgeryGantt'));
const SurgeryScheduler = lazy(() => import('../features/surgery/SurgeryScheduler'));
const SurgeryDashboard = lazy(() => import('../features/surgery/SurgeryDashboard'));
const DischargeSummaryPage = lazy(() => import('../features/surgery/DischargeSummary'));
const PreoperativePage = lazy(() => import('../features/preoperative/PreoperativePage'));
const ReferralsPage = lazy(() => import('../features/referral/ReferralsPage'));
const PharmacyPOS = lazy(() => import('../features/pos/PharmacyPOS'));
const PharmacyProducts = lazy(() => import('../features/pos/PharmacyProducts'));
const OpticsPOS = lazy(() => import('../features/pos/OpticsPOS'));
const OpticsProducts = lazy(() => import('../features/pos/OpticsProducts'));
const LabDashboard = lazy(() => import('../features/lab/LabDashboard'));
const InventoryPOS = lazy(() => import('../features/pos/InventoryPOS'));
const AccountingPage = lazy(() => import('../features/accounting/AccountingPage'));
const WardsPage = lazy(() => import('../features/wards/WardsPage'));
const InpatientPage = lazy(() => import('../features/wards/InpatientPage'));
const AdminPage = lazy(() => import('../features/admin/AdminPage'));
const HRPage = lazy(() => import('../features/hr/HRPage'));
const ProcurementPage = lazy(() => import('../features/procurement/ProcurementPage'));
const MedicineDashboard = lazy(() => import('../features/clinics/MedicineDashboard'));
const ENTDashboard = lazy(() => import('../features/clinics/ENTDashboard'));
const DentalDashboard = lazy(() => import('../features/clinics/DentalDashboard'));
const RetinaDashboard = lazy(() => import('../features/clinics/RetinaDashboard'));
const GlaucomaDashboard = lazy(() => import('../features/clinics/GlaucomaDashboard'));
const OrbitDashboard = lazy(() => import('../features/clinics/OrbitDashboard'));
const PedsOphthDashboard = lazy(() => import('../features/clinics/PedsOphthDashboard'));
const GenOphthDashboard = lazy(() => import('../features/clinics/GenOphthDashboard'));
const OptometryDashboard = lazy(() => import('../features/clinics/OptometryDashboard'));
const ImagingDashboard = lazy(() => import('../features/clinics/ImagingDashboard'));
const OpticLabDashboard = lazy(() => import('../features/optic-lab/OpticLabDashboard'));
const HospitalOverview = lazy(() => import('../features/dashboard/HospitalOverview'));
const PatientListPage = lazy(() => import('../features/patients/PatientListPage'));
const PatientDetailPage = lazy(() => import('../features/patients/PatientDetailPage'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function isNativePlatform() {
  return typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.Capacitor?.isNative);
}

function ProtectedRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (token && isNativePlatform()) {
      import('../lib/sync/syncEngine').then(({ syncEngine }) => syncEngine.init());
    }
  }, [token]);
  if (!token) return <Navigate to="/login" replace />;
  return <AppShell><ErrorBoundary><Suspense fallback={<Spinner />}>{children}</Suspense></ErrorBoundary></AppShell>;
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
            colors={theme === 'dark' ? ['#5227FF', '#FF9FFC', '#B497CF'] : ['#91e0ff', '#7ec8e0', '#6ab0d0']}
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
              <Route path="/preoperative" element={<ProtectedRoute><PreoperativePage /></ProtectedRoute>} />
              <Route path="/wards" element={<ProtectedRoute><WardsPage /></ProtectedRoute>} />
              <Route path="/inpatient" element={<ProtectedRoute><InpatientPage /></ProtectedRoute>} />
              <Route path="/surgery" element={<ProtectedRoute><SurgeryGantt /></ProtectedRoute>} />
              <Route path="/surgery/schedule" element={<ProtectedRoute><SurgeryScheduler /></ProtectedRoute>} />
              <Route path="/surgery/dashboard" element={<ProtectedRoute><SurgeryDashboard /></ProtectedRoute>} />
              <Route path="/surgery/:surgeryId/discharge" element={<ProtectedRoute><DischargeSummaryPage /></ProtectedRoute>} />
              <Route path="/referrals" element={<ProtectedRoute><ReferralsPage /></ProtectedRoute>} />
              <Route path="/pharmacy" element={<ProtectedRoute><PharmacyPOS /></ProtectedRoute>} />
              <Route path="/pharmacy/products" element={<ProtectedRoute><PharmacyProducts /></ProtectedRoute>} />
              <Route path="/optics" element={<ProtectedRoute><OpticsPOS /></ProtectedRoute>} />
              <Route path="/optics/products" element={<ProtectedRoute><OpticsProducts /></ProtectedRoute>} />
              <Route path="/lab" element={<ProtectedRoute><LabDashboard /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><InventoryPOS /></ProtectedRoute>} />
              <Route path="/accounting" element={<ProtectedRoute><AccountingPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
              <Route path="/hr" element={<ProtectedRoute><HRPage /></ProtectedRoute>} />
              <Route path="/procurement" element={<ProtectedRoute><ProcurementPage /></ProtectedRoute>} />
              <Route path="/clinic/medicine" element={<ProtectedRoute><MedicineDashboard /></ProtectedRoute>} />
              <Route path="/clinic/ent" element={<ProtectedRoute><ENTDashboard /></ProtectedRoute>} />
              <Route path="/clinic/dental" element={<ProtectedRoute><DentalDashboard /></ProtectedRoute>} />
              <Route path="/clinic/retina" element={<ProtectedRoute><RetinaDashboard /></ProtectedRoute>} />
              <Route path="/clinic/glaucoma" element={<ProtectedRoute><GlaucomaDashboard /></ProtectedRoute>} />
              <Route path="/clinic/orbit" element={<ProtectedRoute><OrbitDashboard /></ProtectedRoute>} />
              <Route path="/clinic/pediatrics-ophth" element={<ProtectedRoute><PedsOphthDashboard /></ProtectedRoute>} />
              <Route path="/clinic/general-ophth" element={<ProtectedRoute><GenOphthDashboard /></ProtectedRoute>} />
              <Route path="/clinic/optometry" element={<ProtectedRoute><OptometryDashboard /></ProtectedRoute>} />
              <Route path="/clinic/imaging" element={<ProtectedRoute><ImagingDashboard /></ProtectedRoute>} />
              <Route path="/optic-lab" element={<ProtectedRoute><OpticLabDashboard /></ProtectedRoute>} />
              <Route path="/overview" element={<ProtectedRoute><HospitalOverview /></ProtectedRoute>} />
              <Route path="/patients" element={<ProtectedRoute><PatientListPage /></ProtectedRoute>} />
              <Route path="/patients/:id" element={<ProtectedRoute><PatientDetailPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </div>
  );
}
