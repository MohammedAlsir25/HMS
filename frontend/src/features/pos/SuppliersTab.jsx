import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from '../../hooks/queries/useSuppliers';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

export default function SuppliersTab({ category }) {
  const { t } = useTranslation();
  const { data: suppliers = [], isLoading } = useSuppliers(category);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '' });
  const [mutationError, setMutationError] = useState('');

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', contactPerson: '', phone: '', email: '' });
    setShowModal(true);
  };

  const openEdit = (supplier) => {
    setEditItem(supplier);
    setForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setMutationError('');
      if (editItem) {
        await updateSupplier.mutateAsync({ id: editItem.id, ...form });
      } else {
        await createSupplier.mutateAsync({ ...form, category });
      }
      setShowModal(false);
      setEditItem(null);
    } catch (err) {
      setMutationError(err.message || 'Failed to save supplier');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier?')) return;
    try {
      setMutationError('');
      await deleteSupplier.mutateAsync(id);
    } catch (err) {
      setMutationError(err.message || 'Failed to delete supplier');
    }
  };

  return (
    <div className="space-y-4">
      {mutationError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{mutationError}</span>
          <button onClick={() => setMutationError('')} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 text-xl leading-none touch-target">&times;</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-heading-xs font-semibold text-obsidian">Suppliers</h2>
        <Button onClick={openCreate}>Add Supplier</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-body text-slate p-4">Loading...</p>
          ) : suppliers.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No suppliers yet</p>
          ) : (
            <div className="divide-y divide-silver">
              {suppliers.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-obsidian">{s.name}</p>
                    <p className="text-caption text-slate">
                      {[s.contactPerson, s.phone, s.email].filter(Boolean).join(' \u00B7 ') || '\u2014'}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(s.id)}>Del</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showModal} onClose={() => { setShowModal(false); setEditItem(null); }}
        title={editItem ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Supplier Name" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Contact Person" value={form.contactPerson}
            onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
          <Input label="Phone" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Email" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowModal(false); setEditItem(null); }}
              className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={createSupplier.isPending || updateSupplier.isPending}>
              {editItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
