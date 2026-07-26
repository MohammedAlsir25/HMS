import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { useHRReport } from '../../hooks/queries/useReports';

const deptColumns = [
  { key: 'department', label: 'Department' },
  { key: 'count', label: 'Headcount', render: (r) => <span className="font-semibold">{r.count || 0}</span> },
  { key: 'percent', label: '%', render: (r) => r.percent || '0%' },
];

const leaveColumns = [
  { key: 'type', label: 'Leave Type' },
  { key: 'total', label: 'Requests', render: (r) => r.total || 0 },
  { key: 'used', label: 'Approved', render: (r) => <span className="text-green-600">{r.used || 0}</span> },
  { key: 'pending', label: 'Pending', render: (r) => <span className="text-amber-600">{r.pending || 0}</span> },
];

function parsePercent(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace('%', '')) || 0;
  return 0;
}

export default function HRReport({ dateParams }) {
  const { data, isLoading, error } = useHRReport(dateParams);

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
        <p className="text-body text-red-500">{error.message || 'Failed to load HR data'}</p>
      </CardContent></Card>
    );
  }

  if (!data) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-slate">No HR data available</p>
      </CardContent></Card>
    );
  }

  const attendance = data.attendanceDetails || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{data.totalEmployees || 0}</p>
            <p className="text-caption text-slate">Total Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-green-600">{parsePercent(data.attendanceRate).toFixed(1)}%</p>
            <p className="text-caption text-slate">Attendance Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-amber-600">{data.pendingLeaveRequests || 0}</p>
            <p className="text-caption text-slate">Pending Leave Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-blue-600">{data.newHires || 0}</p>
            <p className="text-caption text-slate">New Hires (30d)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{attendance.presentDays || 0}</p>
            <p className="text-caption text-slate">Present Days (30d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{attendance.totalDays || 0}</p>
            <p className="text-caption text-slate">Total Attendance Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-green-600">{data.approvedLeaveRequests || 0}</p>
            <p className="text-caption text-slate">Approved Leaves</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Headcount by Department</CardTitle></CardHeader>
        <CardContent>
          <Table columns={deptColumns} data={data.headcountByDepartment || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Leave Usage by Type</CardTitle></CardHeader>
        <CardContent>
          <Table columns={leaveColumns} data={data.leaveUsage || []} />
        </CardContent>
      </Card>
    </div>
  );
}
