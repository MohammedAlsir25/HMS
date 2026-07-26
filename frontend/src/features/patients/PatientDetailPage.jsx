import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { usePatient, useUpdatePatient, patientKeys } from '../../hooks/queries/usePatients';
import { notifySuccess, notifyError } from '../../utils/notify';
import { CURRENCY } from '../../utils/currency';
import { useAuthStore } from '../../stores/authStore';

const genderLabel = { MALE: 'Male', FEMALE: 'Female' };
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('en-GB') : '—';
const calculateAge = (dob) => {
  if (!dob) return '—';
  const diff = Date.now() - new Date(dob).getTime();
  return `${Math.floor(diff / 31557600000)}y`;
};

const TABS = ['Overview', 'Appointments', 'Clinical Records', 'Surgery History', 'Referrals', 'Preoperative', 'Files', 'Billing'];

const appointmentStatusVariant = {
  WAITING: 'warning',
  CALLED: 'info',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  NO_SHOW: 'danger',
  CANCELLED: 'danger',
  RESERVED: 'info',
  SCHEDULED: 'info',
};

const referralStatusVariant = {
  PENDING: 'warning',
  DISPATCHED: 'info',
  FULFILLED: 'success',
  CANCELLED: 'danger',
};

const preopStatusVariant = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
};

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

function VitalBadge({ label, value, unit, abnormal }) {
  return (
    <div className={`px-2 py-1.5 rounded-lg text-center ${abnormal ? 'bg-red-50 border border-red-200' : 'bg-bone/50'}`}>
      <p className="text-xs text-slate">{label}</p>
      <p className={`text-sm font-medium ${abnormal ? 'text-red-700' : 'text-obsidian'}`}>{value} <span className="text-xs font-normal">{unit}</span></p>
    </div>
  );
}

