import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSuppliers } from '../../hooks/queries/useSuppliers';
import { useAuthStore } from '../../stores/authStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../lib/api';

function buildInvoiceHtml(invoice, logoSrc = '') {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${invoice.invoiceNumber}</title>
<style>
  @page { margin: 15mm; size: A4; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; padding: 20px; }
  .header { text-align: center; border-bottom: 2px solid #1a3a5c; padding-bottom: 15px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 22px; color: #1a3a5c; }
  .header h2 { margin: 5px 0; font-size: 14px; color: #555; font-weight: normal; }
  .header .sub { margin-top: 8px; font-size: 13px; color: #1a3a5c; font-weight: bold; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 13px; }
  .meta div { flex: 1; }
  .meta label { color: #555; }
  .logo { height: 70px; margin-bottom: 8px; object-fit: contain; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { background: #e8e8e8; color: #000; padding: 8px 10px; text-align: left; font-size: 13px; border: 1px solid #000; font-weight: bold; }
  td { padding: 7px 10px; border: 1px solid #444; font-size: 13px; }
  .totals { text-align: right; font-size: 14px; margin-top: 5px; }
  .totals strong { font-size: 16px; }
  .payment { display: flex; justify-content: space-between; margin: 15px 0; padding: 10px; background: #f5f7fa; font-size: 13px; }
  .footer { margin-top: 30px; display: flex; justify-content: flex-end; font-size: 13px; }
  .sig-box { text-align: right; line-height: 2; }
  .sig-line { margin-top: 8px; }
  .sig-line .sig-underline { display: inline-block; border-bottom: 1px solid #333; width: 220px; }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  .badge-paid { background: #d4edda; color: #155724; }
  .badge-partial { background: #fff3cd; color: #856404; }
  .badge-pending { background: #f8d7da; color: #721c24; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header">
    ${logoSrc ? `<img src="${logoSrc}" alt="Al Jawarih Hospital" class="logo" />` : ''}
    <h1>Al Jawarih Hospital</h1>
    <h1 style="font-size:16px;color:#555;margin-top:2px">مستشفى الجوارح</h1>
    <div class="sub">${invoice.category === 'pharmacy' ? 'Supplier Delivery Invoice' : 'Supplier Delivery Invoice'}</div>
    <div class="sub" style="font-weight:normal;font-size:12px;color:#555">فاتورة توريد</div>
  </div>
  <div class="meta">
    <div><label>Ref:</label><br><strong>${invoice.invoiceNumber || invoice.id.slice(0, 8)}</strong></div>
    <div><label>Date / التاريخ:</label><br><strong>${new Date(invoice.receivedAt || invoice.createdAt).toLocaleDateString()} ${new Date(invoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>
    <div><label>Supplier / المورد:</label><br><strong>${invoice.supplier?.name || ''}</strong></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Product / المنتج</th><th style="text-align:center">Qty / الكمية</th><th style="text-align:right">Unit Cost / سعر الوحدة</th><th style="text-align:right">Total / الإجمالي</th></tr></thead>
    <tbody>
      ${(invoice.items || []).map((it, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${it.item?.name || ''}</td>
          <td style="text-align:center">${it.quantityReceived}</td>
          <td style="text-align:right">SDG ${Number(it.unitCost).toLocaleString()}</td>
          <td style="text-align:right">SDG ${Number(it.totalLineCost).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <strong>Total / الإجمالي: SDG ${Number(invoice.invoiceTotal).toLocaleString()}</strong>
  </div>
  <div class="payment">
    <div><label>Paid / المدفوع:</label> <strong>SDG ${Number(invoice.amountPaid).toLocaleString()}</strong></div>
    <div><label>Unpaid Amount / المتبقي:</label> <strong>SDG ${(Number(invoice.invoiceTotal) - Number(invoice.amountPaid)).toLocaleString()}</strong></div>
    <div><label>Status / الحالة:</label> <span class="badge badge-${invoice.paymentStatus === 'PaidInFull' ? 'paid' : invoice.paymentStatus === 'PartialPayment' ? 'partial' : 'pending'}">${invoice.paymentStatus === 'PaidInFull' ? 'Paid in Full' : invoice.paymentStatus === 'PartialPayment' ? 'Partial Payment' : 'Pending'}</span></div>
  </div>
  <div style="font-size:12px;color:#555;margin-bottom:10px">
    <div><label>Notes:</label> ${invoice.notes || '—'}</div>
  </div>
  <div class="footer">
    <div class="sig-box">
      <div class="sig-line">Signature / التوقيع: <span class="sig-underline">&nbsp;</span></div>
      <div class="sig-line">Created by / تمت بواسطة: <strong>${invoice.createdBy?.fullName || ''}</strong></div>
    </div>
  </div>

</body></html>`;
}

async function printInvoice(invoice) {
  let logoSrc = '';
  try {
    const resp = await fetch('/logo.png');
    const blob = await resp.blob();
    logoSrc = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { /* no logo fallback */ }
  const html = buildInvoiceHtml(invoice, logoSrc);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) { alert('Please allow popups to print'); return; }
  setTimeout(() => { win.print(); }, 1000);
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function DeliveryModal({ open, onClose, category, onSuccess }) {
  const { t } = useTranslation();
  const { data: suppliers = [] } = useSuppliers(category);
  const currentUser = useAuthStore((s) => s.user);

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
  const [newProductIdx, setNewProductIdx] = useState(null);
  const [newProductForm, setNewProductForm] = useState({ name: '', sku: '', price: '', minStock: '0' });
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [supplierBalance, setSupplierBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchSupplierBalance = useCallback(async (supplierId) => {
    if (!supplierId) { setSupplierBalance(null); return; }
    setBalanceLoading(true);
    try {
      const data = await api.get(`/pos/suppliers/${supplierId}/balance`);
      setSupplierBalance(data);
    } catch { setSupplierBalance(null); }
    setBalanceLoading(false);
  }, []);

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
    setCreatedInvoice(null);
    setNewProductIdx(null);
    setNewProductForm({ name: '', sku: '', price: '', minStock: '0' });
    setSupplierBalance(null);
    setErrors({});

    api.get(`/pos/${category}/items`).then(setProducts).catch(() => {});
    api.get(`/pos/${category}/invoices/next-ref`).then((data) => {
      setForm((prev) => ({ ...prev, invoiceNumber: data.ref }));
    }).catch(() => {});
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

  const startNewProduct = (idx) => {
    setNewProductIdx(idx);
    setNewProductForm({ name: '', sku: '', price: '', minStock: '0' });
  };

  const cancelNewProduct = () => {
    setNewProductIdx(null);
    setNewProductForm({ name: '', sku: '', price: '', minStock: '0' });
  };

  const saveNewProduct = async (idx) => {
    if (!newProductForm.name || !newProductForm.sku) { alert('Name and SKU are required'); return; }
    setCreatingProduct(true);
    try {
      const product = await api.post(`/pos/${category}/items`, {
        name: newProductForm.name,
        sku: newProductForm.sku,
        price: Number(newProductForm.price) || 0,
        minStock: Number(newProductForm.minStock) || 0,
      });
      updateItem(idx, 'itemId', product.id);
      setProducts((prev) => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
      setNewProductIdx(null);
      setNewProductForm({ name: '', sku: '', price: '', minStock: '0' });
    } catch (err) {
      alert(err.message || 'Failed to create product');
    }
    setCreatingProduct(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (Number(form.amountPaid) > Number(form.invoiceTotal)) {
      newErrors.amountPaid = 'Amount Paid cannot exceed Invoice Total';
    }
    items.forEach((it, idx) => {
      if (!it.itemId) newErrors[`item_${idx}`] = 'Please select an item';
    });
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    const validItems = items.filter((it) => it.itemId && Number(it.qty) > 0);
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
      const invoice = await api.post(`/pos/${category}/invoices`, payload);
      setCreatedInvoice(invoice);
      setErrors({});
      onSuccess?.();
    } catch (err) {
      alert(err.message || 'Failed to create delivery');
    }
    setSubmitting(false);
  };

  const badgeClass = (status) => {
    if (status === 'PaidInFull') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    if (status === 'PartialPayment') return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
  };

  const statusLabel = (status) => {
    if (status === 'PaidInFull') return 'Paid in Full';
    if (status === 'PartialPayment') return 'Partial Payment';
    return 'Pending';
  };

  if (createdInvoice) {
    return (
      <Modal open={open} onClose={onClose} title="Delivery Created">
        <div className="space-y-6 py-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-heading-sm font-semibold text-obsidian">Invoice Created Successfully</p>
            <p className="text-body text-slate mt-1">{createdInvoice.invoiceNumber || createdInvoice.id.slice(0, 8)}</p>
          </div>

          <div className="bg-bone rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate">Supplier:</span><span className="text-obsidian font-medium">{createdInvoice.supplier?.name}</span></div>
            <div className="flex justify-between"><span className="text-slate">Total:</span><span className="text-obsidian font-medium">SDG {Number(createdInvoice.invoiceTotal).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate">Paid:</span><span className="text-obsidian font-medium">SDG {Number(createdInvoice.amountPaid).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate">Unpaid Amount:</span><span className="text-obsidian font-medium">SDG {(Number(createdInvoice.invoiceTotal) - Number(createdInvoice.amountPaid)).toLocaleString()}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-slate">Status:</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${badgeClass(createdInvoice.paymentStatus)}`}>{statusLabel(createdInvoice.paymentStatus)}</span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Close</Button>
            <Button onClick={() => printInvoice(createdInvoice)} className="flex-1">Print Invoice</Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="New Delivery">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Supplier</label>
          <select
            className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian"
            value={form.supplierId}
            onChange={(e) => { setForm({ ...form, supplierId: e.target.value }); fetchSupplierBalance(e.target.value); }}
            required
          >
            <option value="">-- Select Supplier --</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {supplierBalance && (
            <div className="mt-2 p-3 bg-bone rounded-lg text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate">Balance:</span><span className={`font-semibold ${supplierBalance.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>SDG {Number(supplierBalance.balance).toLocaleString()}</span></div>
              {supplierBalance.balance > 0 && (
                <div className="max-h-24 overflow-y-auto space-y-1 mt-1 border-t border-silver/50 pt-1">
                  {supplierBalance.invoices.filter((i) => i.balance > 0).slice(0, 5).map((inv) => (
                    <div key={inv.id} className="flex justify-between text-xs">
                      <span className="text-slate">{inv.invoiceNumber || inv.id.slice(0, 8)}</span>
                      <span className="text-red-500">SDG {Number(inv.balance).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between text-xs text-slate">
                <span>Total invoiced: SDG {Number(supplierBalance.totalInvoiced).toLocaleString()}</span>
                <span>Paid: SDG {Number(supplierBalance.totalPaid).toLocaleString()}</span>
              </div>
            </div>
          )}
          {balanceLoading && <p className="text-xs text-slate mt-1">Loading balance...</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Invoice Ref" value={form.invoiceNumber}
            onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="Auto-generated" />
          <Input label="Received Date" type="date" value={form.receivedAt}
            onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Invoice Total (SDG)" type="number" min="0" step="0.01" value={form.invoiceTotal}
            onChange={(e) => setForm({ ...form, invoiceTotal: e.target.value })} required />
          <Input label="Amount Paid (SDG)" type="number" min="0" step="0.01" value={form.amountPaid}
            onChange={(e) => { setForm({ ...form, amountPaid: e.target.value }); setErrors((prev) => ({ ...prev, amountPaid: undefined })); }} />
          {errors.amountPaid && <p className="text-xs text-red-500 col-span-3 -mt-2">{errors.amountPaid}</p>}
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
              {newProductIdx === idx ? (
                <>
                  <div className="col-span-5 space-y-1">
                    <div>
                      <label className="text-xs text-slate block mb-1">Name *</label>
                      <input className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption text-obsidian" value={newProductForm.name}
                        onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-slate block mb-1">SKU *</label>
                      <input className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption text-obsidian" value={newProductForm.sku}
                        onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-span-3 space-y-1">
                    <div>
                      <label className="text-xs text-slate block mb-1">Price</label>
                      <input className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption text-obsidian" type="number" min="0" step="0.01" value={newProductForm.price}
                        onChange={(e) => setNewProductForm({ ...newProductForm, price: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-slate block mb-1">Min Stock</label>
                      <input className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption text-obsidian" type="number" min="0" value={newProductForm.minStock}
                        onChange={(e) => setNewProductForm({ ...newProductForm, minStock: e.target.value })} />
                    </div>
                  </div>
                  <div className="col-span-4 flex items-end gap-1">
                    <button type="button" className="text-xs px-2 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      disabled={creatingProduct} onClick={() => saveNewProduct(idx)}>
                      {creatingProduct ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" className="text-xs px-2 py-1.5 text-slate hover:text-red-500"
                      onClick={cancelNewProduct}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-5">
                    <label className="text-xs text-slate block mb-1">Product</label>
                    <div className="flex gap-1">
                      <select className="flex-1 px-2 py-1.5 bg-paper border border-silver rounded text-caption text-obsidian"
                        value={it.itemId} onChange={(e) => { updateItem(idx, 'itemId', e.target.value); setErrors((prev) => ({ ...prev, [`item_${idx}`]: undefined })); }}>
                        <option value="" className="text-obsidian">-- Select --</option>
                        {products.map((p) => <option key={p.id} value={p.id} className="text-obsidian">{p.name} ({p.sku})</option>)}
                      </select>
                      <button type="button" className="text-xs px-2 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 whitespace-nowrap"
                        onClick={() => startNewProduct(idx)}>New</button>
                    </div>
                    {errors[`item_${idx}`] && <p className="text-xs text-red-500 mt-1">{errors[`item_${idx}`]}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate block mb-1">Qty</label>
                    <input type="number" min="1" className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption text-obsidian"
                      value={it.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-slate block mb-1">Unit Cost</label>
                    <input type="number" min="0" step="0.01" className="w-full px-2 py-1.5 bg-paper border border-silver rounded text-caption text-obsidian"
                      value={it.unitCost} onChange={(e) => updateItem(idx, 'unitCost', e.target.value)} />
                  </div>
                  <div className="col-span-2 flex items-end gap-1">
                    <div className="flex-1 text-right">
                      <label className="text-xs text-slate block mb-1">Total</label>
                      <p className="text-caption font-medium text-obsidian py-1.5">SDG {lineTotal(idx).toFixed(2)}</p>
                    </div>
                    {items.length > 1 && (
                      <button type="button" className="text-slate hover:text-red-500 p-1 mt-5"
                        onClick={() => removeLine(idx)}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
          <div className="flex justify-between text-caption text-slate pt-1">
            <span>Items Total: <strong className="text-obsidian">SDG {itemsTotal.toFixed(2)}</strong></span>
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
