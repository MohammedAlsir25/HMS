import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { useSurgeryReport } from '../../hooks/queries/useReports';

const trendColumns = [
  { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) },
  { key: 'count', label: 'Surgeries', render: (r) => <span className="font-semibold">{r.count || 0}</span> },
];

const typeColumns = [
  { key: 'type', label: 'Surgery Type' },
  { key: 'count', label: 'Count', render: (r) => <span className="font-semibold">{r.count || 0}</span> },
];

const orColumns = [
  { key: 'orName', label: 'OR Room' },
  { key: 'totalSlots', label: 'Surgeries', render: (r) => r.totalSlots || 0 },
  { key: 'used', label: 'Completed', render: (r) => r.used || 0 },
  { key: 'rate', label: 'Utilization', render: (r) => <span className="font-medium">{r.rate || '0%'}</span> },
];

function parsePercent(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace('%', '')) || 0;
  return 0;
}

export default function SurgeryReport({ dateParams }) {
  const { data, isLoading, error } = useSurgeryReport(dateParams);

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
        <p className="text-body text-red-500">{error.message || 'Failed to load surgery data'}</p>
      </CardContent></Card>
    );
  }

  if (!data) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-slate">No surgery data available</p>
      </CardContent></Card>
    );
  }

  const summary = data.summary || {};
  const orUtil = data.orUtilization || [];
  const avgUtil = orUtil.length > 0
    ? orUtil.reduce((s, o) => s + parsePercent(o.rate), 0) / orUtil.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{summary.totalSurgeries || 0}</p>
            <p className="text-caption text-slate">Total Surgeries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{(data.avgDuration || 0).toFixed(0)} hrs</p>
            <p className="text-caption text-slate">Avg Duration</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className={`text-2xl font-bold ${parsePercent(data.cancellationRate) > 10 ? 'text-red-600' : 'text-green-600'}`}>{data.cancellationRate || '0%'}</p>
            <p className="text-caption text-slate">Cancellation Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{avgUtil.toFixed(1)}%</p>
            <p className="text-caption text-slate">Avg OR Utilization</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-green-600">{summary.completed || 0}</p>
            <p className="text-caption text-slate">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-blue-600">{summary.inProgress || 0}</p>
            <p className="text-caption text-slate">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-amber-600">{summary.scheduled || 0}</p>
            <p className="text-caption text-slate">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-red-600">{summary.cancelled || 0}</p>
            <p className="text-caption text-slate">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Surgeries Per Day</CardTitle></CardHeader>
        <CardContent>
          <Table columns={trendColumns} data={data.surgeriesPerDay || []} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>By Surgery Type</CardTitle></CardHeader>
          <CardContent>
            <Table columns={typeColumns} data={data.byType || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>OR Utilization</CardTitle></CardHeader>
          <CardContent>
            <Table columns={orColumns} data={orUtil} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
