import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';
import { notifySuccess, notifyError } from '../../utils/notify';

export default function LabOrderModal({ isOpen, onClose, clinicSlug, patientId, patientName, onOrderCreated }) {
  const [testSearch, setTestSearch] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [selectedTests, setSelectedTests] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [panels, setPanels] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [priority, setPriority] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingTests(true);
    Promise.all([
      api.get('/lab/tests').catch(() => []),
      api.get('/lab/panels').catch(() => []),
    ]).then(([tests, p]) => {
      setTestResults(tests);
      setPanels(p);
    }).finally(() => setLoadingTests(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setTestSearch('');
      setSelectedTests([]);
      setSelectedPanel(null);
      setClinicalNotes('');
      setPriority(0);
    }
  }, [isOpen]);

  const filteredTests = testResults.filter((t) =>
    !testSearch ||
    t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
    t.code?.toLowerCase().includes(testSearch.toLowerCase()) ||
    t.category?.toLowerCase().includes(testSearch.toLowerCase())
  );

  const groupedTests = filteredTests.reduce((acc, test) => {
    const cat = test.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(test);
    return acc;
  }, {});

  const toggleTest = useCallback((test) => {
    setSelectedTests((prev) =>
      prev.find((t) => t.id === test.id)
        ? prev.filter((t) => t.id !== test.id)
        : [...prev, test]
    );
  }, []);

  const removeTest = useCallback((testId) => {
    setSelectedTests((prev) => prev.filter((t) => t.id !== testId));
  }, []);

  const handlePanelSelect = useCallback((e) => {
    const panelId = e.target.value;
    if (!panelId) { setSelectedPanel(null); return; }
    const panel = panels.find((p) => p.id === panelId);
    setSelectedPanel(panel);
  }, [panels]);

  const handleSubmit = async () => {
    if (selectedTests.length === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/clinics/${clinicSlug}/lab-order`, {
        patientId,
        testIds: selectedTests.map((t) => t.id),
        panelId: selectedPanel?.id || null,
        clinicalNotes: clinicalNotes || null,
        priority,
      });
      notifySuccess('Lab order created');
      onOrderCreated?.();
      onClose();
    } catch (err) {
      notifyError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={`Order Lab Tests — ${patientName || ''}`} className="max-w-4xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{selectedTests.length} test{selectedTests.length !== 1 ? 's' : ''} selected</Badge>
          {selectedPanel && <Badge variant="primary">Panel: {selectedPanel.name}</Badge>}
        </div>

        {selectedTests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTests.map((t) => (
              <span key={t.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-lilac-bloom/20 text-obsidian text-caption rounded-lg">
                {t.name}
                <button onClick={() => removeTest(t.id)} className="text-slate hover:text-red-500 ml-1">&times;</button>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Search Tests</label>
            <Input
              placeholder="Search by name, code, or category..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Select Panel (optional)</label>
            <select
              value={selectedPanel?.id || ''}
              onChange={handlePanelSelect}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
            >
              <option value="">No panel</option>
              {panels.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-3">
          {loadingTests && <p className="text-caption text-slate text-center py-4">Loading test catalog...</p>}
          {!loadingTests && Object.keys(groupedTests).length === 0 && (
            <p className="text-caption text-slate text-center py-4">No tests found</p>
          )}
          {Object.keys(groupedTests).sort().map((category) => {
            const catTests = groupedTests[category];
            const catSelected = catTests.filter((t) => selectedTests.some((s) => s.id === t.id)).length;
            return (
              <div key={category} className="bg-bone rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-obsidian text-xs uppercase tracking-wider">{category}</h4>
                  <span className="text-caption text-slate">{catSelected}/{catTests.length}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {catTests.map((test) => (
                    <label
                      key={test.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors
                        ${selectedTests.some((t) => t.id === test.id) ? 'bg-lilac-bloom/20' : 'hover:bg-paper'}`}
                    >
                      <input
                        type="checkbox"
                        className="accent-lilac-bloom shrink-0"
                        checked={selectedTests.some((t) => t.id === test.id)}
                        onChange={() => toggleTest(test)}
                      />
                      <span className="text-body text-obsidian text-sm">{test.name}</span>
                      {test.unit && <span className="text-caption text-slate ml-auto">{test.unit}</span>}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Clinical Notes</label>
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            placeholder="Relevant clinical history, reason for tests..."
            className="w-full h-20 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Priority</label>
          <div className="flex gap-2">
            {[
              { value: 0, label: 'Routine' },
              { value: 1, label: 'Urgent' },
              { value: 2, label: 'STAT' },
            ].map((p) => (
              <button
                key={p.value}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
                  ${priority === p.value ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                onClick={() => setPriority(p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={selectedTests.length === 0}>
            Create Lab Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}
