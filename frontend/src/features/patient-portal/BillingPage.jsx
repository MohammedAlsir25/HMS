import { useState, useEffect } from 'react';
import { CreditCard, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { portalApi } from './hooks/usePortalApi';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const statusVariant = {
  Paid: 'success',
  Pending: 'warning',
  Partial: 'info',
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [tab, setTab] = useState('invoices');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [invoiceData, paymentData] = await Promise.all([
          portalApi.getInvoices('all'),
          portalApi.getPaymentHistory(),
        ]);
        if (cancelled) return;
        setInvoices(invoiceData?.invoices || []);
        setPayments(paymentData?.payments || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'callback') {
      const invoiceId = params.get('invoiceId');
      if (invoiceId) {
        portalApi.getInvoices('all').then((data) => {
          setInvoices(data?.invoices || []);
        }).catch(() => {});
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const totalOutstanding = invoices
    .filter((inv) => inv.paymentStatus !== 'Paid')
    .reduce((sum, inv) => sum + (inv.amountDue || 0), 0);

  const handleTapCheckout = async () => {
    if (!payModal) return;
    setCheckoutLoading(true);
    setError('');
    try {
      const profile = await portalApi.getProfile();
      const result = await portalApi.tapCheckout(
        payModal.id,
        payModal.amountDue,
        'SAR',
        profile?.fullName || profile?.name || 'Patient',
        profile?.email || '',
        profile?.phone || ''
      );
      if (result?.url) {
        window.open(result.url, '_blank');
      } else {
        setError('Failed to get payment link. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const closePayModal = () => {
    setPayModal(null);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-heading-sm font-semibold text-obsidian">Billing</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-body text-slate mt-3">Loading billing data...</p>
        </div>
      ) : (
        <>
          {totalOutstanding > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent>
                <div className="flex items-center gap-3">
                  <CreditCard className="w-8 h-8 text-amber-600" />
                  <div>
                    <p className="text-caption font-medium text-amber-800">Outstanding Balance</p>
                    <p className="text-heading-sm font-semibold text-amber-900">{totalOutstanding.toFixed(2)} SAR</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 border-b border-silver">
            {['invoices', 'history'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-body font-medium capitalize border-b-2 transition-colors ${
                  tab === t ? 'border-lilac-bloom text-obsidian' : 'border-transparent text-slate hover:text-obsidian'
                }`}
              >
                {t === 'invoices' ? 'Invoices' : 'Payment History'}
              </button>
            ))}
          </div>

          {tab === 'invoices' && (
            <>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-body text-slate">No invoices found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <Card key={inv.id}>
                      <CardContent>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-body font-medium text-obsidian">{inv.invoiceNumber}</h3>
                              <Badge variant={statusVariant[inv.paymentStatus] || 'default'} size="sm">{inv.paymentStatus}</Badge>
                            </div>
                            <p className="text-caption text-slate">Date: {formatDate(inv.date)}</p>
                            <p className="text-caption text-graphite">Total: {inv.total?.toFixed(2)} SAR | Paid: {inv.amountPaid?.toFixed(2)} SAR | Due: {inv.amountDue?.toFixed(2)} SAR</p>
                          </div>
                          {inv.amountDue > 0 && (
                            <Button size="sm" onClick={() => setPayModal(inv)}>Pay Now</Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-body text-slate">No payment history</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((pmt) => (
                    <Card key={pmt.id}>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-body font-medium text-obsidian">{pmt.invoiceNumber}</p>
                            <p className="text-caption text-slate">{formatDate(pmt.createdAt)} — {pmt.paymentMethod}</p>
                          </div>
                          <span className="text-body font-medium text-green-700">{pmt.amount?.toFixed(2)} SAR</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal open={!!payModal} onClose={closePayModal} title="Pay Invoice">
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-body space-y-1">
            <p className="text-slate">Invoice: {payModal?.invoiceNumber}</p>
            <p className="text-obsidian font-medium">Amount due: {payModal?.amountDue?.toFixed(2)} SAR</p>
          </div>

          <Button
            className="w-full flex items-center justify-center gap-2"
            onClick={handleTapCheckout}
            loading={checkoutLoading}
          >
            <span>Pay {payModal?.amountDue?.toFixed(2)} SAR with Tap</span>
            <ExternalLink className="w-4 h-4" />
          </Button>

          <Button variant="outline" className="w-full" onClick={closePayModal}>
            Pay Later
          </Button>
        </div>
      </Modal>
    </div>
  );
}
