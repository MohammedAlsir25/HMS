import { useState } from 'react';
import { usePreoperativePatients, useUpdatePreopStatus } from '../../hooks/queries/usePreoperative';
import { useSurgeries } from '../../hooks/queries/useSurgery';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

const statusColors = {
  WAITING: { label: 'Waiting', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'info' },
  CLEARED: { label: 'Cleared', variant: 'success' },
  FLAGGED: { label: 'Flagged', variant: 'danger' },
};

export default function PreoperativePage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [flagModal, setFlagModal] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [referTo, setReferTo] = useState('');

  const { data: patients = [], isLoading } = usePreoperativePatients();
  const { data: surgeries = [] } = useSurgeries(date);
  const updateStatus = useUpdatePreopStatus();

  const surgeryMap = {};
  surgeries.forEach((s) => { surgeryMap[s.preoperativeId] = s; });

  const groups = { WAITING: [], IN_PROGRESS: [], CLEARED: [], FLAGGED: [] };
  patients.forEach((p) => {
    if (groups[p.status]) groups[p.status].push(p);
    else groups.WAITING.push(p);
  });

  const handleAdvance = (id, status) => {
    if (status === 'FLAGGED') {
      setFlagModal(id);
      return;
    }
    updateStatus.mutate({ id, status });
  };

  const handleFlagConfirm = () => {
    if (!flagModal) return;
    updateStatus.mutate({
      id: flagModal,
      status: 'FLAGGED',
      flaggedReason: flagReason,
      referredTo: referTo || undefined,
    });
    setFlagModal(null);
    setFlagReason('');
    setReferTo('');
  };

  const statusOrder = ['IN_PROGRESS', 'WAITING', 'CLEARED', 'FLAGGED'];
  const boardSections = statusOrder.filter((k) => groups[k].length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Preoperative Assessment</h1>
          <p className="text-body text-slate mt-1">Pre-surgical evaluation queue</p>
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor="preop-date" className="text-sm font-medium text-graphite">Surgery Date</label>
          <input
            id="preop-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          />
        </div>
      </div>

      {boardSections.length === 0 && !isLoading && (
        <Card>
          <CardContent>
            <p className="text-body text-slate text-center py-8">No preoperative patients found</p>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <Card>
          <CardContent>
            <p className="text-caption text-slate text-center py-8">Loading...</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {statusOrder.map((statusKey) => {
          const list = groups[statusKey] || [];
          if (list.length === 0) return null;
          const colors = statusColors[statusKey] || statusColors.WAITING;
          return (
            <Card key={statusKey} className="h-fit">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    <span className={`inline-flex items-center gap-2`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        statusKey === 'IN_PROGRESS' ? 'bg-blue-400' :
                        statusKey === 'WAITING' ? 'bg-amber-400' :
                        statusKey === 'CLEARED' ? 'bg-green-400' :
                        'bg-red-400'
                      }`} />
                      {statusKey === 'IN_PROGRESS' ? 'In Progress' :
                       statusKey === 'WAITING' ? 'Waiting' :
                       statusKey === 'CLEARED' ? 'Cleared' :
                       'Flagged'}
                    </span>
                  </CardTitle>
                  <Badge variant={colors.variant} size="sm">{list.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[65vh] overflow-y-auto">
                {list.map((p) => {
                  const surgery = surgeryMap[p.id];
                  const age = p.patient?.dateOfBirth
                    ? Math.floor((new Date() - new Date(p.patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                    : null;
                  return (
                    <div key={p.id} className="rounded-xl border border-silver p-4 space-y-3 hover:border-lilac-bloom/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-body font-medium text-obsidian">{p.patient?.fullName || 'Unknown'}</p>
                          <p className="text-caption text-slate">
                            {p.patient?.mrn}
                            {age !== null && <span> &middot; {age}y</span>}
                          </p>
                        </div>
                        <Badge variant={colors.variant} size="sm">{statusKey.replace('_', ' ')}</Badge>
                      </div>

                      <div className="text-caption text-slate space-y-1">
                        {p.operationType && (
                          <p><span className="font-medium text-graphite">Op:</span> {p.operationType.name}</p>
                        )}
                        {surgery && (
                          <p><span className="font-medium text-graphite">Scheduled:</span> {new Date(surgery.startTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                        {p.anesthesiologist && (
                          <p><span className="font-medium text-graphite">Anesth:</span> {p.anesthesiologist.fullName}</p>
                        )}
                        {p.flaggedReason && (
                          <p className="text-red-600 dark:text-red-400"><span className="font-medium">Flag:</span> {p.flaggedReason}</p>
                        )}
                        {p.referredTo && (
                          <p className="text-amber-600 dark:text-amber-400"><span className="font-medium">Referred:</span> {p.referredTo}</p>
                        )}
                        {p.notes && <p className="italic">{p.notes}</p>}
                      </div>

                      <div className="flex gap-2 pt-1">
                        {statusKey === 'WAITING' && (
                          <Button size="sm" onClick={() => handleAdvance(p.id, 'IN_PROGRESS')}>Start</Button>
                        )}
                        {statusKey === 'IN_PROGRESS' && (
                          <>
                            <Button size="sm" onClick={() => handleAdvance(p.id, 'CLEARED')}>Clear</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleAdvance(p.id, 'FLAGGED')}>Flag</Button>
                          </>
                        )}
                        {statusKey === 'FLAGGED' && (
                          <Button size="sm" onClick={() => handleAdvance(p.id, 'IN_PROGRESS')}>Re-evaluate</Button>
                        )}
                        {(statusKey === 'WAITING' || statusKey === 'IN_PROGRESS') && (
                          <Button size="sm" variant="ghost" onClick={() => handleAdvance(p.id, 'FLAGGED')}>Skip</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal open={!!flagModal} onClose={() => setFlagModal(null)} title="Flag Patient">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Reason for Flagging</label>
            <textarea
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              rows={3}
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="e.g., Uncontrolled hypertension, abnormal ECG..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-graphite mb-1">Refer To (optional)</label>
            <input
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              value={referTo}
              onChange={(e) => setReferTo(e.target.value)}
              placeholder="e.g., Cardiology, Internal Medicine..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setFlagModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleFlagConfirm} disabled={!flagReason.trim()}>Confirm Flag</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
