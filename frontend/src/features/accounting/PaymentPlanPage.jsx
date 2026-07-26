import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaymentPlans, usePaymentPlan, useCreatePaymentPlan, usePayInstallment } from '../../hooks/queries/useAccounting';
import { usePatientSearch } from '../../hooks/usePatients';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';
import { api } from '../../lib/api';

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'biweekly', label: 'Biweekly', days: 14 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
];

const STATUS_COLORS = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  DEFAULTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const INST_STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  PAID: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  OVERDUE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  SKIPPED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export default function PaymentPlanPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('list');
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInst, setSelectedInst] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const params = 'limit=100';
  const { data, isLoading, isError, error } = usePaymentPlans(params);
  const plans = data?.plans || data || [];

  const { data: selectedPlan, isLoading: loadingDetail } = usePaymentPlan(selectedPlanId);

  const payInstallment = usePayInstallment();

  const handlePayInstallment = useCallback((inst) => {
    setSelectedInst(inst);
    setPayAmount(inst.amount || '');
    setShowPayModal(true);
  }, []);

  const handlePaySubmit = useCallback(async () => {
    if (!selectedInst || !payAmount) return;
    await payInstallment.mutateAsync({ planId: selectedPlanId, instId: selectedInst.id, amount: parseFloat(payAmount) });
    setShowPayModal(false);
    setSelectedInst(null);
    setPayAmount('');
  }, [selectedInst, payAmount, payInstallment, selectedPlanId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.paymentPlans', 'Payment Plans')}</h1>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.paymentPlans', 'Payment Plans')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load payment plans'}
        </div>
      </div>
    );
  }

  if (selectedPlanId) {
    return (
      <PlanDetail
        plan={selectedPlan}
        loading={loadingDetail}
        onBack={() => setSelectedPlanId(null)}
        onPayInstallment={handlePayInstallment}
        t={t}
      />
    );
  }

  const columns = [
    {
      key: 'patient', header: t('accounting.patient', 'Patient'),
      render: (row) => <span className="font-medium">{row.patient?.firstName || ''} {row.patient?.lastName || ''}</span>,
    },
    {
      key: 'totalAmount', header: t('accounting.totalAmount', 'Total'),
      render: (row) => <span className="font-semibold">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      key: 'installmentCount', header: t('accounting.installments', 'Installments'),
      render: (row) => `${row.paidInstallments || 0} / ${row.installmentCount || 0}`,
    },
    {
      key: 'frequency', header: t('accounting.frequency', 'Frequency'),
      render: (row) => <Badge>{row.frequency}</Badge>,
    },
    {
      key: 'status', header: t('accounting.status', 'Status'),
      render: (row) => <Badge className={STATUS_COLORS[row.status] || ''}>{row.status}</Badge>,
    },
    {
      key: 'startDate', header: t('accounting.startDate', 'Start Date'),
      render: (row) => new Date(row.startDate).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.paymentPlans', 'Payment Plans')}</h1>
          <p className="text-body text-slate mt-1">{plans.length} {t('accounting.plans', 'plans')}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2">
        <Button variant={tab === 'list' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('list')}>{t('accounting.activePlans', 'Active Plans')}</Button>
        <Button variant={tab === 'create' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('create')}>{t('accounting.createPlan', 'Create Plan')}</Button>
      </div>

      {tab === 'list' && (
        <Card>
          <CardContent>
            {plans.length === 0 ? (
              <p className="text-body text-slate text-center py-8">{t('accounting.noPlans', 'No payment plans found')}</p>
            ) : (
              <Table columns={columns} data={plans} />
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'create' && <CreatePlanForm onCreated={() => setTab('list')} />}

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title={t('accounting.recordPayment', 'Record Payment')}>
        <div className="space-y-4">
          {selectedInst && (
            <div className="bg-bone rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate">Installment #{selectedInst.number}</span>
                <span className="text-obsidian font-medium">{formatCurrency(selectedInst.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate">Due Date:</span>
                <span className="text-obsidian">{new Date(selectedInst.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Amount *</label>
            <Input type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowPayModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handlePaySubmit} disabled={payInstallment.isPending}>
              {payInstallment.isPending ? 'Recording...' : 'Confirm Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PlanDetail({ plan, loading, onBack, onPayInstallment, t }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          Payment plan not found
        </div>
      </div>
    );
  }

  const installments = plan.installments || [];
  const paidCount = installments.filter((i) => i.status === 'PAID').length;

  const instColumns = [
    {
      key: 'number', header: '#',
      render: (row) => row.number || '-',
    },
    {
      key: 'amount', header: 'Amount',
      render: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'dueDate', header: 'Due Date',
      render: (row) => new Date(row.dueDate).toLocaleDateString(),
    },
    {
      key: 'status', header: 'Status',
      render: (row) => <Badge className={INST_STATUS_COLORS[row.status] || ''}>{row.status}</Badge>,
    },
    {
      key: 'paidAt', header: 'Paid On',
      render: (row) => row.paidAt ? new Date(row.paidAt).toLocaleDateString() : '-',
    },
    {
      key: 'actions', header: '',
      render: (row) => (row.status === 'PENDING' || row.status === 'OVERDUE') ? (
        <Button variant="primary" size="sm" onClick={() => onPayInstallment(row)}>Record Payment</Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h1 className="text-heading-sm font-semibold text-obsidian">{plan.patient?.firstName || ''} {plan.patient?.lastName || ''} — Payment Plan</h1>
        <Badge className={STATUS_COLORS[plan.status] || ''}>{plan.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-caption text-slate">Total Amount</p>
          <p className="text-heading-sm font-semibold text-obsidian">{formatCurrency(plan.totalAmount)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-caption text-slate">Installments</p>
          <p className="text-heading-sm font-semibold text-obsidian">{paidCount} / {plan.installmentCount || installments.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-caption text-slate">Frequency</p>
          <p className="text-heading-sm font-semibold text-obsidian">{plan.frequency}</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Installment Schedule</CardTitle></CardHeader>
        <CardContent>
          {installments.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No installments</p>
          ) : (
            <Table columns={instColumns} data={installments} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CreatePlanForm({ onCreated }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createPlan = useCreatePaymentPlan();
  const { query: patientQuery, setQuery: setPatientQuery, results: patientResults, loading: patientLoading, selectedPatient, selectPatient, clearPatient } = usePatientSearch();
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [installmentCount, setInstallmentCount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: invoiceResults = [] } = useQuery({
    queryKey: ['invoices', 'search', invoiceSearch],
    queryFn: () => api.get(`/accounting/invoices?patientSearch=${encodeURIComponent(invoiceSearch)}&limit=10`),
    enabled: invoiceSearch.length >= 2,
  });

  const invoices = invoiceResults?.invoices || invoiceResults || [];
  const frequencyDays = FREQUENCIES.find((f) => f.value === frequency)?.days || 30;
  const count = parseInt(installmentCount) || 0;
  const total = parseFloat(totalAmount) || 0;
  const installmentAmount = count > 0 ? total / count : 0;

  const preview = useMemo(() => {
    if (count <= 0 || !startDate) return [];
    const result = [];
    const start = new Date(startDate);
    for (let i = 0; i < count; i++) {
      const due = new Date(start);
      due.setDate(due.getDate() + i * frequencyDays);
      result.push({
        number: i + 1,
        amount: installmentAmount,
        dueDate: due.toISOString().slice(0, 10),
      });
    }
    return result;
  }, [count, startDate, frequencyDays, installmentAmount]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!selectedPatient || !total || count <= 0) return;
    await createPlan.mutateAsync({
      patientId: selectedPatient.id,
      invoiceId: selectedInvoice?.id || undefined,
      totalAmount: total,
      installmentCount: count,
      frequency,
      startDate,
    });
    onCreated();
  }, [selectedPatient, selectedInvoice, total, count, frequency, startDate, createPlan, onCreated]);

  return (
    <Card>
      <CardHeader><CardTitle>{t('accounting.createPaymentPlan', 'Create Payment Plan')}</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Patient *</label>
            {selectedPatient ? (
              <div className="flex items-center gap-2 p-2 bg-bone rounded-lg">
                <span className="text-obsidian font-medium">{selectedPatient.firstName} {selectedPatient.lastName} — {selectedPatient.mrn}</span>
                <Button variant="ghost" size="sm" type="button" onClick={clearPatient}>×</Button>
              </div>
            ) : (
              <div className="relative">
                <Input type="text" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder="Search patient..." />
                {patientResults.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-paper border border-silver rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {patientResults.map((p) => (
                      <button key={p.id} type="button" className="w-full text-left px-3 py-2 hover:bg-bone text-sm text-obsidian"
                        onClick={() => selectPatient(p)}>
                        {p.firstName} {p.lastName} — {p.mrn}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-graphite block mb-1">Invoice (Optional)</label>
            {selectedInvoice ? (
              <div className="flex items-center gap-2 p-2 bg-bone rounded-lg">
                <span className="text-obsidian font-medium">{selectedInvoice.invoiceNumber} — {formatCurrency(selectedInvoice.total)}</span>
                <Button variant="ghost" size="sm" type="button" onClick={() => setSelectedInvoice(null)}>×</Button>
              </div>
            ) : (
              <div className="relative">
                <Input type="text" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder="Search invoice..." />
                {invoices.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-paper border border-silver rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {invoices.map((inv) => (
                      <button key={inv.id} type="button" className="w-full text-left px-3 py-2 hover:bg-bone text-sm text-obsidian"
                        onClick={() => { setSelectedInvoice(inv); setInvoiceSearch(''); }}>
                        {inv.invoiceNumber} — {formatCurrency(inv.total)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">Total Amount *</label>
              <Input type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">Installments *</label>
              <Input type="number" min="1" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">Frequency *</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">Start Date *</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
          </div>

          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium text-graphite mb-2">Installment Preview ({count} × {formatCurrency(installmentAmount)})</p>
              <div className="max-h-48 overflow-y-auto border border-silver rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-bone sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-caption font-medium text-graphite">#</th>
                      <th className="px-3 py-2 text-right text-caption font-medium text-graphite">Amount</th>
                      <th className="px-3 py-2 text-left text-caption font-medium text-graphite">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((p) => (
                      <tr key={p.number} className="border-t border-silver/50">
                        <td className="px-3 py-2 text-obsidian">{p.number}</td>
                        <td className="px-3 py-2 text-right text-obsidian">{formatCurrency(p.amount)}</td>
                        <td className="px-3 py-2 text-obsidian">{p.dueDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={onCreated}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={!selectedPatient || !total || count <= 0 || createPlan.isPending}>
              {createPlan.isPending ? 'Creating...' : 'Create Payment Plan'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
