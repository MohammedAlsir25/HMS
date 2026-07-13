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
import SymptomTagInput from '../../components/clinic/SymptomTagInput';
import SYMPTOMS from '../../data/symptoms';
import { usePatients } from '../../hooks/usePatients';
import { useClinicalRecords } from '../../hooks/useClinicalRecords';
import { useAIDiagnosis, useIcd10Search } from '../../hooks/useAIDiagnosis';
import { useClinicQueue } from '../../hooks/useClinicQueue';
import { Printer, RotateCcw } from 'lucide-react';
import ScheduleFollowUpModal from './ScheduleFollowUpModal';
import UpcomingFollowUpsSection from './UpcomingFollowUpsSection';

const bodyAreas = ['Optic Nerve', 'Macula', 'Retina', 'Cornea', 'Lens', 'Anterior Chamber', 'Eyelid', 'Orbit', 'Generalized'];
const onsetOptions = ['Sudden', 'Acute (<1 week)', 'Subacute (1-4 weeks)', 'Chronic (>4 weeks)'];

const growthMilestones = [
  { age: '6mo', weight: '7.5kg', height: '66cm', vision: 'Fixes & follows' },
  { age: '12mo', weight: '9.2kg', height: '74cm', vision: 'Interest in pictures' },
  { age: '24mo', weight: '11.8kg', height: '86cm', vision: 'Recognizes familiar people' },
  { age: '36mo', weight: '14.5kg', height: '95cm', vision: '20/40 acuity' },
];

export default function PedsOphthDashboard() {
  const [showReferral, setShowReferral] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showReferralBtn, setShowReferralBtn] = useState(false);
