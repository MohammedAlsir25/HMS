import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Table } from '../../components/ui/Table';
import { usePatientList } from '../../hooks/queries/usePatients';
import { useClinics } from '../../hooks/queries/useClinics';
import NewPatientForm from '../reception/NewPatientForm';

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
  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page')) || 1;
  const { data, isLoading } = usePatientList({ q: q || undefined, page, limit: 20 });
  const { data: clinics = [] } = useClinics();
  const [showNew, setShowNew] = useState(false);

  const patients = data?.patients || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 0;

  const updateParams = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v === undefined || v === null || v === 1 && k === 'page') next.delete(k);
      else next.set(k, v);
    });
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
        <Button onClick={() => setShowNew(true)}>Register New Patient</Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, MRN, phone, or national ID…"
                value={q}
                onChange={(e) => updateParams({ q: e.target.value, page: e.target.value ? '' : undefined })}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate text-body">Loading patients…</div>
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

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Register New Patient">
        <NewPatientForm
          clinics={clinics}
          onPatientCreated={() => { setShowNew(false); updateParams({}); }}
        />
      </Modal>
    </div>
  );
}