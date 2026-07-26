import { useTranslation } from 'react-i18next';
import { useDashboardData } from '../../hooks/queries/useReports';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { formatCurrency } from '../../utils/currency';

function WidgetCard({ title, value, subtitle, color = 'text-obsidian' }) {
  return (
    <Card>
      <CardContent className="text-center py-5">
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-caption text-slate">{title}</p>
        {subtitle && <p className="text-xs text-slate mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function kpisToMap(kpis) {
  if (!Array.isArray(kpis)) return {};
  const map = {};
  for (const kpi of kpis) {
    map[kpi.label] = kpi.value;
  }
  return map;
}

function AdminWidgets({ data, t }) {
  const k = kpisToMap(data.kpis);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <WidgetCard title={t('dashboard.revenueToday')} value={formatCurrency(k['Revenue Today'])} />
      <WidgetCard title={t('dashboard.revenueMonth')} value={formatCurrency(k['Revenue This Month'])} />
      <WidgetCard title={t('dashboard.transactionsToday')} value={k['Transactions Today'] || 0} />
      <WidgetCard title={t('dashboard.newPatientsToday')} value={k['New Patients Today'] || 0} />
      <WidgetCard title={t('dashboard.bedOccupancy')} value={`${k['Bed Occupancy'] || 0}%`} color={(k['Bed Occupancy'] || 0) > 90 ? 'text-red-600' : 'text-green-600'} />
      <WidgetCard title={t('dashboard.surgeriesToday')} value={k['Surgeries Today'] || 0} />
      <WidgetCard title={t('dashboard.pendingLeave')} value={k['Pending Leave Requests'] || 0} color="text-amber-600" />
    </div>
  );
}

function ReceptionWidgets({ data, t }) {
  const k = kpisToMap(data.kpis);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <WidgetCard title={t('dashboard.todaysAppointments')} value={k["Today's Appointments"] || 0} />
      <WidgetCard title={t('dashboard.checkedIn')} value={k['Checked In'] || 0} color="text-green-600" />
      <WidgetCard title={t('dashboard.pendingCheckin')} value={k['Pending Check-in'] || 0} color="text-amber-600" />
    </div>
  );
}

function DoctorWidgets({ data, t }) {
  const k = kpisToMap(data.kpis);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <WidgetCard title={t('dashboard.todaysAppointments')} value={k["Today's Appointments"] || 0} />
      <WidgetCard title={t('dashboard.pendingConsultations')} value={k['Pending Consultations'] || 0} color="text-amber-600" />
      <WidgetCard title={t('dashboard.surgeriesToday')} value={k['Surgeries Today'] || 0} />
    </div>
  );
}

function PharmacistWidgets({ data, t }) {
  const k = kpisToMap(data.kpis);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <WidgetCard title={t('dashboard.todaysSales')} value={formatCurrency(k["Today's Sales"])} />
      <WidgetCard title={t('dashboard.salesCountToday')} value={k['Sales Count Today'] || 0} color="text-green-600" />
      <WidgetCard title={t('dashboard.lowStockItems')} value={k['Low Stock Items'] || 0} color="text-red-600" />
      <WidgetCard title={t('dashboard.expiringSoon')} value={k['Expiring Soon (30d)'] || 0} color="text-amber-600" />
    </div>
  );
}

function LabWidgets({ data, t }) {
  const k = kpisToMap(data.kpis);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <WidgetCard title={t('dashboard.pendingOrders')} value={k['Pending Orders'] || 0} color="text-amber-600" />
      <WidgetCard title={t('dashboard.completedToday')} value={k['Completed Today'] || 0} color="text-green-600" />
      <WidgetCard title={t('dashboard.testsToday')} value={k['Tests Today'] || 0} />
      <WidgetCard title={t('dashboard.abnormalRate')} value={`${k['Abnormal Rate'] || 0}%`} color="text-red-600" />
    </div>
  );
}