function ClinicalRecordCard({ record }) {
  const [expanded, setExpanded] = useState(false);

  const vitals = record.vitalSigns?.[0];
  const abnormalCount = vitals ? [
    vitals.bloodPressureSystolic > 140 || vitals.bloodPressureDiastolic > 90,
    vitals.heartRate > 100 || (vitals.heartRate && vitals.heartRate < 60),
    vitals.temperature && Number(vitals.temperature) > 38.3,
    vitals.spo2 && vitals.spo2 < 95,
    vitals.bloodGlucose && vitals.bloodGlucose > 200,
  ].filter(Boolean).length : 0;

  const vitalsSummary = vitals ? [
    vitals.bloodPressureSystolic ? `BP ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic || '?'}` : null,
    vitals.heartRate ? `HR ${vitals.heartRate}` : null,
    vitals.temperature ? `Temp ${vitals.temperature}°C` : null,
    vitals.spo2 ? `SpO2 ${vitals.spo2}%` : null,
    vitals.bloodGlucose ? `BG ${vitals.bloodGlucose}` : null,
  ].filter(Boolean).join(' · ') : null;

  return (
    <div className="border border-silver/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-bone/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-body text-obsidian font-medium">
            {formatDateTime(record.encounterDate || record.createdAt)}
          </span>
          {record.diagnosis && (
            <Badge variant="warning" className="truncate max-w-[200px]">{record.diagnosis}</Badge>
          )}
          {abnormalCount > 0 && (
            <Badge variant="danger" size="sm">{abnormalCount} abnormal</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {vitalsSummary && <span className="text-caption text-slate hidden sm:inline">{vitalsSummary}</span>}
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            className={`text-slate transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-silver/50 space-y-4">
          {vitals && (
            <div>
              <p className="text-caption text-slate mb-2 font-medium">Vital Signs</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {vitals.bloodPressureSystolic && (
                  <VitalBadge label="BP" value={`${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic || '?'}`} unit="mmHg"
                    abnormal={vitals.bloodPressureSystolic > 140 || vitals.bloodPressureDiastolic > 90} />
                )}
                {vitals.heartRate && (
                  <VitalBadge label="HR" value={vitals.heartRate} unit="bpm"
                    abnormal={vitals.heartRate > 100 || vitals.heartRate < 60} />
                )}
                {vitals.temperature && (
                  <VitalBadge label="Temp" value={vitals.temperature} unit="°C"
                    abnormal={Number(vitals.temperature) > 38.3} />
                )}
                {vitals.spo2 && (
                  <VitalBadge label="SpO2" value={vitals.spo2} unit="%"
                    abnormal={vitals.spo2 < 95} />
                )}
                {vitals.bloodGlucose && (
                  <VitalBadge label="BG" value={vitals.bloodGlucose} unit="mg/dL"
                    abnormal={vitals.bloodGlucose > 200} />
                )}
                {vitals.weight && (
                  <VitalBadge label="Weight" value={vitals.weight} unit="kg" />
                )}
              </div>
            </div>
          )}

          {record.symptoms?.length > 0 && (
            <div>
              <p className="text-caption text-slate mb-1 font-medium">Symptoms</p>
              <div className="flex flex-wrap gap-1.5">
                {record.symptoms.map((s, i) => (
                  <Badge key={i} variant="info">{s.name}{s.severity ? ` (${s.severity}/10)` : ''}</Badge>
                ))}
              </div>
            </div>
          )}

          {record.diagnosis && (
            <div>
              <p className="text-caption text-slate mb-1 font-medium">Diagnosis</p>
              <p className="text-body text-obsidian">{record.diagnosis}</p>
            </div>
          )}

          {record.medications?.length > 0 && (
            <div>
              <p className="text-caption text-slate mb-1 font-medium">Medications</p>
              <div className="space-y-1">
                {record.medications.map((m, i) => (
                  <p key={i} className="text-body text-obsidian">
                    {m.drugName} {m.dosage} {m.frequency} {m.route ? `(${m.route})` : ''}
                  </p>
                ))}
              </div>
            </div>
          )}

          {record.notes && (
            <div>
              <p className="text-caption text-slate mb-1 font-medium">Clinical Notes</p>
              <div className="bg-bone/50 rounded-lg p-3 text-body text-obsidian whitespace-pre-wrap">{record.notes}</div>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-silver/30">
            <Button variant="ghost" size="sm" onClick={() => window.open(`/clinics/${record.clinic?.slug || 'medicine'}/print-report/${record.id}`, '_blank')}>
              Print
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FileUploadSection({ patient }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const MAX_SIZE = 15 * 1024 * 1024;

  const getBaseUrl = () => {
    if (typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.Capacitor?.isNative)) {
      return 'https://al-jawahir-hospital-production.up.railway.app/api';
    }
    return import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
  };

  const handleUpload = async (files) => {
    const fileArr = Array.from(files);
    for (const f of fileArr) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        notifyError(new Error(`${f.name}: Only PDF and images (JPEG, PNG, WebP) allowed`));
        return;
      }
      if (f.size > MAX_SIZE) {
        notifyError(new Error(`${f.name}: Max file size is 15MB`));
        return;
      }
    }

    const formData = new FormData();
    fileArr.forEach(f => formData.append('files', f));

    setUploading(true);
    setProgress(0);

    const token = useAuthStore.getState().token;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getBaseUrl()}/patients/${patient.id}/files`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status === 201) {
        notifySuccess('Files uploaded');
        queryClient.invalidateQueries({ queryKey: patientKeys.detail(patient.id) });
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          notifyError(new Error(err.message || 'Upload failed'));
        } catch {
          notifyError(new Error('Upload failed'));
        }
      }
    };

    xhr.onerror = () => { setUploading(false); notifyError(new Error('Upload failed')); };
    xhr.send(formData);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (fileId) => {
    try {
      await fetch(`${getBaseUrl()}/patients/${patient.id}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${useAuthStore.getState().token}` },
      });
      notifySuccess('File deleted');
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(patient.id) });
    } catch {
      notifyError(new Error('Failed to delete file'));
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-lilac-bloom bg-lilac-bloom/5' : 'border-silver hover:border-lilac-bloom'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => e.target.files?.length && handleUpload(e.target.files)}
        />
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-2 text-slate">
          <path d="M16 20V8m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 22v2a2 2 0 002 2h16a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-body text-slate">Drag files here or click to browse</p>
        <p className="text-caption text-slate mt-1">PDF, JPEG, PNG, WebP — max 15MB per file</p>
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="w-full bg-silver rounded-full h-2">
            <div className="bg-lilac-bloom h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-caption text-slate text-right">{progress}%</p>
        </div>
      )}

      <div className="space-y-2">
        {patient.files?.map((f) => (
          <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-silver/50">
            <div className="flex items-center gap-3 min-w-0">
              {f.mimeType === 'application/pdf' ? (
                <span className="text-red-500 text-caption font-bold shrink-0 px-2 py-0.5 bg-red-50 rounded">PDF</span>
              ) : (
                <span className="text-blue-500 text-caption font-bold shrink-0 px-2 py-0.5 bg-blue-50 rounded">IMG</span>
              )}
              <div className="min-w-0">
                <p className="text-body text-obsidian truncate">{f.originalName}</p>
                <p className="text-caption text-slate">{formatDateTime(f.createdAt)} · {(f.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/api/patients/files/${f.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caption text-lilac-bloom hover:underline"
              >
                Download
              </a>
              <button
                onClick={() => handleDelete(f.id)}
                className="text-slate hover:text-red-500 transition-colors p-1"
                aria-label="Delete file"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3.5h8M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4.5 5.5v4a1 1 0 001 1h2a1 1 0 001-1v-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
        {(!patient.files || patient.files.length === 0) && !uploading && (
          <p className="text-caption text-slate text-center py-8">No files uploaded</p>
        )}
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: patient, isLoading, isError, refetch } = usePatient(id);
  const updateMutation = useUpdatePatient();
  const [activeTab, setActiveTab] = useState('Overview');

  if (isLoading) return <div className="text-center py-12 text-slate text-body">Loading patient…</div>;
  if (isError) return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <p className="text-body text-red-500">Failed to load patient</p>
      <button
        onClick={() => refetch()}
        className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );
  if (!patient) return <div className="text-center py-12 text-slate text-body">Patient not found</div>;

  const handleUpdate = (fields) => {
    updateMutation.mutate({ id: patient.id, ...fields }, {
      onSuccess: () => notifySuccess('Patient updated'),
      onError: (err) => notifyError(err),
    });
  };

  const appointmentColumns = [
    { key: 'clinic', label: 'Clinic', render: (r) => r.clinic?.name || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge size="sm" variant={appointmentStatusVariant[r.status] || 'default'}>{r.status}</Badge> },
    { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
    { key: 'visitType', label: 'Type', render: (r) => r.visitType || '—' },
  ];

  const surgeryColumns = [
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
    { key: 'operationType', label: 'Type', render: (r) => r.operationType?.name || '—' },
    { key: 'status', label: 'Status', render: (r) => <Badge size="sm">{r.status}</Badge> },
  ];

  const referralColumns = [
    { key: 'type', label: 'Type', render: (r) => <Badge size="sm">{r.type}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge size="sm" variant={referralStatusVariant[r.status] || 'default'}>{r.status}</Badge> },
    { key: 'fromClinic', label: 'From', render: (r) => r.fromClinic?.name || '—' },
    { key: 'toClinic', label: 'To', render: (r) => r.toClinic?.name || '—' },
    { key: 'createdAt', label: 'Date', render: (r) => formatDateTime(r.createdAt) },
  ];

  const preopColumns = [
    { key: 'status', label: 'Status', render: (r) => <Badge size="sm" variant={preopStatusVariant[r.status] || 'default'}>{r.status}</Badge> },
    { key: 'operationType', label: 'Operation', render: (r) => r.operationType?.name || '—' },
    { key: 'scheduledDate', label: 'Scheduled', render: (r) => formatDate(r.scheduledDate) },
    { key: 'createdAt', label: 'Created', render: (r) => formatDateTime(r.createdAt) },
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
                {genderLabel[patient.gender] || '—'} · {formatDate(patient.dateOfBirth)} ({calculateAge(patient.dateOfBirth)})
                {patient.phone && <> · {patient.phone}</>}
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
            </div>
          )}

          {activeTab === 'Appointments' && (
            <Table columns={appointmentColumns} data={patient.appointments || []} />
          )}

          {activeTab === 'Clinical Records' && (
            <div className="space-y-2">
              {patient.clinicalRecords?.length > 0 ? (
                patient.clinicalRecords.map((record) => (
                  <ClinicalRecordCard key={record.id} record={record} />
                ))
              ) : (
                <p className="text-caption text-slate text-center py-8">No clinical records</p>
              )}
            </div>
          )}

          {activeTab === 'Surgery History' && (
            <Table columns={surgeryColumns} data={patient.surgeries || []} />
          )}

          {activeTab === 'Referrals' && (
            <Table columns={referralColumns} data={patient.referrals || []} />
          )}

          {activeTab === 'Preoperative' && (
            <Table columns={preopColumns} data={patient.preoperativeRequests || []} />
          )}

          {activeTab === 'Files' && (
            <FileUploadSection patient={patient} />
          )}

          {activeTab === 'Billing' && (
            <Table columns={transactionColumns} data={patient.transactions || []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
