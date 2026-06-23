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
import OpticNerveDiagram from '../../components/anatomical/OpticNerveDiagram';
import { usePatients } from '../../hooks/usePatients';
import { useClinicalRecords } from '../../hooks/useClinicalRecords';
import { useAIDiagnosis } from '../../hooks/useAIDiagnosis';
import { useClinicQueue } from '../../hooks/useClinicQueue';
import { api } from '../../lib/api';

const glaucomaBodyAreas = [
  'Optic Nerve Head', 'Anterior Chamber Angle', 'Trabecular Meshwork',
  'Cornea', 'Iris', 'Lens', 'Retinal Nerve Fiber Layer', 'Macula',
];

const glaucomaSymptomCategories = {
  'Vision': ['Blurred Vision', 'Gradual Vision Loss', 'Sudden Vision Loss', 'Halos Around Lights (Rainbow Rings)'],
  'Visual Field': ['Peripheral Vision Loss', 'Missing Area in Vision (Scotoma)', 'Tunnel Vision', 'Night Vision Difficulty (Nyctalopia)'],
  'Pain': ['Eye Pain (Deep Ache)', 'Brow Ache', 'Headache', 'Pain with Eye Movement', 'Eye Pressure Sensation'],
  'Redness': ['Red Eye (Diffuse Injection)', 'Ciliary Flush (Circumcorneal)', 'Bloodshot Eye'],
  'Other': ['Photophobia (Light Sensitivity)', 'Nausea / Vomiting with Eye Pain', 'Teary / Watery Eye (Epiphora)',
    'Transient Blurring after Exercise', 'Color Desaturation / Faded Colors', 'Difficulty with Contrast'],
};

const onsetOptions = ['Sudden (<24h)', 'Acute (1-7 days)', 'Subacute (1-4 weeks)', 'Slow (>4 weeks)', 'Intermittent'];

const glaucomaExamFields = [
  { id: 'iopOD', label: 'IOP (OD) mmHg', desc: 'Goldmann applanation tonometry; note time of day' },
  { id: 'iopOS', label: 'IOP (OS) mmHg', desc: 'Goldmann applanation tonometry; note time of day' },
  { id: 'cctOD', label: 'CCT (OD) µm', desc: 'Corneal thickness; affects IOP accuracy' },
  { id: 'cctOS', label: 'CCT (OS) µm', desc: 'Corneal thickness; affects IOP accuracy' },
  { id: 'targetIOP', label: 'Target IOP', desc: 'OD and OS; based on baseline IOP, disease stage, progression rate, life expectancy' },
  { id: 'vanHerick', label: 'Van Herick AC Depth', desc: 'Grade I-IV; shallow suggests narrow angle risk' },
  { id: 'gonioscopyOD', label: 'Gonioscopy (OD)', desc: 'Shaffer/Spaeth grade per quadrant; TM pigmentation; PAS extent; NVA; Sampaolesi line' },
  { id: 'gonioscopyOS', label: 'Gonioscopy (OS)', desc: 'Shaffer/Spaeth grade per quadrant; TM pigmentation; PAS extent; NVA; Sampaolesi line' },
  { id: 'cornea', label: 'Cornea / Anterior Segment', desc: 'Krukenberg spindle, corneal edema, keratic precipitates, AC cells/flare, iris (NVI/PEXM/transillumination defects)' },
  { id: 'lens', label: 'Lens Status', desc: 'Phakic/pseudophakic; PEX material (bulls-eye pattern); cataract grade (LOCS III); zonular integrity' },
  { id: 'cdRatioOD', label: 'C/D Ratio (OD)', desc: 'Vertical C/D; rim shape (ISNT rule); notching; excavation; disc hemorrhage location' },
  { id: 'cdRatioOS', label: 'C/D Ratio (OS)', desc: 'Vertical C/D; rim shape (ISNT rule); notching; excavation; disc hemorrhage location' },
  { id: 'opticDisc', label: 'Optic Disc Detailed', desc: 'Disc size (small/medium/large); rim description; PPA (beta-zone); disc hemorrhage (splinter at inferotemporal pole); OCT RNFL + GCIPL correlation' },
  { id: 'rnflOct', label: 'OCT RNFL / GCIPL', desc: 'Average RNFL thickness (µm); quadrant/clock-hour thinning; GCIPL sectoral loss; normative percentile; inter-eye asymmetry; trend analysis over visits' },
  { id: 'visualField', label: 'Visual Field', desc: 'Test type (24-2 SITA Std/Fast, 10-2); MD; PSD; VFI; GHT; reliability; defect pattern (arcuate, nasal step, paracentral, altitudinal, generalized depression); GPA progression analysis' },
  { id: 'octa', label: 'OCT Angiography', desc: 'Peripapillary and macular vessel density (%; sectoral); flow area; OCTA quality score' },
  { id: 'fundusPhoto', label: 'Fundus Photo', desc: 'Stereoscopic disc photo for longitudinal comparison; baseline vs current' },
];

