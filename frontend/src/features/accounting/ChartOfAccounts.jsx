import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccounts, useCreateAccount, useUpdateAccount } from '../../hooks/queries/useJournal';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

const TYPE_COLORS = {
  ASSET: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  LIABILITY: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  EQUITY: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  REVENUE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EXPENSE: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
};

export default function ChartOfAccounts() {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [expandedTypes, setExpandedTypes] = useState({ ASSET: true, LIABILITY: true, EQUITY: true, REVENUE: true, EXPENSE: true });

  const { data, isLoading, isError, error } = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();

  const accounts = Array.isArray(data) ? data : data?.accounts || [];

  const accountsByType = ACCOUNT_TYPES.reduce((acc, type) => {
    acc[type] = accounts.filter((a) => a.type === type);
    return acc;
  }, {});

  const toggleType = useCallback((type) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const handleNew = useCallback(() => {
    setEditingAccount(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((account) => {
    setEditingAccount(account);
    setShowModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setEditingAccount(null);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.chartOfAccounts', 'Chart of Accounts')}</h1>
        <p className="text-body text-slate">{t('accounting.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.chartOfAccounts', 'Chart of Accounts')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load accounts'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('accounting.chartOfAccounts', 'Chart of Accounts')}</h1>
          <p className="text-body text-slate mt-1">{accounts.length} {t('accounting.accounts', 'accounts')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={handleNew}>+ {t('accounting.newAccount', 'New Account')}</Button>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-body text-slate text-center">{t('accounting.noAccounts', 'No accounts found. Create your first account to get started.')}</p>
          </CardContent>
        </Card>
      ) : (
        ACCOUNT_TYPES.map((type) => (
          <Card key={type}>
            <CardHeader>
              <button className="flex items-center justify-between w-full" onClick={() => toggleType(type)}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{expandedTypes[type] ? '▼' : '▶'}</span>
                  <CardTitle>{type}</CardTitle>
                  <Badge className={TYPE_COLORS[type]}>{accountsByType[type].length}</Badge>
                </div>
              </button>
            </CardHeader>
            {expandedTypes[type] && (
              <CardContent>
                {accountsByType[type].length === 0 ? (
                  <p className="text-body text-slate text-center py-3">No {type.toLowerCase()} accounts</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-body">
                      <thead>
                        <tr className="border-b border-silver">
                          <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">Code</th>
                          <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">Name</th>
                          <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">Parent</th>
                          <th className="text-left py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider">Status</th>
                          <th className="text-right py-2 px-3 text-caption text-slate font-medium uppercase tracking-wider"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountsByType[type].map((account) => {
                          const parent = accounts.find((a) => a.id === account.parentId);
                          return (
                            <tr key={account.id} className="border-b border-silver/50 hover:bg-paper/50">
                              <td className="py-2 px-3 font-mono text-sm font-medium text-obsidian">{account.code}</td>
                              <td className="py-2 px-3 text-obsidian">{account.name}</td>
                              <td className="py-2 px-3 text-slate">{parent ? `${parent.code} - ${parent.name}` : '-'}</td>
                              <td className="py-2 px-3">
                                <Badge variant={account.isActive ? 'success' : 'danger'}>
                                  {account.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleEdit(account)}>Edit</Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ))
      )}

      <Modal open={showModal} onClose={handleModalClose} title={editingAccount ? t('accounting.editAccount', 'Edit Account') : t('accounting.newAccount', 'New Account')}>
        <AccountForm
          account={editingAccount}
          allAccounts={accounts}
          onSave={async (formData) => {
            if (editingAccount) {
              await updateMutation.mutateAsync({ id: editingAccount.id, ...formData });
            } else {
              await createMutation.mutateAsync(formData);
            }
            handleModalClose();
          }}
          onCancel={handleModalClose}
          saving={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  );
}

function AccountForm({ account, allAccounts, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    code: account?.code || '',
    name: account?.name || '',
    type: account?.type || 'ASSET',
    parentId: account?.parentId || '',
  });

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.type) return;
    onSave({ ...form, parentId: form.parentId || null });
  }, [form, onSave]);

  const parentOptions = allAccounts.filter((a) => a.type === form.type && a.id !== account?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Code *</label>
        <Input type="text" value={form.code} onChange={(e) => handleChange('code', e.target.value)} placeholder="e.g. 1100" required />
      </div>
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Name *</label>
        <Input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Type *</label>
        <select value={form.type} onChange={(e) => handleChange('type', e.target.value)}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Parent Account</label>
        <select value={form.parentId} onChange={(e) => handleChange('parentId', e.target.value)}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          <option value="">None (Top-level)</option>
          {parentOptions.map((a) => (
            <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : account ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
