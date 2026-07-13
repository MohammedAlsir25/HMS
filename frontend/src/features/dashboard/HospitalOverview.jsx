import { useAccountingSummary } from '../../hooks/queries/useAccounting';
import { useSurgeryStats, useSurgeries } from '../../hooks/queries/useSurgery';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/currency';

export default function HospitalOverview() {
  const today = new Date().toISOString().slice(0, 10);
  const { data: accounting } = useAccountingSummary();
  const { data: stats = {} } = useSurgeryStats();
  const { data: surgeries = [] } = useSurgeries(today);
  const sum = (obj) => obj ? Object.values(obj).reduce((a, b) => a + b, 0) : 0;

  const pending = (stats.SCHEDULED || 0) + (stats.PREP || 0);
  const inSurgery = stats.IN_SURGERY || 0;
  const inRecovery = stats.RECOVERY || 0;

  const todaySurgeryCount = surgeries.length;
  const scheduledSurgeries = surgeries.filter((s) => s.status === 'SCHEDULED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-sm font-semibold text-obsidian">Hospital Overview</h1>
        <p className="text-body text-slate mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{formatCurrency(accounting?.today?.total)}</p>
            <p className="text-caption text-slate mt-1">Revenue Today</p>
            <p className="text-xs text-slate">{accounting?.today?.count || 0} txns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{formatCurrency(accounting?.week?.total)}</p>
            <p className="text-caption text-slate mt-1">Revenue This Week</p>
            <p className="text-xs text-slate">{accounting?.week?.count || 0} txns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{formatCurrency(accounting?.month?.total)}</p>
            <p className="text-caption text-slate mt-1">Revenue This Month</p>
            <p className="text-xs text-slate">{accounting?.month?.count || 0} txns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-green-600">{formatCurrency(accounting?.today?.grossProfit)}</p>
            <p className="text-caption text-slate mt-1">Gross Profit Today</p>
            <p className="text-xs text-slate">COGS: {formatCurrency(accounting?.today?.cogs)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Surgery Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Today's Surgeries</span>
              <span className="text-lg font-semibold text-obsidian">{stats.today || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Pending (Scheduled/Prep)</span>
              <span className="text-lg font-semibold text-amber-600">{pending}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">In Surgery</span>
              <span className="text-lg font-semibold text-green-600">{inSurgery}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">In Recovery</span>
              <span className="text-lg font-semibold text-purple-600">{inRecovery}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Completed All Time</span>
              <span className="text-lg font-semibold text-blue-600">{stats.COMPLETED || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by Source (Today)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {accounting?.today?.byType && Object.entries(accounting.today.byType)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 8)
              .map(([type, amount]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-caption text-graphite capitalize">{type.toLowerCase()}</span>
                  <span className="text-caption font-semibold text-obsidian">{formatCurrency(amount)}</span>
                </div>
              ))}
            {(!accounting?.today?.byType || Object.keys(accounting.today.byType).length === 0) && (
              <p className="text-caption text-slate text-center py-4">No transactions today</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Surgery Schedule</CardTitle>
            <span className="text-caption text-slate">{todaySurgeryCount} surgeries</span>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {surgeries.length === 0 && (
              <p className="text-caption text-slate text-center py-8">No surgeries scheduled today</p>
            )}
            {surgeries.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded border border-silver/50 hover:bg-bone/30 transition-colors">
                <div className="min-w-0">
                  <p className="text-caption font-medium text-obsidian truncate">{s.patient?.fullName || 'Unknown'}</p>
                  <p className="text-xs text-slate">OR {s.orRoom} — {new Date(s.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Badge variant={
                  s.status === 'SCHEDULED' ? 'primary' :
                  s.status === 'PREP' ? 'warning' :
                  s.status === 'IN_SURGERY' ? 'info' :
                  s.status === 'RECOVERY' ? 'info' : 'default'
                } size="sm">{s.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {accounting?.openShift && (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-body font-medium text-obsidian">Open Shift: {accounting.openShift.user?.fullName || 'Unknown'}</p>
              <p className="text-caption text-slate">
                Opened at {new Date(accounting.openShift.openedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                {' — '}
                {accounting.openShift.transactions?.length || 0} transactions
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="success">Open</Badge>
              <span className="text-caption font-semibold text-obsidian">
                {formatCurrency((accounting.openShift.transactions || []).reduce((acc, t) => acc + Number(t.amount), 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}