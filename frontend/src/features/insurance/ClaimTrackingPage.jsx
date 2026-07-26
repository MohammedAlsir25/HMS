import { useState } from 'react';
import { useInsuranceClaims, useClaimDashboard, useInsuranceSettlements, useInsuranceCompanies } from '../../hooks/queries/useInsurance';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';
import ClaimForm from './ClaimForm';
import ClaimDetail from './ClaimDetail';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
  SUBMITTED: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  UNDER_REVIEW: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  APPROVED: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  PARTIALLY_APPROVED: 'bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200',
  REJECTED: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  SETTLED: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
  CLOSED: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
};

const TABS = ['ALL', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED'];

function buildParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) params.set(key, value);
  });
  return params.toString();
}

function getAgingDays(submittedAt) {
  if (!submittedAt) return null;
  const diff = Date.now() - new Date(submittedAt).getTime();
  return Math.floor(diff / 86400000);
}

function getAgingColor(days) {
  if (days === null) return '';
  if (days < 30) return 'text-green-600 dark:text-green-400';
  if (days <= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

export default function ClaimTrackingPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [viewTab, setViewTab] = useState('claims');

  const claimsParams = buildParams({
    status: statusFilter === 'ALL' ? '' : statusFilter,
    insuranceCompanyId: companyFilter,
    limit: '100',
  });

  const settlementsParams = buildParams({ limit: '100' });

  const { data: companiesData } = useInsuranceCompanies('limit=500');
  const companies = companiesData?.companies || companiesData || [];

  const { data: dashboard } = useClaimDashboard();
  const { data: claimsData, isLoading, isError, error } = useInsuranceClaims(claimsParams);
  const { data: settlementsData, isLoading: settlementsLoading } = useInsuranceSettlements(settlementsParams);

  const claims = claimsData?.claims || claimsData || [];
  const settlements = settlementsData?.settlements || settlementsData || [];

  const claimColumns = [
    {
      key: 'claimNumber', header: 'Claim #',
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors font-medium" onClick={() => setSelectedClaim(row)}>
          {row.claimNumber}
        </button>
      ),
    },
    {
      key: 'patient', header: 'Patient',
      render: (row) => <span className="font-medium">{row.patient?.firstName} {row.patient?.lastName}</span>,
    },
    {
      key: 'company', header: 'Company',
      render: (row) => row.insuranceCompany?.name || '-',
    },
    {
      key: 'claimAmount', header: 'Claimed',
      render: (row) => <span className="font-medium">{formatCurrency(row.claimAmount)}</span>,
    },
    {
      key: 'approvedAmount', header: 'Approved',
      render: (row) => row.approvedAmount ? <span className="text-green-600 dark:text-green-400">{formatCurrency(row.approvedAmount)}</span> : <span className="text-slate">-</span>,
    },
    {
      key: 'paidAmount', header: 'Paid',
      render: (row) => <span className="text-blue-600 dark:text-blue-400 font-semibold">{formatCurrency(row.paidAmount || 0)}</span>,
    },
    {
      key: 'status', header: 'Status',
      render: (row) => <Badge className={STATUS_STYLES[row.status] || ''}>{row.status?.replace(/_/g, ' ')}</Badge>,
    },
    {
      key: 'aging', header: 'Aging',
      render: (row) => {
        const days = getAgingDays(row.submittedAt);
        return days !== null ? <span className={`font-medium ${getAgingColor(days)}`}>{days}d</span> : <span className="text-slate">-</span>;
      },
    },
    {
      key: 'submittedAt', header: 'Submitted',
      render: (row) => row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '-',
    },
  ];

  const settlementColumns = [
    {
      key: 'claimNumber', header: 'Claim #',
      render: (row) => row.claim?.claimNumber || '-',
    },
    {
      key: 'company', header: 'Company',
      render: (row) => row.insuranceCompany?.name || '-',
    },
    {
      key: 'amount', header: 'Amount',
      render: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'settlementDate', header: 'Date',
      render: (row) => new Date(row.settlementDate).toLocaleDateString(),
    },
    {
      key: 'referenceNumber', header: 'Reference',
      render: (row) => row.referenceNumber || '-',
    },
    {
      key: 'notes', header: 'Notes',
      render: (row) => row.notes || '-',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">Claims Tracking</h1>
        <p className="text-body text-slate">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">Claims Tracking</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load claims'}
        </div>
      </div>
    );
  }

  const d = dashboard || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Claims Tracking</h1>
          <p className="text-body text-slate mt-1">Track insurance claim lifecycle and settlements</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>+ Create Claim</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-caption text-slate">Total Claims</p>
          <p className="text-heading-sm font-semibold text-obsidian">{d.totalCount || claims.length || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-caption text-slate">Pending</p>
          <p className="text-heading-sm font-semibold text-amber-600">{d.pendingCount || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-caption text-slate">Approved</p>
          <p className="text-heading-sm font-semibold text-green-600">{d.approvedCount || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-caption text-slate">Rejected</p>
          <p className="text-heading-sm font-semibold text-red-600">{d.rejectedCount || 0}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-caption text-slate">Settled</p>
          <p className="text-heading-sm font-semibold text-emerald-600">{d.settledCount || 0}</p>
        </CardContent></Card>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2">
        <Button variant={viewTab === 'claims' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewTab('claims')}>Claims</Button>
        <Button variant={viewTab === 'settlements' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewTab('settlements')}>Settlements</Button>
      </div>

      {viewTab === 'claims' && (
        <>
          <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
            {TABS.map((t) => (
              <Button key={t} variant={statusFilter === t ? 'primary' : 'secondary'} size="sm" onClick={() => setStatusFilter(t)}>
                {t.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
              className="px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
              <option value="">All Companies</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <Card>
            <CardContent>
              {claims.length === 0 ? (
                <p className="text-body text-slate text-center py-8">No claims found</p>
              ) : (
                <Table columns={claimColumns} data={claims} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {viewTab === 'settlements' && (
        <Card>
          <CardContent>
            {settlementsLoading ? (
              <p className="text-body text-slate text-center py-8">Loading settlements...</p>
            ) : settlements.length === 0 ? (
              <p className="text-body text-slate text-center py-8">No settlements found</p>
            ) : (
              <Table columns={settlementColumns} data={settlements} />
            )}
          </CardContent>
        </Card>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create Claim" className="max-w-2xl">
        <ClaimForm patients={[]} policies={[]} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!selectedClaim} onClose={() => setSelectedClaim(null)} title="Claim Detail" className="max-w-xl">
        {selectedClaim && <ClaimDetail claim={selectedClaim} onClose={() => setSelectedClaim(null)} />}
      </Modal>
    </div>
  );
}
