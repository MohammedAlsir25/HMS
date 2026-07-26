import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { notifySuccess, notifyError } from '../../utils/notify';

function CatalogEditModal({ test, onSave, onClose, saving }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ ...test });

  return (
    <Modal open={true} onClose={onClose} title={test.id ? t('lab.editTest') : t('lab.addTest')}>
      <div className="space-y-3">
        <Input label={t('lab.testName')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label={t('lab.testCode')} value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <Input label={t('lab.category')} value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <Input label={t('lab.specimen')} value={form.specimen || ''} onChange={(e) => setForm({ ...form, specimen: e.target.value })} />
        <Input label={t('lab.unit')} value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('lab.refRangeLow')} type="number" value={form.refRangeLow ?? ''} onChange={(e) => setForm({ ...form, refRangeLow: e.target.value ? parseFloat(e.target.value) : null })} />
          <Input label={t('lab.refRangeHigh')} type="number" value={form.refRangeHigh ?? ''} onChange={(e) => setForm({ ...form, refRangeHigh: e.target.value ? parseFloat(e.target.value) : null })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('lab.lowCritical')} type="number" value={form.lowCritical ?? ''} onChange={(e) => setForm({ ...form, lowCritical: e.target.value ? parseFloat(e.target.value) : null })} />
          <Input label={t('lab.highCritical')} type="number" value={form.highCritical ?? ''} onChange={(e) => setForm({ ...form, highCritical: e.target.value ? parseFloat(e.target.value) : null })} />
        </div>
        <Input label={t('lab.refRangeText')} value={form.refRangeText || ''} onChange={(e) => setForm({ ...form, refRangeText: e.target.value })} placeholder="e.g. 3.5 - 5.5" />
        <Input label={t('lab.price')} type="number" value={form.price ?? ''} onChange={(e) => setForm({ ...form, price: e.target.value ? parseFloat(e.target.value) : null })} />
        <div className="flex gap-2 pt-2">
          <Button onClick={() => onSave(form)} loading={saving}>Save</Button>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function LabCatalogTab({ onRefresh }) {
  const { t } = useTranslation();
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editTest, setEditTest] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/lab/tests');
      setCatalog(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load catalog');
      setCatalog([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const handleSave = useCallback(async (test) => {
    setSaving(true);
    try {
      const payload = {
        name: test.name,
        code: test.code,
        category: test.category,
        specimen: test.specimen,
        unit: test.unit,
        refRangeLow: test.refRangeLow,
        refRangeHigh: test.refRangeHigh,
        lowCritical: test.lowCritical,
        highCritical: test.highCritical,
        refRangeText: test.refRangeText,
        price: test.price,
      };
      if (test.id) {
        await api.put(`/lab/tests/${test.id}`, payload);
      } else {
        await api.post('/lab/tests', payload);
      }
      loadCatalog();
      if (onRefresh) onRefresh();
      setEditTest(null);
      notifySuccess('Test saved');
    } catch (err) { notifyError(err); }
    finally { setSaving(false); }
  }, [loadCatalog, onRefresh]);

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
        <Button size="sm" onClick={() => setEditTest({ name: '', code: '', category: '', specimen: '', unit: '', refRangeLow: null, refRangeHigh: null, lowCritical: null, highCritical: null, refRangeText: '', price: 0 })}>
          {t('lab.addTest')}
        </Button>
      </div>

      {catalog.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body text-slate">{t('lab.noTests')}</p>
        </div>
      ) : (
        <Table
          columns={[
            { key: 'code', label: t('lab.testCode') },
            { key: 'name', label: t('lab.testName') },
            { key: 'category', label: t('lab.category') },
            { key: 'specimen', label: t('lab.specimen') },
            { key: 'unit', label: t('lab.unit') },
            { key: 'refRange', label: t('lab.refRange'), render: (row) => {
              if (row.refRangeText) return row.refRangeText;
              if (row.refRangeLow != null && row.refRangeHigh != null) return `${row.refRangeLow} - ${row.refRangeHigh}`;
              return '-';
            }},
            { key: 'price', label: t('lab.price'), render: (v) => v != null ? `SDG ${Number(v).toFixed(2)}` : '-' },
            { key: 'actions', label: t('lab.actions'), render: (row) => (
              <button onClick={(e) => { e.stopPropagation(); setEditTest(row); }} className="text-lilac-bloom hover:underline text-caption">
                {t('common.edit')}
              </button>
            )},
          ]}
          data={catalog}
        />
      )}

      {editTest && (
        <CatalogEditModal
          test={editTest}
          onSave={handleSave}
          onClose={() => setEditTest(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
