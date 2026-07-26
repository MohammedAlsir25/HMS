import { useState } from 'react';
import { usePreAuthorizations, useInsuranceCompanies } from '../../hooks/queries/useInsurance';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/currency';
import PreAuthForm from './PreAuthForm';
import PreAuthDetail from './PreAuthDetail';

const STATUS_STYLES = {
  SUBMITTED: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  UNDER_REVIEW: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  APPROVED: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  PARTIALLY_APPROVED: 'bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200',
  REJECTED: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  CANCELLED: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
};

const TABS = ['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'];

function buildParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) params.set(key, value);
  });
  return params.toString();
}

export default function PreAuthorizationPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedPreAuth, setSelectedPreAuth] = useState(null);

  const params = buildParams({
    status: statusFilter === 'ALL' ? '' : statusFilter,
    search,
    insuranceCompanyId: companyFilter,
    limit: '50',
  });

  const { data: companiesData } = useInsuranceCompanies('limit=500');
  const companies = companiesData?.companies || companiesData || [];

  const { data, isLoading, isError, error } = usePreAuthorizations(params);
  const preAuths = data?.preAuthorizations || data || [];

  const columns = [
    {
      key: 'referenceNumber', header: 'Reference #',
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors font-medium" onClick={() => setSelectedPreAuth(row)}>
          {row.referenceNumber}
        </button>
      ),
    },
    {
      key: 'patient', header: 'Patient',
      render: (row) => <span className="font-medium">{row.patient?.firstName} {row.patient?.lastName}</span>,
    },
    {
      key: 'company', header: 'Company',
      render: (row) => row.insuranceCompany?.name || row.insurancePolicy?.insuranceCompany?.name || '-',
    },
    {
      key: 'estimatedTotalCost', header: 'Est. Cost',
      render: (row) => formatCurrency(row.estimatedTotalCost),
    },
    {
      key: 'status', header: 'Status',
      render: (row) => <Badge className={STATUS_STYLES[row.status] || ''}>{row.status?.replace(/_/g, ' ')}</Badge>,
    },
    {
      key: 'submittedAt', header: 'Submitted',
      render: (row) => row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '-',
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">Pre-Authorizations</h1>
        <p className="text-body text-slate">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">Pre-Authorizations</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load pre-authorizations'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Pre-Authorizations</h1>
          <p className="text-body text-slate mt-1">Submit and track insurance pre-authorization requests</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>+ New Pre-Auth</Button>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
        {TABS.map((t) => (
          <Button key={t} variant={statusFilter === t ? 'primary' : 'secondary'} size="sm" onClick={() => setStatusFilter(t)}>
            {t.replace(/_/g, ' ')}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom w-48" />
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
          className="px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          <option value="">All Companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <Card>
        <CardContent>
          {preAuths.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No pre-authorization requests found</p>
          ) : (
            <Table columns={columns} data={preAuths} />
          )}
        </CardContent>
      </Card>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Pre-Authorization" className="max-w-2xl">
        <PreAuthForm patients={[]} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!selectedPreAuth} onClose={() => setSelectedPreAuth(null)} title="Pre-Authorization Detail" className="max-w-xl">
        {selectedPreAuth && <PreAuthDetail preAuth={selectedPreAuth} onClose={() => setSelectedPreAuth(null)} />}
      </Modal>
    </div>
  );
}
