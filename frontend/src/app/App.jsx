import { useEffect, useState, Suspense, lazy, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import 'shepherd.js/dist/css/shepherd.css';
import { useAuthStore } from '../stores/authStore';
import { useUIStore } from '../stores/uiStore';
const LiquidEther = lazy(() => import('../background/LiquidEther'));
import AppShell from '../components/layout/AppShell';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import RoleGuard from '../components/auth/RoleGuard';
import LoginPage from '../features/auth/LoginPage';
import PortalLayout from '../features/patient-portal/PortalLayout';
import { PortalAuthProvider, usePortalAuth } from '../features/patient-portal/hooks/usePortalAuth';
import KeyboardShortcutsModal from '../components/ui/KeyboardShortcutsModal';
import { SHORTCUTS } from '../lib/shortcuts';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import * as swRegistration from '../lib/serviceWorkerRegistration';

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
const PharmacyDashboard = lazy(() => import('../features/pharmacy/PharmacyDashboard'));
const PharmacySalesReport = lazy(() => import('../features/pharmacy/PharmacySalesReport'));
const OpticsPOS = lazy(() => import('../features/pos/OpticsPOS'));
const OpticsProducts = lazy(() => import('../features/pos/OpticsProducts'));
const LabDashboard = lazy(() => import('../features/lab/LabDashboard'));
const InventoryPOS = lazy(() => import('../features/pos/InventoryPOS'));
const AccountingPage = lazy(() => import('../features/accounting/AccountingPage'));
const ServiceItemCatalog = lazy(() => import('../features/accounting/ServiceItemCatalog'));
const InvoicePage = lazy(() => import('../features/accounting/InvoicePage'));
const ChartOfAccounts = lazy(() => import('../features/accounting/ChartOfAccounts'));
const JournalEntryList = lazy(() => import('../features/accounting/JournalEntryList'));
const BalanceSheet = lazy(() => import('../features/accounting/BalanceSheet'));
const FixedAssetRegister = lazy(() => import('../features/accounting/FixedAssetRegister'));
const WardsPage = lazy(() => import('../features/wards/WardsPage'));
const InpatientPage = lazy(() => import('../features/wards/InpatientPage'));
const AdminPage = lazy(() => import('../features/admin/AdminPage'));
const ImagingProcedureTypesPage = lazy(() => import('../features/admin/ImagingProcedureTypesPage'));
const HRPage = lazy(() => import('../features/hr/HRPage'));
const EmployeeDetail = lazy(() => import('../features/hr/EmployeeDetail'));
const MyHRPage = lazy(() => import('../features/hr/MyHRPage'));
const ProcurementPage = lazy(() => import('../features/procurement/ProcurementPage'));
const AppointmentCalendar = lazy(() => import('../features/appointments/AppointmentCalendar'));
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
const ConsultationPage = lazy(() => import('../features/clinics/ConsultationPage'));
const OpticLabDashboard = lazy(() => import('../features/optic-lab/OpticLabDashboard'));
const HospitalOverview = lazy(() => import('../features/dashboard/HospitalOverview'));
const PatientListPage = lazy(() => import('../features/patients/PatientListPage'));
const PatientDetailPage = lazy(() => import('../features/patients/PatientDetailPage'));
const ReportsPage = lazy(() => import('../features/reports/ReportsPage'));
const RoleWidgets = lazy(() => import('../components/dashboard/RoleWidgets'));
const InsurancePage = lazy(() => import('../features/insurance/InsurancePage'));
const PreAuthorizationPage = lazy(() => import('../features/insurance/PreAuthorizationPage'));
const ClaimTrackingPage = lazy(() => import('../features/insurance/ClaimTrackingPage'));
const InsuranceReportsPage = lazy(() => import('../features/insurance/InsuranceReportsPage'));
const EmergencyDashboard = lazy(() => import('../features/emergency/EmergencyDashboard'));
const TriageWorkspace = lazy(() => import('../features/emergency/TriageWorkspace'));
const RapidRegistration = lazy(() => import('../features/emergency/RapidRegistration'));
const EmergencyStats = lazy(() => import('../features/emergency/EmergencyStats'));
const PaymentPlanPage = lazy(() => import('../features/accounting/PaymentPlanPage'));
const ARAgingDashboard = lazy(() => import('../features/accounting/ARAgingDashboard'));
const DenialAppealPage = lazy(() => import('../features/insurance/DenialAppealPage'));
const COBPage = lazy(() => import('../features/insurance/COBPage'));
const IntegrationPage = lazy(() => import('../features/admin/IntegrationPage'));
const FhirExplorer = lazy(() => import('../features/admin/FhirExplorer'));

const NotFoundPage = lazy(() => import('../features/errors/NotFoundPage'));
const PermissionDeniedPage = lazy(() => import('../features/errors/PermissionDeniedPage'));

const PortalLogin = lazy(() => import('../features/patient-portal/PortalLogin'));
const PortalRegister = lazy(() => import('../features/patient-portal/PortalRegister'));
const PortalResetPassword = lazy(() => import('../features/patient-portal/PortalResetPassword'));
const PortalDashboard = lazy(() => import('../features/patient-portal/PortalDashboard'));
const BookAppointment = lazy(() => import('../features/patient-portal/BookAppointment'));
const AppointmentsPage = lazy(() => import('../features/patient-portal/AppointmentsPage'));
const MedicalRecordsPage = lazy(() => import('../features/patient-portal/MedicalRecordsPage'));
const LabResultsPage = lazy(() => import('../features/patient-portal/LabResultsPage'));
const PrescriptionsPage = lazy(() => import('../features/patient-portal/PrescriptionsPage'));
const BillingPage = lazy(() => import('../features/patient-portal/BillingPage'));
const ProfilePage = lazy(() => import('../features/patient-portal/ProfilePage'));
const PortalAdminPage = lazy(() => import('../features/patient-portal/PortalAdminPage'));

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

function ProtectedPortalRoute({ children }) {
  const { isAuthenticated, isLoading } = usePortalAuth();
  if (isLoading) return <Spinner />;
  if (!isAuthenticated) return <Navigate to="/portal/login" replace />;
  return children;
}

export default function App() {
  const theme = useUIStore((s) => s.theme);
  const language = useUIStore((s) => s.language);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleShortcut = useCallback((id) => {
    if (id === 'show-shortcuts') setShortcutsOpen((v) => !v);
    if (id === 'escape-close') setShortcutsOpen(false);
  }, []);

  const shortcutDefs = SHORTCUTS.map((s) => ({
    ...s,
    handler: () => handleShortcut(s.id),
  }));

  useKeyboardShortcuts(shortcutDefs, [handleShortcut]);

  useEffect(() => {
    if (import.meta.env.PROD) {
      swRegistration.register();
    }
  }, []);

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} bg-paper min-h-dvh`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="relative min-h-dvh">
        <div className={`fixed inset-0 z-0 pointer-events-none ${theme !== 'dark' ? 'opacity-[0.35]' : ''}`}>
          <Suspense fallback={null}>
            <LiquidEther
              colors={theme === 'dark' ? ['#5227FF', '#FF9FFC', '#B497CF'] : ['#91e0ff', '#7ec8e0', '#6ab0d0']}
            />
          </Suspense>
        </div>
        <div className="relative z-10">
          <Toaster position="top-right" toastOptions={{ className: '!bg-paper dark:!bg-obsidian !text-obsidian dark:!text-paper !shadow-lg !border !border-silver/20' }} />
          <KeyboardShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><RoleGuard><div className="space-y-6"><RoleWidgets /><DashboardRedirect /></div></RoleGuard></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><RoleGuard><SettingsPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/overview" element={<ProtectedRoute><RoleGuard><HospitalOverview /></RoleGuard></ProtectedRoute>} />
              <Route path="/reception" element={<ProtectedRoute><RoleGuard requiredPermissions={['appointment:write']}><ReceptionPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/appointments" element={<ProtectedRoute><RoleGuard requiredPermissions={['appointment:read']}><AppointmentCalendar /></RoleGuard></ProtectedRoute>} />
              <Route path="/waiting-room" element={<WaitingRoomTV />} />
              <Route path="/patients" element={<ProtectedRoute><RoleGuard requiredPermissions={['patient:read']}><PatientListPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/patients/:id" element={<ProtectedRoute><RoleGuard requiredPermissions={['patient:read']}><PatientDetailPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/referrals" element={<ProtectedRoute><RoleGuard requiredPermissions={['patient:read']}><ReferralsPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/medicine" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><MedicineDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/ent" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><ENTDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/dental" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><DentalDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/retina" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><RetinaDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/glaucoma" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><GlaucomaDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/orbit" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><OrbitDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/pediatrics-ophth" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><PedsOphthDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/general-ophth" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><GenOphthDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/optometry" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><OptometryDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/imaging" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><ImagingDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/clinic/:slug/consultation/:appointmentId" element={<ProtectedRoute><RoleGuard requiredPermissions={['clinical:read']}><ConsultationPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/surgery" element={<ProtectedRoute><RoleGuard requiredPermissions={['surgery:read']}><SurgeryGantt /></RoleGuard></ProtectedRoute>} />
              <Route path="/surgery/schedule" element={<ProtectedRoute><RoleGuard requiredPermissions={['surgery:read']}><SurgeryScheduler /></RoleGuard></ProtectedRoute>} />
              <Route path="/surgery/dashboard" element={<ProtectedRoute><RoleGuard requiredPermissions={['surgery:read']}><SurgeryDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/surgery/:surgeryId/discharge" element={<ProtectedRoute><RoleGuard requiredPermissions={['surgery:read']}><DischargeSummaryPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/preoperative" element={<ProtectedRoute><RoleGuard requiredPermissions={['preoperative:read']}><PreoperativePage /></RoleGuard></ProtectedRoute>} />
              <Route path="/wards" element={<ProtectedRoute><RoleGuard requiredPermissions={['ward:read']}><WardsPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/inpatient" element={<ProtectedRoute><RoleGuard requiredPermissions={['ward:read']}><InpatientPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/pharmacy" element={<ProtectedRoute><RoleGuard requiredPermissions={['pharmacy:read']}><PharmacyPOS /></RoleGuard></ProtectedRoute>} />
              <Route path="/pharmacy/dashboard" element={<ProtectedRoute><RoleGuard requiredPermissions={['pharmacy:read']}><PharmacyDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/pharmacy/products" element={<ProtectedRoute><RoleGuard requiredPermissions={['pharmacy:read']}><PharmacyProducts /></RoleGuard></ProtectedRoute>} />
              <Route path="/pharmacy/reports" element={<ProtectedRoute><RoleGuard requiredPermissions={['pharmacy:read']}><PharmacySalesReport /></RoleGuard></ProtectedRoute>} />
              <Route path="/optics" element={<ProtectedRoute><RoleGuard requiredPermissions={['optics:read']}><OpticsPOS /></RoleGuard></ProtectedRoute>} />
              <Route path="/optics/products" element={<ProtectedRoute><RoleGuard requiredPermissions={['optics:read']}><OpticsProducts /></RoleGuard></ProtectedRoute>} />
              <Route path="/optic-lab" element={<ProtectedRoute><RoleGuard requiredPermissions={['optic_lab:read']}><OpticLabDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/lab" element={<ProtectedRoute><RoleGuard requiredPermissions={['diagnostics:read']}><LabDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><RoleGuard requiredPermissions={['inventory:read']}><InventoryPOS /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><AccountingPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting/service-items" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><ServiceItemCatalog /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting/invoices" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><InvoicePage /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting/chart-of-accounts" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><ChartOfAccounts /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting/journal-entries" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><JournalEntryList /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting/balance-sheet" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><BalanceSheet /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting/fixed-assets" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><FixedAssetRegister /></RoleGuard></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><RoleGuard requiredPermissions={['admin:users']}><AdminPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/admin/integrations" element={<ProtectedRoute><RoleGuard requiredPermissions={['admin:users']}><IntegrationPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/admin/fhir-explorer" element={<ProtectedRoute><RoleGuard requiredPermissions={['admin:users']}><FhirExplorer /></RoleGuard></ProtectedRoute>} />
              <Route path="/admin/imaging-procedure-types" element={<ProtectedRoute><RoleGuard requiredPermissions={['pricing:write']}><ImagingProcedureTypesPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/hr" element={<ProtectedRoute><RoleGuard requiredPermissions={['hr:read']}><HRPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/hr/employees/:id" element={<ProtectedRoute><RoleGuard requiredPermissions={['hr:read']}><EmployeeDetail /></RoleGuard></ProtectedRoute>} />
              <Route path="/hr/my" element={<ProtectedRoute><RoleGuard><MyHRPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/procurement" element={<ProtectedRoute><RoleGuard requiredPermissions={['purchase:read']}><ProcurementPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><ReportsPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/insurance/companies" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><InsurancePage /></RoleGuard></ProtectedRoute>} />
              <Route path="/insurance/policies" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><InsurancePage /></RoleGuard></ProtectedRoute>} />
              <Route path="/insurance/pre-authorizations" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><PreAuthorizationPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/insurance/claims" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><ClaimTrackingPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/insurance/settlements" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><ClaimTrackingPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/insurance/reports" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><InsuranceReportsPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/insurance/denial-appeals" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><DenialAppealPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/insurance/cob" element={<ProtectedRoute><RoleGuard requiredPermissions={['insurance:read']}><COBPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting/payment-plans" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><PaymentPlanPage /></RoleGuard></ProtectedRoute>} />
              <Route path="/accounting/ar-aging" element={<ProtectedRoute><RoleGuard requiredPermissions={['accounting:read']}><ARAgingDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/emergency" element={<ProtectedRoute><RoleGuard requiredPermissions={['emergency:read']}><EmergencyDashboard /></RoleGuard></ProtectedRoute>} />
              <Route path="/emergency/triage" element={<ProtectedRoute><RoleGuard requiredPermissions={['emergency:read']}><TriageWorkspace /></RoleGuard></ProtectedRoute>} />
              <Route path="/emergency/register" element={<ProtectedRoute><RoleGuard requiredPermissions={['emergency:read']}><RapidRegistration /></RoleGuard></ProtectedRoute>} />
              <Route path="/emergency/stats" element={<ProtectedRoute><RoleGuard requiredPermissions={['emergency:read']}><EmergencyStats /></RoleGuard></ProtectedRoute>} />
              <Route path="/portal" element={<PortalAuthProvider><PortalLayout /></PortalAuthProvider>}>
                <Route path="login" element={<Suspense fallback={<Spinner />}><PortalLogin /></Suspense>} />
                <Route path="register" element={<Suspense fallback={<Spinner />}><PortalRegister /></Suspense>} />
                <Route path="reset-password" element={<Suspense fallback={<Spinner />}><PortalResetPassword /></Suspense>} />
                <Route path="dashboard" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><PortalDashboard /></Suspense></ProtectedPortalRoute>} />
                <Route path="appointments" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><AppointmentsPage /></Suspense></ProtectedPortalRoute>} />
                <Route path="book" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><BookAppointment /></Suspense></ProtectedPortalRoute>} />
                <Route path="medical-records" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><MedicalRecordsPage /></Suspense></ProtectedPortalRoute>} />
                <Route path="lab-results" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><LabResultsPage /></Suspense></ProtectedPortalRoute>} />
                <Route path="prescriptions" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><PrescriptionsPage /></Suspense></ProtectedPortalRoute>} />
                <Route path="billing" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><BillingPage /></Suspense></ProtectedPortalRoute>} />
                <Route path="profile" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><ProfilePage /></Suspense></ProtectedPortalRoute>} />
                <Route path="admin" element={<ProtectedPortalRoute><Suspense fallback={<Spinner />}><PortalAdminPage /></Suspense></ProtectedPortalRoute>} />
                <Route index element={<Navigate to="/portal/login" replace />} />
              </Route>
              <Route path="/access-denied" element={<ProtectedRoute><Suspense fallback={<Spinner />}><PermissionDeniedPage /></Suspense></ProtectedRoute>} />
              <Route path="*" element={<Suspense fallback={<Spinner />}><NotFoundPage /></Suspense>} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </div>
  );
}
