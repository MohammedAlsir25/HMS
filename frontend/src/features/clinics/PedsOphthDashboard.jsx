import { useState, useEffect, useCallback } from 'react';
import CrossReferralModal from '../referral/CrossReferralModal';
import ClinicDashboardShell, { ClinicSection, StatCard } from '../../components/clinic/ClinicDashboardShell';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import PatientSearchBar from '../../components/clinic/PatientSearchBar';
import VitalSignsInput from '../../components/clinic/VitalSignsInput';
import AIDiagnosisPanel from '../../components/clinic/AIDiagnosisPanel';
import PrescriptionWriter from '../../components/clinic/PrescriptionWriter';
import ClinicQueuePanel from '../../components/clinic/ClinicQueuePanel';
import EncounterSummary from '../../components/clinic/EncounterSummary';
import { usePatients } from '../../hooks/usePatients';
import { useClinicalRecords } from '../../hooks/useClinicalRecords';
import { useAIDiagnosis, useIcd10Search } from '../../hooks/useAIDiagnosis';
import { useClinicQueue } from '../../hooks/useClinicQueue';

const bodyAreas = ['Optic Nerve', 'Macula', 'Retina', 'Cornea', 'Lens', 'Anterior Chamber', 'Eyelid', 'Orbit', 'Generalized'];
const onsetOptions = ['Sudden', 'Acute (<1 week)', 'Subacute (1-4 weeks)', 'Chronic (>4 weeks)'];

function emptySymptom() {
  return { name: '', bodyArea: '', onset: '', duration: '', severity: 5, description: '' };
}

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

  const patients = usePatients();
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
  const [saveMessage, setSaveMessage] = useState('');
  const [showIcd10Dropdown, setShowIcd10Dropdown] = useState(false);

  const { data: icd10Results = [] } = useIcd10Search(diagnosis);

  const [selectedAge, setSelectedAge] = useState(null);
  const [strabismus, setStrabismus] = useState({
    coverTest: '', prismCoverTest: '', nearDeviation: '', distanceDeviation: '', avPattern: '', binocularity: '',
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

  const addSymptom = useCallback(() => {
    setSymptoms([...symptoms, emptySymptom()]);
  }, [symptoms]);

  const updateSymptom = useCallback((idx, field, value) => {
    setSymptoms(symptoms.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }, [symptoms]);

  const removeSymptom = useCallback((idx) => {
    setSymptoms(symptoms.filter((_, i) => i !== idx));
  }, [symptoms]);

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
    setSaveMessage('');
    ai.reset();
  }, [ai]);

  const handleSave = useCallback(async () => {
    if (!patients.selectedPatient) return;
    setSaving(true);
    setSaveMessage('');
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
      setSaveMessage('Record saved successfully');
    } catch {
      setSaveMessage('Failed to save record');
    } finally {
      setSaving(false);
    }
  }, [patients.selectedPatient, vitals, symptoms, diagnosis, diagnosisIcd10, medications, soapNotes, selectedAge, strabismus, records, resetForm]);

  return (
    <ClinicDashboardShell
      title="Pediatrics Ophthalmology"
      subtitle="Child Development & Strabismus Assessment with AI-Assisted Diagnosis"
      actionButtons={
        showReferralBtn && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSummary(true)}>
              Print Summary
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowReferral(true)}>
              Refer Patient
            </Button>
          </div>
        )
      }
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
              <div className="space-y-3">
                {symptoms.map((symp, idx) => (
                  <div key={idx} className="bg-bone rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-caption font-medium text-graphite">Symptom #{idx + 1}</span>
                      <button onClick={() => removeSymptom(idx)} className="text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-400 text-caption touch-target">Remove</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input label="Symptom" placeholder="e.g. Crossed Eyes" value={symp.name} onChange={(e) => updateSymptom(idx, 'name', e.target.value)} />
                      <select value={symp.bodyArea} onChange={(e) => updateSymptom(idx, 'bodyArea', e.target.value)}
                        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                        <option value="">Body Area</option>
                        {bodyAreas.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <select value={symp.onset} onChange={(e) => updateSymptom(idx, 'onset', e.target.value)}
                        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                        <option value="">Onset</option>
                        {onsetOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <Input label="Duration" placeholder="e.g. 3 days" value={symp.duration} onChange={(e) => updateSymptom(idx, 'duration', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-graphite block mb-1">Severity: {symp.severity}/10</label>
                      <input type="range" min="1" max="10" value={symp.severity} onChange={(e) => updateSymptom(idx, 'severity', parseInt(e.target.value))}
                        className="w-full accent-lilac-bloom" />
                    </div>
                    <Input label="Description" placeholder="Additional details..." value={symp.description} onChange={(e) => updateSymptom(idx, 'description', e.target.value)} />
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={addSymptom}>
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="mr-1">
                    <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Add Symptom
                </Button>
              </div>
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
            <ClinicSection title="SOAP Notes">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Subjective</label>
                  <textarea value={soapNotes.subjective} onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                    placeholder="Chief complaint (parent report), birth history, developmental milestones, school performance, previous treatments..."
                    className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Objective</label>
                  <textarea value={soapNotes.objective} onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                    placeholder="VA (age-appropriate method), cycloplegic refraction, cover test, ocular motility, alignment, binocularity assessment..."
                    className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Assessment</label>
                  <textarea value={soapNotes.assessment} onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                    placeholder="Diagnosis, amblyopia risk, binocular potential, developmental impact..."
                    className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Plan</label>
                  <textarea value={soapNotes.plan} onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                    placeholder="Treatment plan (glasses/patching/surgery), follow-up interval, orthoptic exercises, school accommodations..."
                    className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
              </div>
            </ClinicSection>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Clinical Record'}
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Reset
            </Button>
            {showReferralBtn && (
              <Button variant="secondary" onClick={() => setShowReferral(true)}>
                Refer Patient
              </Button>
            )}
            {saveMessage && (
              <span className={`text-sm font-medium ${saveMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                {saveMessage}
              </span>
            )}
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

      {!patients.selectedPatient && records.stats && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Patients" value={records.stats.totalPatients} />
          <StatCard label="Today's Appointments" value={records.stats.todayAppointments} />
          <StatCard label="Today's Records" value={records.stats.todayRecords} />
          <StatCard label="Pediatric Patients" value={records.stats.totalPatients} variant="highlight" />
        </div>
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

      {saveMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all duration-300 ${saveMessage.includes('success') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
          {saveMessage}
        </div>
      )}
    </ClinicDashboardShell>
  );
}
