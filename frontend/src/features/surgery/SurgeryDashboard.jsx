import { useNavigate } from 'react-router-dom';
import { useSurgeries, useSurgeryStats } from '../../hooks/queries/useSurgery';
import { useAccountingSummary } from '../../hooks/queries/useAccounting';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const statusConfig = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-lilac-bloom', text: 'text-lilac-bloom' },
  PREP: { label: 'Prep', color: 'bg-amber-400', text: 'text-amber-600' },
  IN_SURGERY: { label: 'In Surgery', color: 'bg-green-400', text: 'text-green-600' },
  RECOVERY: { label: 'Recovery', color: 'bg-purple-400', text: 'text-purple-600' },
  COMPLETED: { label: 'Completed', color: 'bg-blue-400', text: 'text-blue-600' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-400', text: 'text-red-600' },
};

export default function SurgeryDashboard() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const { data: stats = {} } = useSurgeryStats();
  const { data: surgeries = [] } = useSurgeries(today);
  const { data: accounting } = useAccountingSummary();
  const surgeryRevenueTypes = accounting?.today?.byType || {};
  const todaySurgeryRevenue = (surgeryRevenueTypes.SURGERY || 0) + (surgeryRevenueTypes.PREOP || 0);

  const maxCount = Math.max(
    ...Object.keys(statusConfig).map((k) => stats[k] || 0),
    1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Surgery Dashboard</h1>
          <p className="text-body text-slate mt-1">Analytics and overview</p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-sm font-medium bg-paper border border-silver rounded-lg text-obsidian hover:bg-bone transition-colors"
            onClick={() => navigate('/surgery')}
          >
            Gantt View
          </button>
          <button
            className="px-4 py-2 text-sm font-medium bg-paper border border-silver rounded-lg text-obsidian hover:bg-bone transition-colors"
            onClick={() => navigate('/surgery/schedule')}
          >
            Schedule
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{stats.today || 0}</p>
            <p className="text-caption text-slate mt-1">Today's Surgeries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{stats.total || 0}</p>
            <p className="text-caption text-slate mt-1">Total All Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-amber-600">{(stats.SCHEDULED || 0) + (stats.PREP || 0)}</p>
            <p className="text-caption text-slate mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-green-600">{stats.COMPLETED || 0}</p>
            <p className="text-caption text-slate mt-1">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-lilac-bloom">${todaySurgeryRevenue.toFixed(2)}</p>
            <p className="text-caption text-slate mt-1">Surgery Revenue Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-red-600">{stats.CANCELLED || 0}</p>
            <p className="text-caption text-slate mt-1">Cancelled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Surgeries by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const count = stats[key] || 0;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-graphite">{cfg.label}</span>
                    <span className="font-semibold text-obsidian">{count}</span>
                  </div>
                  <div className="w-full h-3 bg-bone rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${cfg.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Schedule ({today})</CardTitle>
              <span className="text-caption text-slate">{surgeries.length} surgeries</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {surgeries.length === 0 && (
              <p className="text-caption text-slate text-center py-8">No surgeries scheduled today</p>
            )}
            {surgeries.map((s) => {
              const cfg = statusConfig[s.status] || statusConfig.SCHEDULED;
              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-silver p-3 hover:bg-bone/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/surgery')}
                >
                  <div className="min-w-0">
                    <p className="text-body font-medium text-obsidian truncate">{s.patient?.fullName}</p>
                    <p className="text-caption text-slate">
                      OR {s.orRoom} &middot; {new Date(s.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {' — '}
                      {new Date(s.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Badge variant={
                    s.status === 'SCHEDULED' ? 'primary' :
                    s.status === 'PREP' ? 'warning' :
                    s.status === 'IN_SURGERY' ? 'info' :
                    s.status === 'RECOVERY' ? 'info' : 'default'
                  } size="sm">{s.status}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>OR Utilization — Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((room) => {
              const roomSurgeries = surgeries.filter((s) => s.orRoom === room);
              const totalMins = roomSurgeries.reduce((acc, s) => {
                return acc + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
              }, 0);
              const utilizationPct = Math.min(Math.round((totalMins / (14 * 60)) * 100), 100);
              return (
                <div key={room} className="text-center">
                  <p className="text-body font-medium text-obsidian">OR {room}</p>
                  <p className="text-2xl font-bold mt-1" style={{
                    color: utilizationPct > 75 ? '#16a34a' : utilizationPct > 40 ? '#ca8a04' : '#6b7280'
                  }}>
                    {utilizationPct}%
                  </p>
                  <p className="text-caption text-slate">{roomSurgeries.length} surgeries</p>
                  <div className="w-full h-2 bg-bone rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-lilac-bloom transition-all duration-500"
                      style={{ width: `${utilizationPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
