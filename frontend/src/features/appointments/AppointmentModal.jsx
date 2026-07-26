import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import PatientQuickSearch from '../../components/shared/PatientQuickSearch';
import { useClinics, useClinicDoctors } from '../../hooks/queries/useClinics';
import { useCreateAppointment } from '../../hooks/queries/useAppointments';
import { notifySuccess, notifyError } from '../../utils/notify';

export default function AppointmentModal({ isOpen, onClose, defaultClinicId = '' }) {
  const { t } = useTranslation();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [clinicId, setClinicId] = useState(defaultClinicId);
  const [doctorId, setDoctorId] = useState('');
  const [appointmentType, setAppointmentType] = useState('WALKIN');
  const [visitType, setVisitType] = useState('NEW_VISIT');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [priority, setPriority] = useState(0);
  const [notes, setNotes] = useState('');

  const { data: clinics = [] } = useClinics();
  const { data: doctors = [] } = useClinicDoctors(
    clinics.find((c) => c.id === clinicId)?.slug || ''
  );
  const createAppointment = useCreateAppointment();

  const reset = () => {
    setSelectedPatient(null);
    setClinicId(defaultClinicId);
    setDoctorId('');
    setAppointmentType('WALKIN');
    setVisitType('NEW_VISIT');
    setScheduledDate('');
    setScheduledTime('');
    setPriority(0);
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedPatient || !clinicId) return;
    const data = {
      patientId: selectedPatient.id,
      clinicId,
      type: appointmentType,
      visitType,
      priority,
      notes: notes || undefined,
    };
    if (appointmentType === 'RESERVATION') {
      if (!scheduledDate || !scheduledTime) return;
      data.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      if (doctorId) data.doctorId = doctorId;
    }
    try {
      await createAppointment.mutateAsync({ type: appointmentType, data });
      notifySuccess(t('reception.appointmentCreated', 'Appointment created'));
      handleClose();
    } catch (err) {
      notifyError(err);
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title={t('reception.newAppointment', 'New Appointment')} className="max-w-xl">
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1.5">Patient *</label>
          {selectedPatient ? (
            <div className="flex items-center justify-between bg-bone rounded-lg px-4 py-3">
              <div>
                <p className="text-body font-medium text-obsidian">{selectedPatient.fullName}</p>
                <p className="text-caption text-slate">{selectedPatient.mrn}</p>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="text-caption text-lilac-bloom hover:underline">Change</button>
            </div>
          ) : (
            <PatientQuickSearch onSelect={setSelectedPatient} placeholder="Search patient by name or MRN..." />
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1.5">Clinic *</label>
          <select
            value={clinicId}
            onChange={(e) => { setClinicId(e.target.value); setDoctorId(''); }}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent"
          >
            <option value="">{t('reception.selectClinic', 'Select clinic')}</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {clinicId && doctors.length > 0 && (
          <div>
            <label className="text-sm font-medium text-graphite block mb-1.5">Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent"
            >
              <option value="">Any available</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>Dr. {d.fullName}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-graphite block mb-1.5">Appointment Type *</label>
            <div className="flex gap-2">
              {['WALKIN', 'RESERVATION'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setAppointmentType(type)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-caption font-medium transition-colors touch-target
                    ${appointmentType === type
                      ? 'bg-lilac-bloom text-obsidian'
                      : 'bg-bone text-graphite hover:bg-silver'}`}
                >
                  {type === 'WALKIN' ? 'Walk-in' : 'Reservation'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-graphite block mb-1.5">Visit Type *</label>
            <div className="flex gap-2">
              {['NEW_VISIT', 'FOLLOW_UP'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVisitType(type)}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-caption font-medium transition-colors touch-target
                    ${visitType === type
                      ? 'bg-lilac-bloom text-obsidian'
                      : 'bg-bone text-graphite hover:bg-silver'}`}
                >
                  {type === 'NEW_VISIT' ? 'New Visit' : 'Follow-up'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {appointmentType === 'RESERVATION' && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date *"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
            />
            <Input
              label="Time *"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-graphite block mb-1.5">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value))}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent"
          >
            {[0, 1, 2, 3, 4, 5].map((p) => (
              <option key={p} value={p}>{p === 0 ? 'Normal' : `Priority ${p}`}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes..."
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-silver">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            loading={createAppointment.isPending}
            disabled={!selectedPatient || !clinicId || (appointmentType === 'RESERVATION' && (!scheduledDate || !scheduledTime))}
          >
            {appointmentType === 'WALKIN' ? 'Check In' : 'Create Reservation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