function emptySymptom() {
  return { name: '', bodyArea: '', onset: '', duration: '', severity: 5, description: '' };
}

export default function GlaucomaDashboard() {
  const [showReferral, setShowReferral] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showReferralBtn, setShowReferralBtn] = useState(false);

  const patients = usePatients();
  const records = useClinicalRecords('glaucoma');
  const ai = useAIDiagnosis();

  const handleQueueSelect = useCallback((patient) => {
    patients.selectPatient(patient);
  }, [patients]);

  const queue = useClinicQueue('glaucoma', handleQueueSelect);

  const [vitals, setVitals] = useState({});
  const [symptoms, setSymptoms] = useState([]);
  const [diagnosis, setDiagnosis] = useState('');
  const [diagnosisIcd10, setDiagnosisIcd10] = useState('');
  const [icd10Results, setIcd10Results] = useState([]);
  const [medications, setMedications] = useState([]);
  const [soapNotes, setSoapNotes] = useState({ subjective: '', objective: '', assessment: '', plan: '' });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showIcd10Dropdown, setShowIcd10Dropdown] = useState(false);

  const [selectedSector, setSelectedSector] = useState(null);
  const [findings, setFindings] = useState({});
  const [activeEye, setActiveEye] = useState('OD');
  const [glaucomaExamNotes, setGlaucomaExamNotes] = useState({});

  useEffect(() => {
    records.fetchStats();
  }, []);

  useEffect(() => {
    if (patients.selectedPatient) {
      records.fetchRecords(patients.selectedPatient.id);
      setShowReferralBtn(true);
      ai.reset();
    } else {
      setShowReferralBtn(false);
    }
  }, [patients.selectedPatient]);

  const handleSectorSelect = (sectorId) => {
    setSelectedSector(sectorId);
    setFindings((prev) => {
      const key = `${activeEye}-sector-${sectorId}`;
      return { ...prev, [key]: prev[key] ? null : { noted: true } };
    });
  };

  const handleIcd10Search = useCallback(async (q) => {
    setDiagnosis(q);
    setDiagnosisIcd10('');
    if (q.length < 2) { setIcd10Results([]); setShowIcd10Dropdown(false); return; }
    try {
      const data = await api.get(`/ai/icd10?q=${encodeURIComponent(q)}`);
      setIcd10Results(data || []);
      setShowIcd10Dropdown(true);
    } catch {
      setIcd10Results([]);
    }
  }, []);

  const selectIcd10 = useCallback((code) => {
    setDiagnosis(code.name);
    setDiagnosisIcd10(code.code);
    setShowIcd10Dropdown(false);
    setIcd10Results([]);
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

  const handleExamFieldChange = useCallback((fieldId, value) => {
    setGlaucomaExamNotes((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleAIGetSuggestions = useCallback(() => {
    if (!patients.selectedPatient) return;
    ai.getDiagnosis({
      patientId: patients.selectedPatient.id,
      symptoms: symptoms.filter((s) => s.name.trim()),
      vitals: Object.fromEntries(Object.entries(vitals).filter(([_, v]) => v !== null && v !== '')),
      specialty: 'glaucoma',
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
    setSelectedSector(null);
    setFindings({});
    setGlaucomaExamNotes({});
    setSaveMessage('');
    ai.reset();
  }, [ai]);

  const handleSave = useCallback(async () => {
    if (!patients.selectedPatient) return;
    setSaving(true);
    setSaveMessage('');
    try {
      const examPayload = {};
      for (const f of glaucomaExamFields) {
        if (glaucomaExamNotes[f.id]) examPayload[f.id] = glaucomaExamNotes[f.id];
      }
      const payload = {
        patientId: patients.selectedPatient.id,
        diagnosis: diagnosisIcd10 ? `${diagnosisIcd10} - ${diagnosis}` : diagnosis,
        prescriptions: medications.map((m) => `${m.drugName} ${m.dosage} ${m.frequency} ${m.duration}`).join('; '),
        clinicSpecificJson: {
          icd10Code: diagnosisIcd10,
          glaucomaFindings: findings,
          glaucomaExam: examPayload,
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
      setSaveMessage('Record saved successfully');
    } catch {
      setSaveMessage('Failed to save record');
    } finally {
      setSaving(false);
    }
  }, [patients.selectedPatient, vitals, symptoms, diagnosis, diagnosisIcd10, medications, soapNotes, findings, glaucomaExamNotes, activeEye, records, resetForm]);

  const flatSymptomOptions = Object.values(glaucomaSymptomCategories).flat();

  return (
    <ClinicDashboardShell
      title="Glaucoma Clinic"
      subtitle="Glaucoma Evaluation & Management with AI-Assisted Diagnosis"
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
                  {patients.selectedPatient.gender && ` \u00B7 ${patients.selectedPatient.gender}`}
                  {patients.selectedPatient.dateOfBirth && ` \u00B7 ${new Date(patients.selectedPatient.dateOfBirth).toLocaleDateString()}`}
                  {patients.selectedPatient.phone && ` \u00B7 ${patients.selectedPatient.phone}`}
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
                      <button onClick={() => removeSymptom(idx)} className="text-red-400 hover:text-red-600 text-caption touch-target">Remove</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-medium text-graphite block mb-1">Symptom</label>
                        <select value={symp.name} onChange={(e) => updateSymptom(idx, 'name', e.target.value)}
                          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                          <option value="">Select glaucoma symptom...</option>
                          {flatSymptomOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <select value={symp.bodyArea} onChange={(e) => updateSymptom(idx, 'bodyArea', e.target.value)}
                        className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                        <option value="">Anatomical Area</option>
                        {glaucomaBodyAreas.map((b) => <option key={b} value={b}>{b}</option>)}
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
                    <Input label="Description" placeholder="OD/OS/OU, quality, pattern, aggravating/relieving factors, precipitating events..." value={symp.description} onChange={(e) => updateSymptom(idx, 'description', e.target.value)} />
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
            <ClinicSection title="Optic Nerve Head Diagram">
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
              <OpticNerveDiagram
                side={activeEye}
                onSectorSelect={handleSectorSelect}
                selectedSector={selectedSector}
                findings={findings}
              />
              {selectedSector && (
                <div className="mt-3 p-3 bg-lilac-bloom/10 rounded-lg">
                  <p className="text-sm font-medium text-graphite">{activeEye === 'OD' ? 'Right' : 'Left'} Eye — Sector {selectedSector} o'clock Selected</p>
                  <p className="text-caption text-slate">Marked on optic nerve head diagram. Document specific findings and RNFL thinning in examination fields below.</p>
                </div>
              )}
            </ClinicSection>

            <div className="space-y-6">
              <ClinicSection title="Glaucoma Examination Findings">
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {glaucomaExamFields.map((f) => (
                    <div key={f.id} className="bg-bone rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-graphite">{f.label}</span>
                        <span className="text-caption text-slate">{f.desc}</span>
                      </div>
                      <textarea
                        value={glaucomaExamNotes[f.id] || ''}
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
              <PrescriptionWriter medications={medications} onChange={setMedications} clinicSlug="glaucoma" />
            </ClinicSection>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-6">
            <ClinicSection title="SOAP Notes">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Subjective</label>
                  <textarea value={soapNotes.subjective} onChange={(e) => setSoapNotes({ ...soapNotes, subjective: e.target.value })}
                    placeholder="Chief complaint, onset (sudden/gradual), laterality (OD/OS/OU), eye pain/halos/headache/blurred vision/VF loss, PMH (DM/HTN/steroid use/ocular history/family history of glaucoma)..."
                    className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Objective</label>
                  <textarea value={soapNotes.objective} onChange={(e) => setSoapNotes({ ...soapNotes, objective: e.target.value })}
                    placeholder="Best-corrected VA (OD/OS), IOP (time, method), CCT, slit lamp exam (cornea, AC depth, iris, lens), gonioscopy (Shaffer grade per quadrant, TM pigmentation, PAS, NVA), dilated fundus exam (C/D ratio, rim, ISNT rule, disc hemorrhage, PPA), OCT RNFL/GCIPL (average thickness, normative comparison, trend), VF (MD, PSD, VFI, GHT, reliability) ..."
                    className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Assessment</label>
                  <textarea value={soapNotes.assessment} onChange={(e) => setSoapNotes({ ...soapNotes, assessment: e.target.value })}
                    placeholder="Glaucoma type with laterality (OD/OS/OU), stage (mild/moderate/severe/indeterminate), activity/progression status, structural-functional correlation, rate of progression (MD slope, RNFL slope), target IOP, differential considerations, comparison to prior visits..."
                    className="w-full h-24 px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none" />
                </div>
                <div>
                  <label className="text-sm font-medium text-graphite block mb-1">Plan</label>
                  <textarea value={soapNotes.plan} onChange={(e) => setSoapNotes({ ...soapNotes, plan: e.target.value })}
                    placeholder="Medical therapy changes (PGA/beta-blocker/CAI/alpha-agonist/Rho-kinase inhibitor), laser (SLT/ALT/LPI/CPC), surgical plan (trabeculectomy/GDD/MIGS), follow-up interval (stable: 6-12mo / moderate: 4-6mo / advanced: 1-3mo), tests ordered (OCT/VF/gonioscopy/imaging), referrals (low vision/neuro-ophthalmology), patient education on adherence and self-monitoring..."
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
          </div>

          {records.records.length > 0 && (
            <ClinicSection title="Patient History" className="mb-6">
              <Table
                columns={[
                  { key: 'date', label: 'Date', render: (r) => new Date(r.encounterDate).toLocaleDateString() },
                  { key: 'diagnosis', label: 'Diagnosis', render: (r) => r.diagnosis ? <Badge variant="warning">{r.diagnosis}</Badge> : '-' },
                  { key: 'medications', label: 'Treatment', render: (r) => r.medications?.length ? r.medications.map(m => m.drugName).join(', ') : r.prescriptions || '-' },
                  { key: 'findings', label: 'IOP', render: (r) => {
                    const json = r.clinicSpecificJson;
                    if (!json?.glaucomaExam) return '-';
                    const iop = [];
                    if (json.glaucomaExam.iopOD) iop.push(`OD:${json.glaucomaExam.iopOD}`);
                    if (json.glaucomaExam.iopOS) iop.push(`OS:${json.glaucomaExam.iopOS}`);
                    return iop.length ? iop.join(' ') : '-';
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
          <StatCard label="Glaucoma Patients" value={records.stats.totalPatients} variant="highlight" />
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
        fromClinicId="glaucoma"
      />

      {saveMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all duration-300"
             style={{ backgroundColor: saveMessage.includes('success') ? '#d1fae5' : '#fee2e2', color: saveMessage.includes('success') ? '#065f46' : '#991b1b' }}>
          {saveMessage}
        </div>
      )}
    </ClinicDashboardShell>
  );
}
