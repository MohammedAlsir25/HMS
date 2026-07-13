import { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { notifySuccess, notifyError } from '../../utils/notify';

export default function ScheduleFollowUpModal({ open, onClose, clinicSlug, patientId, patientName, onScheduled }) {
  const { t } = useTranslation();
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minDate = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scheduledDate) return;
    setSubmitting(true);
    try {
      await api.post(`/clinics/${clinicSlug}/schedule-follow-up`, { patientId, scheduledDate, notes: notes || null });
      notifySuccess(`Follow-up scheduled for ${patientName} on ${new Date(scheduledDate).toLocaleDateString()}`);
      setScheduledDate('');
      setNotes('');
      onScheduled?.();
      onClose();
    } catch (err) {
      notifyError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Schedule Follow-Up">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-body text-obsidian">
          Schedule follow-up for <span className="font-semibold">{patientName}</span>
        </p>
        <Input
          label="Follow-Up Date"
          type="date"
          min={minDate}
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          required
        />
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Reason / Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for follow-up..."
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none min-h-[80px]"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!scheduledDate} loading={submitting}>Schedule</Button>
        </div>
      </form>
    </Modal>
  );
}