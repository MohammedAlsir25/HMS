import { useState, useEffect, useCallback } from 'react';
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
import VitalSignsInput from '../../components/clinic/VitalSignsInput';
import AIDiagnosisPanel from '../../components/clinic/AIDiagnosisPanel';
import ClinicQueuePanel from '../../components/clinic/ClinicQueuePanel';
import EncounterSummary from '../../components/clinic/EncounterSummary';
import LoadingOverlay from '../../components/ui/LoadingOverlay';
import OptometryReportPrint from './OptometryReportPrint';
import SymptomTagInput from '../../components/clinic/SymptomTagInput';
import SYMPTOMS from '../../data/symptoms';
import { usePatients } from '../../hooks/usePatients';
import { useClinicalRecords } from '../../hooks/useClinicalRecords';
import { useAIDiagnosis, useIcd10Search } from '../../hooks/useAIDiagnosis';
import { useClinicQueue } from '../../hooks/useClinicQueue';
import { useScreeningQueue, useCompleteScreening } from '../../hooks/queries/useClinics';
import { Printer, RotateCcw } from 'lucide-react';
import ScheduleFollowUpModal from './ScheduleFollowUpModal';
import UpcomingFollowUpsSection from './UpcomingFollowUpsSection';
import LabOrderModal from './LabOrderModal';
import TemplateLoader from './TemplateLoader';
import ImagingOrderModal from './ImagingOrderModal';

const bodyAreas = ['Optic Nerve', 'Macula', 'Retina', 'Cornea', 'Lens', 'Anterior Chamber', 'Eyelid', 'Orbit', 'Generalized'];
const onsetOptions = ['Sudden', 'Acute (<1 week)', 'Subacute (1-4 weeks)', 'Chronic (>4 weeks)'];

