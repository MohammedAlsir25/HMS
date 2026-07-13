import { useOpticLabJobs } from '../../hooks/queries/useOpticLab';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

const statusBadge = {
  NEW: { label: 'New', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  COMPLETED: { label: 'Completed', variant: 'success' },
};

export default function OpticLabJobsTab() {
  const { data: jobs = [], isLoading } = useOpticLabJobs();

  if (isLoading) {
    return <p className="text-body text-slate text-center py-8">Loading lab jobs...</p>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Optic Lab Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No lab jobs yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-silver">
                    <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Job #</th>
                    <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Customer</th>
                    <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Phone</th>
                    <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Frame</th>
                    <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Prescription</th>
                    <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Status</th>
                    <th className="text-left py-2 px-3 text-caption font-medium text-graphite">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const badge = statusBadge[job.status] || { label: job.status, variant: 'default' };
                    return (
                      <tr key={job.id} className="border-b border-bone hover:bg-bone/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-obsidian">{job.jobNumber}</td>
                        <td className="py-2 px-3 text-obsidian">{job.customerName || '—'}</td>
                        <td className="py-2 px-3 text-graphite text-caption">{job.customerPhone || '—'}</td>
                        <td className="py-2 px-3 text-graphite">{job.frameName || '—'}</td>
                        <td className="py-2 px-3 text-caption text-graphite">
                          {job.sphOD || job.sphOS
                            ? `${job.sphOD ? `OD: ${job.sphOD}/${job.cylOD || '—'}/${job.axisOD || '—'}` : ''}${job.sphOD && job.sphOS ? ' | ' : ''}${job.sphOS ? `OS: ${job.sphOS}/${job.cylOS || '—'}/${job.axisOS || '—'}` : ''}`
                            : '—'}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                        </td>
                        <td className="py-2 px-3 text-slate text-caption">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
