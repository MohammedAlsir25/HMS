import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePOSItems, posKeys } from '../../hooks/queries/usePOS';
import { useReferrals } from '../../hooks/queries/useReferrals';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';
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
  const [activeTab, setActiveTab] = useState('sale');
  const [activeReferralId, setActiveReferralId] = useState(null);

  const { data: items = [], isLoading } = usePOSItems('pharmacy');
  const { data: referrals = [], isLoading: referralsLoading } = useReferrals(activeTab === 'referrals' ? 'type=PHARMACY_DISPATCH&status=PENDING' : null);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { id: item.id, name: item.name, sku: item.sku, price: Number(item.price), quantity: 1 }];
    });
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((c) => c.id !== id));
  const updateQty = (id, qty) => setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: Math.max(1, qty) } : c));
  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

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
      setCart([]);
      setPatientName('');
      setPaymentMethod('CASH');
      setActiveReferralId(null);
      queryClient.invalidateQueries({ queryKey: posKeys.items('pharmacy') });
    } catch (err) { console.error('[PharmacyPOS]', err); }
    setCompleting(false);
  }, [cart, paymentMethod, total, patientName]);

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
            <div className="space-y-2">
              <div className="flex justify-between text-body">
                <span className="text-graphite">Amount</span>
                <span className="font-semibold text-obsidian">${Number(receipt.amount).toFixed(2)}</span>
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
            <Button className="w-full" onClick={() => setReceipt(null)}>New Sale</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {activeTab === 'suppliers' ? <SuppliersTab /> : null}
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
                  {filteredItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-bone transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-body text-obsidian truncate">{item.name}</p>
                        <p className="text-caption text-slate">{item.sku} · Stock: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-body font-medium text-obsidian">${Number(item.price).toFixed(2)}</span>
                        <Button size="sm" onClick={() => addToCart(item)} disabled={item.quantity < 1}>Add</Button>
                      </div>
                    </div>
                  ))}
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
              {cart.map((c) => (
                <div key={c.id} className="flex items-center justify-between pb-2 border-b border-bone last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-obsidian truncate">{c.name}</p>
                    <p className="text-caption text-slate">${c.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <select
                      className="w-14 px-1 py-1 bg-paper border border-silver rounded text-caption"
                      value={c.quantity}
                      onChange={(e) => updateQty(c.id, parseInt(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                    <button className="text-slate hover:text-red-500 dark:hover:text-red-400 touch-target p-1" onClick={() => removeFromCart(c.id)}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {cart.length > 0 && (
                <div className="pt-2 border-t border-silver">
                  <div className="flex justify-between text-body font-semibold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
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
                  {completing ? 'Processing...' : `Charge $${total.toFixed(2)}`}
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
