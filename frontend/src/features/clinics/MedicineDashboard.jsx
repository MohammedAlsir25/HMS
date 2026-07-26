import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import CrossReferralModal from '../referral/CrossReferralModal';
import ClinicDashboardShell, { ClinicSection, StatCard } from '../../components/clinic/ClinicDashboardShell';
import ClinicHistoryPanel from '../../components/clinic/ClinicHistoryPanel';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { notifySuccess, notifyError } from '../../utils/notify';
import { Table } from '../../components/ui/Table';
import PatientSearchBar from '../../components/clinic/PatientSearchBar';
import VitalSignsInput, { getAbnormalVitals } from '../../components/clinic/VitalSignsInput';
import AIDiagnosisPanel from '../../components/clinic/AIDiagnosisPanel';
import PrescriptionWriter from '../../components/clinic/PrescriptionWriter';
import ClinicQueuePanel from '../../components/clinic/ClinicQueuePanel';
import EncounterSummary from '../../components/clinic/EncounterSummary';
import LabResultsView from '../../components/clinic/LabResultsView';
import SymptomTagInput from '../../components/clinic/SymptomTagInput';
import LabOrderModal from './LabOrderModal';
import TemplateLoader from './TemplateLoader';
import SYMPTOMS from '../../data/symptoms';
import { usePatients } from '../../hooks/usePatients';
import { useClinicalRecords } from '../../hooks/useClinicalRecords';
import { useAIDiagnosis, useIcd10Search } from '../../hooks/useAIDiagnosis';
import { useClinicQueue } from '../../hooks/useClinicQueue';
import { Printer, RotateCcw } from 'lucide-react';
import ScheduleFollowUpModal from './ScheduleFollowUpModal';
import UpcomingFollowUpsSection from './UpcomingFollowUpsSection';

const bodyAreas = ['Head', 'Chest', 'Abdomen', 'Back', 'Upper Extremity', 'Lower Extremity', 'Neck', 'Pelvis', 'Generalized'];
const onsetOptions = ['Sudden', 'Acute (<1 week)', 'Subacute (1-4 weeks)', 'Chronic (>4 weeks)'];

