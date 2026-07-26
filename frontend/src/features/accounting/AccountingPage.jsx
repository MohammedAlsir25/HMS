import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { useAccountingSummary, useRevenueByDay, useRevenueByType, useAccountingTransactions, useExpenses, usePnL, useDebts, usePayDebt, useCreateDebt, useCurrentShift, useOpenShift, useCloseShift, useCashMovements, useCreateCashMovement, accountingKeys } from '../../hooks/queries/useAccounting';
import { useDepartments } from '../../hooks/queries/useAdmin';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { CURRENCY, formatCurrency } from '../../utils/currency';
import { printReceipt } from '../../lib/printReceipt';

import ServiceItemCatalog from './ServiceItemCatalog';
import InvoicePage from './InvoicePage';

const TYPE_ICONS = {
  RECEPTION: '🩺',
  PHARMACY: '💊',
  OPTICS: '👓',
};
const TYPE_COLORS = {
  RECEPTION: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  PHARMACY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  OPTICS: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};
const EXPENSE_CATEGORIES = ['SALARY', 'SUPPLIES', 'UTILITIES', 'RENT', 'EQUIPMENT', 'MAINTENANCE', 'MARKETING', 'OTHER'];
const PAYMENT_METHODS = ['CASH', 'CARD', 'BANK_TRANSFER'];

