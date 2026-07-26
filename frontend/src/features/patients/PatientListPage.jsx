import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { usePatientList } from '../../hooks/queries/usePatients';
import { useClinics } from '../../hooks/queries/useClinics';
import PatientRegistration from './PatientRegistration';

const genderLabel = { MALE: 'Male', FEMALE: 'Female' };
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
const calculateAge = (dob) => {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  const age = Math.floor(diff / 31557600000);
  return `${age}y`;
};

export default function PatientListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showRegistration, setShowRegistration] = useState(false);
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page')) || 1;
  const gender = searchParams.get('gender') || '';
  const dateFrom = searchParams.get('dateFrom') || '';
  const dateTo = searchParams.get('dateTo') || '';

  const { data, isLoading, isError, refetch } = usePatientList({
    q: q || undefined,
    page,
    limit: 20,
    gender: gender || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: clinics = [] } = useClinics();
  const patients = data?.patients || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;

  const hasActiveFilters = gender || dateFrom || dateTo;

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v === undefined || v === null || v === 1 && k === 'page') next.delete(k);
      else next.set(k, v);
    });
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    setSearchParams(next, { replace: true });
  };

  const columns = [
    { key: 'mrn', label: 'MRN', render: (r) => <span className="font-mono text-caption">{r.mrn}</span> },
    { key: 'fullName', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'gender', label: 'Gender', render: (r) => genderLabel[r.gender] || '—' },
    { key: 'dateOfBirth', label: 'DOB / Age', render: (r) => r.dateOfBirth ? `${formatDate(r.dateOfBirth)} (${calculateAge(r.dateOfBirth)})` : '—' },
    { key: 'createdAt', label: 'Registered', render: (r) => formatDate(r.createdAt) },
    { key: 'actions', label: '', render: (r) => <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); navigate(`/patients/${r.id}`); }}>View</Button> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Patient Directory</h1>
          <p className="text-body text-slate mt-1">{total} patient{total !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowRegistration(true)}>Register Patient</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
            <div className="flex-1 w-full">
              <Input
                placeholder="Search by name, MRN, phone, or national ID…"
                value={q}
                onChange={(e) => updateParams({ q: e.target.value, page: e.target.value ? '' : undefined })}
              />
            </div>
            <select
              value={gender}
              onChange={(e) => updateParams({ gender: e.target.value, page: '' })}
              className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian"
            >
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => updateParams({ dateFrom: e.target.value, page: '' })}
              className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => updateParams({ dateTo: e.target.value, page: '' })}
              className="px-3 py-2.5 bg-paper border border-silver rounded-lg text-body text-obsidian"
            />
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate text-body">Loading patients…</div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-body text-red-500">Failed to load patients</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <Table columns={columns} data={patients} onRowClick={(r) => navigate(`/patients/${r.id}`)} />

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-silver/50 mt-4">
                  <p className="text-caption text-slate">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => updateParams({ page: page - 1 })}>Previous</Button>
                    <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => updateParams({ page: page + 1 })}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <PatientRegistration
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
      />
    </div>
  );
}
