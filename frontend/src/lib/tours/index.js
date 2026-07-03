const DASHBOARD_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Al Jawarih!',
    text: 'This is your command center. Each tile opens a different module. Let\'s take a quick tour of what\'s available.',
    attachTo: { element: '[data-tour="dashboard"]', on: 'bottom' },
  },
  {
    id: 'reception',
    title: 'Reception',
    text: 'Check in patients, manage reservations, and view the waiting room queue.',
    attachTo: { element: '[data-tour="reception"]', on: 'bottom' },
  },
  {
    id: 'waiting-room',
    title: 'Waiting Room',
    text: 'TV-style display showing which patients are waiting across all clinics.',
    attachTo: { element: '[data-tour="waiting-room"]', on: 'bottom' },
  },
  {
    id: 'clinics',
    title: 'Medical Clinics',
    text: 'Access patient records, write prescriptions, and manage clinic workflows for Medicine, ENT, Dental, Retina, and more.',
    attachTo: { element: '[data-tour="medicine"]', on: 'bottom' },
  },
  {
    id: 'surgery',
    title: 'Surgery',
    text: 'Schedule and manage surgical procedures with Gantt-style planning.',
    attachTo: { element: '[data-tour="surgery"]', on: 'bottom' },
  },
  {
    id: 'referrals',
    title: 'Referrals',
    text: 'Manage cross-clinic and cross-hospital patient referrals.',
    attachTo: { element: '[data-tour="referrals"]', on: 'bottom' },
  },
  {
    id: 'laboratory',
    title: 'Laboratory',
    text: 'View lab orders, submit results, and track pending tests.',
    attachTo: { element: '[data-tour="laboratory"]', on: 'bottom' },
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy',
    text: 'Dispense medications, manage stock, and process prescriptions.',
    attachTo: { element: '[data-tour="pharmacy"]', on: 'bottom' },
  },
  {
    id: 'optics',
    title: 'Optics',
    text: 'Manage optical sales, frames, lenses, and customer orders.',
    attachTo: { element: '[data-tour="optics"]', on: 'bottom' },
  },
  {
    id: 'inventory',
    title: 'Inventory',
    text: 'Track stock levels, manage suppliers, and handle procurement requests.',
    attachTo: { element: '[data-tour="inventory"]', on: 'bottom' },
  },
  {
    id: 'accounting',
    title: 'Accounting',
    text: 'Track revenue, expenses, COGS, and CAPEX with multi-tier approval.',
    attachTo: { element: '[data-tour="accounting"]', on: 'bottom' },
  },
  {
    id: 'admin',
    title: 'Admin',
    text: 'Manage users, roles, permissions, and system configuration.',
    attachTo: { element: '[data-tour="admin"]', on: 'bottom' },
  },
  {
    id: 'hr',
    title: 'HR',
    text: 'Manage employees, payroll, leave requests, and department structures.',
    attachTo: { element: '[data-tour="hr"]', on: 'bottom' },
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    text: 'You can replay this tour anytime from the Settings page. Click any tile to get started.',
    buttons: [
      {
        text: 'Done',
        action() { this.complete(); },
      },
    ],
  },
];

const RECEPTION_STEPS = [
  {
    id: 'welcome',
    title: 'Reception Dashboard',
    text: 'This is where you manage patient check-ins, reservations, and the waiting area.',
    attachTo: { element: '[data-tour="reception-page"]', on: 'bottom' },
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    text: 'Start by checking in a new patient or viewing today\'s reservations.',
    buttons: [
      {
        text: 'Done',
        action() { this.complete(); },
      },
    ],
  },
];

const PHARMACY_STEPS = [
  {
    id: 'welcome',
    title: 'Pharmacy Dashboard',
    text: 'Process prescriptions, dispense medications, and manage stock levels here.',
    attachTo: { element: '[data-tour="pharmacy-page"]', on: 'bottom' },
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    text: 'Start by processing a new prescription or checking inventory.',
    buttons: [
      {
        text: 'Done',
        action() { this.complete(); },
      },
    ],
  },
];

const ACCOUNTING_STEPS = [
  {
    id: 'welcome',
    title: 'Accounting Dashboard',
    text: 'Track revenue, expenses, COGS, and CAPEX. Multi-tier approval for high-value transactions.',
    attachTo: { element: '[data-tour="accounting-page"]', on: 'bottom' },
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    text: 'Review today\'s transactions or create a new expense entry.',
    buttons: [
      {
        text: 'Done',
        action() { this.complete(); },
      },
    ],
  },
];

const HR_STEPS = [
  {
    id: 'welcome',
    title: 'HR Dashboard',
    text: 'Manage employees, payroll runs, leave requests, and department structures.',
    attachTo: { element: '[data-tour="hr-page"]', on: 'bottom' },
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    text: 'Start by viewing employees or processing the next payroll run.',
    buttons: [
      {
        text: 'Done',
        action() { this.complete(); },
      },
    ],
  },
];

const LAB_STEPS = [
  {
    id: 'welcome',
    title: 'Lab Dashboard',
    text: 'View lab orders, submit test results, and track pending analyses.',
    attachTo: { element: '[data-tour="lab-page"]', on: 'bottom' },
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    text: 'Check pending orders or review completed results.',
    buttons: [
      {
        text: 'Done',
        action() { this.complete(); },
      },
    ],
  },
];

const INVENTORY_STEPS = [
  {
    id: 'welcome',
    title: 'Inventory Dashboard',
    text: 'Track stock, manage suppliers, and handle procurement requests.',
    attachTo: { element: '[data-tour="inventory-page"]', on: 'bottom' },
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    text: 'Review current stock levels or create a new purchase order.',
    buttons: [
      {
        text: 'Done',
        action() { this.complete(); },
      },
    ],
  },
];

const SIMPLE_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome!',
    text: 'This is your dashboard. Use the navigation to get started.',
    attachTo: { element: '[data-tour="page-header"]', on: 'bottom' },
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    text: 'Replay this tour anytime from Settings.',
    buttons: [
      {
        text: 'Done',
        action() { this.complete(); },
      },
    ],
  },
];

const TOURS = {
  'Super Admin': { path: '/dashboard', steps: DASHBOARD_STEPS },
  'Receptionist': { path: '/reception', steps: RECEPTION_STEPS },
  'Pharmacist': { path: '/pharmacy', steps: PHARMACY_STEPS },
  'Optician': { path: '/optics', steps: SIMPLE_STEPS },
  'Accountant': { path: '/accounting', steps: ACCOUNTING_STEPS },
  'CFO': { path: '/accounting', steps: ACCOUNTING_STEPS },
  'CEO': { path: '/accounting', steps: ACCOUNTING_STEPS },
  'HR Manager': { path: '/hr', steps: HR_STEPS },
  'Lab Technician': { path: '/lab', steps: LAB_STEPS },
  'Lab Admin': { path: '/lab', steps: LAB_STEPS },
  'Inventory Manager': { path: '/inventory', steps: INVENTORY_STEPS },
  'Procurement Manager': { path: '/procurement', steps: SIMPLE_STEPS },
};

export function getTour(role) {
  return TOURS[role] || null;
}

export default TOURS;
