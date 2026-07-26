import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { useLabReport } from '../../hooks/queries/useReports';

const trendColumns = [
  { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) },
  { key: 'count', label: 'Tests', render: (r) => <span className="font-semibold">{r.count || 0}</span> },
];

const tatColumns = [
  { key: 'testType', label: 'Test Type' },
  { key: 'avgHours', label: 'Avg TAT (hours)', render: (r) => <span className="font-medium">{(r.avgHours || 0).toFixed(1)}h</span> },
  { key: 'totalTests', label: 'Total Tests', render: (r) => r.totalTests || 0 },
];

const abnormalColumns = [
  { key: 'testType', label: 'Test Type' },
  { key: 'total', label: 'Total', render: (r) => r.total || 0 },
  { key: 'abnormalRate', label: 'Abnormal Rate', render: (r) => <span className="text-red-600 font-semibold">{r.abnormalRate || '0%'}</span> },
];

const deptColumns = [
  { key: 'department', label: 'Department' },
  { key: 'count', label: 'Tests', render: (r) => r.count || 0 },
];

function parsePercent(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace('%', '')) || 0;
  return 0;
}

export default function LabReport({ dateParams }) {
  const { data, isLoading, error } = useLabReport(dateParams);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="text-center py-5"><div className="h-8 bg-bone rounded animate-pulse" /><div className="h-4 bg-bone rounded animate-pulse mt-2" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-red-500">{error.message || 'Failed to load lab data'}</p>
      </CardContent></Card>
    );
  }

  if (!data) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-slate">No lab data available</p>
      </CardContent></Card>
    );
  }

  const summary = data.summary || {};
  const tat = data.turnaroundTime || {};
  const abnormalRate = data.abnormalRate || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{summary.totalTests || 0}</p>
            <p className="text-caption text-slate">Total Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{(tat.avg || 0).toFixed(1)}h</p>
            <p className="text-caption text-slate">Avg Turnaround</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-amber-600">{parsePercent(abnormalRate.overall).toFixed(1)}%</p>
            <p className="text-caption text-slate">Abnormal Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-green-600">{summary.completedOrders || 0}</p>
            <p className="text-caption text-slate">Completed Orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{summary.totalOrders || 0}</p>
            <p className="text-caption text-slate">Total Orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-amber-600">{summary.pendingOrders || 0}</p>
            <p className="text-caption text-slate">Pending Orders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Tests Per Day</CardTitle></CardHeader>
        <CardContent>
          <Table columns={trendColumns} data={data.testsPerDay || []} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Avg TAT by Test Type</CardTitle></CardHeader>
          <CardContent>
            <Table columns={tatColumns} data={tat.byTestType || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Abnormal Rate by Test Type</CardTitle></CardHeader>
          <CardContent>
            <Table columns={abnormalColumns} data={abnormalRate.byTest || []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>By Department</CardTitle></CardHeader>
        <CardContent>
          <Table columns={deptColumns} data={data.byDepartment || []} />
        </CardContent>
      </Card>
    </div>
  );
}
