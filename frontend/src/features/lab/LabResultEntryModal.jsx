import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { notifySuccess, notifyError } from '../../utils/notify';

const statusBadge = {
  SUBMITTED: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const priorityBadge = {
  ROUTINE: 'default',
  URGENT: 'danger',
  STAT: 'danger',
};

function calculateFlag(value, test) {
  const num = Number(value);
  if (isNaN(num)) return { flag: 'NORMAL', isAbnormal: false };
  if (test.highCritical && num > Number(test.highCritical)) return { flag: 'CRITICAL_HIGH', isAbnormal: true };
  if (test.lowCritical && num < Number(test.lowCritical)) return { flag: 'CRITICAL_LOW', isAbnormal: true };
  if (test.refRangeHigh && num > Number(test.refRangeHigh)) return { flag: 'HIGH', isAbnormal: true };
  if (test.refRangeLow && num < Number(test.refRangeLow)) return { flag: 'LOW', isAbnormal: true };
  return { flag: 'NORMAL', isAbnormal: false };
}

const flagColors = {
  NORMAL: 'success',
  HIGH: 'warning',
  LOW: 'info',
  CRITICAL_HIGH: 'danger',
  CRITICAL_LOW: 'danger',
  ABNORMAL: 'warning',
};

export default function LabResultEntryModal({ order, open, onClose, onSave }) {
  const { t } = useTranslation();
  const [results, setResults] = useState({});
  const [resultNotes, setResultNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) {
      const init = {};
      order.tests?.forEach((ot) => {
        init[ot.testId] = ot.value || '';
      });
      setResults(init);
      setResultNotes(order.resultNotes || '');
    }
  }, [order]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        results: Object.entries(results).map(([testId, value]) => ({
          orderTestId: order.tests?.find((ot) => ot.testId === testId)?.id,
          value,
        })),
        resultNotes,
      };
      const updated = await api.put(`/lab/orders/${order.id}/results`, payload);
      if (onSave) onSave(updated);
      onClose();
      notifySuccess('Results saved');
    } catch (err) { notifyError(err); }
    finally { setSaving(false); }
  }, [order, results, resultNotes, onSave, onClose]);

  if (!order) return null;

  return (
    <Modal open={open} onClose={onClose} title={`${t('lab.enterResults')} — ${order.patient?.fullName || ''}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={statusBadge[order.status]}>{t('lab.' + order.status.toLowerCase())}</Badge>
          <Badge variant={priorityBadge[order.priority]}>{order.priority}</Badge>
          {order.assignedTo && (
            <span className="text-caption text-slate">{t('lab.assignedTo')}: {order.assignedTo}</span>
          )}
        </div>

        <div className="space-y-3">
          {order.tests?.map((ot) => {
            const currentValue = results[ot.testId] || '';
            const flagResult = currentValue ? calculateFlag(currentValue, ot.test || {}) : null;
            const refRange = ot.test?.refRangeText || (ot.test?.refRangeLow != null && ot.test?.refRangeHigh != null ? `${ot.test.refRangeLow} - ${ot.test.refRangeHigh}` : null);
            return (
              <div key={ot.id} className="bg-bone rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-obsidian">{ot.test?.name || ot.testId}</span>
                  <div className="flex items-center gap-2">
                    {ot.test?.unit && <span className="text-caption text-slate">{ot.test.unit}</span>}
                    {flagResult && flagResult.flag !== 'NORMAL' && (
                      <Badge variant={flagColors[flagResult.flag] || 'default'} size="sm">{flagResult.flag}</Badge>
                    )}
                  </div>
                </div>
                {refRange && (
                  <p className="text-caption text-slate">{t('lab.refRange')}: {refRange}</p>
                )}
                <Input
                  label={t('lab.value')}
                  type="text"
                  value={currentValue}
                  onChange={(e) => setResults({ ...results, [ot.testId]: e.target.value })}
                  placeholder="Enter result value..."
                />
              </div>
            );
          })}
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">{t('lab.resultNotes')}</label>
          <textarea
            value={resultNotes}
            onChange={(e) => setResultNotes(e.target.value)}
            placeholder="Optional notes..."
            className="w-full h-20 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} loading={saving}>{t('lab.saveResults')}</Button>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
}
