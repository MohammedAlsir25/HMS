import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function UpcomingFollowUpsSection({ clinicSlug }) {
  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['upcoming-follow-ups', clinicSlug],
    queryFn: () => api.get(`/clinics/${clinicSlug}/upcoming-follow-ups`),
    refetchInterval: 30000,
  });

  if (isLoading) return null;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Follow-Ups</CardTitle>
          {followUps.length > 0 && <Badge>{followUps.length}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        {followUps.length === 0 ? (
          <p className="text-body text-slate text-center py-4">No upcoming follow-ups</p>
        ) : (
          <div className="space-y-2">
            {followUps.map((fu) => {
              const days = daysUntil(fu.scheduledAt);
              return (
                <div key={fu.id} className="flex items-center justify-between p-3 bg-bone rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-obsidian truncate">{fu.patient.fullName}</p>
                    <p className="text-caption text-slate">{fu.patient.mrn}</p>
                    {fu.notes && <p className="text-caption text-slate mt-0.5 truncate">{fu.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-caption text-obsidian whitespace-nowrap">
                      {new Date(fu.scheduledAt).toLocaleDateString()}
                    </span>
                    <Badge variant={days <= 0 ? 'danger' : days <= 1 ? 'warning' : 'default'} size="sm">
                      {days <= 0 ? 'Overdue' : days === 1 ? 'Tomorrow' : `${days} days`}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}