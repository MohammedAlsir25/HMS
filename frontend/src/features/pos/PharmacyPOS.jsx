import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePOSItems, posKeys } from '../../hooks/queries/usePOS';
import { useReferrals } from '../../hooks/queries/useReferrals';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { StripCounter } from '../../components/ui/StripCounter';
import { api } from '../../lib/api';
import { printReceipt } from '../../lib/printReceipt';
import PharmacyProducts from './PharmacyProducts';
import SuppliersTab from './SuppliersTab';

const paymentMethods = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];

export default function PharmacyPOS() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [patientName, setPatientName] = useState('');
  const [completing, setCompleting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [receiptItems, setReceiptItems] = useState([]);
  const [activeTab, setActiveTab] = useState('sale');
  const [activeReferralId, setActiveReferralId] = useState(null);
  const [error, setError] = useState('');

  const { data: items = [], isLoading } = usePOSItems('pharmacy');
  const { data: referrals = [], isLoading: referralsLoading } = useReferrals(activeTab === 'referrals' ? 'type=PHARMACY_DISPATCH&status=PENDING' : null);

  const addToCart = (item) => {
    setError('');
    const packSize = item.packSize || 1;
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + packSize } : c);
      }
      return [...prev, { id: item.id, name: item.name, sku: item.sku, price: Number(item.price), packSize, quantity: packSize, mode: 'box' }];
    });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((c) => c.id !== id));

  const toggleMode = (id, newMode) => {
    setCart((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      if (newMode === 'box' && c.quantity % c.packSize !== 0) {
        return { ...c, mode: newMode, quantity: Math.floor(c.quantity / c.packSize) * c.packSize };
      }
      return { ...c, mode: newMode };
    }));
  };

  const updateQty = (id, displayQty) => {
    setCart((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const strips = c.mode === 'box' ? displayQty * c.packSize : displayQty;
      return { ...c, quantity: Math.max(c.mode === 'box' ? c.packSize : 1, strips) };
    }));
  };

  const total = cart.reduce((sum, c) => sum + (c.price / c.packSize) * c.quantity, 0);

  const handleDispenseReferral = useCallback((referral) => {
    setPatientName(referral.patient?.fullName || '');
    setActiveReferralId(referral.id);
    setActiveTab('sale');
  }, []);

  const filteredItems = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase())
  );

  const handleComplete = useCallback(async () => {
    if (cart.length === 0) return;
    setCompleting(true);
    try {
      const result = await api.post('/pos/transact', {
        type: 'PHARMACY',
        items: cart.map((c) => ({ id: c.id, quantity: c.quantity, name: c.name })),
        paymentMethod,
        amount: total,
        patientName: patientName || null,
        referralId: activeReferralId || undefined,
      });
      setReceipt(result.transaction);
      setReceiptItems(cart.map((c) => ({
        name: c.name,
        quantity: c.quantity,
        price: Number(c.price) / Number(c.packSize),
        total: (Number(c.price) / Number(c.packSize)) * c.quantity,
      })));
      setCart([]);
      setPatientName('');
      setPaymentMethod('CASH');
      setActiveReferralId(null);
      queryClient.invalidateQueries({ queryKey: posKeys.items('pharmacy') });
    } catch (err) { console.error('[PharmacyPOS]', err); setError(err.message || 'Transaction failed'); }
    setCompleting(false);
  }, [cart, paymentMethod, total, patientName, activeReferralId]);

  if (receipt) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Receipt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-4 text-center">
              <p className="text-lg font-bold text-green-700 dark:text-green-300">Transaction Complete</p>
              <p className="text-caption text-green-600 dark:text-green-400">ID: {receipt.id.slice(0, 8)}</p>
            </div>
            <div className="text-caption text-slate space-y-1">
              <p>Date: {new Date(receipt.createdAt).toLocaleString()}</p>
              <p>Cashier: {receipt.cashier?.fullName || '-'}</p>
            </div>
            {receiptItems.length > 0 && (
              <div>
                <div className="flex justify-between text-caption font-semibold text-graphite border-b border-silver pb-1 mb-1">
                  <span className="flex-1">Item</span>
                  <span className="w-16 text-center">Qty</span>
                  <span className="w-28 text-right">Price</span>
                  <span className="w-28 text-right">Total</span>
                </div>
                {receiptItems.map((it, i) => (
                  <div key={i} className="flex justify-between text-body text-obsidian py-1 border-b border-bone">
                    <span className="flex-1 truncate">{it.name}</span>
                    <span className="w-16 text-center">{it.quantity}</span>
                    <span className="w-28 text-right whitespace-nowrap">SDG {it.price.toFixed(2)}</span>
                    <span className="w-28 text-right whitespace-nowrap">SDG {it.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between text-body">
                <span className="text-graphite">Amount</span>
                <span className="font-semibold text-obsidian">SDG {Number(receipt.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-body">
                <span className="text-graphite">Payment</span>
                <Badge variant="primary" size="sm">{receipt.paymentMethod}</Badge>
              </div>
              <div className="flex justify-between text-body">
                <span className="text-graphite">Date</span>
                <span className="text-obsidian">{new Date(receipt.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => printReceipt({
                title: 'Sale Receipt',
                transaction: receipt,
                items: receiptItems.map((it) => ({ name: it.name, quantity: it.quantity, price: it.price, total: it.total })),
              })}>Print Receipt</Button>
              <Button className="flex-1" onClick={() => { setReceipt(null); setReceiptItems([]); setError(''); }}>New Sale</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {completing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="loader" />
        </div>
      )}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button className="text-red-500 hover:text-red-700 touch-target p-1 shrink-0" onClick={() => setError('')}>&times;</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Pharmacy POS</h1>
          <p className="text-body text-slate mt-1">Dispense medications and process payments</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-silver">
        <button className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'sale' ? 'border-b-2 border-lilac-bloom text-obsidian' : 'text-slate hover:text-obsidian'}`}
          onClick={() => setActiveTab('sale')}>Sale</button>
        <button className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'referrals' ? 'border-b-2 border-lilac-bloom text-obsidian' : 'text-slate hover:text-obsidian'}`}
          onClick={() => setActiveTab('referrals')}>Referrals</button>
        <button className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'products' ? 'border-b-2 border-lilac-bloom text-obsidian' : 'text-slate hover:text-obsidian'}`}
          onClick={() => setActiveTab('products')}>Products</button>
        <button className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'suppliers' ? 'border-b-2 border-lilac-bloom text-obsidian' : 'text-slate hover:text-obsidian'}`}
          onClick={() => setActiveTab('suppliers')}>Suppliers</button>
      </div>

      {activeTab === 'suppliers' ? <SuppliersTab category="pharmacy" /> : null}
      {activeTab === 'referrals' ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending Pharmacy Referrals</CardTitle>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <p className="text-body text-slate">Loading...</p>
            ) : referrals.length === 0 ? (
              <p className="text-body text-slate text-center py-8">No pending referrals</p>
            ) : (
              <div className="space-y-3">
                {referrals.map((ref) => (
                  <div key={ref.id} className="bg-bone rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-obsidian">{ref.patient?.fullName || 'Unknown'}</p>
                        <p className="text-caption text-slate">{ref.patient?.mrn}</p>
                      </div>
                      <Button size="sm" onClick={() => handleDispenseReferral(ref)}>Dispense</Button>
                    </div>
                    {ref.medications?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-caption font-medium text-graphite">Prescribed Medications:</p>
                        {ref.medications.map((m, i) => (
                          <div key={i} className="text-caption text-obsidian pl-2 border-l-2 border-lilac-bloom">
                            <span className="font-medium">{m.drugName}</span>
                            {m.dosage && <span> — {m.dosage}</span>}
                            {m.frequency && <span> — {m.frequency}</span>}
                            {m.duration && <span> — {m.duration}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
      {activeTab === 'products' ? <PharmacyProducts /> : null}
      {activeTab === 'sale' ? (

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                label="Search"
                placeholder="Search by name or SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-3"
              />
              {isLoading && <p className="text-body text-slate">Loading inventory...</p>}
              {!isLoading && (
                <div className="max-h-[50vh] overflow-y-auto space-y-1">
                  {filteredItems.map((item) => {
                    const outOfStock = item.quantity < 1;
                    return (
                    <div key={item.id}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bone cursor-pointer'}`}
                      onClick={() => !outOfStock && addToCart(item)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-body text-obsidian truncate">{item.name}</p>
                        <p className="text-caption text-slate">{item.sku} · Stock: {Number(item.quantity).toFixed(1)} boxes · {item.packSize || 1} strips/box</p>
                      </div>
                      <span className="text-body font-medium text-obsidian shrink-0 ml-2">SDG {(Number(item.price) / (item.packSize || 1)).toFixed(2)} / strip</span>
                    </div>
                    );
                  })}
                  {filteredItems.length === 0 && <p className="text-body text-slate text-center py-4">No items found</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cart ({cart.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 && <p className="text-body text-slate text-center py-4">Cart is empty</p>}
              {cart.map((c) => {
                const mode = c.mode || 'box';
                const displayQty = mode === 'box' ? Math.floor(c.quantity / c.packSize) : c.quantity;
                const displayLabel = mode === 'box' ? (displayQty !== 1 ? 'boxes' : 'box') : (displayQty !== 1 ? 'strips' : 'strip');
                return (
                <div key={c.id} className="pb-3 border-b border-bone last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="text-body text-obsidian truncate">{c.name}</p>
                    <button className="text-slate hover:text-red-500 touch-target p-1" onClick={() => removeFromCart(c.id)}>
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                  <div className="flex gap-0 mt-2">
                    <button
                      className={`px-2.5 py-1 text-xs font-medium rounded-l-md border transition-colors ${mode === 'box' ? 'bg-lilac-bloom text-obsidian border-lilac-bloom z-10' : 'bg-paper text-graphite border-silver hover:bg-bone'}`}
                      onClick={() => toggleMode(c.id, 'box')}
                    >Box</button>
                    <button
                      className={`px-2.5 py-1 text-xs font-medium rounded-r-md border-l-0 border transition-colors ${mode === 'strip' ? 'bg-lilac-bloom text-obsidian border-lilac-bloom z-10' : 'bg-paper text-graphite border-silver hover:bg-bone'}`}
                      onClick={() => toggleMode(c.id, 'strip')}
                    >Strip</button>
                  </div>
                  <div className="mt-2">
                    <StripCounter
                      value={displayQty}
                      min={1}
                      label={displayLabel}
                      onChange={(v) => updateQty(c.id, v)}
                    />
                  </div>
                  <p className="text-caption text-slate mt-1">
                    SDG {((c.price / c.packSize) * c.quantity).toFixed(2)}
                  </p>
                </div>
                );
              })}
              {cart.length > 0 && (
                <div className="pt-2 border-t border-silver">
                  <div className="flex justify-between text-body font-semibold">
                    <span>Total</span>
                    <span>SDG {total.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {cart.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input label="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Optional" />
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Method</label>
                  <div className="flex gap-2 flex-wrap">
                    {paymentMethods.map((m) => (
                      <button
                        key={m.value}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-target
                          ${paymentMethod === m.value ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                        onClick={() => setPaymentMethod(m.value)}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={handleComplete} disabled={completing}>
                  {completing ? 'Processing...' : `Charge SDG ${total.toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
  ) : null}
    </div>
  );
}
