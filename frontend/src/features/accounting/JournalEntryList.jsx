import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useJournalEntries, useCreateJournalEntry, useAccounts } from '../../hooks/queries/useJournal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';

function buildParams(filters) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.accountId) params.set('accountId', filters.accountId);
  if (filters.reference) params.set('reference', filters.reference);
  if (filters.limit) params.set('limit', filters.limit);
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  return params.toString();
}

export default function JournalEntryList() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({ startDate: '', endDate: '', accountId: '', reference: '', limit: '25', offset: 0 });
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const params = buildParams(filters);
  const { data, isLoading, isError, error } = useJournalEntries(params || 'limit=25');
  const { data: accounts = [] } = useAccounts();
  const createMutation = useCreateJournalEntry();

  const entries = data?.entries || data || [];
  const totalCount = data?.totalCount || entries.length;
  const accountsList = Array.isArray(accounts) ? accounts : accounts?.accounts || [];

  const handleFilterChange = useCallback((field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value, offset: 0 }));
  }, []);

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleCreateClose = useCallback(() => {
    setShowCreateModal(false);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.journalEntries', 'Journal Entries')}</h1>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.journalEntries', 'Journal Entries')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load journal entries'}
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'entryNumber', header: t('accounting.entryNumber', 'Entry #'),
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors font-medium" onClick={() => toggleExpand(row.id)}>
          {row.entryNumber}
        </button>
      ),
    },
    {
      key: 'date', header: t('accounting.date', 'Date'),
      render: (row) => new Date(row.date || row.createdAt).toLocaleDateString(),
    },
    { key: 'description', header: t('accounting.description', 'Description') },
    {
      key: 'reference', header: t('accounting.reference', 'Reference'),
      render: (row) => row.reference || '-',
    },
    {
      key: 'totalDebit', header: t('accounting.debit', 'Debit'),
      render: (row) => {
        const total = (row.lines || []).reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
        return <span className="font-semibold">{formatCurrency(total)}</span>;
      },
    },
    {
      key: 'totalCredit', header: t('accounting.credit', 'Credit'),
      render: (row) => {
        const total = (row.lines || []).reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
        return <span className="font-semibold">{formatCurrency(total)}</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.journalEntries', 'Journal Entries')}</h1>
          <p className="text-body text-slate mt-1">{totalCount} {t('accounting.entries', 'entries')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>+ {t('accounting.newEntry', 'New Entry')}</Button>
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
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
              <label className="text-xs font-medium text-graphite block mb-1">Account</label>
              <select value={filters.accountId} onChange={(e) => handleFilterChange('accountId', e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">All</option>
                {accountsList.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-graphite block mb-1">Reference</label>
              <Input type="text" placeholder="Search..." value={filters.reference} onChange={(e) => handleFilterChange('reference', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-graphite block mb-1">Per page</label>
              <select value={filters.limit} onChange={(e) => handleFilterChange('limit', e.target.value)}
                className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {entries.length === 0 ? (
            <p className="text-body text-slate text-center py-8">{t('accounting.noEntries', 'No journal entries found')}</p>
          ) : (
            <div>
              <Table columns={columns} data={entries} />
              {entries.map((entry) => expandedId === entry.id && (
                <div key={entry.id} className="mt-2 mb-4 p-4 bg-bone/50 rounded-lg border border-silver">
                  <h4 className="text-sm font-semibold text-obsidian mb-2">Journal Lines</h4>
                  {!entry.lines || entry.lines.length === 0 ? (
                    <p className="text-body text-slate text-center py-3">No lines</p>
                  ) : (
                    <table className="w-full text-body">
                      <thead>
                        <tr className="border-b border-silver">
                          <th className="text-left py-2 px-3 text-caption text-slate font-medium">Account</th>
                          <th className="text-right py-2 px-3 text-caption text-slate font-medium">Debit</th>
                          <th className="text-right py-2 px-3 text-caption text-slate font-medium">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entry.lines.map((line, idx) => {
                          const account = accountsList.find((a) => a.id === line.accountId);
                          return (
                            <tr key={idx} className="border-b border-silver/50">
                              <td className="py-2 px-3 text-obsidian">{account ? `${account.code} - ${account.name}` : line.accountId}</td>
                              <td className="py-2 px-3 text-right font-medium">{Number(line.debit) > 0 ? formatCurrency(line.debit) : '-'}</td>
                              <td className="py-2 px-3 text-right font-medium">{Number(line.credit) > 0 ? formatCurrency(line.credit) : '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={showCreateModal} onClose={handleCreateClose} title={t('accounting.newEntry', 'New Journal Entry')} className="max-w-2xl">
        <JournalEntryForm
          accounts={accountsList}
          onSave={async (formData) => {
            await createMutation.mutateAsync(formData);
            handleCreateClose();
          }}
          onCancel={handleCreateClose}
          saving={createMutation.isPending}
        />
      </Modal>
    </div>
  );
}

function JournalEntryForm({ accounts, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    reference: '',
    lines: [
      { accountId: '', debit: '', credit: '' },
      { accountId: '', debit: '', credit: '' },
    ],
  });

  const totalDebit = form.lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleLineChange = useCallback((index, field, value) => {
    setForm((prev) => {
      const newLines = [...prev.lines];
      newLines[index] = { ...newLines[index], [field]: value };
      if (field === 'debit' && value) newLines[index].credit = '';
      if (field === 'credit' && value) newLines[index].debit = '';
      return { ...prev, lines: newLines };
    });
  }, []);

  const addLine = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { accountId: '', debit: '', credit: '' }],
    }));
  }, []);

  const removeLine = useCallback((index) => {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.description || !isBalanced) return;
    const validLines = form.lines.filter((l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0));
    if (validLines.length < 2) return;
    onSave({
      date: form.date,
      description: form.description,
      reference: form.reference || undefined,
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
      })),
    });
  }, [form, isBalanced, onSave]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Date *</label>
          <Input type="date" value={form.date} onChange={(e) => handleChange('date', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Reference</label>
          <Input type="text" value={form.reference} onChange={(e) => handleChange('reference', e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Description *</label>
        <Input type="text" value={form.description} onChange={(e) => handleChange('description', e.target.value)} required />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-graphite">Lines *</label>
          <Button variant="ghost" size="sm" type="button" onClick={addLine}>+ Add Line</Button>
        </div>
        <div className="space-y-2">
          {form.lines.map((line, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5">
                <select value={line.accountId} onChange={(e) => handleLineChange(index, 'accountId', e.target.value)}
                  className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <Input type="number" min="0" step="0.01" placeholder="Debit" value={line.debit} onChange={(e) => handleLineChange(index, 'debit', e.target.value)} />
              </div>
              <div className="col-span-3">
                <Input type="number" min="0" step="0.01" placeholder="Credit" value={line.credit} onChange={(e) => handleLineChange(index, 'credit', e.target.value)} />
              </div>
              <div className="col-span-1">
                {form.lines.length > 2 && (
                  <Button variant="ghost" size="sm" type="button" onClick={() => removeLine(index)} className="text-red-500">×</Button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3 p-3 bg-bone rounded-lg text-sm">
          <span>Total Debit: <span className="font-semibold">{formatCurrency(totalDebit)}</span></span>
          <span>Total Credit: <span className="font-semibold">{formatCurrency(totalCredit)}</span></span>
          <span className={isBalanced ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
            {isBalanced ? 'Balanced' : 'Unbalanced'}
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving || !isBalanced}>
          {saving ? 'Creating...' : 'Create Entry'}
        </Button>
      </div>
    </form>
  );
}
