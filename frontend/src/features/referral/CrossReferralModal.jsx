import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';

const clinicList = [
  { id: 'medicine', name: 'Medicine' },
  { id: 'ent', name: 'ENT' },
  { id: 'dental', name: 'Dental' },
  { id: 'retina', name: 'Retina' },
  { id: 'glaucoma', name: 'Glaucoma' },
  { id: 'orbit', name: 'Orbit' },
  { id: 'pediatrics-ophth', name: 'Peds Ophth' },
  { id: 'general-ophth', name: 'Gen Ophth' },
  { id: 'optometry', name: 'Optometry' },
];

export default function CrossReferralModal({ open, onClose, fromClinicId, onCreated }) {
  const [step, setStep] = useState('patient');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [referralType, setReferralType] = useState('INTERNAL_CLINIC');
  const [toClinicId, setToClinicId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open) {
      setStep('patient');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedPatient(null);
      setReferralType('INTERNAL_CLINIC');
      setToClinicId('');
      setNotes('');
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.length < 2 || step !== 'patient') { return; }
    const timer = setTimeout(() => {
      setSearching(true);
      api.get(`/reception/search?q=${encodeURIComponent(searchQuery)}`)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, step]);

  const handleCreate = useCallback(async () => {
    try {
      const referral = await api.post('/referrals', {
        patientId: selectedPatient.id,
        fromClinicId,
        toClinicId: referralType === 'INTERNAL_CLINIC' ? toClinicId : null,
        type: referralType,
        notes: notes || null,
      });
      if (onCreated) onCreated(referral);
      onClose();
    } catch { /* ignore */ }
  }, [selectedPatient, fromClinicId, toClinicId, referralType, notes, onCreated, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Cross-Referral">
      <div className="space-y-4">
        {step === 'patient' && (
          <>
            <Input
              label="Search patient"
              placeholder="Name or MRN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searching && <p className="text-caption text-slate">Searching...</p>}
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-bone touch-target text-body text-obsidian"
                    onClick={() => { setSelectedPatient(p); setStep('type'); }}
                  >
                    <span className="font-medium">{p.fullName}</span>
                    <span className="text-caption text-slate ml-2">{p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 'type' && selectedPatient && (
          <>
            <div className="bg-bone rounded-lg px-4 py-3">
              <p className="text-body font-medium text-obsidian">{selectedPatient.fullName}</p>
              <p className="text-caption text-slate">{selectedPatient.mrn}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-graphite block mb-1">Referral Type</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'INTERNAL_CLINIC', label: 'Internal Clinic' },
                  { value: 'PHARMACY_DISPATCH', label: 'Pharmacy' },
                  { value: 'OPTICS_DISPATCH', label: 'Optics' },
                  { value: 'LAB_DISPATCH', label: 'Lab Tests' },
                ].map((t) => (
                  <button
                    key={t.value}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
                      ${referralType === t.value ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                    onClick={() => { setReferralType(t.value); setToClinicId(''); }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {referralType === 'INTERNAL_CLINIC' && (
              <div>
                <label className="text-sm font-medium text-graphite block mb-1">Target Clinic</label>
                <select
                  className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian
                    focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  value={toClinicId}
                  onChange={(e) => setToClinicId(e.target.value)}
                >
                  <option value="">Select clinic...</option>
                  {clinicList.filter((c) => c.id !== fromClinicId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referral reason..." />

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={referralType === 'INTERNAL_CLINIC' && !toClinicId}>
                Create Referral
              </Button>
              <Button variant="secondary" onClick={() => setStep('patient')}>Change Patient</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
