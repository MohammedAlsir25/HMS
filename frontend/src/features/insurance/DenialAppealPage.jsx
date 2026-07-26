import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDenialAppeals, useCreateDenialAppeal, useUpdateDenialAppeal, useResubmitDenialAppeal, useInsuranceClaims } from '../../hooks/queries/useInsurance';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';

const STATUS_COLORS = {
  OPEN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  RESUBMITTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DENIED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const STATUSES = ['ALL', 'OPEN', 'IN_REVIEW', 'RESUBMITTED', 'APPROVED', 'DENIED'];

export default function DenialAppealPage() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [selectedAppeal, setSelectedAppeal] = useState(null);

  const params = `limit=100${statusFilter !== 'ALL' ? `&status=${statusFilter}` : ''}`;
  const { data, isLoading, isError, error } = useDenialAppeals(params);
  const appeals = data?.appeals || data || [];

  const resubmitMutation = useResubmitDenialAppeal();

  const handleResubmit = useCallback(async (id) => {
    await resubmitMutation.mutateAsync(id);
  }, [resubmitMutation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('insurance.denialAppeals', 'Denial Appeals')}</h1>
        <p className="text-body text-slate">{t('common.loading', 'Loading...')}</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('insurance.denialAppeals', 'Denial Appeals')}</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load denial appeals'}
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: 'claimNumber', header: 'Claim #',
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors font-medium" onClick={() => setSelectedAppeal(row)}>
          {row.claim?.claimNumber || row.claimNumber || '-'}
        </button>
      ),
    },
    {
      key: 'patient', header: 'Patient',
      render: (row) => <span className="font-medium">{row.claim?.patient?.firstName || ''} {row.claim?.patient?.lastName || ''}</span>,
    },
    {
      key: 'insuranceCompany', header: 'Company',
      render: (row) => row.insuranceCompany?.name || row.claim?.insuranceCompany?.name || '-',
    },
    {
      key: 'denialReason', header: 'Denial Reason',
      render: (row) => <span className="text-sm">{row.denialReason || row.reason || '-'}</span>,
    },
    {
      key: 'appealAmount', header: 'Amount',
      render: (row) => <span className="font-semibold">{formatCurrency(row.appealAmount || row.claim?.claimAmount || 0)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (row) => <Badge className={STATUS_COLORS[row.status] || ''}>{row.status?.replace(/_/g, ' ')}</Badge>,
    },
    {
      key: 'createdAt', header: 'Filed',
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('insurance.denialAppeals', 'Denial Appeals')}</h1>
          <p className="text-body text-slate mt-1">{appeals.length} {t('insurance.appeals', 'appeals')}</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>+ Create Appeal</Button>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
        {STATUSES.map((s) => (
          <Button key={s} variant={statusFilter === s ? 'primary' : 'secondary'} size="sm" onClick={() => setStatusFilter(s)}>
            {s.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent>
          {appeals.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No denial appeals found</p>
          ) : (
            <Table columns={columns} data={appeals} />
          )}
        </CardContent>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Appeal" className="max-w-2xl">
        <CreateAppealForm onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!selectedAppeal} onClose={() => setSelectedAppeal(null)} title="Appeal Detail" className="max-w-xl">
        {selectedAppeal && (
          <AppealDetail
            appeal={selectedAppeal}
            onClose={() => setSelectedAppeal(null)}
            onResubmit={handleResubmit}
            resubmitting={resubmitMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function AppealDetail({ appeal, onClose, onResubmit, resubmitting }) {
  const timeline = appeal.timeline || appeal.statusHistory || [];

  return (
    <div className="space-y-4">
      <div className="bg-bone rounded-lg p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate">Claim #</span>
          <span className="text-obsidian font-medium">{appeal.claim?.claimNumber || appeal.claimNumber || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">Patient</span>
          <span className="text-obsidian">{appeal.claim?.patient?.firstName || ''} {appeal.claim?.patient?.lastName || ''}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">Company</span>
          <span className="text-obsidian">{appeal.insuranceCompany?.name || appeal.claim?.insuranceCompany?.name || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">Denial Reason</span>
          <span className="text-obsidian">{appeal.denialReason || appeal.reason || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">Amount</span>
          <span className="text-obsidian font-semibold">{formatCurrency(appeal.appealAmount || appeal.claim?.claimAmount || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate">Status</span>
          <Badge className={STATUS_COLORS[appeal.status] || ''}>{appeal.status?.replace(/_/g, ' ')}</Badge>
        </div>
        {appeal.notes && (
          <div className="pt-2 border-t border-silver/50">
            <span className="text-slate block mb-1">Notes</span>
            <p className="text-obsidian">{appeal.notes}</p>
          </div>
        )}
      </div>

      {timeline.length > 0 && (
        <div>
          <p className="text-sm font-medium text-graphite mb-2">Status Timeline</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {timeline.map((entry, i) => (
              <div key={i} className="flex items-start gap-3 p-2 border-l-2 border-lilac-bloom">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge className={STATUS_COLORS[entry.status] || ''} size="sm">{entry.status?.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-slate">{entry.date ? new Date(entry.date).toLocaleString() : entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}</span>
                  </div>
                  {entry.note && <p className="text-xs text-graphite mt-1">{entry.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-2">
        {appeal.status === 'IN_REVIEW' && (
          <Button variant="primary" onClick={() => { onResubmit(appeal.id); onClose(); }} disabled={resubmitting}>
            {resubmitting ? 'Resubmitting...' : 'Resubmit'}
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="ghost" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}

function CreateAppealForm({ onClose }) {
  const { t } = useTranslation();
  const createAppeal = useCreateDenialAppeal();
  const { data: claimsData } = useInsuranceClaims('status=REJECTED&limit=100');
  const rejectedClaims = claimsData?.claims || claimsData || [];

  const [form, setForm] = useState({
    claimId: '',
    denialReason: '',
    appealAmount: '',
    notes: '',
  });

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!form.claimId || !form.denialReason) return;
    await createAppeal.mutateAsync({
      claimId: form.claimId,
      denialReason: form.denialReason,
      appealAmount: parseFloat(form.appealAmount) || undefined,
      notes: form.notes,
    });
    onClose();
  }, [form, createAppeal, onClose]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Rejected Claim *</label>
        <select value={form.claimId} onChange={(e) => handleChange('claimId', e.target.value)}
          className="w-full px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" required>
          <option value="">Select a rejected claim</option>
          {rejectedClaims.map((c) => (
            <option key={c.id} value={c.id}>{c.claimNumber} — {c.patient?.firstName} {c.patient?.lastName} — {formatCurrency(c.claimAmount)}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Denial Reason *</label>
        <Input type="text" value={form.denialReason} onChange={(e) => handleChange('denialReason', e.target.value)} placeholder="e.g. Missing documentation" required />
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Appeal Amount</label>
        <Input type="number" min="0" step="0.01" value={form.appealAmount} onChange={(e) => handleChange('appealAmount', e.target.value)} placeholder="0.00" />
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" placeholder="Additional details for this appeal..." />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={!form.claimId || !form.denialReason || createAppeal.isPending}>
          {createAppeal.isPending ? 'Creating...' : 'Create Appeal'}
        </Button>
      </div>
    </form>
  );
}
