'use client';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';

const columns = [
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Name' },
  { key: 'category', header: 'Category', render: (v) => <Badge>{v}</Badge> },
  { key: 'quantity', header: 'Qty', render: (v, row) => (
    <span className={v <= row.minStock ? 'text-red-500 font-semibold' : ''}>{v}</span>
  )},
  { key: 'price', header: 'Price', render: (v) => `$${Number(v).toFixed(2)}` },
  { key: 'costPrice', header: 'Cost', render: (v) => v ? `$${Number(v).toFixed(2)}` : '-' },
  { key: 'minStock', header: 'Min Stock' },
];

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({ name: '', sku: '', category: '', quantity: 0, price: 0, costPrice: 0, minStock: 0 });
  const [txForm, setTxForm] = useState({ type: 'IN', quantity: 1, notes: '' });

  const loadItems = async () => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await api.get(`/inventory/items${params}`);
      setItems(data);
    } catch (err) {
      console.error('Failed to load items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    loadItems();
  };

  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    try {
      const data = await api.get(`/inventory/items/${item.id}`);
      setTransactions(data.transactions || []);
    } catch (err) {
      setTransactions([]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/items', form);
      setShowModal(false);
      setForm({ name: '', sku: '', category: '', quantity: 0, price: 0, costPrice: 0, minStock: 0 });
      loadItems();
    } catch (err) {
      alert(err.message || 'Failed to create item');
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      await api.post('/inventory/transactions', { itemId: selectedItem.id, ...txForm });
      setTxForm({ type: 'IN', quantity: 1, notes: '' });
      handleSelectItem(selectedItem);
      loadItems();
    } catch (err) {
      alert(err.message || 'Transaction failed');
    }
  };

  const lowStockCount = items.filter((i) => i.quantity <= i.minStock).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Inventory</h1>
          <p className="text-body text-slate mt-1">Manage stock, track movements & monitor low-stock items</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Add Item</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-caption text-slate">Total Items</p><p className="text-heading-sm font-semibold text-obsidian">{items.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-caption text-slate">Low Stock Items</p><p className="text-heading-sm font-semibold text-red-500">{lowStockCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-caption text-slate">Categories</p><p className="text-heading-sm font-semibold text-obsidian">{new Set(items.map(i => i.category)).size}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Items</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="mb-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  <Button type="submit" variant="secondary">Search</Button>
                </div>
              </form>
              {loading ? (
                <p className="text-body text-slate">Loading inventory...</p>
              ) : items.length === 0 ? (
                <p className="text-body text-slate text-center py-4">No items found</p>
              ) : (
                <Table columns={columns} data={items} onRowClick={handleSelectItem} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedItem ? (
            <>
              <Card>
                <CardHeader><CardTitle>{selectedItem.name}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-body"><span className="font-medium">SKU:</span> {selectedItem.sku}</p>
                  <p className="text-body"><span className="font-medium">Category:</span> {selectedItem.category}</p>
                  <p className="text-body"><span className="font-medium">Quantity:</span> {selectedItem.quantity}</p>
                  <p className="text-body"><span className="font-medium">Price:</span> ${Number(selectedItem.price).toFixed(2)}</p>
                  {selectedItem.costPrice != null && <p className="text-body"><span className="font-medium">Cost:</span> ${Number(selectedItem.costPrice).toFixed(2)}</p>}
                  <p className="text-body"><span className="font-medium">Min Stock:</span> {selectedItem.minStock}</p>
                  {selectedItem.quantity <= selectedItem.minStock && (
                    <Badge variant="danger">Low Stock</Badge>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Add Transaction</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleTransaction} className="space-y-3">
                    <select value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="IN">Stock In</option>
                      <option value="OUT">Stock Out</option>
                    </select>
                    <Input type="number" label="Quantity" min="1" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: parseInt(e.target.value) || 1 })} />
                    <Input placeholder="Notes" value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} />
                    <Button type="submit" variant="primary" className="w-full">Record Transaction</Button>
                  </form>
                </CardContent>
              </Card>

              {transactions.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {transactions.map((tx) => (
                        <div key={tx.id} className="flex justify-between items-center py-1 border-b border-silver last:border-0">
                          <div>
                            <Badge variant={tx.type === 'IN' ? 'success' : 'danger'}>{tx.type}</Badge>
                            <span className="text-caption text-slate ml-2">{tx.quantity} units</span>
                          </div>
                          <span className="text-caption text-slate">{new Date(tx.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-body text-slate text-center py-4">Select an item to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Inventory Item">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="SKU" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <div>
            <label className="text-sm font-medium text-graphite">Category</label>
            <select required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom mt-1">
              <option value="">Select category</option>
              <option value="medication">Medication</option>
              <option value="consumable">Consumable</option>
              <option value="instrument">Instrument</option>
              <option value="frame">Frame</option>
              <option value="lens">Lens</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Input label="Initial Quantity" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
          <Input label="Price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
          <Input label="Cost Price" type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: parseFloat(e.target.value) || 0 })} />
          <Input label="Min Stock Level" type="number" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: parseInt(e.target.value) || 0 })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create Item</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
