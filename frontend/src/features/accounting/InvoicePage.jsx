import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAccountingInvoices, useAccountingInvoice, useCreateAccountingInvoice, useRecordInvoicePayment } from '../../hooks/queries/useAccountingInvoices';
import { useServiceItems } from '../../hooks/queries/useServiceCatalog';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';
import { printReceipt } from '../../lib/printReceipt';

const SOURCE_TYPES = ['CONSULTATION', 'PHARMACY', 'LAB', 'IMAGING', 'SURGERY', 'WARD', 'MANUAL'];
const PAYMENT_STATUSES = ['Pending', 'PartialPayment', 'PaidInFull', 'Voided'];

const SOURCE_COLORS = {
  CONSULTATION: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PHARMACY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  LAB: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  IMAGING: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  SURGERY: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  WARD: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  MANUAL: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

const STATUS_COLORS = {
  Pending: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PartialPayment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PaidInFull: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Voided: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400 line-through',
};

function buildFilterString(filters) {
  const params = new URLSearchParams();
  if (filters.sourceType) params.set('sourceType', filters.sourceType);
  if (filters.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.patientSearch) params.set('patientSearch', filters.patientSearch);
  if (filters.limit) params.set('limit', filters.limit);
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  return params.toString();
}

export default function InvoicePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ sourceType: '', paymentStatus: '', startDate: '', endDate: '', patientSearch: '', limit: '25', offset: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showCreditMemoModal, setShowCreditMemoModal] = useState(false);
  const [creditMemoAmount, setCreditMemoAmount] = useState('');
  const [creditMemoReason, setCreditMemoReason] = useState('');

  const params = buildFilterString(filters);
  const { data, isLoading, isError, error } = useAccountingInvoices(params || 'limit=25');
  const invoices = data?.invoices || data || [];
  const totalCount = data?.totalCount || invoices.length;

  const { data: selectedInvoice, isLoading: loadingDetail } = useAccountingInvoice(selectedId);

  const createMutation = useCreateAccountingInvoice();
  const paymentMutation = useRecordInvoicePayment();

  const voidMutation = useMutation({
    mutationFn: (id) => api.post(`/accounting/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'invoices'] });
      setShowVoidModal(false);
      setSelectedId(null);
    },
  });

  const creditMemoMutation = useMutation({
    mutationFn: (data) => api.post('/accounting/credit-memos', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounting', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['accounting', 'invoices', selectedId] });
      setShowCreditMemoModal(false);
      setCreditMemoAmount('');
      setCreditMemoReason('');
    },
  });

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value, offset: 0 }));
  }, []);

  const handleCreateClose = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  const handleSelect = useCallback((invoice) => {
    setSelectedId(invoice.id);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleRecordPayment = useCallback(() => {
    setPaymentAmount('');
    setShowPaymentModal(true);
  }, []);

  const handlePaymentClose = useCallback(() => {
    setShowPaymentModal(false);
    setPaymentAmount('');
  }, []);

  const handlePaymentSubmit = useCallback(async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    await paymentMutation.mutateAsync({ id: selectedId, amount: parseFloat(paymentAmount) });
    handlePaymentClose();
  }, [paymentAmount, paymentMutation, selectedId, handlePaymentClose]);

  const handleVoidClose = useCallback(() => {
    setShowVoidModal(false);
  }, []);

  const handleVoidConfirm = useCallback(async () => {
    if (!selectedId) return;
    await voidMutation.mutateAsync(selectedId);
  }, [selectedId, voidMutation]);

  const handleCreditMemoClose = useCallback(() => {
    setShowCreditMemoModal(false);
    setCreditMemoAmount('');
    setCreditMemoReason('');
  }, []);

  const handleCreditMemoSubmit = useCallback(async () => {
    if (!selectedId || !creditMemoAmount || parseFloat(creditMemoAmount) <= 0) return;
    await creditMemoMutation.mutateAsync({
      invoiceId: selectedId,
      amount: parseFloat(creditMemoAmount),
      reason: creditMemoReason,
    });
  }, [selectedId, creditMemoAmount, creditMemoReason, creditMemoMutation]);

  const handlePrint = useCallback(async () => {
    if (!selectedInvoice) return;
    const receiptData = {
      title: `Invoice ${selectedInvoice.invoiceNumber}`,
      transaction: {
        id: selectedInvoice.id,
        createdAt: selectedInvoice.createdAt,
        amount: selectedInvoice.total,
        paymentMethod: selectedInvoice.items?.[0]?.paymentMethod || 'CASH',
        cashier: { fullName: selectedInvoice.createdBy?.fullName || '' },
        description: selectedInvoice.notes || '',
      },
      items: (selectedInvoice.items || []).map((it) => ({
        name: it.description || it.serviceItem?.name || '',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        total: it.total,
      })),
      patientName: selectedInvoice.patient?.firstName ? `${selectedInvoice.patient.firstName} ${selectedInvoice.patient.lastName || ''}` : '',
      mrn: selectedInvoice.patient?.mrn || '',
    };
    printReceipt(receiptData);
  }, [selectedInvoice]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.invoices', 'Invoices')}</h1>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.invoices', 'Invoices')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load invoices'}
        </div>
      </div>
    );
  }

  if (selectedId) {
    return (
      <InvoiceDetail
        invoice={selectedInvoice}
        loading={loadingDetail}
        onBack={handleBack}
        onRecordPayment={handleRecordPayment}
        onPrint={handlePrint}
        onVoid={() => setShowVoidModal(true)}
        onCreateCreditMemo={() => setShowCreditMemoModal(true)}
        t={t}
      />
    );
  }

  const columns = [
    {
      key: 'invoiceNumber', header: t('accounting.invoiceNumber', 'Invoice #'),
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors font-medium" onClick={() => handleSelect(row)}>
          {row.invoiceNumber}
        </button>
      ),
    },
    {
      key: 'patient', header: t('accounting.patient', 'Patient'),
      render: (row) => row.patient ? `${row.patient.firstName || ''} ${row.patient.lastName || ''}` : '-',
    },
    {
      key: 'sourceType', header: t('accounting.source', 'Source'),
      render: (row) => <Badge className={SOURCE_COLORS[row.sourceType] || ''}>{row.sourceType}</Badge>,
    },
    {
      key: 'total', header: t('accounting.total', 'Total'),
      render: (row) => <span className="font-semibold">{formatCurrency(row.total)}</span>,
    },
    {
      key: 'amountPaid', header: t('accounting.paid', 'Paid'),
      render: (row) => <span className="text-green-600 dark:text-green-400">{formatCurrency(row.amountPaid)}</span>,
    },
    {
      key: 'balance', header: t('accounting.balance', 'Balance'),
      render: (row) => {
        const balance = (Number(row.total) || 0) - (Number(row.amountPaid) || 0);
        return <span className={balance > 0 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>{formatCurrency(balance)}</span>;
      },
    },
    {
      key: 'paymentStatus', header: t('accounting.status', 'Status'),
      render: (row) => <Badge className={STATUS_COLORS[row.paymentStatus] || ''}>{row.paymentStatus}</Badge>,
    },
    {
      key: 'createdAt', header: t('accounting.date', 'Date'),
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.invoices', 'Invoices')}</h1>
          <p className="text-body text-slate mt-1">{totalCount} {t('accounting.invoices', 'invoices')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>+ {t('accounting.createInvoice', 'Create Invoice')}</Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="text-xs font-medium text-graphite block mb-1">Source Type</label>
              <select value={filters.sourceType} onChange={(e) => handleFilterChange('sourceType', e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">All</option>
                {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-graphite block mb-1">Payment Status</label>
              <select value={filters.paymentStatus} onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">All</option>
                {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-graphite block mb-1">From</label>
              <input type="date" value={filters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite block mb-1">To</label>
              <input type="date" value={filters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite block mb-1">Patient</label>
              <Input type="text" placeholder="Search..." value={filters.patientSearch} onChange={(e) => handleFilterChange('patientSearch', e.target.value)} />
            </div>
          </div>

          {invoices.length === 0 ? (
            <p className="text-body text-slate text-center py-8">{t('accounting.noInvoices', 'No invoices found')}</p>
          ) : (
            <Table columns={columns} data={invoices} />
          )}
        </CardContent>
      </Card>

      <Modal open={showCreateModal} onClose={handleCreateClose} title={t('accounting.createInvoice', 'Create Invoice')} className="max-w-2xl">
        <CreateInvoiceForm
          onSave={async (formData) => {
            await createMutation.mutateAsync(formData);
            handleCreateClose();
          }}
          onCancel={handleCreateClose}
          saving={createMutation.isPending}
        />
      </Modal>

      <Modal open={showPaymentModal} onClose={handlePaymentClose} title={t('accounting.recordPayment', 'Record Payment')}>
        <div className="space-y-4">
          {selectedInvoice && (
            <div className="bg-bone rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate">Invoice:</span>
                <span className="text-obsidian font-medium">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Total:</span>
                <span className="text-obsidian">{formatCurrency(selectedInvoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Paid:</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(selectedInvoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Balance:</span>
                <span className="text-red-600 dark:text-red-400 font-semibold">
                  {formatCurrency((Number(selectedInvoice.total) || 0) - (Number(selectedInvoice.amountPaid) || 0))}
                </span>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Amount *</label>
            <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handlePaymentClose}>Cancel</Button>
            <Button variant="primary" onClick={handlePaymentSubmit} disabled={paymentMutation.isPending}>
              {paymentMutation.isPending ? 'Recording...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showVoidModal} onClose={handleVoidClose} title="Void Invoice">
        <div className="space-y-4">
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
            This action will permanently void the invoice. It cannot be undone.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleVoidClose}>Cancel</Button>
            <Button variant="primary" className="bg-red-600 hover:bg-red-700" onClick={handleVoidConfirm} disabled={voidMutation.isPending}>
              {voidMutation.isPending ? 'Voiding...' : 'Confirm Void'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={showCreditMemoModal} onClose={handleCreditMemoClose} title="Create Credit Memo">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Amount *</label>
            <Input type="number" min="0" step="0.01" value={creditMemoAmount} onChange={(e) => setCreditMemoAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Reason</label>
            <textarea value={creditMemoReason} onChange={(e) => setCreditMemoReason(e.target.value)} rows={3}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              placeholder="Enter reason for credit memo" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={handleCreditMemoClose}>Cancel</Button>
            <Button variant="primary" onClick={handleCreditMemoSubmit} disabled={creditMemoMutation.isPending}>
              {creditMemoMutation.isPending ? 'Creating...' : 'Create Credit Memo'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function InvoiceDetail({ invoice, loading, onBack, onRecordPayment, onPrint, onVoid, onCreateCreditMemo, t }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          Invoice not found
        </div>
      </div>
    );
  }

  const balance = (Number(invoice.total) || 0) - (Number(invoice.amountPaid) || 0);
  const isVoided = invoice.paymentStatus === 'Voided';
  const isUnpaid = invoice.paymentStatus === 'Pending' && !isVoided;
  const creditMemos = invoice.creditMemos || [];
  const refunds = invoice.refunds || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
          <h1 className="text-heading-sm font-semibold text-obsidian">{invoice.invoiceNumber}</h1>
          <Badge className={SOURCE_COLORS[invoice.sourceType] || ''}>{invoice.sourceType}</Badge>
          <Badge className={STATUS_COLORS[invoice.paymentStatus] || ''}>{invoice.paymentStatus}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {!isVoided && balance > 0 && (
            <Button variant="primary" size="sm" onClick={onRecordPayment}>{t('accounting.recordPayment', 'Record Payment')}</Button>
          )}
          {isUnpaid && (
            <Button variant="secondary" size="sm" onClick={onVoid} className="text-red-600 border-red-300 hover:bg-red-50">Void Invoice</Button>
          )}
          {!isVoided && (
            <Button variant="secondary" size="sm" onClick={onCreateCreditMemo}>Credit Memo</Button>
          )}
          <Button variant="secondary" size="sm" onClick={onPrint}>{t('accounting.printReceipt', 'Print Receipt')}</Button>
          <Button variant="secondary" size="sm" onClick={() => window.open(`/api/billing/invoices/${invoice.id}/arabic-pdf`, '_blank')}>Print Arabic Invoice</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t('accounting.invoiceDetails', 'Invoice Details')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-silver/50">
                <span className="text-slate">Patient</span>
                <span className="text-obsidian font-medium">{invoice.patient ? `${invoice.patient.firstName || ''} ${invoice.patient.lastName || ''}` : '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-silver/50">
                <span className="text-slate">MRN</span>
                <span className="text-obsidian">{invoice.patient?.mrn || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-silver/50">
                <span className="text-slate">Date</span>
                <span className="text-obsidian">{new Date(invoice.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-silver/50">
                <span className="text-slate">Created By</span>
                <span className="text-obsidian">{invoice.createdBy?.fullName || '-'}</span>
              </div>
              {invoice.notes && (
                <div className="py-1.5">
                  <span className="text-slate block mb-1">Notes</span>
                  <p className="text-obsidian">{invoice.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('accounting.paymentSummary', 'Payment Summary')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate">Subtotal</span>
                <span className="text-obsidian">{formatCurrency(invoice.subtotal || invoice.total)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate">Discount</span>
                  <span className="text-red-600 dark:text-red-400">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate">Tax</span>
                  <span className="text-obsidian">{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-silver font-semibold text-lg">
                <span className="text-obsidian">Total</span>
                <span className="text-obsidian">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate">Paid</span>
                <span className="text-green-600 dark:text-green-400">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-obsidian">Balance</span>
                <span className={balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>{formatCurrency(balance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('accounting.lineItems', 'Line Items')}</CardTitle></CardHeader>
        <CardContent>
          {(!invoice.items || invoice.items.length === 0) ? (
            <p className="text-body text-slate text-center py-4">{t('accounting.noItems', 'No items')}</p>
          ) : (
            <Table
              columns={[
                { key: 'description', header: 'Item', render: (row) => row.description || row.serviceItem?.name || '-' },
                { key: 'quantity', header: 'Qty', render: (row) => row.quantity },
                { key: 'unitPrice', header: 'Unit Price', render: (row) => formatCurrency(row.unitPrice) },
                { key: 'total', header: 'Total', render: (row) => <span className="font-semibold">{formatCurrency(row.total)}</span> },
              ]}
              data={invoice.items}
            />
          )}
        </CardContent>
      </Card>

      {creditMemos.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Credit Memos</CardTitle></CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: 'amount', header: 'Amount', render: (r) => <span className="text-red-600 font-semibold">-{formatCurrency(r.amount)}</span> },
                { key: 'reason', header: 'Reason', render: (r) => r.reason || '-' },
                { key: 'createdAt', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
                { key: 'createdBy', header: 'By', render: (r) => r.createdBy?.fullName || '-' },
              ]}
              data={creditMemos}
            />
          </CardContent>
        </Card>
      )}

      {refunds.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Refunds</CardTitle></CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: 'amount', header: 'Amount', render: (r) => <span className="text-red-600 font-semibold">{formatCurrency(r.amount)}</span> },
                { key: 'method', header: 'Method', render: (r) => r.paymentMethod || '-' },
                { key: 'reason', header: 'Reason', render: (r) => r.reason || '-' },
                { key: 'createdAt', header: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() },
              ]}
              data={refunds}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateInvoiceForm({ onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    patientId: '',
    sourceType: 'MANUAL',
    discount: '',
    tax: '',
    notes: '',
    items: [{ serviceItemId: '', description: '', quantity: 1, unitPrice: 0 }],
  });
  const [itemSearch, setItemSearch] = useState('');

  const { data: serviceItems = [] } = useServiceItems(itemSearch ? `search=${itemSearch}&limit=20` : 'limit=20');

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setForm((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'serviceItemId') {
        const svc = (Array.isArray(serviceItems) ? serviceItems : []).find((s) => s.id === value);
        if (svc) {
          newItems[index].description = svc.name;
          newItems[index].unitPrice = Number(svc.price) || 0;
        }
      }
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(field === 'quantity' ? value : newItems[index].quantity) || 0;
        const price = Number(field === 'unitPrice' ? value : newItems[index].unitPrice) || 0;
        newItems[index].total = qty * price;
      }
      return { ...prev, items: newItems };
    });
  }, [serviceItems]);

  const addItem = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { serviceItemId: '', description: '', quantity: 1, unitPrice: 0 }],
    }));
  }, []);

  const removeItem = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const subtotal = form.items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const discount = parseFloat(form.discount) || 0;
  const tax = parseFloat(form.tax) || 0;
  const total = subtotal - discount + tax;

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.patientId) return;
    const validItems = form.items.filter((it) => it.description || it.serviceItemId);
    if (validItems.length === 0) return;
    onSave({
      patientId: form.patientId,
      sourceType: form.sourceType,
      discount,
      tax,
      notes: form.notes,
      items: validItems.map((it) => ({
        serviceItemId: it.serviceItemId || undefined,
        description: it.description,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
      })),
    });
  }, [form, discount, tax, onSave]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Patient ID *</label>
        <Input type="text" value={form.patientId} onChange={(e) => handleChange('patientId', e.target.value)} placeholder="Enter patient ID" required />
      </div>
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Source Type *</label>
        <select value={form.sourceType} onChange={(e) => handleChange('sourceType', e.target.value)}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-graphite">Line Items *</label>
          <Button variant="ghost" size="sm" type="button" onClick={addItem}>+ Add Item</Button>
        </div>
        <div className="space-y-3">
          {form.items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Input type="text" placeholder="Service search" value={item.description} onChange={(e) => {
                  setItemSearch(e.target.value);
                  handleItemChange(index, 'description', e.target.value);
                }} />
              </div>
              <div className="col-span-3">
                <select value={item.serviceItemId} onChange={(e) => handleItemChange(index, 'serviceItemId', e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                  <option value="">Manual entry</option>
                  {(Array.isArray(serviceItems) ? serviceItems : []).map((svc) => (
                    <option key={svc.id} value={svc.id}>{svc.name} - {formatCurrency(svc.price)}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <Input type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
              </div>
              <div className="col-span-2">
                <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)} />
              </div>
              <div className="col-span-1">
                <span className="text-sm font-medium text-obsidian">{formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}</span>
              </div>
              <div className="col-span-1">
                {form.items.length > 1 && (
                  <Button variant="ghost" size="sm" type="button" onClick={() => removeItem(index)} className="text-red-500">×</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Discount</label>
          <Input type="number" min="0" step="0.01" value={form.discount} onChange={(e) => handleChange('discount', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Tax</label>
          <Input type="number" min="0" step="0.01" value={form.tax} onChange={(e) => handleChange('tax', e.target.value)} />
        </div>
        <div className="flex items-end">
          <div className="p-3 bg-bone rounded-lg w-full text-right">
            <span className="text-caption text-slate">Total: </span>
            <span className="text-heading-sm font-semibold text-obsidian">{formatCurrency(total)}</span>
          </div>
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
          {saving ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
