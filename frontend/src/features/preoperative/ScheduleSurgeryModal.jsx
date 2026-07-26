import { useState } from 'react';
import { useScheduleFromPreop } from '../../hooks/queries/usePreoperative';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';

const OR_ROOMS = [1, 2, 3, 4, 5];

export default function ScheduleSurgeryModal({ open, onClose, requestId, patientName }) {
  const today = new Date().toISOString().slice(0, 10);
  const [scheduledDate, setScheduledDate] = useState(today);
  const [orRoom, setOrRoom] = useState('');
  const [endTime, setEndTime] = useState('');

  const scheduleFromPreop = useScheduleFromPreop();

  const handleSubmit = () => {
    if (!scheduledDate || !orRoom || !endTime) {
      toast.error('Date, OR room, and end time are required');
      return;
    }
    const startTime = `${scheduledDate}T08:00:00`;
    const endDateTime = `${scheduledDate}T${endTime}:00`;
    scheduleFromPreop.mutate(
      { id: requestId, scheduledDate: startTime, orRoom, endTime: endDateTime },
      {
        onSuccess: () => {
          toast.success('Surgery scheduled successfully');
          handleClose();
        },
        onError: (err) => toast.error(err.message || 'Failed to schedule surgery'),
      }
    );
  };

  const handleClose = () => {
    setScheduledDate(today);
    setOrRoom('');
    setEndTime('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`Schedule Surgery${patientName ? ` — ${patientName}` : ''}`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-graphite mb-1">Surgery Date</label>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-graphite mb-1">OR Room</label>
          <select
            value={orRoom}
            onChange={(e) => setOrRoom(e.target.value)}
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          >
            <option value="">Select OR...</option>
            {OR_ROOMS.map((r) => (
              <option key={r} value={r}>OR {r}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-graphite mb-1">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            loading={scheduleFromPreop.isPending}
            disabled={!scheduledDate || !orRoom || !endTime}
          >
            Schedule Surgery
          </Button>
        </div>
      </div>
    </Modal>
  );
}
