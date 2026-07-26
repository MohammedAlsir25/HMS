import {
  Home, Building2, ClipboardList, Monitor, Users, ArrowLeftRight,
  Stethoscope, ClipboardCheck, GanttChartSquare, LayoutDashboard, Calendar,
  Bed, HeartPulse, ShoppingCart, Package, Glasses, Wrench,
  FlaskConical, Warehouse, Truck, DollarSign, BarChart3,
  Settings, UsersRound, LucideIcon, Activity,
  ListChecks, FileText, BookOpen, Scale, Landmark, Boxes,
  Shield, FileCheck, ReceiptText, Banknote, Siren, Ambulance,
  CreditCard, AlertTriangle, RefreshCw, Plug, Search
} from 'lucide-react';

export type NavItem = {
  label: string;
  icon: LucideIcon;
  path: string;
  requiredPermissions: string[];
  badge?: () => number | null;
};

export type NavGroup = {
  key: string;
  label: string;
  items: NavItem[];
  requiredPermissions: string[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: 'Overview',
    requiredPermissions: [],
    items: [
      { label: 'Dashboard', icon: Home, path: '/dashboard', requiredPermissions: [] },
      { label: 'Hospital Overview', icon: Building2, path: '/overview', requiredPermissions: [] },
    ],
  },
  {
    key: 'clinical',
    label: 'Clinical',
    requiredPermissions: ['patient:read', 'appointment:read'],
    items: [
      { label: 'Reception', icon: ClipboardList, path: '/reception', requiredPermissions: ['appointment:write', 'patient:create'] },
      { label: 'Waiting Room', icon: Monitor, path: '/waiting-room', requiredPermissions: [] },
      { label: 'Patients', icon: Users, path: '/patients', requiredPermissions: ['patient:read'] },
      { label: 'Referrals', icon: ArrowLeftRight, path: '/referrals', requiredPermissions: ['patient:read'] },
    ],
  },
  {
    key: 'clinics',
    label: 'Clinics',
    requiredPermissions: ['clinical:read'],
    items: [
      { label: 'Medicine', icon: Stethoscope, path: '/clinic/medicine', requiredPermissions: [] },
      { label: 'ENT', icon: Stethoscope, path: '/clinic/ent', requiredPermissions: [] },
      { label: 'Dental', icon: Stethoscope, path: '/clinic/dental', requiredPermissions: [] },
      { label: 'Retina', icon: Stethoscope, path: '/clinic/retina', requiredPermissions: [] },
      { label: 'Glaucoma', icon: Stethoscope, path: '/clinic/glaucoma', requiredPermissions: [] },
      { label: 'Orbit', icon: Stethoscope, path: '/clinic/orbit', requiredPermissions: [] },
      { label: 'Peds Ophth', icon: Stethoscope, path: '/clinic/pediatrics-ophth', requiredPermissions: [] },
      { label: 'Gen Ophth', icon: Stethoscope, path: '/clinic/general-ophth', requiredPermissions: [] },
      { label: 'Optometry', icon: Stethoscope, path: '/clinic/optometry', requiredPermissions: [] },
      { label: 'Imaging', icon: Stethoscope, path: '/clinic/imaging', requiredPermissions: [] },
    ],
  },
  {
    key: 'surgery',
    label: 'Surgery',
    requiredPermissions: ['surgery:read'],
    items: [
      { label: 'Preoperative', icon: ClipboardCheck, path: '/preoperative', requiredPermissions: ['preoperative:read'] },
      { label: 'Surgery Gantt', icon: GanttChartSquare, path: '/surgery', requiredPermissions: [] },
      { label: 'Surgery Dashboard', icon: LayoutDashboard, path: '/surgery/dashboard', requiredPermissions: [] },
      { label: 'Surgery Scheduler', icon: Calendar, path: '/surgery/schedule', requiredPermissions: [] },
    ],
  },
  {
    key: 'wards',
    label: 'Wards & Inpatient',
    requiredPermissions: ['ward:read'],
    items: [
      { label: 'Wards & Beds', icon: Bed, path: '/wards', requiredPermissions: [] },
      { label: 'In-Patient', icon: HeartPulse, path: '/inpatient', requiredPermissions: [] },
    ],
  },
  {
    key: 'pharmacy',
    label: 'Pharmacy',
    requiredPermissions: ['pharmacy:read'],
    items: [
      { label: 'Pharmacy Dashboard', icon: LayoutDashboard, path: '/pharmacy/dashboard', requiredPermissions: [] },
      { label: 'Pharmacy POS', icon: ShoppingCart, path: '/pharmacy', requiredPermissions: [] },
      { label: 'Pharmacy Products', icon: Package, path: '/pharmacy/products', requiredPermissions: [] },
      { label: 'Sales Report', icon: BarChart3, path: '/pharmacy/reports', requiredPermissions: [] },
    ],
  },
  {
    key: 'optics',
    label: 'Optics',
    requiredPermissions: ['optics:read', 'optic_lab:read'],
    items: [
      { label: 'Optics POS', icon: Glasses, path: '/optics', requiredPermissions: ['optics:read'] },
      { label: 'Optics Products', icon: Package, path: '/optics/products', requiredPermissions: ['optics:read'] },
      { label: 'Optic Lab', icon: Wrench, path: '/optic-lab', requiredPermissions: ['optic_lab:read'] },
    ],
  },
  {
    key: 'lab',
    label: 'Lab & Diagnostics',
    requiredPermissions: ['diagnostics:read'],
    items: [
      { label: 'Laboratory', icon: FlaskConical, path: '/lab', requiredPermissions: [] },
    ],
  },
  {
    key: 'emergency',
    label: 'Emergency',
    requiredPermissions: ['emergency:read'],
    items: [
      { label: 'ED Dashboard', icon: Ambulance, path: '/emergency', requiredPermissions: [] },
      { label: 'Triage', icon: HeartPulse, path: '/emergency/triage', requiredPermissions: ['emergency:write'] },
      { label: 'Register', icon: ClipboardList, path: '/emergency/register', requiredPermissions: ['emergency:write'] },
      { label: 'Stats', icon: BarChart3, path: '/emergency/stats', requiredPermissions: [] },
    ],
  },
  {
    key: 'operations',
    label: 'Operations & Inventory',
    requiredPermissions: ['inventory:read', 'purchase:read'],
    items: [
      { label: 'Inventory', icon: Warehouse, path: '/inventory', requiredPermissions: ['inventory:read'] },
      { label: 'Procurement', icon: Truck, path: '/procurement', requiredPermissions: ['purchase:read'] },
    ],
  },
  {
    key: 'finance',
    label: 'Finance',
    requiredPermissions: ['accounting:read'],
    items: [
      { label: 'Accounting', icon: DollarSign, path: '/accounting', requiredPermissions: [] },
      { label: 'Service Items', icon: ListChecks, path: '/accounting/service-items', requiredPermissions: [] },
      { label: 'Invoices', icon: FileText, path: '/accounting/invoices', requiredPermissions: [] },
      { label: 'Chart of Accounts', icon: BookOpen, path: '/accounting/chart-of-accounts', requiredPermissions: [] },
      { label: 'Journal Entries', icon: Scale, path: '/accounting/journal-entries', requiredPermissions: [] },
      { label: 'Balance Sheet', icon: Landmark, path: '/accounting/balance-sheet', requiredPermissions: [] },
      { label: 'Fixed Assets', icon: Boxes, path: '/accounting/fixed-assets', requiredPermissions: [] },
      { label: 'Payment Plans', icon: CreditCard, path: '/accounting/payment-plans', requiredPermissions: [] },
      { label: 'AR Aging', icon: BarChart3, path: '/accounting/ar-aging', requiredPermissions: [] },
      { label: 'Reports', icon: BarChart3, path: '/reports', requiredPermissions: [] },
    ],
  },
  {
    key: 'insurance',
    label: 'Insurance',
    requiredPermissions: ['insurance:read'],
    items: [
      { label: 'Companies', icon: Shield, path: '/insurance/companies', requiredPermissions: [] },
      { label: 'Policies', icon: FileCheck, path: '/insurance/policies', requiredPermissions: [] },
      { label: 'Pre-Authorizations', icon: ClipboardCheck, path: '/insurance/pre-authorizations', requiredPermissions: [] },
      { label: 'Claims', icon: ReceiptText, path: '/insurance/claims', requiredPermissions: [] },
      { label: 'Settlements', icon: Banknote, path: '/insurance/settlements', requiredPermissions: [] },
      { label: 'Denial Appeals', icon: AlertTriangle, path: '/insurance/denial-appeals', requiredPermissions: [] },
      { label: 'COB', icon: RefreshCw, path: '/insurance/cob', requiredPermissions: [] },
      { label: 'Reports', icon: BarChart3, path: '/insurance/reports', requiredPermissions: [] },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    requiredPermissions: ['admin:users', 'hr:read'],
    items: [
      { label: 'Admin', icon: Settings, path: '/admin', requiredPermissions: ['admin:users'] },
      { label: 'Integrations', icon: Plug, path: '/admin/integrations', requiredPermissions: ['admin:users'] },
      { label: 'FHIR Explorer', icon: Search, path: '/admin/fhir-explorer', requiredPermissions: ['admin:users'] },
      { label: 'Imaging Procedures', icon: Activity, path: '/admin/imaging-procedure-types', requiredPermissions: ['pricing:write'] },
      { label: 'HR', icon: UsersRound, path: '/hr', requiredPermissions: ['hr:read'] },
      { label: 'My HR', icon: ClipboardCheck, path: '/hr/my', requiredPermissions: [] },
      { label: 'Settings', icon: Settings, path: '/settings', requiredPermissions: [] },
    ],
  },
];

export function getVisibleNav(userPermissions: string[]): NavGroup[] {
  return NAV_GROUPS
    .filter(group =>
      group.requiredPermissions.length === 0 ||
      group.requiredPermissions.some(p => userPermissions.includes(p))
    )
    .map(group => ({
      ...group,
      items: group.items.filter(item =>
        item.requiredPermissions.length === 0 ||
        item.requiredPermissions.some(p => userPermissions.includes(p))
      ),
    }))
    .filter(group => group.items.length > 0);
}

export function findNavItem(path: string): { group: string; item: string } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.path === path) return { group: group.label, item: item.label };
    }
  }
  const segments = path.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const parentPath = '/' + segments.slice(0, 2).join('/');
    return findNavItem(parentPath);
  }
  return null;
}