export default function MedicineDashboard() {
  const [showReferral, setShowReferral] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showReferralBtn, setShowReferralBtn] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showLabOrder, setShowLabOrder] = useState(false);
  const location = useLocation();

  const patients = usePatients({ clinicSlug: 'medicine' });
  const records = useClinicalRecords('medicine');
  const ai = useAIDiagnosis();

  const handleQueueSelect = useCallback((patient) => {
    patients.selectPatient(patient);
  }, [patients]);

  const queue = useClinicQueue('medicine', handleQueueSelect);

  const [vitals, setVitals] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisIcd10, setDiagnosisIcd10] = useState('');
  const [medications, setMedications] = useState([]);
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [saving, setSaving] = useState(false);
  const [showIcd10Dropdown, setShowIcd10Dropdown] = useState(false);
  const [pageError, setPageError] = useState(null);

  const { data: icd10Results = [] } = useIcd10Search(diagnosis);

  useEffect(() => {
    if (location.state?.selectedPatientId && patients.selectPatientById) {
      patients.selectPatientById(location.state.selectedPatientId);
    }
  }, [location.state]);

  useEffect(() => {
    if (patients.selectedPatient) {
      setPageError(null);
      records.fetchRecords(patients.selectedPatient.id).catch((err) => setPageError(err.message || 'Failed to load records'));
      setShowReferralBtn(true);
      ai.reset();
    } else {
      setShowReferralBtn(false);
    }
  }, [patients.selectedPatient]);

  const handleIcd10Search = useCallback((q) => {
    setDiagnosis(q);
    setDiagnosisIcd10('');
    if (q.length >= 2) setShowIcd10Dropdown(true);
  }, []);

  const selectIcd10 = useCallback((code) => {
    setDiagnosis(code.name);
    setDiagnosisIcd10(code.code);
    setShowIcd10Dropdown(false);
  }, []);

  const handleAIGetSuggestions = useCallback(() => {
    if (!patients.selectedPatient) return;
    ai.getDiagnosis({
      patientId: patients.selectedPatient.id,
      symptoms: symptoms.filter((s) => s.name.trim()),
      vitals: Object.fromEntries(Object.entries(vitals).filter(([_, v]) => v !== null && v !== '')),
    });
  }, [patients.selectedPatient, symptoms, vitals, ai]);

  const handleApplyDiagnosis = useCallback((d) => {
    setDiagnosis(d.name);
    setDiagnosisIcd10(d.icd10 || '');
  }, []);

  const handleApplyAll = useCallback(() => {
    if (ai.diagnoses.length > 0) {
      const top = ai.diagnoses.sort((a, b) => b.confidence - a.confidence)[0];
      setDiagnosis(top.name);
      setDiagnosisIcd10(top.icd10 || '');
    }
    if (ai.treatments.length > 0) {
      const existingNames = medications.map((m) => m.drugName.toLowerCase());
      const newMeds = ai.treatments
        .filter((t) => !existingNames.includes(t.medication.toLowerCase()))
        .map((t) => ({
          drugName: t.medication,
          dosage: t.dosage || '',
          frequency: '',
          duration: t.duration || '',
          route: 'oral',
          notes: t.notes || '',
        }));
      if (newMeds.length > 0) setMedications([...medications, ...newMeds]);
    }
    if (ai.tests.length > 0) {
      setSoapNotes((prev) => ({
        ...prev,
        assessment: [prev.assessment, `Recommended tests: ${ai.tests.join(', ')}`].filter(Boolean).join('\n'),
      }));
    }
  }, [ai.diagnoses, ai.treatments, ai.tests, medications]);

  const resetForm = useCallback(() => {
    setVitals({});
    setSymptoms([]);
    setDiagnosis('');
    setDiagnosisIcd10('');
    setMedications([]);
    setSoapNotes({ subjective: '', objective: '', assessment: '', plan: '' });
    ai.reset();
  }, [ai]);

  const handleSave = useCallback(async () => {
    if (!patients.selectedPatient) return;
    setSaving(true);
    try {
      const payload = {
        patientId: patients.selectedPatient.id,
        diagnosis: diagnosisIcd10 ? `${diagnosisIcd10} - ${diagnosis}` : diagnosis,
        prescriptions: medications.map((m) => `${m.drugName} ${m.dosage} ${m.frequency} ${m.duration}`).join('; '),
        clinicSpecificJson: { icd10Code: diagnosisIcd10 },
        notes: [soapNotes.subjective, soapNotes.objective, soapNotes.assessment, soapNotes.plan].filter(Boolean).join('\n---\n'),
        vitalSigns: Object.fromEntries(Object.entries(vitals).filter(([_, v]) => v !== null && v !== '')),
        symptoms: symptoms.filter((s) => s.name.trim()),
        medications: medications.filter((m) => m.drugName.trim()),
      };
      await records.saveRecord(payload);
      if (patients.selectedPatient) records.fetchRecords(patients.selectedPatient.id);
      resetForm();
      notifySuccess('Record saved successfully');
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }, [patients.selectedPatient, vitals, symptoms, diagnosis, diagnosisIcd10, medications, soapNotes, records, resetForm]);

  const refetchAll = useCallback(() => {
    setPageError(null);
    if (patients.selectedPatient) {
      records.fetchRecords(patients.selectedPatient.id).catch((err) => setPageError(err.message || 'Failed to load records'));
    }
  }, [patients.selectedPatient, records.fetchRecords]);

  if (patients.loading || records.loading) {
    return (
      <ClinicDashboardShell
        title="Medicine Clinic"
        subtitle="Internal Medicine & Chronic Disease Management"
        historyPanel={<ClinicHistoryPanel clinicSlug="medicine" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-slate/5 animate-pulse" />
          ))}
        </div>
      </ClinicDashboardShell>
    );
  }

  if (pageError) {
    return (
      <ClinicDashboardShell
        title="Medicine Clinic"
        subtitle="Internal Medicine & Chronic Disease Management"
        historyPanel={<ClinicHistoryPanel clinicSlug="medicine" />}
      >
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-body text-red-500">Failed to load clinic data</p>
          <button onClick={refetchAll} className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90">
            Retry
          </button>
        </div>
      </ClinicDashboardShell>
    );
  }

  if (records.records.length === 0 && patients.selectedPatient && !patients.loading && !records.loading) {
    return (
      <ClinicDashboardShell
        title="Medicine Clinic"
        subtitle="Internal Medicine & Chronic Disease Management"
        historyPanel={<ClinicHistoryPanel clinicSlug="medicine" />}
      >
        <div className="flex flex-col items-center gap-3 py-12">
          <p className="text-body text-slate">No clinical records found for this patient.</p>
          <button onClick={refetchAll} className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90">
            Retry
          </button>
        </div>
      </ClinicDashboardShell>
    );
  }

  return (
    <ClinicDashboardShell
      title="Medicine Clinic"
      subtitle="Internal Medicine & Chronic Disease Management"
      historyPanel={<ClinicHistoryPanel clinicSlug="medicine" />}
    >
      <ClinicQueuePanel
        queue={queue.queue}
        loading={queue.loading}
        lastUpdated={queue.lastUpdated}
        onStartConsultation={queue.startConsultation}
      />

      <Card className="mb-6">
        <CardHeader><CardTitle>Patient Selection</CardTitle></CardHeader>
        <CardContent>
          <PatientSearchBar
            query={patients.query}
            onSearch={patients.setQuery}
            results={patients.results}
            loading={patients.loading}
            onSelect={patients.selectPatient}
            onClear={patients.clearPatient}
          />
          {patients.selectedPatient && (
            <div className="mt-4 flex flex-wrap items-center gap-4 p-4 bg-lilac-bloom/10 rounded-lg">
              <div>
                <p className="text-body font-semibold text-obsidian">{patients.selectedPatient.fullName}</p>
                <p className="text-caption text-slate">
                  MRN: {patients.selectedPatient.mrn}
                  {patients.selectedPatient.gender && ` · ${patients.selectedPatient.gender}`}
                  {patients.selectedPatient.dateOfBirth && ` · ${new Date(patients.selectedPatient.dateOfBirth).toLocaleDateString()}`}
                  {patients.selectedPatient.phone && ` · ${patients.selectedPatient.phone}`}
                </p>
              </div>
              {patients.selectedPatient.chronicConditions?.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {patients.selectedPatient.chronicConditions.map((c) => (
                    <Badge key={c} variant="warning">{c}</Badge>
                  ))}
                </div>
              )}
              {patients.selectedPatient.diabetesType && patients.selectedPatient.diabetesType !== 'NONE' && (
                <Badge variant="info">{patients.selectedPatient.diabetesType}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {patients.selectedPatient && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ClinicSection title="Vital Signs">
              <VitalSignsInput values={vitals} onChange={setVitals} />
            </ClinicSection>

            <ClinicSection title="Symptom Assessment">
              <SymptomTagInput
                symptoms={symptoms}
                onSymptomsChange={setSymptoms}
                suggestions={SYMPTOMS}
                bodyAreaOptions={bodyAreas}
                onsetOptions={onsetOptions}
              />
            </ClinicSection>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ClinicSection title="Diagnosis">
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    label="Diagnosis"
                    placeholder="Type diagnosis or ICD-10 code..."
                    value={diagnosis}
                    onChange={(e) => handleIcd10Search(e.target.value)}
                  />
                  {diagnosisIcd10 && (
                    <p className="text-caption text-lilac-bloom font-medium mt-1">ICD-10: {diagnosisIcd10}</p>
                  )}
                  {showIcd10Dropdown && icd10Results.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-paper border border-silver rounded-lg shadow-md max-h-48 overflow-y-auto">
                      {icd10Results.map((c) => (
                        <button key={c.id} onClick={() => selectIcd10(c)}
                          className="w-full text-left px-4 py-2 hover:bg-bone transition-colors border-b border-silver/50 last:border-0">
                          <span className="font-mono text-caption text-lilac-bloom">{c.code}</span>
                          <span className="text-body text-obsidian ml-2">{c.name}</span>
                          {c.category && <span className="text-caption text-slate ml-2">({c.category})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <AIDiagnosisPanel
                    diagnoses={ai.diagnoses}
                    tests={ai.tests}
                    treatments={ai.treatments}
                    aiNotes={ai.aiNotes}
                    loading={ai.loading}
                    error={ai.error}
                    onGetSuggestions={handleAIGetSuggestions}
                    onApplyDiagnosis={handleApplyDiagnosis}
                    onApplyAll={handleApplyAll}
                    disabled={!patients.selectedPatient}
                  />
                </div>
              </div>
            </ClinicSection>

            <ClinicSection title="Prescriptions">
              <PrescriptionWriter medications={medications} onChange={setMedications} clinicSlug="medicine" />
            </ClinicSection>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-6">
            <ClinicSection title="SOAP Notes">
              <TemplateLoader
                clinicSlug="medicine"
                onLoadTemplate={(data) => setSoapNotes(data)}
                currentSections={soapNotes}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Subjective</label>
                  <textarea value={soapNotes.subjective} onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                    placeholder="Patient's chief complaint, history of present illness..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Objective</label>
                  <textarea value={soapNotes.objective} onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                    placeholder="Physical exam findings, vital signs, test results..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Assessment</label>
                  <textarea value={soapNotes.assessment} onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                    placeholder="Diagnosis, differential, severity assessment..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Plan</label>
                  <textarea value={soapNotes.plan} onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                    placeholder="Treatment plan, medications, follow-up, referrals..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
              </div>
            </ClinicSection>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Save Clinical Record
            </Button>
            <Button variant="secondary" onClick={() => setShowLabOrder(true)}>
              Order Lab Tests
            </Button>
            {showReferralBtn && (
              <Button variant="secondary" onClick={() => setShowReferral(true)}>
                Refer Patient
              </Button>
            )}
            <Button variant="secondary" onClick={() => setShowFollowUpModal(true)}>
              Schedule Follow-Up
            </Button>
            <Button variant="ghost" onClick={() => setShowSummary(true)} title="Print Summary">
              <Printer size={16} />
            </Button>
            <Button variant="ghost" onClick={resetForm} title="Reset Form">
              <RotateCcw size={16} />
            </Button>
          </div>

          <LabResultsView patientId={patients.selectedPatient?.id} />

          {records.records.length > 0 && (
            <ClinicSection title="Patient History" className="mb-6">
              <Table
                columns={[
                  { key: 'date', label: 'Date', render: (r) => new Date(r.encounterDate).toLocaleDateString() },
                  { key: 'diagnosis', label: 'Diagnosis', render: (r) => r.diagnosis ? <Badge variant="warning">{r.diagnosis}</Badge> : '-' },
                  { key: 'medications', label: 'Medications', render: (r) => r.medications?.length ? r.medications.map(m => m.drugName).join(', ') : r.prescriptions || '-' },
                  { key: 'vitals', label: 'Vitals', render: (r) => {
                    const v = r.vitalSigns?.[0];
                    if (!v) return '-';
                    const parts = [];
                    if (v.bloodPressureSystolic) parts.push(`BP ${v.bloodPressureSystolic}/${v.bloodPressureDiastolic || '?'}`);
                    if (v.heartRate) parts.push(`HR ${v.heartRate}`);
                    if (v.bloodGlucose) parts.push(`BG ${v.bloodGlucose}`);
                    return parts.join(', ');
                  }},
                ]}
                data={records.records}
              />
            </ClinicSection>
          )}
        </>
      )}

      {!patients.selectedPatient && (
        <>
          <UpcomingFollowUpsSection clinicSlug="medicine" />
          {records.stats && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Patients" value={records.stats.totalPatients} />
              <StatCard label="Today's Appointments" value={records.stats.todayAppointments} />
              <StatCard label="Today's Records" value={records.stats.todayRecords} />
              <StatCard label="Chronic Patients" value={records.stats.chronicPatients} variant="highlight" />
            </div>
          )}
        </>
      )}

      {showSummary && (
        <EncounterSummary
          patient={patients.selectedPatient}
          vitals={vitals}
          symptoms={symptoms}
          diagnosis={diagnosis}
          diagnosisIcd10={diagnosisIcd10}
          medications={medications}
          soapNotes={soapNotes}
          onClose={() => setShowSummary(false)}
        />
      )}

      <CrossReferralModal
        open={showReferral}
        onClose={() => setShowReferral(false)}
        fromClinicId="medicine"
        selectedPatient={patients.selectedPatient}
      />
      <LabOrderModal
        isOpen={showLabOrder}
        onClose={() => setShowLabOrder(false)}
        clinicSlug="medicine"
        patientId={patients.selectedPatient?.id}
        patientName={patients.selectedPatient?.fullName}
        onOrderCreated={() => { if (patients.selectedPatient) records.fetchRecords(patients.selectedPatient.id); }}
      />
      <ScheduleFollowUpModal
        open={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        clinicSlug="medicine"
        patientId={patients.selectedPatient?.id}
        patientName={patients.selectedPatient?.fullName}
        onScheduled={() => setShowFollowUpModal(false)}
      />
    </ClinicDashboardShell>
  );
}
