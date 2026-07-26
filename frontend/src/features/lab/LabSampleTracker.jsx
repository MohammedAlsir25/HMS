import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { notifySuccess, notifyError } from '../../utils/notify';

const sampleStatusBadge = {
  COLLECTED: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  REJECTED: 'danger',
};

export default function LabSampleTracker({ orderId }) {
  const { t } = useTranslation();
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});

  const loadSamples = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get(`/lab/samples?orderId=${orderId}`);
      setSamples(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load samples');
      setSamples([]);
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => { loadSamples(); }, [loadSamples]);

  const handleCreateSample = useCallback(async () => {
    setCreating(true);
    try {
      await api.post('/lab/samples', { orderId });
      loadSamples();
      notifySuccess('Sample created');
    } catch (err) { notifyError(err); }
    finally { setCreating(false); }
  }, [orderId, loadSamples]);

  const handleUpdateStatus = useCallback(async (sampleId, status) => {
    setUpdatingId(sampleId);
    try {
      const body = { status };
      if (status === 'REJECTED' && rejectionReasons[sampleId]) {
        body.rejectionReason = rejectionReasons[sampleId];
      }
      await api.patch(`/lab/samples/${sampleId}/status`, body);
      loadSamples();
      notifySuccess('Sample status updated');
    } catch (err) { notifyError(err); }
    finally { setUpdatingId(null); }
  }, [rejectionReasons, loadSamples]);

  const handleRejectionReasonChange = useCallback((sampleId, value) => {
    setRejectionReasons((prev) => ({ ...prev, [sampleId]: value }));
  }, []);

  if (!orderId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="w-6 h-6 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2 text-center">
        <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-caption font-medium text-obsidian">{t('lab.samples')}</h4>
        <Button size="sm" onClick={handleCreateSample} loading={creating}>
          {t('lab.collectSample')}
        </Button>
      </div>

      {samples.length === 0 ? (
        <p className="text-caption text-slate text-center py-4">{t('lab.noSamples')}</p>
      ) : (
        <div className="space-y-2">
          {samples.map((sample) => (
            <div key={sample.id} className="bg-bone rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-caption font-medium text-obsidian bg-paper px-2 py-0.5 rounded border border-silver">
                  {sample.label}
                </span>
                <Badge variant={sampleStatusBadge[sample.status]} size="sm">{sample.status}</Badge>
              </div>

              <div className="text-caption text-slate space-y-0.5">
                {sample.collectedBy && (
                  <p>Collected by: {sample.collectedBy.fullName}</p>
                )}
                {sample.collectedAt && (
                  <p>Collected at: {new Date(sample.collectedAt).toLocaleString()}</p>
                )}
                {sample.notes && <p>Notes: {sample.notes}</p>}
                {sample.rejectionReason && <p>Rejection reason: {sample.rejectionReason}</p>}
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="px-2 py-1 text-caption bg-paper border border-silver rounded-lg text-obsidian"
                  value={sample.status}
                  onChange={(e) => handleUpdateStatus(sample.id, e.target.value)}
                  disabled={updatingId === sample.id}
                >
                  <option value="COLLECTED">{t('lab.sampleCollected')}</option>
                  <option value="IN_PROGRESS">{t('lab.sampleInProgress')}</option>
                  <option value="COMPLETED">{t('lab.sampleCompleted')}</option>
                  <option value="REJECTED">{t('lab.sampleRejected')}</option>
                </select>
                {updatingId === sample.id && (
                  <div className="w-4 h-4 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {sample.status === 'REJECTED' && (
                <input
                  type="text"
                  placeholder="Rejection reason..."
                  value={rejectionReasons[sample.id] || ''}
                  onChange={(e) => handleRejectionReasonChange(sample.id, e.target.value)}
                  className="w-full px-2 py-1 text-caption bg-paper border border-silver rounded-lg text-obsidian placeholder:text-slate"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