export default function OptometryDashboard() {
  const [showReferral, setShowReferral] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showReferralBtn, setShowReferralBtn] = useState(false);
  const [activeScreeningAppt, setActiveScreeningAppt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [printData, setPrintData] = useState(null);
  const [currentRecordId, setCurrentRecordId] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showLabOrder, setShowLabOrder] = useState(false);
  const [showImagingOrder, setShowImagingOrder] = useState(false);

  const patients = usePatients({ clinicSlug: 'optometry' });
  const records = useClinicalRecords('optometry');
  const ai = useAIDiagnosis();
  const screeningQueue = useScreeningQueue('optometry');
  const completeScreening = useCompleteScreening('optometry');

  const handleQueueSelect = useCallback((patient) => {
    patients.selectPatient(patient);
    setActiveScreeningAppt(null);
  }, [patients]);

  const queue = useClinicQueue('optometry', handleQueueSelect);

  const [vitals, setVitals] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisIcd10, setDiagnosisIcd10] = useState('');
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [saving, setSaving] = useState(false);
  const [showIcd10Dropdown, setShowIcd10Dropdown] = useState(false);

  const { data: icd10Results = [] } = useIcd10Search(diagnosis);

  const [autoref, setAutoref] = useState({ odSph: '', odCyl: '', odAxis: '', osSph: '', osCyl: '', osAxis: '' });
  const [retinaTest, setRetinaTest] = useState({
    odMedia: '', odDisc: '', odCDRatio: '', odMacula: '', odVessels: '', odPeriphery: '',
    osMedia: '', osDisc: '', osCDRatio: '', osMacula: '', osVessels: '', osPeriphery: '',
  });

  useEffect(() => {
    if (patients.selectedPatient) {
      records.fetchRecords(patients.selectedPatient.id);
      setShowReferralBtn(true);
      ai.reset();
      setCurrentRecordId(null);
      setViewingRecord(null);
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
      specialty: 'optometry',
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
    if (ai.tests.length > 0) {
      setSoapNotes((prev) => ({
        ...prev,
        assessment: [prev.assessment, `Recommended tests: ${ai.tests.join(', ')}`].filter(Boolean).join('\n'),
      }));
    }
  }, [ai.diagnoses, ai.tests]);

  const resetForm = useCallback(() => {
    setVitals({});
    setSymptoms([]);
    setDiagnosis('');
    setDiagnosisIcd10('');
    setSoapNotes({ subjective: '', objective: '', assessment: '', plan: '' });
    setAutoref({ odSph: '', odCyl: '', odAxis: '', osSph: '', osCyl: '', osAxis: '' });
    setRetinaTest({ odMedia: '', odDisc: '', odCDRatio: '', odMacula: '', odVessels: '', odPeriphery: '', osMedia: '', osDisc: '', osCDRatio: '', osMacula: '', osVessels: '', osPeriphery: '' });
    setActiveScreeningAppt(null);
    ai.reset();
  }, [ai]);

  const clearAll = useCallback(() => {
    patients.clearPatient();
    resetForm();
  }, [patients, resetForm]);

  const handleSave = useCallback(async () => {
    if (!patients.selectedPatient) return;
    setSaving(true);
    try {
      const clinicalNotes = [soapNotes.subjective, soapNotes.objective, soapNotes.assessment, soapNotes.plan].filter(Boolean).join('\n---\n');
      const payload = {
        patientId: patients.selectedPatient.id,
        diagnosis: diagnosisIcd10 ? `${diagnosisIcd10} - ${diagnosis}` : diagnosis,
        clinicSpecificJson: {
          icd10Code: diagnosisIcd10,
          autoRefraction: autoref,
        },
        notes: clinicalNotes,
        vitalSigns: Object.fromEntries(Object.entries(vitals).filter(([_, v]) => v !== null && v !== '')),
        symptoms: symptoms.filter((s) => s.name.trim()),
      };
      const saved = await records.saveRecord(payload);
      setCurrentRecordId(saved.id);
      if (patients.selectedPatient) records.fetchRecords(patients.selectedPatient.id);
      resetForm();
      notifySuccess('Record saved successfully');
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  }, [patients.selectedPatient, vitals, symptoms, diagnosis, diagnosisIcd10, soapNotes, autoref, records, resetForm]);

  const handleFinishAndSend = useCallback(async () => {
    if (!patients.selectedPatient || !activeScreeningAppt) return;
    setLoading(true);
    try {
      const clinicalNotes = [soapNotes.subjective, soapNotes.objective, soapNotes.assessment, soapNotes.plan].filter(Boolean).join('\n---\n');
      const payload = {
        optometryAppointmentId: activeScreeningAppt.id,
        diagnosis,
        diagnosisIcd10,
        notes: clinicalNotes,
        vitalSigns: Object.fromEntries(Object.entries(vitals).filter(([_, v]) => v !== null && v !== '')),
        symptoms: symptoms.filter((s) => s.name.trim()),
        autorefraction: autoref,
      };
      const result = await completeScreening.mutateAsync(payload);
      setPrintData(result.printData);
      notifySuccess(`Sent to ${activeScreeningAppt.targetClinic.name} — Token #${String(result.targetAppointment.token).padStart(3, '0')}`);
      clearAll();
    } catch (err) {
      notifyError(err);
    } finally {
      setLoading(false);
    }
  }, [patients.selectedPatient, activeScreeningAppt, vitals, symptoms, diagnosis, diagnosisIcd10, soapNotes, autoref, completeScreening, clearAll]);

  const handleStartPreScreening = useCallback((appt) => {
    setActiveScreeningAppt(appt);
    patients.selectPatient(appt.patient);
  }, [patients]);

  const targetClinic = activeScreeningAppt?.targetClinic;

  return (
    <ClinicDashboardShell
      title="Optometry Clinic"
      subtitle="Refraction, Visual Acuity & Pre-Triage Assessment"
      historyPanel={<ClinicHistoryPanel clinicSlug="optometry" />}
    >
      {loading && <LoadingOverlay message="Processing optometry screening..." />}

      {printData && (
        <OptometryReportPrint
          printData={printData}
          onClose={() => setPrintData(null)}
        />
      )}

      <ClinicQueuePanel
        queue={queue.queue}
        loading={queue.loading}
        lastUpdated={queue.lastUpdated}
        onStartConsultation={queue.startConsultation}
      />

      {!patients.selectedPatient && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pre-Screening Queue</CardTitle>
              {screeningQueue.data && (
                <span className="text-caption text-slate">{screeningQueue.data.length} waiting</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {screeningQueue.isLoading && (
              <p className="text-body text-slate py-4 text-center">Loading pre-screening queue...</p>
            )}
            {!screeningQueue.isLoading && (!screeningQueue.data || screeningQueue.data.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-silver mb-3">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <p className="text-body font-medium text-slate">No patients waiting for pre-screening</p>
                <p className="text-caption text-slate mt-1">Patients registered for eye clinics will appear here</p>
              </div>
            )}
            {screeningQueue.data && screeningQueue.data.length > 0 && (
              <div className="space-y-2">
                {screeningQueue.data.map((appt) => (
                  <div key={appt.id} className="flex items-center gap-4 bg-lilac-bloom/5 rounded-lg px-4 py-3 hover:bg-lilac-bloom/10 transition-colors">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-paper border border-silver shrink-0">
                      <span className="text-subheading font-bold text-obsidian">#{String(appt.token).padStart(3, '0')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-obsidian truncate">{appt.patient.fullName}</p>
                      <p className="text-caption text-slate">MRN: {appt.patient.mrn}</p>
                    </div>
                    <Badge variant="primary" className="shrink-0">
                      → {appt.targetClinic?.name || 'Eye Clinic'}
                    </Badge>
                    <Button size="sm" variant="primary" onClick={() => handleStartPreScreening(appt)}>
                      Start Pre-Screening
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle>Patient Selection</CardTitle></CardHeader>
        <CardContent>
          <PatientSearchBar
            query={patients.query}
            onSearch={patients.setQuery}
            results={patients.results}
            loading={patients.loading}
            onSelect={patients.selectPatient}
            onClear={clearAll}
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
              {targetClinic && (
                <Badge variant="primary">Pre-Screening → {targetClinic.name}</Badge>
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
              <div className="mt-4 pt-4 border-t border-silver/50">
                <p className="text-sm font-medium text-graphite mb-2">Intraocular Pressure</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="IOP (OD) mmHg" placeholder="e.g. 16" value={vitals.iopOD || ''} onChange={(e) => setVitals((p) => ({ ...p, iopOD: e.target.value }))} />
                  <Input label="IOP (OS) mmHg" placeholder="e.g. 16" value={vitals.iopOS || ''} onChange={(e) => setVitals((p) => ({ ...p, iopOS: e.target.value }))} />
                </div>
              </div>
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
            <ClinicSection title="Auto-Refraction">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-graphite border-b border-silver pb-1">Right Eye (OD)</p>
                  <Input label="Sphere" placeholder="-2.50 D" value={autoref.odSph} onChange={(e) => setAutoref((p) => ({ ...p, odSph: e.target.value }))} />
                  <Input label="Cylinder" placeholder="-0.75 D" value={autoref.odCyl} onChange={(e) => setAutoref((p) => ({ ...p, odCyl: e.target.value }))} />
                  <Input label="Axis" placeholder="180" value={autoref.odAxis} onChange={(e) => setAutoref((p) => ({ ...p, odAxis: e.target.value }))} />
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-graphite border-b border-silver pb-1">Left Eye (OS)</p>
                  <Input label="Sphere" placeholder="-2.25 D" value={autoref.osSph} onChange={(e) => setAutoref((p) => ({ ...p, osSph: e.target.value }))} />
                  <Input label="Cylinder" placeholder="-0.50 D" value={autoref.osCyl} onChange={(e) => setAutoref((p) => ({ ...p, osCyl: e.target.value }))} />
                  <Input label="Axis" placeholder="175" value={autoref.osAxis} onChange={(e) => setAutoref((p) => ({ ...p, osAxis: e.target.value }))} />
                </div>
              </div>
            </ClinicSection>

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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ClinicSection title="Refraction History">
              <div className="space-y-2">
                {[
                  { date: '2026-06-20', odSph: -2.50, odCyl: -0.75, odAxis: 180, osSph: -2.25, osCyl: -0.50, osAxis: 175, vaOd: '6/9', vaOs: '6/12' },
                  { date: '2026-05-15', odSph: -2.50, odCyl: -0.75, odAxis: 180, osSph: -2.25, osCyl: -0.50, osAxis: 175, vaOd: '6/12', vaOs: '6/15' },
                  { date: '2026-04-10', odSph: -2.75, odCyl: -0.50, odAxis: 180, osSph: -2.50, osCyl: -0.50, osAxis: 175, vaOd: '6/12', vaOs: '6/18' },
                ].map((r) => (
                  <div key={r.date} className="py-2 border-b border-silver/50 last:border-0">
                    <div className="flex items-center justify-between text-caption text-slate mb-1">
                      <span>{r.date}</span>
                      <span>VA: {r.vaOd} / {r.vaOs}</span>
                    </div>
                    <div className="text-body text-obsidian">
                      OD: {r.odSph} ({r.odCyl} × {r.odAxis}) &nbsp; OS: {r.osSph} ({r.osCyl} × {r.osAxis})
                    </div>
                  </div>
                ))}
              </div>
            </ClinicSection>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-6">
            <ClinicSection title="Retina Test">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-graphite border-b border-silver pb-1">Right Eye (OD)</p>
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Media</label>
                    <select value={retinaTest.odMedia} onChange={(e) => setRetinaTest((p) => ({ ...p, odMedia: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Clear">Clear</option>
                      <option value="Cataract">Cataract</option>
                      <option value="Vitreous Opacity">Vitreous Opacity</option>
                      <option value="Vitreous Hemorrhage">Vitreous Hemorrhage</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Optic Disc</label>
                    <select value={retinaTest.odDisc} onChange={(e) => setRetinaTest((p) => ({ ...p, odDisc: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Pale">Pale</option>
                      <option value="Swollen (Edema)">Swollen (Edema)</option>
                      <option value="Cupped">Cupped</option>
                      <option value="Tilted">Tilted</option>
                      <option value="Drusen">Drusen</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <Input label="C/D Ratio" type="number" step="0.1" min="0" max="1" placeholder="0.3" value={retinaTest.odCDRatio} onChange={(e) => setRetinaTest((p) => ({ ...p, odCDRatio: e.target.value }))} />
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Macula</label>
                    <select value={retinaTest.odMacula} onChange={(e) => setRetinaTest((p) => ({ ...p, odMacula: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal</option>
                      <option value="Edema">Edema</option>
                      <option value="Drusen">Drusen</option>
                      <option value="Hemorrhage">Hemorrhage</option>
                      <option value="Hole">Hole</option>
                      <option value="Scar">Scar</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Vessels</label>
                    <select value={retinaTest.odVessels} onChange={(e) => setRetinaTest((p) => ({ ...p, odVessels: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Tortuous">Tortuous</option>
                      <option value="Narrowed">Narrowed</option>
                      <option value="Sheathed">Sheathed</option>
                      <option value="Neovascularization">Neovascularization</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Periphery</label>
                    <select value={retinaTest.odPeriphery} onChange={(e) => setRetinaTest((p) => ({ ...p, odPeriphery: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Lattice Degeneration">Lattice Degeneration</option>
                      <option value="Hole">Hole</option>
                      <option value="Tear">Tear</option>
                      <option value="Detachment">Detachment</option>
                      <option value="RPE Changes">RPE Changes</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-graphite border-b border-silver pb-1">Left Eye (OS)</p>
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Media</label>
                    <select value={retinaTest.osMedia} onChange={(e) => setRetinaTest((p) => ({ ...p, osMedia: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Clear">Clear</option>
                      <option value="Cataract">Cataract</option>
                      <option value="Vitreous Opacity">Vitreous Opacity</option>
                      <option value="Vitreous Hemorrhage">Vitreous Hemorrhage</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Optic Disc</label>
                    <select value={retinaTest.osDisc} onChange={(e) => setRetinaTest((p) => ({ ...p, osDisc: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Pale">Pale</option>
                      <option value="Swollen (Edema)">Swollen (Edema)</option>
                      <option value="Cupped">Cupped</option>
                      <option value="Tilted">Tilted</option>
                      <option value="Drusen">Drusen</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <Input label="C/D Ratio" type="number" step="0.1" min="0" max="1" placeholder="0.3" value={retinaTest.osCDRatio} onChange={(e) => setRetinaTest((p) => ({ ...p, osCDRatio: e.target.value }))} />
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Macula</label>
                    <select value={retinaTest.osMacula} onChange={(e) => setRetinaTest((p) => ({ ...p, osMacula: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal</option>
                      <option value="Edema">Edema</option>
                      <option value="Drusen">Drusen</option>
                      <option value="Hemorrhage">Hemorrhage</option>
                      <option value="Hole">Hole</option>
                      <option value="Scar">Scar</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Vessels</label>
                    <select value={retinaTest.osVessels} onChange={(e) => setRetinaTest((p) => ({ ...p, osVessels: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Tortuous">Tortuous</option>
                      <option value="Narrowed">Narrowed</option>
                      <option value="Sheathed">Sheathed</option>
                      <option value="Neovascularization">Neovascularization</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-graphite block mb-1">Periphery</label>
                    <select value={retinaTest.osPeriphery} onChange={(e) => setRetinaTest((p) => ({ ...p, osPeriphery: e.target.value }))}
                      className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Lattice Degeneration">Lattice Degeneration</option>
                      <option value="Hole">Hole</option>
                      <option value="Tear">Tear</option>
                      <option value="Detachment">Detachment</option>
                      <option value="RPE Changes">RPE Changes</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            </ClinicSection>
          </div>

          <div className="flex items-center gap-3 mb-6">
            {targetClinic ? (
              <Button variant="primary" onClick={handleFinishAndSend} loading={loading || completeScreening.isPending}>
                Finish & Send to {targetClinic.name}
              </Button>
            ) : (
              <>
                <Button variant="primary" onClick={handleSave} loading={saving}>
                  Save Clinical Record
                </Button>
                <Button variant="secondary" onClick={() => setShowLabOrder(true)}>
                  Order Lab Tests
                </Button>
                <Button variant="secondary" onClick={() => setShowImagingOrder(true)}>
                  Order Imaging
                </Button>
              </>
            )}
            {showReferralBtn && !targetClinic && (
              <Button variant="secondary" onClick={() => setShowReferral(true)}>
                Refer Patient
              </Button>
            )}
            {!targetClinic && (
              <Button variant="secondary" onClick={() => setShowFollowUpModal(true)}>
                Schedule Follow-Up
              </Button>
            )}
            <Button variant="ghost" onClick={() => setShowSummary(true)} title="Print Summary">
              <Printer size={16} />
            </Button>
            <Button variant="ghost" onClick={clearAll} title={targetClinic ? 'Cancel' : 'Reset Form'}>
              <RotateCcw size={16} />
            </Button>
          </div>

          {records.records.length > 0 && (() => {
            const pastRecords = records.records.filter((r) => r.id !== currentRecordId);
            if (pastRecords.length === 0) return null;
            return (
            <>
              <div className="mb-6">
                <TemplateLoader
                  clinicSlug="optometry"
                  onLoadTemplate={(data) => setSoapNotes(data)}
                  currentSections={soapNotes}
                />
              </div>
              <ClinicSection title="Patient History" className="mb-6">
                <Table
                  columns={[
                    { key: 'date', label: 'Date', render: (r) => new Date(r.encounterDate).toLocaleDateString() },
                    { key: 'diagnosis', label: 'Diagnosis', render: (r) => r.diagnosis ? <Badge variant="warning">{r.diagnosis}</Badge> : '-' },
                    { key: 'medications', label: 'Rx', render: (r) => r.medications?.length ? r.medications.map(m => m.drugName).join(', ') : r.prescriptions || '-' },
                    { key: 'findings', label: 'Refraction', render: (r) => {
                      const json = r.clinicSpecificJson;
                      if (!json?.autoRefraction) return '-';
                      const a = json.autoRefraction;
                      return `OD: ${a.odSph || '?'} / OS: ${a.osSph || '?'}`;
                    }},
                  ]}
                  data={pastRecords}
                  onRowClick={(r) => setViewingRecord(viewingRecord?.id === r.id ? null : r)}
                />
              </ClinicSection>
            </>
            );
          })()}

          {viewingRecord && (
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Record Detail — {new Date(viewingRecord.encounterDate).toLocaleDateString()}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setViewingRecord(null)}>Close</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-caption text-slate">Patient</p>
                      <p className="text-body font-medium text-obsidian">{viewingRecord.patient?.fullName || '—'}</p>
                      <p className="text-caption text-slate">MRN: {viewingRecord.patient?.mrn || '—'}</p>
                    </div>
                    <div>
                      <p className="text-caption text-slate">Date</p>
                      <p className="text-body font-medium text-obsidian">{new Date(viewingRecord.encounterDate).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="border-t border-silver/50 pt-4">
                    <p className="text-sm font-semibold text-graphite mb-2">Diagnosis</p>
                    <p className="text-body text-obsidian">{viewingRecord.diagnosis || '—'}</p>
                    {viewingRecord.clinicSpecificJson?.icd10Code && (
                      <p className="text-caption text-lilac-bloom">ICD-10: {viewingRecord.clinicSpecificJson.icd10Code}</p>
                    )}
                  </div>

                  <div className="border-t border-silver/50 pt-4">
                    <p className="text-sm font-semibold text-graphite mb-2">Refraction</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-bone rounded-lg p-3">
                        <p className="text-xs font-medium text-slate mb-1">Right Eye (OD)</p>
                        {(() => {
                          const a = viewingRecord.clinicSpecificJson?.autoRefraction;
                          if (!a) return <p className="text-body text-slate">No data</p>;
                          return (
                            <>
                              <p className="text-body text-obsidian">Sphere: {a.odSph || '—'}</p>
                              <p className="text-body text-obsidian">Cylinder: {a.odCyl || '—'}</p>
                              <p className="text-body text-obsidian">Axis: {a.odAxis || '—'}</p>
                            </>
                          );
                        })()}
                      </div>
                      <div className="bg-bone rounded-lg p-3">
                        <p className="text-xs font-medium text-slate mb-1">Left Eye (OS)</p>
                        {(() => {
                          const a = viewingRecord.clinicSpecificJson?.autoRefraction;
                          if (!a) return <p className="text-body text-slate">No data</p>;
                          return (
                            <>
                              <p className="text-body text-obsidian">Sphere: {a.osSph || '—'}</p>
                              <p className="text-body text-obsidian">Cylinder: {a.osCyl || '—'}</p>
                              <p className="text-body text-obsidian">Axis: {a.osAxis || '—'}</p>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {viewingRecord.symptoms?.length > 0 && (
                    <div className="border-t border-silver/50 pt-4">
                      <p className="text-sm font-semibold text-graphite mb-2">Symptoms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {viewingRecord.symptoms.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-lilac-bloom/20 text-obsidian text-sm rounded-full border border-lilac-bloom/30">
                            {s.name}{s.onset ? ` · ${s.onset}` : ''}{s.duration ? ` · ${s.duration}` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingRecord.vitalSigns?.length > 0 && (
                    <div className="border-t border-silver/50 pt-4">
                      <p className="text-sm font-semibold text-graphite mb-2">Vital Signs</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {viewingRecord.vitalSigns.map((v, i) => (
                          <div key={i} className="bg-bone rounded-lg p-2 text-center">
                            <p className="text-caption text-slate">{v.type || '—'}</p>
                            <p className="text-body font-semibold text-obsidian">{v.value || '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingRecord.medications?.length > 0 && (
                    <div className="border-t border-silver/50 pt-4">
                      <p className="text-sm font-semibold text-graphite mb-2">Medications</p>
                      <div className="space-y-1">
                        {viewingRecord.medications.map((m, i) => (
                          <p key={i} className="text-body text-obsidian">• {m.drugName}{m.dosage ? ` — ${m.dosage}` : ''}{m.frequency ? `, ${m.frequency}` : ''}{m.duration ? `, ${m.duration}` : ''}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewingRecord.notes && (
                    <div className="border-t border-silver/50 pt-4">
                      <p className="text-sm font-semibold text-graphite mb-2">Notes</p>
                      <p className="text-body text-obsidian whitespace-pre-wrap">{viewingRecord.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!patients.selectedPatient && (
        <>
          <UpcomingFollowUpsSection clinicSlug="optometry" />
          {records.stats && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Patients" value={records.stats.totalPatients} />
              <StatCard label="Today's Appointments" value={records.stats.todayAppointments} />
              <StatCard label="Today's Records" value={records.stats.todayRecords} />
              <StatCard label="Refractions Done" value={records.stats.totalPatients} variant="highlight" />
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
          medications={[]}
          soapNotes={soapNotes}
          onClose={() => setShowSummary(false)}
        />
      )}

      <CrossReferralModal
        open={showReferral}
        onClose={() => setShowReferral(false)}
        fromClinicId="optometry"
        selectedPatient={patients.selectedPatient}
      />

            <LabOrderModal
        isOpen={showLabOrder}
        onClose={() => setShowLabOrder(false)}
        clinicSlug="optometry"
        patientId={patients.selectedPatient?.id}
        patientName={patients.selectedPatient?.fullName}
        onOrderCreated={() => { if (patients.selectedPatient) records.fetchRecords(patients.selectedPatient.id); }}
      />
      <ImagingOrderModal
        isOpen={showImagingOrder}
        onClose={() => setShowImagingOrder(false)}
        clinicSlug="optometry"
        patientId={patients.selectedPatient?.id}
        patientName={patients.selectedPatient?.fullName}
        onOrderCreated={() => { if (patients.selectedPatient) records.fetchRecords(patients.selectedPatient.id); }}
      />
      <ScheduleFollowUpModal
        open={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        clinicSlug="optometry"
        patientId={patients.selectedPatient?.id}
        patientName={patients.selectedPatient?.fullName}
        onScheduled={() => setShowFollowUpModal(false)}
      />

    </ClinicDashboardShell>
  );
}
