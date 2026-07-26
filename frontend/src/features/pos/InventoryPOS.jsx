import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import SuppliersTab from './SuppliersTab';
import DeliveryModal from './DeliveryModal';

const STORES = [
  { key: 'pharmacy', label: 'Pharmacy' },
  { key: 'optics', label: 'Optics' },
  { key: 'hospital', label: 'Hospital' },
];

const invoiceColumns = [
  { key: 'invoiceNumber', header: 'Ref' },
  { key: 'supplier', header: 'Supplier', render: (row) => row.supplier?.name || '-' },
  { key: 'invoiceTotal', header: 'Total', render: (row) => `SDG ${Number(row.invoiceTotal).toLocaleString()}` },
  { key: 'amountPaid', header: 'Paid', render: (row) => `SDG ${Number(row.amountPaid).toLocaleString()}` },
  { key: 'paymentStatus', header: 'Status', render: (row) => <Badge>{row.paymentStatus}</Badge> },
  { key: 'receivedAt', header: 'Date', render: (row) => new Date(row.receivedAt).toLocaleDateString() },
];

export default function InventoryPOS() {
  const [activeStore, setActiveStore] = useState('pharmacy');
  const [subTab, setSubTab] = useState('products');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [showDelivery, setShowDelivery] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await api.get(`/pos/${activeStore}/items`);
      setItems(data);
    } catch (err) { setItems([]); setFetchError(err.message || 'Failed to load items'); }
    setLoading(false);
  }, [activeStore]);

  const fetchInvoices = useCallback(async () => {
    try {
      const data = await api.get(`/pos/${activeStore}/invoices`);
      setInvoices(data);
    } catch { setInvoices([]); }
  }, [activeStore]);

  useEffect(() => { fetchItems(); fetchInvoices(); }, [fetchItems, fetchInvoices]);

  const filteredItems = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Inventory Dashboard</h1>
          <p className="text-body text-slate mt-1">Manage stock, deliveries & suppliers across all stores</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-silver">
        {STORES.map((s) => (
          <button key={s.key}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeStore === s.key ? 'border-b-2 border-lilac-bloom text-obsidian' : 'text-slate hover:text-obsidian'}`}
            onClick={() => { setActiveStore(s.key); setSubTab('products'); }}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${subTab === 'products' ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
            onClick={() => setSubTab('products')}>Products</button>
          <button className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${subTab === 'deliveries' ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
            onClick={() => setSubTab('deliveries')}>Deliveries</button>
          <button className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${subTab === 'suppliers' ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
            onClick={() => setSubTab('suppliers')}>Suppliers</button>
        </div>
        <Button onClick={() => setShowDelivery(true)}>+ New Delivery</Button>
      </div>

      {subTab === 'products' && (
        <Card>
          <CardHeader>
            <CardTitle>{activeStore === 'pharmacy' ? 'Pharmacy' : activeStore === 'optics' ? 'Optics' : 'Hospital'} Products</CardTitle>
          </CardHeader>
          <CardContent>
            <Input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
            {loading ? (
              <p className="text-body text-slate">Loading...</p>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <p className="text-body text-red-500">{fetchError}</p>
                <button
                  onClick={() => { fetchItems(); fetchInvoices(); }}
                  className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
                >
                  Retry
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No items found</p>
            ) : (
              <div className="max-h-[55vh] overflow-y-auto space-y-1">
                {filteredItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bone transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-body text-obsidian truncate">{item.name}</p>
                      <p className="text-caption text-slate">{item.sku} · Stock: {item.quantity} · Min: {item.minStock}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      {item.quantity <= item.minStock && <Badge variant="danger">Low</Badge>}
                      <span className="text-body font-medium text-obsidian">SDG {Number(item.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {subTab === 'deliveries' && (
        <Card>
          <CardHeader>
            <CardTitle>Delivery Invoices ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No deliveries yet</p>
            ) : (
              <Table columns={invoiceColumns} data={invoices} />
            )}
          </CardContent>
        </Card>
      )}

      {subTab === 'suppliers' && <SuppliersTab category={activeStore} />}

      <DeliveryModal open={showDelivery} onClose={() => setShowDelivery(false)} category={activeStore}
        onSuccess={() => { setShowDelivery(false); fetchItems(); fetchInvoices(); }} />
    </div>
  );
}
