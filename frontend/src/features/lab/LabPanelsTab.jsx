import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { notifySuccess, notifyError } from '../../utils/notify';

function CreatePanelModal({ testCatalog, onSave, onClose, saving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', testIds: [] });
  const [testSearch, setTestSearch] = useState('');

  const toggleTest = useCallback((testId) => {
    setForm((prev) => ({
      ...prev,
      testIds: prev.testIds.includes(testId)
        ? prev.testIds.filter((id) => id !== testId)
        : [...prev.testIds, testId],
    }));
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

  return (
    <Modal open={true} onClose={onClose} title={t('lab.createPanel')} className="max-w-4xl">
      <div className="space-y-4">
        <Input label={t('lab.panelName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Filter tests" placeholder="Search by name or category..." value={testSearch} onChange={(e) => setTestSearch(e.target.value)} />

        <div className="max-h-[50vh] overflow-y-auto space-y-4">
          {sortedCategories.map((category) => {
            const catTests = groupedTests[category];
            const catSelected = catTests.filter((t) => form.testIds.includes(t.id)).length;
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
                        ${form.testIds.includes(test.id) ? 'bg-lilac-bloom/20' : 'hover:bg-paper'}`}
                    >
                      <input
                        type="checkbox"
                        checked={form.testIds.includes(test.id)}
                        onChange={() => toggleTest(test.id)}
                        className="accent-lilac-bloom shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-body text-obsidian block truncate">{test.name}</span>
                        {test.specimen && (
                          <span className="text-caption text-slate block truncate">{test.specimen}</span>
                        )}
                      </div>
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

        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(form)} loading={saving} disabled={!form.name || form.testIds.length === 0}>
            {t('lab.createPanel')} ({form.testIds.length} tests)
          </Button>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function LabPanelsTab() {
  const { t } = useTranslation();
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedPanelId, setExpandedPanelId] = useState(null);
  const [testCatalog, setTestCatalog] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadPanels = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/lab/panels');
      setPanels(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load panels');
      setPanels([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPanels(); }, [loadPanels]);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await api.get('/lab/tests');
      setTestCatalog(data || []);
    } catch {
      setTestCatalog([]);
    }
  }, []);

  const handleOpenCreate = useCallback(async () => {
    await loadCatalog();
    setShowCreate(true);
  }, [loadCatalog]);

  const handleCreate = useCallback(async (form) => {
    setSaving(true);
    try {
      await api.post('/lab/panels', { name: form.name, testIds: form.testIds });
      loadPanels();
      setShowCreate(false);
      notifySuccess('Panel created');
    } catch (err) { notifyError(err); }
    finally { setSaving(false); }
  }, [loadPanels]);

  const handleDelete = useCallback(async (panelId) => {
    if (!window.confirm(t('lab.confirmDeletePanel'))) return;
    try {
      await api.delete(`/lab/panels/${panelId}`);
      loadPanels();
      notifySuccess('Panel deleted');
    } catch (err) { notifyError(err); }
  }, [loadPanels, t]);

  const toggleExpand = useCallback((panelId) => {
    setExpandedPanelId((prev) => prev === panelId ? null : panelId);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-8 text-center">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={handleOpenCreate}>{t('lab.createPanel')}</Button>
      </div>

      {panels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body text-slate">{t('lab.noPanels')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {panels.map((panel) => (
            <div key={panel.id} className="bg-bone rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-silver/30 transition-colors"
                onClick={() => toggleExpand(panel.id)}
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`w-4 h-4 text-slate transition-transform ${expandedPanelId === panel.id ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-obsidian">{panel.name}</span>
                  <span className="text-caption text-slate">{panel.panelTests?.length || 0} tests</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(panel.id); }}
                  className="text-red-500 hover:text-red-700 text-caption touch-target"
                >
                  {t('common.delete')}
                </button>
              </div>
              {expandedPanelId === panel.id && panel.panelTests?.length > 0 && (
                <div className="px-4 pb-3 border-t border-silver/50">
                  <table className="w-full mt-2">
                    <thead>
                      <tr className="text-caption text-slate">
                        <th className="text-left py-1 px-2">Code</th>
                        <th className="text-left py-1 px-2">Name</th>
                        <th className="text-left py-1 px-2">Category</th>
                        <th className="text-left py-1 px-2">Specimen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {panel.panelTests.map((pt) => (
                        <tr key={pt.id} className="border-t border-silver/30">
                          <td className="py-1.5 px-2 text-caption text-obsidian">{pt.test?.code || '-'}</td>
                          <td className="py-1.5 px-2 text-caption text-obsidian">{pt.test?.name || '-'}</td>
                          <td className="py-1.5 px-2 text-caption text-slate">{pt.test?.category || '-'}</td>
                          <td className="py-1.5 px-2 text-caption text-slate">{pt.test?.specimen || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePanelModal
          testCatalog={testCatalog}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
