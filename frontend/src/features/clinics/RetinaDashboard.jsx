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
import PrescriptionWriter from '../../components/clinic/PrescriptionWriter';
import ClinicQueuePanel from '../../components/clinic/ClinicQueuePanel';
import EncounterSummary from '../../components/clinic/EncounterSummary';
import EyeDiagram from '../../components/anatomical/EyeDiagram';
import SymptomTagInput from '../../components/clinic/SymptomTagInput';
import SYMPTOMS from '../../data/symptoms';
import { usePatients } from '../../hooks/usePatients';
import { useClinicalRecords } from '../../hooks/useClinicalRecords';
import { useAIDiagnosis, useIcd10Search } from '../../hooks/useAIDiagnosis';
import { useClinicQueue } from '../../hooks/useClinicQueue';
import { Printer, RotateCcw } from 'lucide-react';
import ScheduleFollowUpModal from './ScheduleFollowUpModal';
import UpcomingFollowUpsSection from './UpcomingFollowUpsSection';

const retinaBodyAreas = [
  'Macula', 'Optic Disc', 'Retinal Vessels', 'Peripheral Retina',
  'Vitreous', 'Choroid', 'Anterior Segment', 'Posterior Pole',
];

const onsetOptions = ['Sudden (<24h)', 'Acute (1-7 days)', 'Subacute (1-4 weeks)', 'Slow (>4 weeks)', 'Intermittent'];

const retinaExamFields = [
  { id: 'visualAcuityOD', label: 'VA (OD)', desc: 'Far and near, with/without pinhole' },
  { id: 'visualAcuityOS', label: 'VA (OS)', desc: 'Far and near, with/without pinhole' },
  { id: 'iopOD', label: 'IOP (OD) mmHg', desc: 'Goldmann applanation tonometry' },
  { id: 'iopOS', label: 'IOP (OS) mmHg', desc: 'Goldmann applanation tonometry' },
  { id: 'pupils', label: 'Pupils', desc: 'RAPD, size, shape, reactions' },
  { id: 'anteriorSegment', label: 'Anterior Segment', desc: 'Cornea, AC (cells/flare), lens status (phakic/pseudophakic), iris' },
  { id: 'vitreous', label: 'Vitreous', desc: 'Cells, haze (1-4+), hemorrhage, syneresis, PVD (complete/partial), asteroid hyalosis' },
  { id: 'opticDisc', label: 'Optic Disc', desc: 'C/D ratio, rim (ISNT rule), color, cupping, drusen, edema, atrophy, pallor' },
  { id: 'macula', label: 'Macula', desc: 'Drusen (hard/soft/confluent), RPE changes, geographic atrophy, CNV, hemorrhage, exudates, ERM, hole (stage), edema, scar, foveal reflex' },
  { id: 'vessels', label: 'Retinal Vessels', desc: 'AV ratio, tortuosity, sheathing, caliber changes, neovascularization (NVD/NVE), venous beading, microaneurysms, IRMA' },
  { id: 'periphery', label: 'Peripheral Retina', desc: 'Lattice degeneration, holes, tears, detachment (extent in clock hours), retinoschisis, ROP changes' },
  { id: 'oct', label: 'OCT Findings', desc: 'CST/CRT (um), RPE morphology, SRF, IRF, sub-RPE fluid, PED, choroidal thickness, vitreomacular interface, ellipsoid zone integrity' },
  { id: 'fa', label: 'FA / ICGA Findings', desc: 'Early/late phase, filling delays, leakage (focal/diffuse), pooling, staining, window defects, CNV type (1/2/PCV), capillary non-perfusion areas, disc leakage' },
  { id: 'visualField', label: 'Visual Field', desc: 'Mean deviation, pattern deviation, reliability indices, defect pattern (arcuate, altitudinal, central, peripheral)' },
];

