import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { patientKeys } from '../../hooks/usePatients';

export default function ReservationFormModal({ open, onClose, clinics, onCreated }) {
  const [patientId, setPatientId] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [clinicSlug, setClinicSlug] = useState('');
  const [clinicId, setClinicId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debouncedQuery = useDebounce(searchQuery, 300);
  const { data: searchResults = [], isLoading: searching } = useQuery({
    queryKey: patientKeys.search(debouncedQuery),
    queryFn: () => api.get(`/patients/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
  });

  const selectedClinic = clinics.find((c) => c.slug === clinicSlug || c.id === clinicId);

  const { data: doctors = [] } = useQuery({
    queryKey: ['clinic', clinicSlug || clinicId, 'doctors'],
    queryFn: () => api.get(`/clinics/${encodeURIComponent(clinicSlug || clinicId)}/doctors`),
    enabled: !!(clinicSlug || clinicId),
  });

  useEffect(() => {
    if (!open) {
      setPatientId('');
      setFullName('');
      setPhone('');
      setClinicSlug('');
      setClinicId('');
      setDoctorId('');
      setScheduledAt('');
      setNotes('');
      setSearchQuery('');
      setSubmitting(false);
      setError('');
    }
  }, [open]);

  const handleSelectPatient = (p) => {
    setPatientId(p.id);
    setFullName(p.fullName);
    setPhone(p.phone || '');
    setSearchQuery('');
  };

  const handleClinicChange = (e) => {
    const val = e.target.value;
    setClinicSlug(val);
    setClinicId(val);
    setDoctorId('');
    const c = clinics.find((x) => x.slug === val || x.id === val);
    setClinicId(c?.id || val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!clinicId) return;
    if (!patientId && !fullName) return;
    setSubmitting(true);
    try {
      const payload = {
        clinicId,
        doctorId: doctorId || undefined,
        scheduledAt: scheduledAt || undefined,
        notes: notes || undefined,
      };
      payload.patientId = patientId;
      await api.post('/reception/reservations', payload);
      onCreated?.();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create reservation';
      setError(msg);
    }
    finally { setSubmitting(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Reservation">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start justify-between mb-4">
          <span>{error}</span>
          <button type="button" className="text-red-500 hover:text-red-700 ml-2 text-lg leading-none" onClick={() => setError('')}>&times;</button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Patient</label>
          <>
            <Input
              placeholder="Search existing patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching && <p className="text-xs text-slate mt-1">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1 mt-1 border border-silver rounded-lg">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${patientId === p.id ? 'bg-lilac-bloom text-obsidian' : 'hover:bg-bone text-graphite'}`}
                    onClick={() => handleSelectPatient(p)}
                  >
                    <span className="font-medium">{p.fullName}</span>
                    <span className="text-xs text-slate ml-2">{p.mrn}</span>
                    {p.phone && <span className="text-xs text-slate ml-2">{p.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </>
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Clinic</label>
          <select
            value={clinicSlug}
            onChange={handleClinicChange}
            className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            required
          >
            <option value="">-- Select Clinic --</option>
            {clinics.map((c) => (
              <option key={c.id} value={c.slug || c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Doctor</label>
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            disabled={!doctors.length}
          >
            <option value="">-- Assign Doctor --</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.fullName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Date & Time</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom min-h-[60px]"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="primary" className="flex-1" disabled={submitting || !clinicId || !patientId}>
            {submitting ? 'Creating...' : 'Create Reservation'}
          </Button>
        </div>
      </form>
      {submitting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="loader" />
        </div>
      )}
    </Modal>
  );
}