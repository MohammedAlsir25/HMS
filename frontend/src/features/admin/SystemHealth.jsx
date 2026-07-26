import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const statCard = (label, value, variant = 'default') => (
  <div className="p-4 border border-silver rounded-lg bg-white dark:bg-obsidian/20">
    <p className="text-caption text-slate mb-1">{label}</p>
    <p className={`text-heading-sm font-semibold ${variant === 'success' ? 'text-green-600' : variant === 'warning' ? 'text-amber-500' : variant === 'danger' ? 'text-red-500' : 'text-obsidian dark:text-paper'}`}>
      {value ?? '-'}
    </p>
  </div>
);

export default function SystemHealth() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'system', 'health'],
    queryFn: () => api.get('/admin/system/health'),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-4 border border-silver rounded-lg bg-white dark:bg-obsidian/20 animate-pulse">
            <div className="h-3 w-16 bg-slate/20 rounded mb-2" />
            <div className="h-6 w-12 bg-slate/20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-body text-red-500">Failed to load system health</p>
            <button onClick={() => refetch()} className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white">Retry</button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent>
          <p className="text-body text-slate py-8 text-center">No system data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-heading-sm font-semibold text-obsidian dark:text-paper">System Health</h2>
          <p className="text-caption text-slate mt-1">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </p>
        </div>
        <Badge variant={data.status === 'ok' ? 'success' : 'danger'}>{data.status}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCard('DB Connected', data.db?.connected ? 'Connected' : 'Disconnected', data.db?.connected ? 'success' : 'danger')}
        {statCard('Active Users', data.users?.total ?? 0)}
        {statCard('Active (15min)', data.users?.activeLast15min ?? 0)}
        {statCard('Total Patients', data.patients?.total ?? 0)}
        {statCard('Departments', data.departments?.total ?? 0)}
        {statCard('Appointments', data.appointments?.total ?? 0)}
        {statCard('Queue Depth', data.appointments?.queueDepth ?? 0, (data.appointments?.queueDepth ?? 0) > 50 ? 'warning' : 'default')}
        {statCard('Errors (24h)', data.errors?.last24h ?? 0, (data.errors?.last24h ?? 0) > 10 ? 'danger' : 'default')}
      </div>
    </div>
  );
}