const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  const patients = usePatients({ clinicSlug: 'pediatrics-ophth' });
  const records = useClinicalRecords('pediatrics-ophth');
  const ai = useAIDiagnosis();

  const handleQueueSelect = useCallback((patient) => {
    patients.selectPatient(patient);
  }, [patients]);

  const queue = useClinicQueue('pediatrics-ophth', handleQueueSelect);

  const [vitals, setVitals] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisIcd10, setDiagnosisIcd10] = useState('');
  const [medications, setMedications] = useState([]);
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [saving, setSaving] = useState(false);
  const [showIcd10Dropdown, setShowIcd10Dropdown] = useState(false);

  const { data: icd10Results = [] } = useIcd10Search(diagnosis);

  const [selectedAge, setSelectedAge] = useState(null);
  const [strabismus, setStrabismus] = useState({
    coverTest: '', prismCoverTest: '', nearDeviation: '', distanceDeviation: '', avPattern: '', binocularity: '',
  });
  const [retinaTest, setRetinaTest] = useState({
    odMedia: '', odDisc: '', odCDRatio: '', odMacula: '', odVessels: '', odPeriphery: '',
    osMedia: '', osDisc: '', osCDRatio: '', osMacula: '', osVessels: '', osPeriphery: '',
  });

  useEffect(() => {
    if (patients.selectedPatient) {
      records.fetchRecords(patients.selectedPatient.id);
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
      specialty: 'pediatrics-ophth',
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
          route: 'topical',
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
    setSelectedAge(null);
    setStrabismus({ coverTest: '', prismCoverTest: '', nearDeviation: '', distanceDeviation: '', avPattern: '', binocularity: '' });
    setRetinaTest({ odMedia: '', odDisc: '', odCDRatio: '', odMacula: '', odVessels: '', odPeriphery: '', osMedia: '', osDisc: '', osCDRatio: '', osMacula: '', osVessels: '', osPeriphery: '' });
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
        clinicSpecificJson: {
          icd10Code: diagnosisIcd10,
          selectedMilestone: selectedAge,
          strabismus,
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
  }, [patients.selectedPatient, vitals, symptoms, diagnosis, diagnosisIcd10, medications, soapNotes, selectedAge, strabismus, records, resetForm]);

  return (
    <ClinicDashboardShell
      title="Pediatrics Ophthalmology"
      subtitle="Child Development & Strabismus Assessment with AI-Assisted Diagnosis"
      historyPanel={<ClinicHistoryPanel clinicSlug="pediatrics-ophth" />}
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
            <ClinicSection title="Growth & Development">
              <div className="space-y-2">
                {growthMilestones.map((m) => (
                  <div
                    key={m.age}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors touch-target
                      ${selectedAge === m.age ? 'bg-lilac-bloom/10 border border-lilac-bloom' : 'bg-bone'}`}
                    onClick={() => setSelectedAge(m.age === selectedAge ? null : m.age)}
                  >
                    <span className="text-body font-medium text-obsidian">{m.age}</span>
                    <span className="text-caption text-graphite">{m.weight} · {m.height}</span>
                    <span className="text-caption text-slate">{m.vision}</span>
                  </div>
                ))}
                {selectedAge && (
                  <div className="mt-3 p-3 bg-lilac-bloom/10 rounded-lg">
                    <p className="text-sm font-medium text-graphite">Selected milestone: {selectedAge}</p>
                    <p className="text-caption text-slate">Milestone will be included in the clinical record.</p>
                  </div>
                )}
              </div>
            </ClinicSection>

            <ClinicSection title="Strabismus Assessment">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Cover Test" placeholder="Orthophoric / ET / XT" value={strabismus.coverTest} onChange={(e) => setStrabismus((p) => ({ ...p, coverTest: e.target.value }))} />
                <Input label="Prism Cover Test" placeholder="Δ" value={strabismus.prismCoverTest} onChange={(e) => setStrabismus((p) => ({ ...p, prismCoverTest: e.target.value }))} />
                <Input label="Near Deviation" placeholder="Prism diopters" value={strabismus.nearDeviation} onChange={(e) => setStrabismus((p) => ({ ...p, nearDeviation: e.target.value }))} />
                <Input label="Distance Deviation" placeholder="Prism diopters" value={strabismus.distanceDeviation} onChange={(e) => setStrabismus((p) => ({ ...p, distanceDeviation: e.target.value }))} />
                <Input label="A-V Pattern" placeholder="None / A / V" value={strabismus.avPattern} onChange={(e) => setStrabismus((p) => ({ ...p, avPattern: e.target.value }))} />
                <Input label="Binocularity" placeholder="Worth 4-dot / Titmus" value={strabismus.binocularity} onChange={(e) => setStrabismus((p) => ({ ...p, binocularity: e.target.value }))} />
              </div>
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
              <PrescriptionWriter medications={medications} onChange={setMedications} clinicSlug="pediatrics-ophth" />
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

          <div className="grid grid-cols-1 gap-6 mb-6">
            <ClinicSection title="SOAP Notes">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Subjective</label>
                  <textarea value={soapNotes.subjective} onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                    placeholder="Chief complaint (parent report), birth history, developmental milestones, school performance, previous treatments..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Objective</label>
                  <textarea value={soapNotes.objective} onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                    placeholder="VA (age-appropriate method), cycloplegic refraction, cover test, ocular motility, alignment, binocularity assessment..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Assessment</label>
                  <textarea value={soapNotes.assessment} onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                    placeholder="Diagnosis, amblyopia risk, binocular potential, developmental impact..."
                    className="w-full h-36 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Plan</label>
                  <textarea value={soapNotes.plan} onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                    placeholder="Treatment plan (glasses/patching/surgery), follow-up interval, orthoptic exercises, school accommodations..."
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
                  { key: 'medications', label: 'Rx', render: (r) => r.medications?.length ? r.medications.map(m => m.drugName).join(', ') : r.prescriptions || '-' },
                  { key: 'findings', label: 'Strabismus', render: (r) => {
                    const json = r.clinicSpecificJson;
                    if (!json?.strabismus?.coverTest) return '-';
                    return json.strabismus.coverTest;
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
          <UpcomingFollowUpsSection clinicSlug="pediatrics-ophth" />
          {records.stats && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total Patients" value={records.stats.totalPatients} />
              <StatCard label="Today's Appointments" value={records.stats.todayAppointments} />
              <StatCard label="Today's Records" value={records.stats.todayRecords} />
              <StatCard label="Pediatric Patients" value={records.stats.totalPatients} variant="highlight" />
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
        fromClinicId="pediatrics-ophth"
      />

      <ScheduleFollowUpModal
        open={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        clinicSlug="pediatrics-ophth"
        patientId={patients.selectedPatient?.id}
        patientName={patients.selectedPatient?.fullName}
        onScheduled={() => setShowFollowUpModal(false)}
      />

    </ClinicDashboardShell>
  );
}
