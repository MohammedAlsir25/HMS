import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useServiceItems, useCreateServiceItem, useUpdateServiceItem } from '../../hooks/queries/useServiceCatalog';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';

const CATEGORIES = ['CONSULTATION', 'SURGERY', 'LAB', 'IMAGING', 'PHARMACY', 'WARD', 'OTHER'];

const CATEGORY_COLORS = {
  CONSULTATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SURGERY: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  LAB: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  IMAGING: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  PHARMACY: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  WARD: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

function buildParams(filters) {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.limit) params.set('limit', filters.limit);
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  return params.toString();
}

export default function ServiceItemCatalog() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ category: '', search: '', limit: '50', offset: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const params = buildParams(filters);
  const { data, isLoading, isError, error } = useServiceItems(params || 'limit=50');
  const createMutation = useCreateServiceItem();
  const updateMutation = useUpdateServiceItem();

  const items = data?.items || data || [];
  const totalCount = data?.totalCount || items.length;

  const handleCategoryChange = useCallback((cat) => {
    setFilters((prev) => ({ ...prev, category: cat, offset: 0 }));
  }, []);

  const handleSearchChange = useCallback((e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, offset: 0 }));
  }, []);

  const handleNew = useCallback(() => {
    setEditingItem(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((item) => {
    setEditingItem(item);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setEditingItem(null);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.serviceItems', 'Service Items')}</h1>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.serviceItems', 'Service Items')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load service items'}
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
      key: 'nameAr', header: t('accounting.nameAr', 'Arabic Name'),
      render: (row) => <span className="text-graphite">{row.nameAr || '-'}</span>,
    },
    {
      key: 'category', header: t('accounting.category', 'Category'),
      render: (row) => <Badge className={CATEGORY_COLORS[row.category] || ''}>{row.category}</Badge>,
    },
    {
      key: 'price', header: t('accounting.price', 'Price'),
      render: (row) => <span className="font-semibold">{formatCurrency(row.price)}</span>,
    },
    {
      key: 'costPrice', header: t('accounting.costPrice', 'Cost'),
      render: (row) => <span className="text-slate">{formatCurrency(row.costPrice || 0)}</span>,
    },
    {
      key: 'isActive', header: t('accounting.status', 'Status'),
      render: (row) => (
        <Badge variant={row.isActive ? 'success' : 'danger'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'id', header: '',
      render: (row) => <Button variant="ghost" size="sm" onClick={() => handleEdit(row)}>Edit</Button>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.serviceItems', 'Service Items')}</h1>
          <p className="text-body text-slate mt-1">{totalCount} {t('accounting.items', 'items')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleNew}>+ {t('accounting.newItem', 'New Item')}</Button>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
        <Button variant={!filters.category ? 'primary' : 'secondary'} size="sm" onClick={() => handleCategoryChange('')}>All</Button>
        {CATEGORIES.map((cat) => (
          <Button key={cat} variant={filters.category === cat ? 'primary' : 'secondary'} size="sm" onClick={() => handleCategoryChange(cat)}>
            {cat}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{t('accounting.serviceItems', 'Service Items')}</CardTitle>
            <Input type="text" placeholder={t('accounting.search', 'Search...')} value={filters.search} onChange={handleSearchChange} className="max-w-xs" />
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-body text-slate text-center py-8">{t('accounting.noItems', 'No service items found')}</p>
          ) : (
            <Table columns={columns} data={items} />
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={handleModalClose} title={editingItem ? t('accounting.editItem', 'Edit Service Item') : t('accounting.newItem', 'New Service Item')}>
        <ServiceItemForm
          item={editingItem}
          onSave={async (formData) => {
            if (editingItem) {
              await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
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

function ServiceItemForm({ item, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: item?.name || '',
    nameAr: item?.nameAr || '',
    category: item?.category || 'CONSULTATION',
    price: item?.price || '',
    costPrice: item?.costPrice || '',
  });

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.name || !form.price || parseFloat(form.price) <= 0) return;
    onSave({ ...form, price: parseFloat(form.price), costPrice: parseFloat(form.costPrice) || 0 });
  }, [form, onSave]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Name *</label>
        <Input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Arabic Name</label>
        <Input type="text" value={form.nameAr} onChange={(e) => handleChange('nameAr', e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Category *</label>
        <select value={form.category} onChange={(e) => handleChange('category', e.target.value)}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Price *</label>
          <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => handleChange('price', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Cost Price</label>
          <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => handleChange('costPrice', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : item ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