function NurseWidgets({ data, t }) {
  const k = kpisToMap(data.kpis);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <WidgetCard title={t('dashboard.bedOccupancy')} value={`${k['Bed Occupancy'] || 0}%`} color={(k['Bed Occupancy'] || 0) > 90 ? 'text-red-600' : 'text-green-600'} />
      <WidgetCard title={t('dashboard.totalBeds')} value={k['Total Beds'] || 0} />
      <WidgetCard title={t('dashboard.occupiedBeds')} value={k['Occupied Beds'] || 0} />
      <WidgetCard title={t('dashboard.availableBeds')} value={k['Available Beds'] || 0} color="text-green-600" />
    </div>
  );
}

function AccountingWidgets({ data, t }) {
  const k = kpisToMap(data.kpis);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <WidgetCard title={t('dashboard.todaysRevenue')} value={formatCurrency(k['Revenue Today'])} />
      <WidgetCard title={t('dashboard.revenueThisMonth')} value={formatCurrency(k['Revenue This Month'])} />
      <WidgetCard title={t('dashboard.openShift')} value={k['Open Shift'] || 'No'} color={k['Open Shift'] === 'Yes' ? 'text-green-600' : 'text-slate'} />
      <WidgetCard title={t('dashboard.outstandingBalance')} value={formatCurrency(k['Outstanding Balance'])} color="text-amber-600" />
    </div>
  );
}

const ROLE_WIDGETS = {
  CEO: AdminWidgets,
  CFO: AdminWidgets,
  Admin: AdminWidgets,
  Administrator: AdminWidgets,
  'Super Admin': AdminWidgets,
  Receptionist: ReceptionWidgets,
  Doctor: DoctorWidgets,
  Pharmacist: PharmacistWidgets,
  'Lab Technician': LabWidgets,
  'Lab Admin': LabWidgets,
  Nurse: NurseWidgets,
  Accountant: AccountingWidgets,
  'Billing Officer': AccountingWidgets,
  'HR Officer': AdminWidgets,
};

function HRWidgets({ data, t }) {
  const k = kpisToMap(data.kpis);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <WidgetCard title={t('dashboard.totalHeadcount')} value={k['Total Headcount'] || 0} />
      <WidgetCard title={t('dashboard.pendingLeaveRequests')} value={k['Pending Leave Requests'] || 0} color="text-amber-600" />
      <WidgetCard title={t('dashboard.presentToday')} value={k['Present Today'] || 0} color="text-green-600" />
    </div>
  );
}

export default function RoleWidgets() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}><CardContent className="text-center py-5"><div className="h-8 bg-bone rounded animate-pulse" /><div className="h-4 bg-bone rounded animate-pulse mt-2" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card><CardContent className="text-center py-6">
        <p className="text-body text-red-500" role="alert">{error.message || t('dashboard.loadError')}</p>
      </CardContent></Card>
    );
  }

  if (!data) {
    return (
      <Card><CardContent className="text-center py-6">
        <p className="text-body text-slate">{t('dashboard.noData')}</p>
      </CardContent></Card>
    );
  }

  const role = user?.role || 'Admin';
  const normalizedRole = role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  let WidgetComponent = ROLE_WIDGETS[role] || ROLE_WIDGETS[normalizedRole];
  if (!WidgetComponent) {
    const lower = role.toLowerCase();
    if (lower.includes('admin') || lower.includes('super')) WidgetComponent = AdminWidgets;
    else if (lower.includes('doctor')) WidgetComponent = DoctorWidgets;
    else if (lower.includes('reception')) WidgetComponent = ReceptionWidgets;
    else if (lower.includes('pharmacist') || lower.includes('pharmacy')) WidgetComponent = PharmacistWidgets;
    else if (lower.includes('lab')) WidgetComponent = LabWidgets;
    else if (lower.includes('nurse')) WidgetComponent = NurseWidgets;
    else if (lower.includes('accountant') || lower.includes('billing')) WidgetComponent = AccountingWidgets;
    else if (lower.includes('hr')) WidgetComponent = HRWidgets;
    else WidgetComponent = AdminWidgets;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-subheading font-medium text-obsidian">{t('dashboard.overview')}</h2>
      <WidgetComponent data={data} t={t} />
    </div>
  );
}
