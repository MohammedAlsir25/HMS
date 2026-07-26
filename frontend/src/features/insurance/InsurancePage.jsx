import { useState } from 'react';
import { useInsuranceCompanies, useInsurancePolicies } from '../../hooks/queries/useInsurance';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import CompanyForm from './CompanyForm';
import PolicyAssignmentForm from './PolicyAssignmentForm';

function buildParams(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== undefined && value !== null) params.set(key, value);
  });
  return params.toString();
}

function CompaniesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [search, setSearch] = useState('');
  const params = buildParams({ search, limit: '50' });
  const { data, isLoading, isError, error } = useInsuranceCompanies(params);

  const companies = data?.companies || data || [];

  const columns = [
    {
      key: 'name', header: 'Company Name',
      render: (row) => (
        <button className="text-left hover:text-lilac-bloom transition-colors font-medium" onClick={() => { setEditingCompany(row); setShowForm(true); }}>
          {row.name}
        </button>
      ),
    },
    { key: 'nameAr', header: 'Arabic Name', render: (row) => row.nameAr || '-' },
    { key: 'contactPerson', header: 'Contact', render: (row) => row.contactPerson || '-' },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '-' },
    { key: 'email', header: 'Email', render: (row) => row.email || '-' },
    {
      key: 'isTpa', header: 'Type',
      render: (row) => row.isTpa ? <Badge className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">TPA</Badge> : <Badge>Insurance</Badge>,
    },
    {
      key: 'isActive', header: 'Status',
      render: (row) => row.isActive
        ? <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Active</Badge>
        : <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Inactive</Badge>,
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditingCompany(row); setShowForm(true); }}>Edit</Button>
      ),
    },
  ];

  if (isLoading) {
    return <p className="text-body text-slate text-center py-8">Loading companies...</p>;
  }

  if (isError) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
        {error?.message || 'Failed to load companies'}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <input type="text" placeholder="Search companies..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom w-64" />
        <Button variant="primary" size="sm" onClick={() => { setEditingCompany(null); setShowForm(true); }}>+ Add Company</Button>
      </div>
      {companies.length === 0 ? (
        <p className="text-body text-slate text-center py-8">No insurance companies found</p>
      ) : (
        <Table columns={columns} data={companies} />
      )}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingCompany(null); }} title={editingCompany ? 'Edit Company' : 'Add Company'}>
        <CompanyForm company={editingCompany} onClose={() => { setShowForm(false); setEditingCompany(null); }} />
      </Modal>
    </>
  );
}

function PoliciesTab() {
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const params = buildParams({ limit: '50' });
  const { data, isLoading, isError, error } = useInsurancePolicies(params);

  const policies = data?.policies || data || [];

  const columns = [
    {
      key: 'patient', header: 'Patient',
      render: (row) => <span className="font-medium">{row.patient?.firstName} {row.patient?.lastName}</span>,
    },
    { key: 'mrn', header: 'MRN', render: (row) => row.patient?.medicalRecordNumber || row.patient?.mrn || '-' },
    {
      key: 'company', header: 'Company',
      render: (row) => row.insuranceCompany?.name || '-',
    },
    { key: 'policyNumber', header: 'Policy #', render: (row) => <span className="font-medium">{row.policyNumber}</span> },
    { key: 'coveragePercent', header: 'Coverage', render: (row) => row.coveragePercent ? `${row.coveragePercent}%` : '-' },
    { key: 'effectiveTo', header: 'Expiry', render: (row) => row.effectiveTo ? new Date(row.effectiveTo).toLocaleDateString() : '-' },
    { key: 'networkType', header: 'Network', render: (row) => row.networkType || '-' },
    {
      key: 'isPrimary', header: 'Primary',
      render: (row) => row.isPrimary ? <Badge className="bg-lilac-100 dark:bg-lilac-900 text-lilac-800 dark:text-lilac-200">Primary</Badge> : <Badge>Secondary</Badge>,
    },
    {
      key: 'isActive', header: 'Status',
      render: (row) => row.isActive
        ? <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Active</Badge>
        : <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Inactive</Badge>,
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditingPolicy(row); setShowForm(true); }}>Edit</Button>
      ),
    },
  ];

  if (isLoading) {
    return <p className="text-body text-slate text-center py-8">Loading policies...</p>;
  }

  if (isError) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
        {error?.message || 'Failed to load policies'}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        <Button variant="primary" size="sm" onClick={() => { setEditingPolicy(null); setShowForm(true); }}>+ Assign Policy</Button>
      </div>
      {policies.length === 0 ? (
        <p className="text-body text-slate text-center py-8">No insurance policies found</p>
      ) : (
        <Table columns={columns} data={policies} />
      )}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingPolicy(null); }} title={editingPolicy ? 'Edit Policy' : 'Assign Policy'}>
        <PolicyAssignmentForm policy={editingPolicy} patients={[]} onClose={() => { setShowForm(false); setEditingPolicy(null); }} />
      </Modal>
    </>
  );
}

export default function InsurancePage() {
  const [tab, setTab] = useState('companies');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-sm font-semibold text-obsidian">Insurance Management</h1>
        <p className="text-body text-slate mt-1">Manage insurance companies and patient policy assignments</p>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2">
        <Button variant={tab === 'companies' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('companies')}>Companies</Button>
        <Button variant={tab === 'policies' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('policies')}>Policies</Button>
      </div>

      <Card>
        <CardContent>
          {tab === 'companies' && <CompaniesTab />}
          {tab === 'policies' && <PoliciesTab />}
        </CardContent>
      </Card>
    </div>
  );
}
