import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';

const EMPTY_MEDICATION = { drugName: '', dosage: '', frequency: '', duration: '', route: 'oral', notes: '' };

export default function CrossReferralModal({ open, onClose, fromClinicId, onCreated }) {
  const [step, setStep] = useState('patient');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [referralType, setReferralType] = useState('INTERNAL_CLINIC');
  const [toClinicId, setToClinicId] = useState('');
  const [notes, setNotes] = useState('');
  const [clinics, setClinics] = useState([]);
  const [medications, setMedications] = useState([]);
  const [testCatalog, setTestCatalog] = useState([]);
  const [selectedTestIds, setSelectedTestIds] = useState([]);
  const [testSearch, setTestSearch] = useState('');

  useEffect(() => {
    if (open) api.get('/clinics').then(setClinics).catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep('patient');
      setSearchQuery('');
      setSearchResults([]);
      setSelectedPatient(null);
      setReferralType('INTERNAL_CLINIC');
      setToClinicId('');
      setNotes('');
      setMedications([]);
      setSelectedTestIds([]);
      setTestSearch('');
    }
  }, [open]);

  const debouncedQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2 || step !== 'patient') { return; }
    setSearching(true);
    api.get(`/reception/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery, step]);

  useEffect(() => {
    if (referralType === 'LAB_DISPATCH' && step === 'type') {
      api.get('/lab/tests').then(setTestCatalog).catch(() => setTestCatalog([]));
    }
  }, [referralType, step]);

  const isPharmacyLab = referralType === 'PHARMACY_DISPATCH' || referralType === 'LAB_DISPATCH';

  const filteredTests = testCatalog.filter((test) =>
    !testSearch || test.name.toLowerCase().includes(testSearch.toLowerCase()) ||
    (test.category && test.category.toLowerCase().includes(testSearch.toLowerCase()))
  );

  const groupedTests = filteredTests.reduce((acc, test) => {
    const cat = test.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(test);
    return acc;
  }, {});

  const handleCreate = useCallback(async () => {
    try {
      const body = {
        patientId: selectedPatient.id,
        fromClinicId,
        toClinicId: referralType === 'INTERNAL_CLINIC' ? toClinicId : null,
        type: referralType,
        notes: notes || null,
      };
      if (referralType === 'PHARMACY_DISPATCH' && medications.length > 0) {
        body.medications = medications;
      }
      if (referralType === 'LAB_DISPATCH' && selectedTestIds.length > 0) {
        body.testIds = selectedTestIds;
      }
      const referral = await api.post('/referrals', body);
      if (onCreated) onCreated(referral);
      onClose();
    } catch { /* ignore */ }
  }, [selectedPatient, fromClinicId, toClinicId, referralType, notes, medications, selectedTestIds, onCreated, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Cross-Referral" className={referralType === 'LAB_DISPATCH' ? 'max-w-4xl' : ''}>
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
                  {clinics.filter((c) => c.id !== fromClinicId).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {referralType === 'PHARMACY_DISPATCH' && (
              <div>
                <label className="text-sm font-medium text-graphite block mb-2">Prescribed Medications</label>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {medications.map((med, idx) => (
                    <div key={idx} className="bg-bone rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-medium text-graphite">Medication #{idx + 1}</span>
                        <button onClick={() => setMedications((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-600 dark:hover:text-red-400 text-caption touch-target">Remove</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        <Input label="Drug Name" placeholder="e.g. Paracetamol" value={med.drugName}
                          onChange={(e) => setMedications((prev) => prev.map((m, i) => i === idx ? { ...m, drugName: e.target.value } : m))} />
                        <Input label="Dosage" placeholder="e.g. 5mg" value={med.dosage}
                          onChange={(e) => setMedications((prev) => prev.map((m, i) => i === idx ? { ...m, dosage: e.target.value } : m))} />
                        <Input label="Frequency" placeholder="e.g. Once daily" value={med.frequency}
                          onChange={(e) => setMedications((prev) => prev.map((m, i) => i === idx ? { ...m, frequency: e.target.value } : m))} />
                        <Input label="Duration" placeholder="e.g. 14 days" value={med.duration}
                          onChange={(e) => setMedications((prev) => prev.map((m, i) => i === idx ? { ...m, duration: e.target.value } : m))} />
                        <select value={med.route}
                          onChange={(e) => setMedications((prev) => prev.map((m, i) => i === idx ? { ...m, route: e.target.value } : m))}
                          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                          <option value="oral">Oral</option>
                          <option value="topical">Topical</option>
                          <option value="intravenous">IV</option>
                          <option value="intramuscular">IM</option>
                          <option value="subcutaneous">Subcutaneous</option>
                          <option value="inhalation">Inhalation</option>
                        </select>
                        <Input label="Notes" placeholder="Special instructions" value={med.notes}
                          onChange={(e) => setMedications((prev) => prev.map((m, i) => i === idx ? { ...m, notes: e.target.value } : m))} />
                      </div>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => setMedications((prev) => [...prev, { ...EMPTY_MEDICATION }])}>
                    + Add Medication
                  </Button>
                </div>
              </div>
            )}

            {referralType === 'LAB_DISPATCH' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-graphite">Select Lab Tests</label>
                  <span className="text-caption text-slate">{selectedTestIds.length} selected</span>
                </div>
                <Input
                  label="Filter"
                  placeholder="Search by name or category..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="mb-3"
                />
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {Object.keys(groupedTests).sort().map((category) => {
                    const catTests = groupedTests[category];
                    const catSelected = catTests.filter((t) => selectedTestIds.includes(t.id)).length;
                    return (
                      <div key={category} className="bg-bone rounded-xl p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-obsidian text-xs uppercase tracking-wider">{category}</h4>
                          <span className="text-caption text-slate">{catSelected}/{catTests.length}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                          {catTests.map((test) => (
                            <label key={test.id}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
                                ${selectedTestIds.includes(test.id) ? 'bg-lilac-bloom/20' : 'hover:bg-paper'}`}>
                              <input type="checkbox" className="accent-lilac-bloom shrink-0"
                                checked={selectedTestIds.includes(test.id)}
                                onChange={() => setSelectedTestIds((prev) =>
                                  prev.includes(test.id) ? prev.filter((id) => id !== test.id) : [...prev, test.id])} />
                              <span className="text-body text-obsidian text-sm">{test.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {Object.keys(groupedTests).length === 0 && (
                    <p className="text-caption text-slate text-center py-4">No tests found</p>
                  )}
                </div>
              </div>
            )}

            <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Referral reason..." />

            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate}
                disabled={
                  (referralType === 'INTERNAL_CLINIC' && !toClinicId) ||
                  (referralType === 'PHARMACY_DISPATCH' && medications.length === 0) ||
                  (referralType === 'LAB_DISPATCH' && selectedTestIds.length === 0)
                }>
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