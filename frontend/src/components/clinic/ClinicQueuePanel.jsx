import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

const statusConfig = {
  WAITING: { label: 'Waiting', class: 'bg-amber-100 text-amber-800 border-amber-200' },
  CALLED: { label: 'Called', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  IN_PROGRESS: { label: 'In Progress', class: 'bg-green-100 text-green-800 border-green-200' },
};

function waitTime(createdAt) {
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function priorityLabel(p) {
  if (p >= 8) return { label: 'Critical', class: 'text-red-600' };
  if (p >= 5) return { label: 'High', class: 'text-orange-500' };
  if (p >= 3) return { label: 'Medium', class: 'text-amber-600' };
  return { label: 'Normal', class: 'text-slate' };
}

export default function ClinicQueuePanel({ queue, loading, lastUpdated, onStartConsultation }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Waiting Queue</CardTitle>
          {lastUpdated && (
            <span className="text-caption text-slate">
              Updated {Math.floor((Date.now() - lastUpdated.getTime()) / 1000)}s ago
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && queue.length === 0 && (
          <p className="text-body text-slate py-4 text-center">Loading queue...</p>
        )}

        {!loading && queue.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-silver mb-3">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" strokeLinecap="round" />
            </svg>
            <p className="text-body font-medium text-slate">No patients in queue</p>
            <p className="text-caption text-slate mt-1">Patients checked in at reception will appear here</p>
          </div>
        )}

        {queue.length > 0 && (
          <div className="space-y-2">
            {queue.map((a) => {
              const status = statusConfig[a.status] || statusConfig.WAITING;
              const pri = priorityLabel(a.priority);
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-4 bg-bone rounded-lg px-4 py-3 hover:bg-lilac-bloom/10 transition-colors"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-paper border border-silver shrink-0">
                    <span className="text-subheading font-bold text-obsidian">#{a.token}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-body font-semibold text-obsidian truncate">{a.patient.fullName}</p>
                      <span className={`text-caption font-medium ${pri.class}`}>{pri.label}</span>
                    </div>
                    <p className="text-caption text-slate">
                      MRN: {a.patient.mrn}
                      {a.patient.gender && ` · ${a.patient.gender}`}
                      <span className="ml-2">{waitTime(a.createdAt)}</span>
                    </p>
                    {a.patient.chronicConditions?.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {a.patient.chronicConditions.slice(0, 3).map((c) => (
                          <span key={c} className="text-xs bg-lilac-bloom/20 text-obsidian px-2 py-0.5 rounded-full">
                            {c}
                          </span>
                        ))}
                        {a.patient.chronicConditions.length > 3 && (
                          <span className="text-xs text-slate">+{a.patient.chronicConditions.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={status.class}>{status.label}</Badge>
                    <Button size="sm" variant="primary" onClick={() => onStartConsultation(a)}>
                      See Patient
                    </Button>
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
