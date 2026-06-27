import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuppliers } from '../../hooks/queries/useSuppliers';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../lib/api';

export default function DeliveryModal({ open, onClose, category, onSuccess }) {
  const { t } = useTranslation();
  const { data: suppliers = [] } = useSuppliers();
  const [form, setForm] = useState({
    supplierId: '',
    invoiceNumber: '',
    invoiceTotal: '',
    amountPaid: '',
    paymentStatus: 'Pending',
    receivedAt: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [items, setItems] = useState([{ itemId: '', qty: '', unitCost: '' }]);
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      supplierId: '',
      invoiceNumber: '',
      invoiceTotal: '',
      amountPaid: '',
      paymentStatus: 'Pending',
      receivedAt: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setItems([{ itemId: '', qty: '', unitCost: '' }]);
    setSubmitting(false);
    api.get(`/pos/${category}/items`).then(setProducts).catch(() => {});
  }, [open, category]);

  const addLine = () => setItems((prev) => [...prev, { itemId: '', qty: '', unitCost: '' }]);
  const removeLine = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const lineTotal = (idx) => {
    const it = items[idx];
    return (Number(it.qty) || 0) * (Number(it.unitCost) || 0);
  };

  const itemsTotal = items.reduce((s, it) => s + lineTotal(items.indexOf(it)), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplierId) { alert('Select a supplier'); return; }
    const validItems = items.filter((it) => it.itemId && Number(it.qty) > 0);
    if (validItems.length === 0) { alert('Add at least one item with quantity'); return; }
    setSubmitting(true);
    try {
      const payload = {
        supplierId: form.supplierId,
        invoiceNumber: form.invoiceNumber || undefined,
        invoiceTotal: Number(form.invoiceTotal) || 0,
        amountPaid: Number(form.amountPaid) || 0,
        paymentStatus: form.paymentStatus,
        receivedAt: form.receivedAt || undefined,
        notes: form.notes || undefined,
        items: validItems.map((it) => ({
          itemId: it.itemId,
          quantityReceived: Number(it.qty),
          unitCost: Number(it.unitCost) || 0,
        })),
      };
      await api.post(`/pos/${category}/invoices`, payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to create delivery');
    }
    setSubmitting(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Delivery">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Supplier</label>
          <select
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian"
            value={form.supplierId}
            onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            required
          >
            <option value="">-- Select Supplier --</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Invoice Ref" value={form.invoiceNumber}
            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="Optional" />
          <Input label="Received Date" type="date" value={form.receivedAt}
            onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Invoice Total ($)" type="number" min="0" step="0.01" value={form.invoiceTotal}
            onChange={(e) => setForm({ ...form, invoiceTotal: e.target.value })} required />
          <Input label="Amount Paid ($)" type="number" min="0" step="0.01" value={form.amountPaid}
            onChange={(e) => setForm({ ...form, amountPaid: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Payment Status</label>
            <select className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian"
              value={form.paymentStatus}
              onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
              <option value="Pending">Pending</option>
              <option value="PartialPayment">Partial Payment</option>
              <option value="PaidInFull">Paid in Full</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-graphite">Line Items</label>
            <Button type="button" size="sm" variant="secondary" onClick={addLine}>+ Add Item</Button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1 items-end p-2 bg-bone rounded-lg">
              <div className="col-span-5">
                <label className="text-xs text-slate block mb-1">Product</label>
                <select className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption"
                  value={it.itemId} onChange={(e) => updateItem(idx, 'itemId', e.target.value)}>
                  <option value="">-- Select --</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate block mb-1">Qty</label>
                <input type="number" min="1" className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption"
                  value={it.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} />
              </div>
              <div className="col-span-3">
                <label className="text-xs text-slate block mb-1">Unit Cost</label>
                <input type="number" min="0" step="0.01" className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption"
                  value={it.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} />
              </div>
              <div className="col-span-2 flex items-end gap-1">
                <div className="flex-1 text-right">
                  <label className="text-xs text-slate block mb-1">Total</label>
                  <p className="text-caption font-medium text-obsidian py-1.5">${lineTotal(idx).toFixed(2)}</p>
                </div>
                {items.length > 1 && (
                  <button type="button" className="text-slate hover:text-red-500 p-1 mt-5"
                    onClick={() => removeLine(idx)}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between text-caption text-slate pt-1">
            <span>Items Total: <strong className="text-obsidian">${itemsTotal.toFixed(2)}</strong></span>
            {form.invoiceTotal && Math.abs(itemsTotal - Number(form.invoiceTotal)) > 0.01 && (
              <span className="text-yellow-600">Mismatch with invoice total</span>
            )}
          </div>
        </div>

        <Input label="Notes" value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" className="flex-1" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Delivery'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