function BarChart({ data, labelKey, valueKey, color = 'bg-lilac-bloom', maxBarHeight = 120 }) {
  if (!data || data.length === 0) return <p className="text-body text-slate text-center py-8">No data</p>;
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="flex items-end gap-1 h-[130px]">
      {data.map((d) => {
        const pct = (d[valueKey] / max) * maxBarHeight;
        return (
          <div key={d[labelKey]} className="flex-1 flex flex-col items-center justify-end h-full">
            <div
              title={`${d[labelKey]}: SDG ${Number(d[valueKey]).toFixed(2)}`}
              className={`w-full rounded-t ${color} transition-all duration-300 hover:opacity-80`}
              style={{ height: `${Math.max(pct, 2)}px` }}
            />
            {data.length <= 15 && (
              <span className="text-[10px] text-slate mt-1 truncate w-full text-center">
                {d[labelKey].slice(5)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function get30DaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function ExpenseForm({ expense, departments, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    amount: expense?.amount || '',
    category: expense?.category || 'SUPPLIES',
    description: expense?.description || '',
    date: expense?.date ? new Date(expense.date).toISOString().slice(0, 10) : getTodayStr(),
    paidTo: expense?.paidTo || '',
    paymentMethod: expense?.paymentMethod || '',
    notes: expense?.notes || '',
    departmentId: expense?.departmentId || '',
  });
  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0 || !form.category || !form.description) {
      alert('Amount, category, and description are required');
      return;
    }
    if (!form.departmentId) {
      alert('Please select a department');
      return;
    }
    onSave({ ...form, amount: parseFloat(form.amount) });
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Amount *</label>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => handleChange('amount', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Category *</label>
          <select value={form.category} onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-graphite block mb-1">Description *</label>
          <Input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Date</label>
          <Input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Paid To</label>
          <Input type="text" value={form.paidTo} onChange={(e) => handleChange('paidTo', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Payment Method</label>
          <select value={form.paymentMethod} onChange={(e) => handleChange('paymentMethod', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            <option value="">--</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Department</label>
          <select value={form.departmentId} onChange={(e) => handleChange('departmentId', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            <option value="">--</option>
            {(departments || []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-graphite block mb-1">Notes</label>
          <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={2}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : expense ? 'Update' : 'Create'} Expense
        </Button>
      </div>
    </form>
  );
}

function buildParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
}

export default function AccountingPage() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');
  const [txFilters, setTxFilters] = useState({ type: '', paymentMethod: '', startDate: get30DaysAgo(), endDate: getTodayStr(), limit: '25', offset: 0 });
  const [showTxModal, setShowTxModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({ type: 'RECEPTION', amount: '', paymentMethod: 'CASH', description: '', departmentId: '' });
  const [addSaving, setAddSaving] = useState(false);

  const [expenseFilters, setExpenseFilters] = useState({ category: '', departmentId: '', startDate: '', endDate: '' });
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseSaving, setExpenseSaving] = useState(false);

  const [payingDebt, setPayingDebt] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [newDebt, setNewDebt] = useState({ creditor: '', description: '', amount: '', dueDate: '', notes: '' });
  const [debtSaving, setDebtSaving] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [denominations, setDenominations] = useState([
    { value: 500, qty: 0 },
    { value: 200, qty: 0 },
    { value: 100, qty: 0 },
    { value: 50, qty: 0 },
    { value: 20, qty: 0 },
    { value: 10, qty: 0 },
    { value: 5, qty: 0 },
    { value: 1, qty: 0 },
  ]);
  const [showCashMovementModal, setShowCashMovementModal] = useState(false);
  const [cmForm, setCmForm] = useState({ type: 'PICKUP', amount: '', reason: '' });
  const [closeShiftSaving, setCloseShiftSaving] = useState(false);
  const [cmSaving, setCmSaving] = useState(false);

  const { data: summary, isLoading: loading, isError: summaryError, refetch: refetchSummary } = useAccountingSummary();
  const { data: departments } = useDepartments();
  const { data: revenueByDay = [] } = useRevenueByDay(`days=30`);
  const { data: revenueByType = [] } = useRevenueByType(`from=${get30DaysAgo()}&to=${getTodayStr()}`);
  const { data: pnlData } = usePnL(`startDate=${get30DaysAgo()}&endDate=${getTodayStr()}`);

  const { data: debtsData } = useDebts();
  const payDebtMutation = usePayDebt();
  const createDebtMutation = useCreateDebt();
  const debts = debtsData?.debts || [];
  const debtSummary = debtsData?.summary || { totalDebt: 0, totalUnpaid: 0, bySource: { pharmacy: { total: 0, unpaid: 0 }, optics: { total: 0, unpaid: 0 }, hospital: { total: 0, unpaid: 0 } } };

  const { data: currentShift } = useCurrentShift();
  const openShiftMutation = useOpenShift();
  const closeShiftMutation = useCloseShift();
  const { data: cashMovements = [] } = useCashMovements(currentShift?.id);
  const createCashMovementMutation = useCreateCashMovement();

  const expenseParams = buildParams({ ...expenseFilters, limit: '200' });
  const txParams = buildParams(txFilters);
  const { data: expensesData = { expenses: [], totalCount: 0 } } = useExpenses(expenseParams);
  const expenses = expensesData.expenses ?? [];
  const expensesTotal = expensesData.totalCount ?? 0;
  const { data: txResponse = { transactions: [], totalCount: 0 }, isLoading: txLoading } = useAccountingTransactions(
    tab === 'transactions' && txFilters.startDate && txFilters.endDate ? txParams : null
  );

  const handleFilterChange = (field, value) => {
    setTxFilters((prev) => ({ ...prev, [field]: value, offset: 0 }));
  };

  const totalPages = Math.ceil(txResponse.totalCount / parseInt(txFilters.limit));
  const currentPage = Math.floor(txFilters.offset / parseInt(txFilters.limit)) + 1;

  const goToPage = (page) => {
    const offset = (page - 1) * parseInt(txFilters.limit);
    setTxFilters((prev) => ({ ...prev, offset }));
  };

  const exportCSV = () => {
    const rows = txResponse.transactions;
    if (rows.length === 0) return;
    const headers = ['Date', 'Type', 'Payment Method', 'Amount', 'Description', 'Cashier'];
    const csv = [
      headers.join(','),
      ...rows.map((r) =>
        [
          new Date(r.createdAt).toISOString(),
          r.type,
          r.paymentMethod,
          Number(r.amount).toFixed(2),
          `"${(r.description || '').replace(/"/g, '""')}"`,
          r.cashier?.fullName || '',
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${getTodayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenShift = async () => {
    setMutationError('');
    try {
      await openShiftMutation.mutateAsync({});
    } catch (err) {
      setMutationError(err.message || 'Failed to open shift');
    }
  };

  const handleCloseShift = async () => {
    const actualTotal = denominations.reduce((sum, d) => sum + d.value * d.qty, 0);
    setCloseShiftSaving(true);
    setMutationError('');
    try {
      await closeShiftMutation.mutateAsync({ expectedTotal: summary?.dailyTotal || 0, actualTotal, denominations: denominations.filter(d => d.qty > 0) });
      setShowCloseShiftModal(false);
      setDenominations(denominations.map(d => ({ ...d, qty: 0 })));
    } catch (err) {
      setMutationError(err.message || 'Failed to close shift');
    }
    setCloseShiftSaving(false);
  };

  const handleCreateCashMovement = async () => {
    if (!cmForm.amount || parseFloat(cmForm.amount) <= 0) { setMutationError('Enter a valid amount'); return; }
    setCmSaving(true);
    setMutationError('');
    try {
      await createCashMovementMutation.mutateAsync({ ...cmForm, amount: parseFloat(cmForm.amount) });
      setShowCashMovementModal(false);
      setCmForm({ type: 'PICKUP', amount: '', reason: '' });
    } catch (err) {
      setMutationError(err.message || 'Failed to record cash movement');
    }
    setCmSaving(false);
  };

  const handleAddTransaction = async () => {
    if (!newTx.amount || parseFloat(newTx.amount) <= 0) { setMutationError('Enter a valid amount'); return; }
    setAddSaving(true);
    setMutationError('');
    try {
      await api.post('/accounting/transactions', {
        type: newTx.type,
        amount: parseFloat(newTx.amount),
        paymentMethod: newTx.paymentMethod,
        description: newTx.description,
        departmentId: newTx.departmentId || null,
      });
      setShowAddModal(false);
      setNewTx({ type: 'RECEPTION', amount: '', paymentMethod: 'CASH', description: '', departmentId: '' });
      queryClient.invalidateQueries({ queryKey: ['accounting'] });
      setTxFilters((prev) => ({ ...prev, offset: 0 }));
    } catch (err) {
      setMutationError(err.message || 'Failed to create transaction');
    } finally {
      setAddSaving(false);
    }
  };

  const invalidateExpenses = () => queryClient.invalidateQueries({ queryKey: accountingKeys.expenses(expenseParams) });

  const handleExpenseSave = async (formData) => {
    setExpenseSaving(true);
    setMutationError('');
    try {
      if (editingExpense) {
        await api.patch(`/accounting/expenses/${editingExpense.id}`, formData);
      } else {
        await api.post('/accounting/expenses', formData);
      }
      setShowExpenseForm(false);
      setEditingExpense(null);
      invalidateExpenses();
    } catch (err) {
      setMutationError(err.message || 'Failed to save expense');
    } finally {
      setExpenseSaving(false);
    }
  };

  const handleExpenseDelete = async (id) => {
    if (!confirm('Delete this expense?')) return;
    setMutationError('');
    try {
      await api.delete(`/accounting/expenses/${id}`);
      invalidateExpenses();
    } catch (err) {
      setMutationError(err.message || 'Failed to delete expense');
    }
  };

  const txColumns = [
    {
      key: 'createdAt', header: t('accounting.date', 'Date'),
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors" onClick={() => setShowTxModal(row)}>
          {new Date(row.createdAt).toLocaleString()}
        </button>
      ),
    },
    {
      key: 'type', header: t('accounting.type', 'Type'),
      render: (row) => (
        <Badge className={TYPE_COLORS[row.type] || ''}>
          {TYPE_ICONS[row.type] || ''} {row.type}
        </Badge>
      ),
    },
    {
      key: 'paymentMethod', header: t('accounting.method', 'Method'),
      render: (row) => <Badge variant="info">{row.paymentMethod}</Badge>,
    },
    {
      key: 'amount', header: t('accounting.amount', 'Amount'),
      render: (row) => <span className="font-semibold">{formatCurrency(row.amount)}</span>,
    },
    { key: 'description', header: t('accounting.description', 'Description') },
    {
      key: 'department', header: 'Department',
      render: (row) => row.department?.name || '-',
    },
    {
      key: 'cashier', header: t('accounting.cashier', 'Cashier'),
      render: (row) => row.cashier?.fullName || '-',
    },
  ];

  const expenseColumns = [
    {
      key: 'date', header: 'Date',
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors" onClick={() => { setEditingExpense(row); setShowExpenseForm(true); }}>
          {new Date(row.date).toLocaleDateString()}
        </button>
      ),
    },
    { key: 'category', header: 'Category', render: (row) => <Badge variant="info">{row.category}</Badge> },
    { key: 'description', header: 'Description' },
    {
      key: 'amount', header: 'Amount',
      render: (row) => <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(row.amount)}</span>,
    },
    { key: 'paidTo', header: 'Paid To' },
    { key: 'paymentMethod', header: 'Payment', render: (row) => row.paymentMethod ? <Badge>{row.paymentMethod}</Badge> : '-' },
    {
      key: 'department', header: 'Department',
      render: (row) => row.department?.name || '-',
    },
    {
      key: 'id', header: '',
      render: (row) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setEditingExpense(row); setShowExpenseForm(true); }}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => handleExpenseDelete(row.id)} className="text-red-500 dark:text-red-400">Del</Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.title')}</h1>
        <p className="text-body text-slate">{t('accounting.loading')}</p>
      </div>
    );
  }

  if (summaryError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.title')}</h1>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-body text-red-500">Failed to load accounting data</p>
          <button
            onClick={() => refetchSummary()}
            className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const todayByType = summary?.today?.byType || {};

  const isLoadingOverlay = addSaving || expenseSaving || paySaving || debtSaving;

  return (
    <div className="space-y-6">
      {isLoadingOverlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-obsidian/40" style={{ backdropFilter: 'blur(2px)' }}>
          <div className="loader"></div>
        </div>
      )}
      {mutationError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{mutationError}</span>
          <button onClick={() => setMutationError('')} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 text-xl leading-none touch-target">&times;</button>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.title')}</h1>
          <p className="text-body text-slate mt-1">{t('accounting.description')}</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2">
        <Button variant={tab === 'overview' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('overview')}>Overview</Button>
        <Button variant={tab === 'transactions' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('transactions')}>Transactions</Button>
        <Button variant={tab === 'expenses' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('expenses')}>Expenses</Button>
        <Button variant={tab === 'debts' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('debts')}>Debt</Button>
        <Button variant={tab === 'cash' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('cash')}>Cash</Button>
        <Button variant={tab === 'service-items' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('service-items')}>Service Items</Button>
        <Button variant={tab === 'invoices' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('invoices')}>Invoices</Button>
      </div>

      {tab === 'overview' && (
        <>
          {summary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {['today', 'week', 'month', 'allTime'].map((period) => {
                  const d = summary[period];
                  const labelKey = period === 'today' ? 'accounting.today' : period === 'week' ? 'accounting.thisWeek' : period === 'month' ? 'accounting.thisMonth' : 'accounting.allTime';
                  return (
                    <Card key={period}>
                      <CardContent className="p-4">
                        <p className="text-caption text-slate">{t(labelKey)}</p>
                        <p className="text-heading-sm font-semibold text-obsidian">{formatCurrency(d?.total || 0)}</p>
                        <p className="text-caption text-slate">{d?.count || 0} {t('accounting.transactions')}</p>
                        <div className="mt-2 pt-2 border-t border-silver text-xs text-slate space-y-0.5">
                          <p>{t('accounting.cogsShort')}: <span className="text-orange-600 dark:text-orange-400 font-medium">{formatCurrency(d?.cogs || 0)}</span></p>
                          <p>{t('accounting.grossProfitShort')}: <span className={((d?.total || 0) - (d?.cogs || 0)) >= 0 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'}>{formatCurrency((d?.total || 0) - (d?.cogs || 0))}</span></p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                {summary?.openShift ? (
                  <Button variant="secondary" size="sm" onClick={() => setShowCloseShiftModal(true)}>
                    {t('accounting.closeShift', 'Close Shift')}
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleOpenShift}>
                    {t('accounting.openShiftBtn', 'Open Shift')}
                  </Button>
                )}
              </div>

              {summary?.openShift && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('accounting.openShift')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                      <Badge variant="success">{t('accounting.open', 'Open')}</Badge>
                      <span className="text-body">{t('accounting.cashier')}: {summary.openShift.user?.fullName || 'Unknown'}</span>
                      <span className="text-body text-slate">{t('accounting.openedAt', 'Opened')}: {new Date(summary.openShift.openedAt).toLocaleString()}</span>
                      <span className="text-body font-medium">{t('accounting.transactions')}: {summary.openShift.transactions?.length || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader><CardTitle>{t('accounting.dailyRevenue', 'Daily Revenue (30 days)')}</CardTitle></CardHeader>
                  <CardContent>
                    <BarChart data={revenueByDay} labelKey="date" valueKey="total" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>{t('accounting.revenueBySource', 'Revenue by Source')}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {revenueByType.length === 0 && <p className="text-body text-slate text-center py-4">{t('accounting.noData', 'No data')}</p>}
                      {revenueByType.map((r) => {
                        const total = revenueByType.reduce((s, x) => s + x.total, 0);
                        const pct = total > 0 ? ((r.total / total) * 100).toFixed(1) : 0;
                        return (
                          <div key={r.type}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="font-medium text-graphite">
                                {TYPE_ICONS[r.type] || ''} {r.type}
                              </span>
                              <span className="text-obsidian font-semibold">{formatCurrency(r.total)} ({pct}%)</span>
                            </div>
                            <div className="w-full h-3 bg-bone rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${r.type === 'RECEPTION' ? 'bg-blue-400 dark:bg-blue-500' : r.type === 'PHARMACY' ? 'bg-green-400 dark:bg-green-500' : 'bg-purple-400 dark:bg-purple-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {pnlData && (
                <Card>
                  <CardHeader><CardTitle>{t('accounting.pnl')} (30 days)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                      <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                        <p className="text-caption text-green-700 dark:text-green-300">{t('accounting.revenue')}</p>
                        <p className="text-heading-sm font-bold text-green-800 dark:text-green-200">{formatCurrency(pnlData.totals?.revenue || 0)}</p>
                      </div>
                      <div className="p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                        <p className="text-caption text-orange-700 dark:text-orange-300">{t('accounting.cogsShort')}</p>
                        <p className="text-heading-sm font-bold text-orange-800 dark:text-orange-200">{formatCurrency(pnlData.totals?.cogs || 0)}</p>
                      </div>
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <p className="text-caption text-blue-700 dark:text-blue-300">{t('accounting.grossProfitShort')}</p>
                        <p className="text-heading-sm font-bold text-blue-800 dark:text-blue-200">{formatCurrency(pnlData.totals?.grossProfit || 0)}</p>
                      </div>
                      <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                        <p className="text-caption text-red-700 dark:text-red-300">{t('accounting.expense')}</p>
                        <p className="text-heading-sm font-bold text-red-800 dark:text-red-200">{formatCurrency(pnlData.totals?.expense || 0)}</p>
                      </div>
                      <div className={`p-4 rounded-lg ${(pnlData.totals?.net || 0) >= 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'}`}>
                        <p className={`text-caption ${(pnlData.totals?.net || 0) >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>{t('accounting.netIncomeShort')}</p>
                        <p className={`text-heading-sm font-bold ${(pnlData.totals?.net || 0) >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                          {formatCurrency(pnlData.totals?.net || 0)}
                        </p>
                      </div>
                    </div>
                    {pnlData.departments?.length > 0 && (
                      <Table
                        columns={[
                          { key: 'department', header: 'Department', render: (row) => row.department?.name || 'Uncategorized' },
                          { key: 'revenue', header: t('accounting.revenue'), render: (row) => formatCurrency(row.revenue) },
                          { key: 'cogs', header: t('accounting.cogsShort'), render: (row) => <span className="text-orange-600 dark:text-orange-400">{formatCurrency(row.cogs)}</span> },
                          { key: 'grossProfit', header: t('accounting.grossProfitShort'), render: (row) => (
                            <span className={row.grossProfit >= 0 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                              {formatCurrency(row.grossProfit)}
                            </span>
                          )},
                          { key: 'expense', header: t('accounting.expense'), render: (row) => <span className="text-red-600 dark:text-red-400">{formatCurrency(row.expense)}</span> },
                          { key: 'net', header: t('accounting.netIncomeShort'), render: (row) => (
                            <span className={row.net >= 0 ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                              {formatCurrency(row.net)}
                            </span>
                          )},
                        ]}
                        data={pnlData.departments}
                      />
                    )}
                  </CardContent>
                </Card>
              )}

              {summary?.today?.byMethod && Object.keys(summary.today.byMethod).length > 0 && (
                <Card>
                  <CardHeader><CardTitle>{t('accounting.todayByMethod', "Today's Payments by Method")}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(summary.today.byMethod).map(([method, amount]) => (
                        <div key={method} className="p-3 bg-bone rounded-lg">
                          <p className="text-caption text-slate">{method}</p>
                          <p className="text-body font-semibold text-obsidian">{formatCurrency(amount)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {Object.keys(todayByType).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(todayByType).map(([type, total]) => (
                    <Card key={type}>
                      <CardContent className="p-4">
                        <p className="text-caption text-slate">{t('accounting.today')} {type}</p>
                        <p className="text-heading-sm font-semibold text-obsidian">{formatCurrency(total)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'cash' && (
        <>
          <div className="flex items-center gap-2 mb-4">
            {currentShift && !currentShift.closedAt ? (
              <>
                <Badge variant="success">Shift Open</Badge>
                <span className="text-body text-slate">Opened: {new Date(currentShift.openedAt).toLocaleString()}</span>
                <span className="text-body font-medium">Transactions: {summary?.today?.count || 0}</span>
                <Button variant="secondary" size="sm" onClick={() => setShowCloseShiftModal(true)}>Close Shift</Button>
                <Button variant="secondary" size="sm" onClick={() => setShowCashMovementModal(true)}>Record Pickup</Button>
              </>
            ) : (
              <Button variant="primary" size="sm" onClick={handleOpenShift}>Open Shift</Button>
            )}
          </div>

          {currentShift?.closedAt && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Badge variant="secondary">Closed</Badge>
                  <span className="text-body">Opened: {new Date(currentShift.openedAt).toLocaleString()}</span>
                  <span className="text-body">Closed: {new Date(currentShift.closedAt).toLocaleString()}</span>
                  <span className="text-body font-medium">Expected: {formatCurrency(currentShift.expectedTotal)}</span>
                  <span className="text-body font-medium">Actual: {formatCurrency(currentShift.actualTotal)}</span>
                  <span className={`text-body font-medium ${(currentShift.actualTotal || 0) >= (currentShift.expectedTotal || 0) ? 'text-green-600' : 'text-red-600'}`}>
                    Difference: {formatCurrency((currentShift.actualTotal || 0) - (currentShift.expectedTotal || 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Cash Movements</CardTitle>
            </CardHeader>
            <CardContent>
              {cashMovements.length === 0 ? (
                <p className="text-body text-slate text-center py-4">No cash movements recorded</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-body">
                    <thead>
                      <tr className="border-b border-silver">
                        <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">Type</th>
                        <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">Amount</th>
                        <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">Reason</th>
                        <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">User</th>
                        <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashMovements.map((cm) => (
                        <tr key={cm.id} className="border-b border-silver hover:bg-paper/50">
                          <td className="py-2 px-3">
                            <Badge variant={cm.type === 'PICKUP' ? 'warning' : cm.type === 'DROP' ? 'info' : 'secondary'}>
                              {cm.type}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 font-medium">{formatCurrency(cm.amount)}</td>
                          <td className="py-2 px-3 text-slate">{cm.reason || '-'}</td>
                          <td className="py-2 px-3 text-slate">{cm.user?.fullName || cm.userId}</td>
                          <td className="py-2 px-3 text-slate">{new Date(cm.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'transactions' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>{t('accounting.recentTransactions')}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                    + {t('accounting.addTransaction', 'Add Transaction')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={exportCSV} disabled={txResponse.transactions.length === 0}>
                    {t('accounting.exportCSV', 'Export CSV')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div>
                  <label className="text-xs font-medium text-graphite block mb-1">{t('accounting.type', 'Type')}</label>
                  <select value={txFilters.type} onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    <option value="">{t('accounting.all', 'All')}</option>
                    <option value="RECEPTION">RECEPTION</option>
                    <option value="PHARMACY">PHARMACY</option>
                    <option value="OPTICS">OPTICS</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite block mb-1">{t('accounting.method', 'Method')}</label>
                  <select value={txFilters.paymentMethod} onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    <option value="">{t('accounting.all', 'All')}</option>
                    <option value="CASH">CASH</option>
                    <option value="CARD">CARD</option>
                    <option value="INSURANCE">INSURANCE</option>
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite block mb-1">{t('accounting.from', 'From')}</label>
                  <input type="date" value={txFilters.startDate} onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite block mb-1">{t('accounting.to', 'To')}</label>
                  <input type="date" value={txFilters.endDate} onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite block mb-1">{t('accounting.perPage', 'Per page')}</label>
                  <select value={txFilters.limit} onChange={(e) => handleFilterChange('limit', e.target.value)}
                    className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              {txLoading ? (
                <p className="text-body text-slate text-center py-4">{t('accounting.loading')}</p>
              ) : txResponse.transactions.length === 0 ? (
                <p className="text-body text-slate text-center py-4">{t('accounting.noTransactions')}</p>
              ) : (
                <>
                  <Table columns={txColumns} data={txResponse.transactions} />
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-caption text-slate">
                        {t('accounting.pageInfo', 'Page {{current}} of {{total}} ({{count}} total)', {
                          current: currentPage, total: totalPages, count: txResponse.totalCount,
                        })}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => goToPage(1)}>
                          {t('accounting.first', 'First')}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
                          {t('accounting.prev', 'Prev')}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => goToPage(currentPage + 1)}>
                          {t('accounting.next', 'Next')}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => goToPage(totalPages)}>
                          {t('accounting.last', 'Last')}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {showTxModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/50" onClick={() => setShowTxModal(null)}>
              <div className="bg-paper rounded-xl shadow-2xl max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-obsidian">{t('accounting.txDetail', 'Transaction Detail')}</h3>
                    <button onClick={() => setShowTxModal(null)} className="text-slate hover:text-obsidian touch-target">&times;</button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-silver/50">
                      <span className="text-caption text-slate">{t('accounting.date')}</span>
                      <span className="text-body text-obsidian">{new Date(showTxModal.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-silver/50">
                      <span className="text-caption text-slate">{t('accounting.type')}</span>
                      <Badge className={TYPE_COLORS[showTxModal.type]}>{showTxModal.type}</Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b border-silver/50">
                      <span className="text-caption text-slate">{t('accounting.method')}</span>
                      <Badge variant="info">{showTxModal.paymentMethod}</Badge>
                    </div>
                    <div className="flex justify-between py-2 border-b border-silver/50">
                      <span className="text-caption text-slate">{t('accounting.amount')}</span>
                      <span className="text-lg font-bold text-obsidian">{formatCurrency(showTxModal.amount)}</span>
                    </div>
                <div className="flex justify-between py-2 border-b border-silver/50">
                  <span className="text-caption text-slate">Department</span>
                  <span className="text-body text-obsidian">{showTxModal.department?.name || '-'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-silver/50">
                  <span className="text-caption text-slate">{t('accounting.cashier')}</span>
                  <span className="text-body text-obsidian">{showTxModal.cashier?.fullName || '-'}</span>
                </div>
                <div className="py-2">
                  <span className="text-caption text-slate block mb-1">{t('accounting.description')}</span>
                  <p className="text-body text-obsidian">{showTxModal.description || '-'}</p>
                </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="primary" onClick={async () => {
                      let tx = showTxModal;
                      try {
                        tx = await api.get(`/accounting/transactions/${showTxModal.id}`);
                      } catch { /* use modal data if fetch fails */ }
                      const items = (tx.inventoryTransactions || []).map((it) => ({
                        name: it.item?.name || '',
                        quantity: Math.abs(Number(it.quantity)),
                        price: Math.abs(Number(it.unitCost || 0)),
                        total: Math.abs(Number(it.quantity) * Number(it.unitCost || 0)),
                      }));
                      printReceipt({ title: `${tx.type} Receipt`, transaction: tx, items });
                    }}>Print Receipt</Button>
                    <Button variant="ghost" onClick={() => setShowTxModal(null)}>{t('accounting.close', 'Close')}</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/50" onClick={() => { setShowAddModal(false); setNewTx({ type: 'RECEPTION', amount: '', paymentMethod: 'CASH', description: '' }); }}>
              <div className="bg-paper rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-obsidian">{t('accounting.addTransaction', 'Add Transaction')}</h3>
                    <button onClick={() => { setShowAddModal(false); setNewTx({ type: 'RECEPTION', amount: '', paymentMethod: 'CASH', description: '' }); }} className="text-slate hover:text-obsidian touch-target">&times;</button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-graphite block mb-1">{t('accounting.type')}</label>
                      <select value={newTx.type} onChange={(e) => setNewTx((p) => ({ ...p, type: e.target.value }))}
                        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                        <option value="RECEPTION">RECEPTION</option>
                        <option value="PHARMACY">PHARMACY</option>
                        <option value="OPTICS">OPTICS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-graphite block mb-1">{t('accounting.method')}</label>
                      <select value={newTx.paymentMethod} onChange={(e) => setNewTx((p) => ({ ...p, paymentMethod: e.target.value }))}
                        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                        <option value="CASH">CASH</option>
                        <option value="CARD">CARD</option>
                        <option value="INSURANCE">INSURANCE</option>
                        <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-graphite block mb-1">{t('accounting.amount')}</label>
                      <input type="number" min="0" step="0.01" value={newTx.amount} onChange={(e) => setNewTx((p) => ({ ...p, amount: e.target.value }))}
                        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-graphite block mb-1">{t('accounting.description')}</label>
                      <input type="text" value={newTx.description} onChange={(e) => setNewTx((p) => ({ ...p, description: e.target.value }))}
                        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-graphite block mb-1">Department</label>
                      <select value={newTx.departmentId} onChange={(e) => setNewTx((p) => ({ ...p, departmentId: e.target.value }))}
                        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                        <option value="">--</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => { setShowAddModal(false); setNewTx({ type: 'RECEPTION', amount: '', paymentMethod: 'CASH', description: '', departmentId: '' }); }}>
                      {t('accounting.cancel', 'Cancel')}
                    </Button>
                    <Button variant="primary" onClick={handleAddTransaction} disabled={addSaving}>
                      {addSaving ? t('accounting.saving', 'Saving...') : t('accounting.save', 'Save')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'expenses' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>Expenses ({expensesTotal})</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="primary" size="sm" onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }}>
                  + Add Expense
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-graphite block mb-1">Category</label>
                <select value={expenseFilters.category} onChange={(e) => setExpenseFilters((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                  <option value="">All</option>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-graphite block mb-1">Department</label>
                <select value={expenseFilters.departmentId} onChange={(e) => setExpenseFilters((p) => ({ ...p, departmentId: e.target.value }))}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                  <option value="">All</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-graphite block mb-1">From</label>
                <input type="date" value={expenseFilters.startDate} onChange={(e) => setExpenseFilters((p) => ({ ...p, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
              </div>
              <div>
                <label className="text-xs font-medium text-graphite block mb-1">To</label>
                <input type="date" value={expenseFilters.endDate} onChange={(e) => setExpenseFilters((p) => ({ ...p, endDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
              </div>
            </div>

            {expenses.length === 0 ? (
              <p className="text-body text-slate text-center py-4">No expenses found</p>
            ) : (
              <Table columns={expenseColumns} data={expenses} />
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'debts' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4">
              <p className="text-caption text-slate">Total Debt</p>
              <p className="text-heading-sm font-semibold text-obsidian">{formatCurrency(debtSummary.totalDebt)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-caption text-slate">Unpaid Balance</p>
              <p className="text-heading-sm font-semibold text-red-600 dark:text-red-400">{formatCurrency(debtSummary.totalUnpaid)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-caption text-slate">Pharmacy Unpaid</p>
              <p className="text-heading-sm font-semibold text-obsidian">{formatCurrency(debtSummary.bySource.pharmacy.unpaid)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-caption text-slate">Optics Unpaid</p>
              <p className="text-heading-sm font-semibold text-obsidian">{formatCurrency(debtSummary.bySource.optics.unpaid)}</p>
            </CardContent></Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Debts ({debts.length})</CardTitle>
                <Button variant="primary" size="sm" onClick={() => setShowAddDebt(true)}>+ Add Hospital Debt</Button>
              </div>
            </CardHeader>
            <CardContent>
              {debts.length === 0 ? (
                <p className="text-body text-slate text-center py-4">No outstanding debts</p>
              ) : (
                <Table columns={[
                  { key: 'source', header: 'Source', render: (row) => {
                    const icons = { pharmacy: '💊', optics: '👓', hospital: '🏢' };
                    const colors = { pharmacy: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', optics: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200', hospital: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' };
                    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[row.source] || ''}`}>{icons[row.source] || ''} {row.source}</span>;
                  }},
                  { key: 'creditor', header: 'Creditor', render: (row) => <span className="font-medium text-obsidian">{row.creditor}</span> },
                  { key: 'invoiceNumber', header: 'Invoice Ref', render: (row) => row.invoiceNumber || <span className="text-slate">—</span> },
                  { key: 'invoiceTotal', header: 'Total', render: (row) => formatCurrency(row.invoiceTotal) },
                  { key: 'amountPaid', header: 'Paid', render: (row) => <span className="text-green-600 dark:text-green-400">{formatCurrency(row.amountPaid)}</span> },
                  { key: 'balance', header: 'Unpaid', render: (row) => <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(row.balance)}</span> },
                  { key: 'status', header: 'Status', render: (row) => {
                    const cls = row.status === 'PaidInFull' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : row.status === 'PartialPayment' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
                    const lbl = row.status === 'PaidInFull' ? 'Paid in Full' : row.status === 'PartialPayment' ? 'Partial' : 'Pending';
                    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{lbl}</span>;
                  }},
                  { key: 'id', header: '', render: (row) => (
                    row.balance > 0 ? (
                      <Button variant="ghost" size="sm" onClick={() => { setPayingDebt(row); setPayAmount(''); }}>Pay Now</Button>
                    ) : null
                  )},
                ]} data={debts} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === 'service-items' && <ServiceItemCatalog />}
      {tab === 'invoices' && <InvoicePage />}

      {payingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/50" onClick={() => setPayingDebt(null)}>
          <div className="bg-paper rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-obsidian">Record Payment</h3>
                <button onClick={() => setPayingDebt(null)} className="text-slate hover:text-obsidian touch-target">&times;</button>
              </div>
              <div className="bg-bone rounded-lg p-3 mb-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate">Creditor:</span><span className="text-obsidian font-medium">{payingDebt.creditor}</span></div>
                <div className="flex justify-between"><span className="text-slate">Balance:</span><span className="text-obsidian font-semibold text-red-600 dark:text-red-400">{formatCurrency(payingDebt.balance)}</span></div>
                {payingDebt.invoiceNumber && <div className="flex justify-between"><span className="text-slate">Invoice:</span><span className="text-obsidian">{payingDebt.invoiceNumber}</span></div>}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Amount to Pay (SDG)</label>
                  <Input type="number" min="0" step="0.01" value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPayingDebt(null)}>Cancel</Button>
                <Button variant="primary" onClick={async () => {
                  if (!payAmount || parseFloat(payAmount) <= 0) { setMutationError('Enter a valid amount'); return; }
                  setMutationError('');
                  setPaySaving(true);
                  try {
                    await payDebtMutation.mutateAsync({ id: payingDebt.id, amount: parseFloat(payAmount) });
                    setPayingDebt(null);
                    setPayAmount('');
                  } catch (err) { setMutationError(err.message || 'Failed to record payment'); }
                  setPaySaving(false);
                }} disabled={paySaving}>
                  {paySaving ? 'Recording...' : 'Confirm Payment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/50" onClick={() => { setShowAddDebt(false); setNewDebt({ creditor: '', description: '', amount: '', dueDate: '', notes: '' }); }}>
          <div className="bg-paper rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-obsidian">Add Hospital Debt</h3>
                <button onClick={() => { setShowAddDebt(false); setNewDebt({ creditor: '', description: '', amount: '', dueDate: '', notes: '' }); }} className="text-slate hover:text-obsidian touch-target">&times;</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Creditor *</label>
                  <Input type="text" value={newDebt.creditor} onChange={(e) => setNewDebt((p) => ({ ...p, creditor: e.target.value }))} placeholder="Name of who we owe" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Description *</label>
                  <Input type="text" value={newDebt.description} onChange={(e) => setNewDebt((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. June electricity bill" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Total Amount *</label>
                  <Input type="number" min="0" step="0.01" value={newDebt.amount} onChange={(e) => setNewDebt((p) => ({ ...p, amount: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Due Date</label>
                  <Input type="date" value={newDebt.dueDate} onChange={(e) => setNewDebt((p) => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Notes</label>
                  <textarea value={newDebt.notes} onChange={(e) => setNewDebt((p) => ({ ...p, notes: e.target.value }))} rows={2}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setShowAddDebt(false); setNewDebt({ creditor: '', description: '', amount: '', dueDate: '', notes: '' }); }}>Cancel</Button>
                <Button variant="primary" onClick={async () => {
                  if (!newDebt.creditor || !newDebt.description || !newDebt.amount || parseFloat(newDebt.amount) <= 0) { setMutationError('Creditor, description, and amount are required'); return; }
                  setMutationError('');
                  setDebtSaving(true);
                  try {
                    await createDebtMutation.mutateAsync({
                      creditor: newDebt.creditor,
                      description: newDebt.description,
                      amount: parseFloat(newDebt.amount),
                      dueDate: newDebt.dueDate || undefined,
                      notes: newDebt.notes || undefined,
                    });
                    setShowAddDebt(false);
                    setNewDebt({ creditor: '', description: '', amount: '', dueDate: '', notes: '' });
                  } catch (err) { setMutationError(err.message || 'Failed to create debt'); }
                  setDebtSaving(false);
                }} disabled={debtSaving}>
                  {debtSaving ? 'Creating...' : 'Create Debt'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCloseShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/50" onClick={() => { setShowCloseShiftModal(false); setDenominations(denominations.map(d => ({ ...d, qty: 0 }))); }}>
          <div className="bg-paper rounded-xl shadow-2xl max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-obsidian">Close Shift</h3>
                <button onClick={() => { setShowCloseShiftModal(false); setDenominations(denominations.map(d => ({ ...d, qty: 0 }))); }} className="text-slate hover:text-obsidian touch-target">&times;</button>
              </div>

              {mutationError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{mutationError}</div>
              )}

              <div className="mb-4">
                <p className="text-body text-slate mb-1">Expected Total (from transactions)</p>
                <p className="text-heading-sm font-semibold text-obsidian">{formatCurrency(summary?.dailyTotal || 0)}</p>
              </div>

              <p className="text-caption font-medium text-graphite mb-3">Count denominations being handed over:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {denominations.map((d, i) => (
                  <div key={d.value} className="flex items-center gap-3">
                    <span className="w-16 text-body font-medium text-obsidian">{d.value} SDG</span>
                    <Input
                      type="number"
                      min="0"
                      value={d.qty}
                      onChange={(e) => {
                        const newD = [...denominations];
                        newD[i] = { ...d, qty: parseInt(e.target.value) || 0 };
                        setDenominations(newD);
                      }}
                      className="w-24"
                    />
                    <span className="text-body text-slate">= {formatCurrency(d.value * d.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between p-3 bg-bone rounded-lg mb-6">
                <span className="text-body font-medium text-obsidian">Counted Total</span>
                <span className="text-heading-sm font-semibold text-obsidian">{formatCurrency(denominations.reduce((s, d) => s + d.value * d.qty, 0))}</span>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setShowCloseShiftModal(false); setDenominations(denominations.map(d => ({ ...d, qty: 0 }))); }}>Cancel</Button>
                <Button variant="primary" onClick={handleCloseShift} disabled={closeShiftSaving}>
                  {closeShiftSaving ? 'Closing...' : 'Close Shift'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCashMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/50" onClick={() => { setShowCashMovementModal(false); setCmForm({ type: 'PICKUP', amount: '', reason: '' }); }}>
          <div className="bg-paper rounded-xl shadow-2xl max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-obsidian">Record Cash Movement</h3>
                <button onClick={() => { setShowCashMovementModal(false); setCmForm({ type: 'PICKUP', amount: '', reason: '' }); }} className="text-slate hover:text-obsidian touch-target">&times;</button>
              </div>

              {mutationError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{mutationError}</div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-graphite block mb-1">Type</label>
                  <select value={cmForm.type} onChange={(e) => setCmForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    <option value="PICKUP">Pickup (cash removed from drawer)</option>
                    <option value="DROP">Drop (cash added to drawer)</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite block mb-1">Amount ({CURRENCY})</label>
                  <Input type="number" min="0" step="0.01" value={cmForm.amount}
                    onChange={(e) => setCmForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs font-medium text-graphite block mb-1">Reason</label>
                  <textarea value={cmForm.reason} onChange={(e) => setCmForm(p => ({ ...p, reason: e.target.value }))} rows={2}
                    className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" placeholder="Optional note" />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setShowCashMovementModal(false); setCmForm({ type: 'PICKUP', amount: '', reason: '' }); }}>Cancel</Button>
                <Button variant="primary" onClick={handleCreateCashMovement} disabled={cmSaving}>
                  {cmSaving ? 'Recording...' : 'Record'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/50" onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }}>
          <div className="bg-paper rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-obsidian">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h3>
                <button onClick={() => { setShowExpenseForm(false); setEditingExpense(null); }} className="text-slate hover:text-obsidian touch-target">&times;</button>
              </div>
              <ExpenseForm
                expense={editingExpense}
                departments={departments}
                onSave={handleExpenseSave}
                onCancel={() => { setShowExpenseForm(false); setEditingExpense(null); }}
                saving={expenseSaving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
