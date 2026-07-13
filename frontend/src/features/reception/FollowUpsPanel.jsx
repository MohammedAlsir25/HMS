import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { notifySuccess, notifyError } from '../../utils/notify';
import { useSurgeryFollowUps, useUpdateFollowUp } from '../../hooks/queries/useSurgery';

function daysUntil(dateStr) {
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function statusBadge(dateStr) {
  const days = daysUntil(dateStr);
  if (days < 0) return <Badge variant="danger" size="sm">Overdue</Badge>;
  if (days === 0) return <Badge variant="warning" size="sm">Today</Badge>;
  if (days <= 3) return <Badge variant="info" size="sm">Soon ({days}d)</Badge>;
  return <Badge variant="default" size="sm">{days} days</Badge>;
}

export default function FollowUpsPanel({ clinics }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [followUpType, setFollowUpType] = useState('clinic');
  const [viewMode, setViewMode] = useState('list');
  const [clinicFilter, setClinicFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [postOpDate, setPostOpDate] = useState('');

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['reception-follow-ups', clinicFilter, search],
    queryFn: () => {
      let url = '/reception/follow-ups';
      const params = [];
      if (clinicFilter) params.push(`clinicId=${clinicFilter}`);
      if (search && search.length >= 2) params.push(`q=${encodeURIComponent(search)}`);
      if (params.length) url += '?' + params.join('&');
      return api.get(url);
    },
    refetchInterval: 30000,
  });

  const today = new Date().toISOString().slice(0, 10);
  const { data: postOpFollowUps = [], isLoading: postOpLoading } = useSurgeryFollowUps(
    postOpDate ? { date: postOpDate } : { date: today }
  );
  const updateFollowUp = useUpdateFollowUp();

  const arriveMutation = useMutation({
    mutationFn: (id) => api.patch(`/reception/reservations/${id}/arrive`, { visitType: 'FOLLOW_UP', priority: 5 }),
    onSuccess: () => {
      notifySuccess('Patient arrived for follow-up');
      queryClient.invalidateQueries({ queryKey: ['reception-follow-ups'] });
    },
    onError: (err) => notifyError(err),
  });

  const filtered = selectedDate
    ? followUps.filter((fu) => fu.scheduledAt?.startsWith(selectedDate))
    : followUps;

  const dates = [...new Set(followUps.map((fu) => fu.scheduledAt?.split('T')[0]).filter(Boolean))].sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle>Follow-Ups</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant={followUpType === 'clinic' ? 'primary' : 'secondary'} onClick={() => setFollowUpType('clinic')}>Clinic</Button>
            <Button size="sm" variant={followUpType === 'postop' ? 'primary' : 'secondary'} onClick={() => setFollowUpType('postop')}>Post-Op</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {followUpType === 'clinic' && (
          <>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Input label="Search Patient" placeholder="Name or MRN..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Clinic</label>
            <select value={clinicFilter} onChange={(e) => setClinicFilter(e.target.value)}
              className="px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="">All Clinics</option>
              {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {isLoading ? (
          <p className="text-body text-slate text-center py-8">Loading...</p>
        ) : viewMode === 'list' ? (
          filtered.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No follow-ups found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((fu) => (
                <div key={fu.id} className="flex items-center justify-between p-3 bg-bone rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-obsidian truncate">{fu.patient.fullName}</p>
                    <p className="text-caption text-slate">{fu.patient.mrn} · {fu.clinic.name}</p>
                    {fu.doctor && <p className="text-caption text-slate">Dr. {fu.doctor.fullName}</p>}
                    {fu.notes && <p className="text-caption text-slate mt-0.5 truncate">{fu.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-caption text-obsidian whitespace-nowrap">
                      {new Date(fu.scheduledAt).toLocaleDateString()}
                    </span>
                    {statusBadge(fu.scheduledAt)}
                    <Button size="sm" variant="primary" onClick={() => arriveMutation.mutate(fu.id)}
                      loading={arriveMutation.isPending}>
                      Arrived
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-graphite mb-2">Select a date</p>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {dates.length === 0 && <p className="text-caption text-slate">No dates available</p>}
                {dates.map((d) => (
                  <button key={d}
                    onClick={() => setSelectedDate(selectedDate === d ? null : d)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-body transition-colors touch-target
                      ${selectedDate === d ? 'bg-lilac-bloom text-obsidian' : 'hover:bg-bone text-graphite'}`}
                  >
                    {new Date(d).toLocaleDateString()} <span className="text-caption text-slate">({followUps.filter((f) => f.scheduledAt?.startsWith(d)).length})</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              {selectedDate ? (
                <div>
                  <p className="text-sm font-medium text-graphite mb-2">{new Date(selectedDate).toLocaleDateString()}</p>
                  {followUps.filter((f) => f.scheduledAt?.startsWith(selectedDate)).length === 0 ? (
                    <p className="text-caption text-slate">No follow-ups on this date</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {followUps.filter((f) => f.scheduledAt?.startsWith(selectedDate)).map((fu) => (
                        <div key={fu.id} className="flex items-center justify-between p-3 bg-bone rounded-lg">
                          <div className="min-w-0 flex-1">
                            <p className="text-body font-medium text-obsidian truncate">{fu.patient.fullName}</p>
                            <p className="text-caption text-slate">{fu.patient.mrn} · {fu.clinic.name}</p>
                          </div>
                          <Button size="sm" variant="primary" onClick={() => arriveMutation.mutate(fu.id)}
                            loading={arriveMutation.isPending} className="ml-2 shrink-0">
                            Arrived
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px]">
                  <p className="text-caption text-slate">Select a date to view follow-ups</p>
                </div>
              )}
            </div>
          </div>
        )}
        </>
        )}

        {followUpType === 'postop' && (
          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div>
                <label className="text-sm font-medium text-graphite block mb-1">Filter by Date</label>
                <input
                  type="date"
                  value={postOpDate}
                  onChange={(e) => setPostOpDate(e.target.value)}
                  className="px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                />
              </div>
            </div>

            {postOpLoading ? (
              <p className="text-body text-slate text-center py-8">Loading...</p>
            ) : postOpFollowUps.length === 0 ? (
              <p className="text-body text-slate text-center py-8">No post-op follow-ups for this date</p>
            ) : (
              <div className="space-y-2">
                {postOpFollowUps.map((fu) => (
                  <div key={fu.id} className="flex items-center justify-between p-3 bg-bone rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-medium text-obsidian truncate">{fu.patient.fullName}</p>
                      <p className="text-caption text-slate">{fu.patient.mrn} · OR {fu.surgery?.orRoom}</p>
                      {fu.notes && <p className="text-caption text-slate mt-0.5 truncate">{fu.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-caption text-obsidian whitespace-nowrap">
                        {new Date(fu.scheduledAt).toLocaleDateString()}
                      </span>
                      <Badge variant={
                        fu.status === 'SCHEDULED' ? 'warning' :
                        fu.status === 'COMPLETED' ? 'success' : 'danger'
                      } size="sm">{fu.status}</Badge>
                      {fu.status === 'SCHEDULED' && (
                        <>
                          <Button size="sm" variant="primary"
                            onClick={() => updateFollowUp.mutate({ followUpId: fu.id, status: 'COMPLETED' })}
                            loading={updateFollowUp.isPending}>
                            Complete
                          </Button>
                          <Button size="sm" variant="secondary"
                            onClick={() => updateFollowUp.mutate({ followUpId: fu.id, status: 'MISSED' })}>
                            Missed
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}