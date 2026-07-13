import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { usePatient, useUpdatePatient } from '../../hooks/queries/usePatients';
import { notifySuccess, notifyError } from '../../utils/notify';
import { CURRENCY } from '../../utils/currency';

const genderLabel = { MALE: 'Male', FEMALE: 'Female' };
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-GB') : '—';
const calculateAge = (dob) => {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / 31557600000)}y`;
};

const TABS = ['Overview', 'Appointments', 'Clinical Records', 'Surgery History', 'Files', 'Billing'];

function EditableField({ label, value, field, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  const handleSave = () => {
    onSave({ [field]: val === '' && field !== 'fullName' ? undefined : val });
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-start justify-between group">
        <div>
          <p className="text-caption text-slate">{label}</p>
          <p className="text-body text-obsidian">{value || '—'}</p>
        </div>
        <button onClick={() => { setVal(value ?? ''); setEditing(true); }} className="text-slate hover:text-lilac-bloom transition-colors opacity-0 group-hover:opacity-100 mt-1">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 1l3 3-8 8H2v-3l8-8z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-caption text-slate">{label}</p>
      <div className="flex gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} className="flex-1" />
        <Button size="sm" onClick={handleSave}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(id);
  const updateMutation = useUpdatePatient();
  const [activeTab, setActiveTab] = useState('Overview');
  const [editField, setEditField] = useState(null);

  if (isLoading) return <div className="text-center py-12 text-slate text-body">Loading patient…</div>;
  if (!patient) return <div className="text-center py-12 text-slate text-body">Patient not found</div>;

  const handleUpdate = (fields) => {
    updateMutation.mutate({ id: patient.id, ...fields }, {
      onSuccess: () => notifySuccess('Patient updated'),
      onError: (err) => notifyError(err),
    });
  };

  const appointmentColumns = [
    { key: 'clinic', label: 'Clinic', render: (r) => r.clinic?.name || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge size="sm">{r.status}</Badge> },
    { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'visitType', label: 'Type', render: (r) => r.visitType || '—' },
  ];

  const recordColumns = [
    { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'diagnosis', label: 'Diagnosis', render: (r) => r.diagnosis || '—' },
    { key: 'treatment', label: 'Treatment', render: (r) => (r.treatment || '').slice(0, 60) },
  ];

  const surgeryColumns = [
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
    { key: 'operationType', label: 'Type', render: (r) => r.operationType?.name || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge size="sm">{r.status}</Badge> },
  ];

  const transactionColumns = [
    { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'type', label: 'Type', render: (r) => <Badge size="sm">{r.type}</Badge> },
    { key: 'amount', label: `Amount (${CURRENCY})`, render: (r) => `${CURRENCY} ${Number(r.amount).toFixed(2)}` },
    { key: 'paymentMethod', label: 'Method', render: (r) => r.paymentMethod || '—' },
  ];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/patients')} className="text-caption text-slate hover:text-obsidian transition-colors inline-flex items-center gap-1">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Back to Patient Directory
      </button>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-heading-sm font-semibold text-obsidian">{patient.fullName}</h1>
                <Badge variant="primary" size="sm">{patient.mrn}</Badge>
              </div>
              <p className="text-body text-slate">
                {genderLabel[patient.gender] || '—'} &middot; {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)})
                {patient.phone && <> &middot; {patient.phone}</>}
              </p>
            </div>
            {patient.beds?.length > 0 && (
              <Badge variant="info" size="md">
                Ward: {patient.beds[0].ward?.name} / {patient.beds[0].bedNumber}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <EditableField label="Full Name" value={patient.fullName} field="fullName" onSave={handleUpdate} />
            <EditableField label="Phone" value={patient.phone} field="phone" onSave={handleUpdate} />
            <EditableField label="National ID" value={patient.nationalId} field="nationalId" onSave={handleUpdate} />
            <EditableField label="Email" value={patient.email} field="email" onSave={handleUpdate} />
            <EditableField label="Date of Birth" value={formatDate(patient.dateOfBirth)} field="dateOfBirth" onSave={(v) => handleUpdate({ ...v, dateOfBirth: v.dateOfBirth || null })} />
            <EditableField label="Gender" value={genderLabel[patient.gender] || '—'} field="gender" onSave={handleUpdate} />
            <EditableField label="Diabetes Type" value={patient.diabetesType} field="diabetesType" onSave={handleUpdate} />
            <EditableField label="Address" value={patient.address} field="address" onSave={handleUpdate} />
            <EditableField label="Notes" value={patient.notes} field="notes" onSave={handleUpdate} />
          </div>
          {patient.chronicConditions?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-silver/50">
              <p className="text-caption text-slate mb-2">Chronic Conditions</p>
              <div className="flex flex-wrap gap-2">
                {patient.chronicConditions.map((c) => <Badge key={c} variant="warning">{c}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-1 border-b border-silver overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-caption font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab ? 'border-lilac-bloom text-lilac-bloom' : 'border-transparent text-slate hover:text-obsidian'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          {activeTab === 'Overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-slate">Registered By</p>
                  <p className="text-body text-obsidian">{patient.createdBy?.fullName || '—'}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">Registered At</p>
                  <p className="text-body text-obsidian">{formatDateTime(patient.createdAt)}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">Last Updated</p>
                  <p className="text-body text-obsidian">{formatDateTime(patient.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">Referrals</p>
                  <p className="text-body text-obsidian">{patient.referrals?.length || 0}</p>
                </div>
              </div>
              {patient.preoperativeRequests?.length > 0 && (
                <>
                  <p className="text-subheading font-medium text-obsidian mt-4">Preoperative Requests</p>
                  <Table
                    columns={[
                      { key: 'status', label: 'Status', render: (r) => <Badge size="sm">{r.status}</Badge> },
                      { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
                    ]}
                    data={patient.preoperativeRequests}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'Appointments' && (
            <Table columns={appointmentColumns} data={patient.appointments || []} />
          )}

          {activeTab === 'Clinical Records' && (
            <Table columns={recordColumns} data={patient.clinicalRecords || []} />
          )}

          {activeTab === 'Surgery History' && (
            <Table columns={surgeryColumns} data={patient.surgeries || []} />
          )}

          {activeTab === 'Files' && (
            <div className="space-y-3">
              {patient.files?.length > 0 ? (
                patient.files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-silver/50">
                    <div className="min-w-0">
                      <p className="text-body text-obsidian truncate">{f.originalName}</p>
                      <p className="text-caption text-slate">{formatDateTime(f.createdAt)} &middot; {(f.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <a
                      href={`/api/patients/files/${f.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-caption text-lilac-bloom hover:underline shrink-0"
                    >
                      Download
                    </a>
                  </div>
                ))
              ) : (
                <p className="text-caption text-slate text-center py-8">No files uploaded</p>
              )}
            </div>
          )}

          {activeTab === 'Billing' && (
            <Table columns={transactionColumns} data={patient.transactions || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}