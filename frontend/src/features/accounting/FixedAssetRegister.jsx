import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useFixedAssets, useCreateFixedAsset, useUpdateFixedAsset, useRunDepreciation } from '../../hooks/queries/useFixedAssets';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';

const ASSET_TYPES = ['MEDICAL_EQUIPMENT', 'FURNITURE', 'VEHICLE', 'BUILDING', 'IT_EQUIPMENT', 'OTHER'];
const DEPRECIATION_METHODS = ['STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION'];

const TYPE_LABELS = {
  MEDICAL_EQUIPMENT: 'Medical Equipment',
  FURNITURE: 'Furniture',
  VEHICLE: 'Vehicle',
  BUILDING: 'Building',
  IT_EQUIPMENT: 'IT Equipment',
  OTHER: 'Other',
};

function buildParams(filters) {
  const params = new URLSearchParams();
  if (filters.assetType) params.set('assetType', filters.assetType);
  if (filters.isActive) params.set('isActive', filters.isActive);
  if (filters.limit) params.set('limit', filters.limit);
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  return params.toString();
}

export default function FixedAssetRegister() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ assetType: '', isActive: '', limit: '50', offset: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const params = buildParams(filters);
  const { data, isLoading, isError, error } = useFixedAssets(params || 'limit=50');
  const createMutation = useCreateFixedAsset();
  const updateMutation = useUpdateFixedAsset();
  const depreciationMutation = useRunDepreciation();

  const assets = data?.assets || data || [];
  const totalCount = data?.totalCount || assets.length;

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value, offset: 0 }));
  }, []);

  const handleNew = useCallback(() => {
    setEditingAsset(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((asset) => {
    setEditingAsset(asset);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setEditingAsset(null);
  }, []);

  const handleRunDepreciation = useCallback(async () => {
    if (!confirm('Run depreciation for all active assets? This will create journal entries.')) return;
    await depreciationMutation.mutateAsync();
  }, [depreciationMutation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.fixedAssets', 'Fixed Assets')}</h1>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.fixedAssets', 'Fixed Assets')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load fixed assets'}
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'name', header: t('accounting.name', 'Name'),
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors font-medium" onClick={() => handleEdit(row)}>
          {row.name}
        </button>
      ),
    },
    {
      key: 'assetType', header: t('accounting.type', 'Type'),
      render: (row) => <Badge>{TYPE_LABELS[row.assetType] || row.assetType}</Badge>,
    },
    {
      key: 'acquisitionCost', header: t('accounting.acquisitionCost', 'Cost'),
      render: (row) => <span className="font-semibold">{formatCurrency(row.acquisitionCost)}</span>,
    },
    {
      key: 'usefulLifeYears', header: t('accounting.usefulLife', 'Life (yrs)'),
      render: (row) => row.usefulLifeYears,
    },
    {
      key: 'depreciationMethod', header: t('accounting.depreciation', 'Depreciation'),
      render: (row) => <span className="text-sm text-graphite">{row.depreciationMethod?.replace('_', ' ')}</span>,
    },
    {
      key: 'monthlyDepreciation', header: t('accounting.monthlyDep', 'Monthly Dep.'),
      render: (row) => formatCurrency(row.monthlyDepreciation || 0),
    },
    {
      key: 'accumulatedDepreciation', header: t('accounting.accumDep', 'Accum. Dep.'),
      render: (row) => <span className="text-red-600 dark:text-red-400">{formatCurrency(row.accumulatedDepreciation || 0)}</span>,
    },
    {
      key: 'bookValue', header: t('accounting.bookValue', 'Book Value'),
      render: (row) => <span className="font-semibold">{formatCurrency(row.bookValue || 0)}</span>,
    },
    {
      key: 'isActive', header: t('accounting.status', 'Status'),
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.fixedAssets', 'Fixed Assets')}</h1>
          <p className="text-body text-slate mt-1">{totalCount} {t('accounting.assets', 'assets')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleRunDepreciation} loading={depreciationMutation.isPending}>
            {t('accounting.runDepreciation', 'Run Depreciation')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleNew}>+ {t('accounting.newAsset', 'New Asset')}</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
        <Button variant={!filters.assetType ? 'primary' : 'secondary'} size="sm" onClick={() => handleFilterChange('assetType', '')}>All</Button>
        {ASSET_TYPES.map((type) => (
          <Button key={type} variant={filters.assetType === type ? 'primary' : 'secondary'} size="sm" onClick={() => handleFilterChange('assetType', type)}>
            {TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent>
          {assets.length === 0 ? (
            <p className="text-body text-slate text-center py-8">{t('accounting.noAssets', 'No fixed assets found')}</p>
          ) : (
            <Table columns={columns} data={assets} />
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={handleModalClose} title={editingAsset ? t('accounting.editAsset', 'Edit Asset') : t('accounting.newAsset', 'New Asset')} className="max-w-2xl">
        <FixedAssetForm
          asset={editingAsset}
          onSave={async (formData) => {
            if (editingAsset) {
              await updateMutation.mutateAsync({ id: editingAsset.id, ...formData });
            } else {
              await createMutation.mutateAsync(formData);
            }
            handleModalClose();
          }}
          onCancel={handleModalClose}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}

function FixedAssetForm({ asset, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: asset?.name || '',
    assetType: asset?.assetType || 'MEDICAL_EQUIPMENT',
    acquisitionCost: asset?.acquisitionCost || '',
    usefulLifeYears: asset?.usefulLifeYears || '',
    salvageValue: asset?.salvageValue || '',
    depreciationMethod: asset?.depreciationMethod || 'STRAIGHT_LINE',
    purchaseDate: asset?.purchaseDate ? new Date(asset.purchaseDate).toISOString().slice(0, 10) : '',
    location: asset?.location || '',
    serialNumber: asset?.serialNumber || '',
    notes: asset?.notes || '',
  });

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const cost = parseFloat(form.acquisitionCost) || 0;
  const life = parseInt(form.usefulLifeYears) || 0;
  const salvage = parseFloat(form.salvageValue) || 0;
  const monthlyDepreciation = life > 0 ? (cost - salvage) / (life * 12) : 0;
  const bookValue = cost - (asset?.accumulatedDepreciation || 0);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.name || !form.acquisitionCost || !form.usefulLifeYears) return;
    onSave({
      ...form,
      acquisitionCost: parseFloat(form.acquisitionCost) || 0,
      usefulLifeYears: parseInt(form.usefulLifeYears) || 0,
      salvageValue: parseFloat(form.salvageValue) || 0,
    });
  }, [form, onSave]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Name *</label>
        <Input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Asset Type *</label>
          <select value={form.assetType} onChange={(e) => handleChange('assetType', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Depreciation Method *</label>
          <select value={form.depreciationMethod} onChange={(e) => handleChange('depreciationMethod', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            {DEPRECIATION_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Acquisition Cost *</label>
          <Input type="number" min="0" step="0.01" value={form.acquisitionCost} onChange={(e) => handleChange('acquisitionCost', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Useful Life (Years) *</label>
          <Input type="number" min="1" value={form.usefulLifeYears} onChange={(e) => handleChange('usefulLifeYears', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Salvage Value</label>
          <Input type="number" min="0" step="0.01" value={form.salvageValue} onChange={(e) => handleChange('salvageValue', e.target.value)} />
        </div>
      </div>

      <div className="p-3 bg-bone rounded-lg grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-slate block">Monthly Depreciation</span>
          <span className="font-semibold text-obsidian">{formatCurrency(monthlyDepreciation)}</span>
        </div>
        <div>
          <span className="text-slate block">Book Value</span>
          <span className="font-semibold text-obsidian">{formatCurrency(bookValue)}</span>
        </div>
        <div>
          <span className="text-slate block">Depreciable Amount</span>
          <span className="font-semibold text-obsidian">{formatCurrency(cost - salvage)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Purchase Date</label>
          <Input type="date" value={form.purchaseDate} onChange={(e) => handleChange('purchaseDate', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Location</label>
          <Input type="text" value={form.location} onChange={(e) => handleChange('location', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Serial Number</label>
          <Input type="text" value={form.serialNumber} onChange={(e) => handleChange('serialNumber', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={2}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : asset ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
