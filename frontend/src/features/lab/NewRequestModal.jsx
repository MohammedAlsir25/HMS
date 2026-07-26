import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePatientSearch } from '../../hooks/usePatients';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { notifyError } from '../../utils/notify';

export default function NewRequestModal({ open, onClose, onCreated }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('patient');
  const [testCatalog, setTestCatalog] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [priority, setPriority] = useState('ROUTINE');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [testSearch, setTestSearch] = useState('');

  const { query: searchQuery, setQuery: setSearchQuery, results: searchResults, loading: searching, selectedPatient, selectPatient: setSelectedPatient } = usePatientSearch({ enabled: step === 'patient' });

  useEffect(() => {
    if (!open) {
      setStep('patient');
      setSearchQuery('');
      setSelectedPatient(null);
      setSelectedTests([]);
      setPriority('ROUTINE');
      setClinicalNotes('');
      setTestSearch('');
    }
  }, [open]);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await api.get('/lab/tests');
      setTestCatalog(data || []);
    } catch {
      setTestCatalog([]);
    }
  }, []);

  useEffect(() => {
    if (step === 'tests') loadCatalog();
  }, [step, loadCatalog]);

  const toggleTest = useCallback((testId) => {
    setSelectedTests((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]
    );
  }, []);

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

  const sortedCategories = Object.keys(groupedTests).sort();

  const handleSubmit = useCallback(async () => {
    if (!selectedPatient || selectedTests.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.post('/lab/orders', {
        patientId: selectedPatient.id,
        testIds: selectedTests,
        priority,
        clinicalNotes: clinicalNotes || null,
      });
      if (onCreated) onCreated(order);
      onClose();
    } catch (err) { notifyError(err); }
    setSubmitting(false);
  }, [selectedPatient, selectedTests, priority, clinicalNotes, onCreated, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={t('lab.requestTest')} className="max-w-4xl">
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
                    onClick={() => { setSelectedPatient(p); setStep('tests'); }}
                  >
                    <span className="font-medium">{p.fullName}</span>
                    <span className="text-caption text-slate ml-2">{p.mrn}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {step === 'tests' && selectedPatient && (
          <>
            <div className="flex items-center justify-between bg-bone rounded-lg px-4 py-3">
              <div>
                <p className="text-body font-medium text-obsidian">{selectedPatient.fullName}</p>
                <p className="text-caption text-slate">{selectedPatient.mrn}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-caption font-medium text-graphite">{selectedTests.length} selected</span>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <label className="text-sm font-medium text-graphite block mb-1">{t('lab.priority')}</label>
                <div className="flex gap-2">
                  {['ROUTINE', 'URGENT', 'STAT'].map((p) => (
                    <button
                      key={p}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
                        ${priority === p ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                      onClick={() => setPriority(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <Input
                  label="Filter tests"
                  placeholder="Search by name or category..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-4">
              {sortedCategories.map((category) => {
                const catTests = groupedTests[category];
                const catSelected = catTests.filter((t) => selectedTests.includes(t.id)).length;
                return (
                  <div key={category} className="bg-bone rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between sticky top-0 bg-bone pb-1">
                      <h3 className="font-semibold text-obsidian text-sm uppercase tracking-wider">{category}</h3>
                      <span className="text-caption text-slate">{catSelected}/{catTests.length} selected</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1">
                      {catTests.map((test) => (
                        <label
                          key={test.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                            ${selectedTests.includes(test.id) ? 'bg-lilac-bloom/20' : 'hover:bg-paper'}`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTests.includes(test.id)}
                            onChange={() => toggleTest(test.id)}
                            className="accent-lilac-bloom shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-body text-obsidian block truncate">{test.name}</span>
                            {test.specimen && (
                              <span className="text-caption text-slate block truncate">{test.specimen}</span>
                            )}
                          </div>
                          {test.price != null && (
                            <span className="text-caption text-slate shrink-0">SDG {Number(test.price).toFixed(0)}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {sortedCategories.length === 0 && (
                <p className="text-caption text-slate text-center py-8">{t('common.noData')}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-graphite block mb-1">{t('lab.clinicalNotes')}</label>
              <textarea
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Optional clinical notes..."
                className="w-full h-20 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} loading={submitting} disabled={selectedTests.length === 0}>
                Submit ({selectedTests.length} tests)
              </Button>
              <Button variant="secondary" onClick={() => setStep('patient')}>Change Patient</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