export default function RetinaDashboard() {
  const [showReferral, setShowReferral] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showReferralBtn, setShowReferralBtn] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const patients = usePatients({ clinicSlug: 'retina' });
  const records = useClinicalRecords('retina');
  const ai = useAIDiagnosis();

  const handleQueueSelect = useCallback((patient) => {
    patients.selectPatient(patient);
  }, [patients]);

  const queue = useClinicQueue('retina', handleQueueSelect);

  const [vitals, setVitals] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisIcd10, setDiagnosisIcd10] = useState('');
  const [medications, setMedications] = useState([]);
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [saving, setSaving] = useState(false);
  const [showIcd10Dropdown, setShowIcd10Dropdown] = useState(false);

  const { data: icd10Results = [] } = useIcd10Search(diagnosis);

  const [selectedRegion, setSelectedRegion] = useState(null);
  const [findings, setFindings] = useState({});
  const [activeEye, setActiveEye] = useState('OD');
  const [retinaExamNotes, setRetinaExamNotes] = useState({});

  useEffect(() => {
    if (patients.selectedPatient) {
      records.fetchRecords(patients.selectedPatient.id);
      setShowReferralBtn(true);
      ai.reset();
    } else {
      setShowReferralBtn(false);
    }
  }, [patients.selectedPatient]);

  const handleRegionSelect = (regionId) => {
    setSelectedRegion(regionId);
    setFindings((prev) => {
      const key = `${activeEye}-${regionId}`;
      return { ...prev, [key]: prev[key] ? null : { noted: true } };
    });
  };

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

  const handleExamFieldChange = useCallback((fieldId, value) => {
    setRetinaExamNotes((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleAIGetSuggestions = useCallback(() => {
    if (!patients.selectedPatient) return;
    ai.getDiagnosis({
      patientId: patients.selectedPatient.id,
      symptoms: symptoms.filter((s) => s.name.trim()),
      vitals: Object.fromEntries(Object.entries(vitals).filter(([_, v]) => v !== null && v !== '')),
      specialty: 'retina',
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
    setSelectedRegion(null);
    setFindings({});
    setRetinaExamNotes({});
    ai.reset();
  }, [ai]);

  const handleSave = useCallback(async () => {
    if (!patients.selectedPatient) return;
    setSaving(true);
    try {
      const examPayload = {};
      for (const f of retinaExamFields) {
        if (retinaExamNotes[f.id]) examPayload[f.id] = retinaExamNotes[f.id];
      }
      const payload = {
        patientId: patients.selectedPatient.id,
        diagnosis: diagnosisIcd10 ? `${diagnosisIcd10} - ${diagnosis}` : diagnosis,
        prescriptions: medications.map((m) => `${m.drugName} ${m.dosage} ${m.frequency} ${m.duration}`).join('; '),
        clinicSpecificJson: {
          icd10Code: diagnosisIcd10,
          retinalFindings: findings,
          retinalExam: examPayload,
          activeEye: activeEye,
        },
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
  }, [patients.selectedPatient, vitals, symptoms, diagnosis, diagnosisIcd10, medications, soapNotes, findings, retinaExamNotes, activeEye, records, resetForm]);


  return (
    <ClinicDashboardShell
      title="Retina Clinic"
      subtitle="Fundus & Retinal Examination with AI-Assisted Diagnosis"
      historyPanel={<ClinicHistoryPanel clinicSlug="retina" />}
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
                bodyAreaOptions={retinaBodyAreas}
                onsetOptions={onsetOptions}
              />
            </ClinicSection>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ClinicSection title="Retinal Fundus Map">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setActiveEye('OD')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
                    ${activeEye === 'OD' ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite'}`}
                >
                  Right Eye (OD)
                </button>
                <button
                  onClick={() => setActiveEye('OS')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
                    ${activeEye === 'OS' ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite'}`}
                >
                  Left Eye (OS)
                </button>
              </div>
              <EyeDiagram
                side={activeEye}
                onRegionSelect={handleRegionSelect}
                selectedRegion={selectedRegion}
                findings={findings}
              />
              {selectedRegion && (
                <div className="mt-3 p-3 bg-lilac-bloom/10 rounded-lg">
                  <p className="text-sm font-medium text-graphite">{activeEye === 'OD' ? 'Right' : 'Left'} Eye — {selectedRegion.charAt(0).toUpperCase() + selectedRegion.slice(1)} Selected</p>
                  <p className="text-caption text-slate">Region marked on the fundus map. Document specific findings in the examination fields below.</p>
                </div>
              )}
            </ClinicSection>

            <div className="space-y-6">
              <ClinicSection title="Retinal Examination Findings">
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {retinaExamFields.map((f) => (
                    <div key={f.id} className="bg-bone rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-graphite">{f.label}</span>
                        <span className="text-caption text-slate">{f.desc}</span>
                      </div>
                      <textarea
                        value={retinaExamNotes[f.id] || ''}
                        onChange={(e) => handleExamFieldChange(f.id, e.target.value)}
                        placeholder={`Findings for ${f.label}...`}
                        className="w-full h-16 px-3 py-2 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none text-sm"
                      />
                    </div>
                  ))}
                </div>
              </ClinicSection>
            </div>
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
                    onGetSuggestions={handleAIGetSuggestions}
                    onApplyDiagnosis={handleApplyDiagnosis}
                    onApplyAll={handleApplyAll}
                    error={ai.error}
                    disabled={!patients.selectedPatient}
                  />
                </div>
              </div>
            </ClinicSection>

            <ClinicSection title="Prescriptions">
              <PrescriptionWriter medications={medications} onChange={setMedications} clinicSlug="retina" />
            </ClinicSection>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-6">
            <ClinicSection title="SOAP Notes">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Subjective</label>
                  <textarea value={soapNotes.subjective} onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                    placeholder="Chief complaint, onset (sudden/gradual), duration, laterality (OD/OS/OU), aggravating/relieving factors, PMH (DM, HTN, ocular history)..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Objective</label>
                  <textarea value={soapNotes.objective} onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                    placeholder="VA (OD/OS), IOP, pupils, anterior segment, dilated fundus exam findings, OCT metrics (CST/CRT), FA findings..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Assessment</label>
                  <textarea value={soapNotes.assessment} onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                    placeholder="Diagnosis with laterality (OD/OS/OU), stage/severity, activity status, correlation with imaging findings, differential considerations..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Plan</label>
                  <textarea value={soapNotes.plan} onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                    placeholder="Treatment (anti-VEGF, laser, surgery, systemic), follow-up interval, diagnostic tests ordered (OCT, FA, ICGA), referrals, patient education..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
              </div>
            </ClinicSection>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Save Clinical Record
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

          {records.records.length > 0 && (
            <ClinicSection title="Patient History" className="mb-6">
              <Table
                columns={[
                  { key: 'date', label: 'Date', render: (r) => new Date(r.encounterDate).toLocaleDateString() },
                  { key: 'diagnosis', label: 'Diagnosis', render: (r) => r.diagnosis ? <Badge variant="warning">{r.diagnosis}</Badge> : '-' },
                  { key: 'medications', label: 'Treatment', render: (r) => r.medications?.length ? r.medications.map(m => m.drugName).join(', ') : r.prescriptions || '-' },
                  { key: 'findings', label: 'VA', render: (r) => {
                    const json = r.clinicSpecificJson;
                    if (!json?.retinalExam) return '-';
                    const va = [];
                    if (json.retinalExam.visualAcuityOD) va.push(`OD:${json.retinalExam.visualAcuityOD}`);
                    if (json.retinalExam.visualAcuityOS) va.push(`OS:${json.retinalExam.visualAcuityOS}`);
                    return va.length ? va.join(' ') : '-';
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
          <UpcomingFollowUpsSection clinicSlug="retina" />
          {records.stats && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Patients" value={records.stats.totalPatients} />
              <StatCard label="Today's Appointments" value={records.stats.todayAppointments} />
              <StatCard label="Today's Records" value={records.stats.todayRecords} />
              <StatCard label="Retina Patients" value={records.stats.totalPatients} variant="highlight" />
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
        fromClinicId="retina"
      />
      <ScheduleFollowUpModal
        open={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        clinicSlug="retina"
        patientId={patients.selectedPatient?.id}
        patientName={patients.selectedPatient?.fullName}
        onScheduled={() => setShowFollowUpModal(false)}
      />
    </ClinicDashboardShell>
  );
}
