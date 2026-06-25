// @ts-nocheck
import { config } from '../../config/index.js';

export async function getAIDiagnosis({ symptoms, vitals, patient, specialty }) {
  const key = config.gemini.apiKey;
  if (!key) return mockDiagnosis({ symptoms, vitals, patient, specialty });

  const prompt = buildPrompt({ symptoms, vitals, patient, specialty });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.gemini.model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }],
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error:', res.status, errText);
      return mockDiagnosis({ symptoms, vitals, patient });
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseAIResponse(text);
  } catch (err) {
    console.error('AI service error:', err);
    return mockDiagnosis({ symptoms, vitals, patient });
  }
}

function buildPrompt({ symptoms, vitals, patient, specialty }) {
  const base = config.gemini.specialtyPrompts?.[specialty] || config.gemini.promptTemplate;
  const parts = [base, '\n\n## Patient Data\n'];

  if (patient) {
    parts.push(`- Age: ${patient.age || 'Unknown'}, Gender: ${patient.gender || 'Unknown'}`);
    if (patient.chronicConditions?.length) {
      parts.push(`- Chronic conditions: ${patient.chronicConditions.join(', ')}`);
    }
    if (patient.diabetesType && patient.diabetesType !== 'NONE') {
      parts.push(`- Diabetes: ${patient.diabetesType}`);
    }
  }

  if (vitals) {
    parts.push('\n## Vital Signs');
    const v = [];
    if (vitals.bloodPressureSystolic) v.push(`BP: ${vitals.bloodPressureSystolic}/${vitals.bloodPressureDiastolic || '?'}`);
    if (vitals.heartRate) v.push(`HR: ${vitals.heartRate} bpm`);
    if (vitals.temperature) v.push(`Temp: ${vitals.temperature}°C`);
    if (vitals.spo2) v.push(`SpO2: ${vitals.spo2}%`);
    if (vitals.bloodGlucose) v.push(`BG: ${vitals.bloodGlucose} mg/dL`);
    if (vitals.weight) v.push(`Weight: ${vitals.weight} kg`);
    parts.push(v.join(', '));
  }

  if (symptoms?.length) {
    parts.push('\n## Symptoms');
    for (const s of symptoms) {
      parts.push(`- ${s.name}${s.bodyArea ? ` (${s.bodyArea})` : ''}${s.severity ? ` severity: ${s.severity}/10` : ''}${s.onset ? ` onset: ${s.onset}` : ''}${s.duration ? ` duration: ${s.duration}` : ''}`);
    }
  }

  return parts.join('\n');
}

function parseAIResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // fall through
    }
  }
  return null;
}

function mockDiagnosis({ symptoms, vitals, patient, specialty }) {
  if (specialty === 'ent') return mockENTDiagnosis({ symptoms, vitals, patient });
  if (specialty === 'dental') return mockDentalDiagnosis({ symptoms, vitals, patient });
  if (specialty === 'retina') return mockRetinaDiagnosis({ symptoms, vitals, patient });
  if (specialty === 'glaucoma') return mockGlaucomaDiagnosis({ symptoms, vitals, patient });

  const suggestions = [];
  const tests = ['Complete Blood Count (CBC)', 'Basic Metabolic Panel', 'Urinalysis'];
  const treatments = [];

  const hasFever = symptoms?.some(s => /fever/i.test(s.name));
  const hasCough = symptoms?.some(s => /cough/i.test(s.name));
  const hasChestPain = symptoms?.some(s => /chest/i.test(s.name) || /pain.*chest/i.test(s.name));
  const hasSOB = symptoms?.some(s => /shortness|breath/i.test(s.name) || /sob/i.test(s.name));
  const hasHeadache = symptoms?.some(s => /headache|head/i.test(s.name));
  const hasFatigue = symptoms?.some(s => /fatigue|tired/i.test(s.name));
  const hasAbdPain = symptoms?.some(s => /abdominal|stomach|belly/i.test(s.name));
  const hasNausea = symptoms?.some(s => /nausea|vomit/i.test(s.name));
  const hasDizziness = symptoms?.some(s => /dizziness|dizzy|vertigo/i.test(s.name));

  const highBP = vitals?.bloodPressureSystolic >= 140;
  const highBG = vitals?.bloodGlucose >= 126;
  const lowSpO2 = vitals?.spo2 <= 94;
  const highHR = vitals?.heartRate >= 100;
  const highTemp = vitals?.temperature >= 38;

  if (hasFever && hasCough) {
    suggestions.push({ name: 'Upper Respiratory Tract Infection', confidence: 75, icd10: 'J06.9', rationale: 'Fever and cough are classic signs of URTI.' });
    suggestions.push({ name: 'Acute Bronchitis', confidence: 55, icd10: 'J20.9', rationale: 'Persistent cough with fever may indicate bronchitis.' });
    if (lowSpO2) suggestions.push({ name: 'Pneumonia', confidence: 60, icd10: 'J15.9', rationale: 'Fever, cough with low SpO2 suggests possible pneumonia.' });
    tests.push('Chest X-Ray', 'CRP', 'Influenza/PCR');
  }

  if (hasChestPain) {
    suggestions.push({ name: 'Gastroesophageal Reflux Disease', confidence: 60, icd10: 'K21.9', rationale: 'Chest pain without cardiac history commonly GERD.' });
    if (patient?.chronicConditions?.some(c => /hyper|heart/i.test(c))) {
      suggestions.push({ name: 'Angina Pectoris', confidence: 55, icd10: 'I20.9', rationale: 'Chest pain with cardiovascular risk factors.' });
      tests.push('ECG', 'Troponin', 'Lipid Panel');
    }
  }

  if (hasSOB || lowSpO2) {
    if (patient?.chronicConditions?.some(c => /asthma|copd/i.test(c))) {
      suggestions.push({ name: 'COPD Exacerbation', confidence: 70, icd10: 'J44.9', rationale: 'SOB with history of COPD.' });
    }
    if (highBP) {
      suggestions.push({ name: 'Heart Failure', confidence: 40, icd10: 'I50.9', rationale: 'SOB with hypertension needs cardiac evaluation.' });
      tests.push('BNP', 'Echocardiogram');
    }
  }

  if (hasHeadache) {
    suggestions.push({ name: 'Tension Headache', confidence: 65, icd10: 'G44.209', rationale: 'Most common headache type presenting to clinic.' });
    if (hasDizziness || highBP) {
      suggestions.push({ name: 'Hypertension', confidence: 50, icd10: 'I10', rationale: 'Headache with elevated BP.' });
    }
  }

  if (hasAbdPain) {
    suggestions.push({ name: 'Acute Gastritis', confidence: 60, icd10: 'K29.70', rationale: 'Abdominal pain is a common presenting symptom.' });
    if (hasNausea) suggestions.push({ name: 'Gastroenteritis', confidence: 55, icd10: 'K52.9', rationale: 'Abdominal pain with nausea suggests GI infection.' });
    tests.push('Abdominal Ultrasound');
  }

  if (hasFatigue && hasDizziness) {
    suggestions.push({ name: 'Iron Deficiency Anemia', confidence: 45, icd10: 'D50.9', rationale: 'Fatigue and dizziness can indicate anemia.' });
    tests.push('Ferritin', 'Iron Studies');
  }

  if (highBG) {
    suggestions.push({ name: 'Type 2 Diabetes Mellitus', confidence: 70, icd10: 'E11.9', rationale: 'Elevated blood glucose indicates possible diabetes.' });
    tests.push('HbA1c', 'Fasting Blood Glucose');
  } else if (vitals?.bloodGlucose && vitals.bloodGlucose > 100) {
    suggestions.push({ name: 'Impaired Fasting Glucose', confidence: 55, icd10: 'R73.03', rationale: 'Borderline elevated blood glucose.' });
  }

  if (hasFatigue && !hasDizziness) {
    suggestions.push({ name: 'Fatigue (unspecified)', confidence: 40, icd10: 'R53.83', rationale: 'Fatigue is a common non-specific symptom.' });
  }

  if (hasNausea && !hasAbdPain) {
    suggestions.push({ name: 'Nausea (unspecified)', confidence: 35, icd10: 'R11.2', rationale: 'Isolated nausea requires further evaluation.' });
  }

  if (suggestions.length === 0) {
    suggestions.push({ name: 'General Medical Examination', confidence: 50, icd10: 'Z00.00', rationale: 'No specific symptom pattern identified. Routine evaluation recommended.' });
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);

  if (symptoms?.length) {
    treatments.push({ medication: 'Acetaminophen 500mg', dosage: '500 mg', duration: '5 days', notes: 'For fever/pain as needed' });
    treatments.push({ medication: 'Omeprazole 20mg', dosage: '20 mg', duration: '14 days', notes: 'If GERD symptoms present' });
  }
  if (highBP) treatments.push({ medication: 'Amlodipine 5mg', dosage: '5 mg', duration: 'Ongoing', notes: 'Start antihypertensive therapy' });
  if (highBG) treatments.push({ medication: 'Metformin 500mg', dosage: '500 mg', duration: 'Ongoing', notes: 'Start with breakfast, titrate as needed' });
  if (hasCough) treatments.push({ medication: 'Dextromethorphan 15mg', dosage: '15 mg', duration: '7 days', notes: 'For cough suppression' });

  return {
    diagnoses: suggestions.slice(0, 5),
    tests: [...new Set(tests)].slice(0, 8),
    treatments: treatments.slice(0, 5),
    notes: 'AI-assisted assessment based on presenting symptoms and vitals. All diagnoses should be clinically confirmed.',
  };
}

function mockENTDiagnosis({ symptoms, vitals, patient }) {
  const suggestions = [];
  const tests = [];
  const treatments = [];

  const earSymptoms = symptoms?.filter(s => /ear|otalgia|hearing|tinnitus|vertigo|dizziness|otorrhea|aural/i.test(s.name));
  const noseSymptoms = symptoms?.filter(s => /nose|nasal|sinus|rhinorrhea|obstruction|epistaxis|sneeze|anosmia|hyposmia|postnasal|facial.*pain/i.test(s.name));
  const throatSymptoms = symptoms?.filter(s => /throat|sore|pharyng|tonsil|laryng|hoarse|dysphonia|dysphagia|cough|stridor|globus|snore|sleep.*apnea/i.test(s.name));

  const hasFever = symptoms?.some(s => /fever/i.test(s.name));
  const hasEarPain = symptoms?.some(s => /ear.*pain|otalgia/i.test(s.name));
  const hasHearingLoss = symptoms?.some(s => /hearing.*loss|hard.*hear/i.test(s.name));
  const hasTinnitus = symptoms?.some(s => /tinnitus|ring/i.test(s.name));
  const hasVertigo = symptoms?.some(s => /vertigo|dizziness|spinning/i.test(s.name));
  const hasOtorrhea = symptoms?.some(s => /ear.*discharge|otorrhea/i.test(s.name));
  const hasNasalObstruction = symptoms?.some(s => /nasal.*obstruct|stuffy|blocked.*nose/i.test(s.name));
  const hasRhinorrhea = symptoms?.some(s => /runny.*nose|rhinorrhea|nasal.*discharge/i.test(s.name));
  const hasFacialPain = symptoms?.some(s => /facial.*pain|sinus.*pain|facial.*pressure/i.test(s.name));
  const hasEpistaxis = symptoms?.some(s => /epistaxis|nosebleed|bloody.*nose/i.test(s.name));
  const hasAnosmia = symptoms?.some(s => /anosmia|loss.*smell|hyposmia/i.test(s.name));
  const hasSoreThroat = symptoms?.some(s => /sore.*throat|pharyngitis|throat.*pain|odynophagia/i.test(s.name));
  const hasHoarseness = symptoms?.some(s => /hoarse|dysphonia|voice.*change|loss.*voice/i.test(s.name));
  const hasDysphagia = symptoms?.some(s => /dysphagia|difficulty.*swallow|trouble.*swallow/i.test(s.name));
  const hasCough = symptoms?.some(s => /cough/i.test(s.name));
  const hasPostnasalDrip = symptoms?.some(s => /postnasal drip/i.test(s.name));
  const hasSnoring = symptoms?.some(s => /snore|sleep.*apnea|apnea/i.test(s.name));
  const hasGlobus = symptoms?.some(s => /globus|lump.*throat/i.test(s.name));
  const hasNeckMass = symptoms?.some(s => /neck.*mass|neck.*lump|cervical.*swell|lymphadenopathy/i.test(s.name));

  const highTemp = vitals?.temperature >= 38;

  // Ear conditions
  if (hasEarPain && hasFever) {
    suggestions.push({ name: 'Acute Otitis Media', confidence: 78, icd10: 'H66.90', rationale: 'Ear pain with fever is classic for acute otitis media, especially in the context of eustachian tube dysfunction.' });
    suggestions.push({ name: 'Acute Otitis Externa', confidence: 55, icd10: 'H60.90', rationale: 'If pain is exacerbated by tragus manipulation, consider otitis externa.' });
    tests.push('Otoscopy with pneumatic assessment', 'Tympanometry');
    if (highTemp) tests.push('Complete Blood Count (CBC)', 'CRP');
  }
  if (hasOtorrhea) {
    suggestions.push({ name: 'Chronic Suppurative Otitis Media', confidence: 60, icd10: 'H66.1', rationale: 'Persistent ear discharge suggests chronic middle ear infection with possible TM perforation.' });
    tests.push('Ear swab culture and sensitivity', 'Audiometry', 'CT Temporal Bone');
  }
  if (hasHearingLoss && hasTinnitus) {
    suggestions.push({ name: 'Sensorineural Hearing Loss', confidence: 65, icd10: 'H91.9', rationale: 'Hearing loss with tinnitus suggests cochlear or retrocochlear pathology.' });
    suggestions.push({ name: 'Presbycusis', confidence: 50, icd10: 'H91.1', rationale: 'Age-related hearing loss common in older patients, typically bilateral high-frequency loss.' });
    tests.push('Pure-tone Audiometry (AC/BC)', 'Speech Audiometry (SRT/WRS)', 'Tympanometry', 'Acoustic Reflex Testing');
    if (hasVertigo) {
      suggestions.push({ name: 'Meniere Disease', confidence: 45, icd10: 'H81.0', rationale: 'Triad of vertigo, tinnitus, and hearing loss suggests Meniere disease.' });
      tests.push('Electrocochleography (ECoG)', 'MRI IAC');
    }
  }
  if (hasVertigo && !hasHearingLoss) {
    suggestions.push({ name: 'Benign Paroxysmal Positional Vertigo', confidence: 70, icd10: 'H81.1', rationale: 'Positional vertigo without hearing loss is characteristic of BPPV, typically posterior canal.' });
    tests.push('Dix-Hallpike maneuver', 'Videonystagmography (VNG)');
  }
  if (hasEarPain && !hasFever) {
    suggestions.push({ name: 'Eustachian Tube Dysfunction', confidence: 55, icd10: 'H69.8', rationale: 'Ear pain without fever may indicate eustachian tube dysfunction with negative middle ear pressure.' });
    suggestions.push({ name: 'Temporomandibular Joint Disorder', confidence: 40, icd10: 'M26.60', rationale: 'Referred ear pain can originate from TMJ, especially with jaw movement.' });
    tests.push('Tympanometry');
  }
  if (hasTinnitus && !hasHearingLoss) {
    suggestions.push({ name: 'Tinnitus, Unspecified', confidence: 50, icd10: 'H93.1', rationale: 'Isolated tinnitus requires audiological evaluation to rule out underlying cochlear pathology.' });
    tests.push('Audiometry', 'Tinnitus Handicap Inventory');
  }

  // Nose & sinus conditions
  if (hasFacialPain && hasNasalObstruction) {
    suggestions.push({ name: 'Acute Sinusitis', confidence: 75, icd10: 'J01.90', rationale: 'Facial pain/pressure with nasal obstruction is highly suggestive of acute sinusitis.' });
    suggestions.push({ name: 'Chronic Sinusitis', confidence: 45, icd10: 'J32.9', rationale: 'If symptoms persist >12 weeks, consider chronic sinusitis.' });
    tests.push('Nasal endoscopy', 'CT Sinus without contrast', 'Sinus culture');
  }
  if (hasRhinorrhea && hasNasalObstruction && !hasFacialPain) {
    suggestions.push({ name: 'Allergic Rhinitis', confidence: 70, icd10: 'J30.4', rationale: 'Clear rhinorrhea with nasal obstruction suggests allergic rhinitis, especially with sneezing and itchy eyes.' });
    tests.push('Allergy skin testing (prick test)', 'Serum IgE');
    if (hasAnosmia) {
      suggestions.push({ name: 'Chronic Rhinosinusitis with Nasal Polyps', confidence: 50, icd10: 'J33.9', rationale: 'Nasal obstruction with anosmia suggests nasal polyposis.' });
      tests.push('Nasal endoscopy', 'CT Sinus', 'Lund-Mackay scoring');
    }
  }
  if (hasEpistaxis) {
    suggestions.push({ name: 'Epistaxis', confidence: 65, icd10: 'R04.0', rationale: 'Nosebleed requires assessment of source (anterior vs posterior), frequency, and any underlying coagulopathy.' });
    suggestions.push({ name: 'Hereditary Hemorrhagic Telangiectasia', confidence: 20, icd10: 'I78.0', rationale: 'Consider in recurrent bilateral epistaxis with family history.' });
    tests.push('Anterior rhinoscopy', 'Nasal endoscopy', 'Complete Blood Count', 'Coagulation profile (PT/PTT/INR)');
    if (vitals?.bloodPressureSystolic >= 140) {
      suggestions.push({ name: 'Hypertension-related Epistaxis', confidence: 55, icd10: 'I10', rationale: 'Epistaxis with elevated BP suggests hypertensive etiology.' });
    }
  }
  if (hasAnosmia && !hasNasalObstruction) {
    suggestions.push({ name: 'Post-Viral Olfactory Dysfunction', confidence: 60, icd10: 'R43.0', rationale: 'Sudden anosmia without nasal obstruction is commonly post-viral, especially post-COVID.' });
    tests.push('Olfactory testing (UPSIT/Sniffin Sticks)', 'MRI Brain with olfactory bulb protocol');
  }

  // Throat conditions
  if (hasSoreThroat && hasFever) {
    suggestions.push({ name: 'Acute Pharyngitis', confidence: 70, icd10: 'J02.9', rationale: 'Sore throat with fever is most commonly viral pharyngitis.' });
    suggestions.push({ name: 'Streptococcal Pharyngitis', confidence: 50, icd10: 'J02.0', rationale: 'If exudates, cervical lymphadenopathy, and absence of cough — consider Group A Strep.' });
    tests.push('Rapid Strep Test', 'Throat swab culture');
    if (vitals?.temperature >= 38.5) {
      suggestions.push({ name: 'Peritonsillar Abscess', confidence: 35, icd10: 'J36', rationale: 'Severe unilateral throat pain with fever and trismus suggests quinsy — requires urgent ENT evaluation.' });
      tests.push('CT Neck with contrast');
    }
  }
  if (hasHoarseness) {
    suggestions.push({ name: 'Acute Laryngitis', confidence: 65, icd10: 'J04.0', rationale: 'Hoarseness with recent URI is most commonly acute laryngitis, typically self-limited.' });
    suggestions.push({ name: 'Laryngopharyngeal Reflux', confidence: 50, icd10: 'K21.9', rationale: 'Silent reflux can cause hoarseness, throat clearing, and globus sensation.' });
    tests.push('Flexible laryngoscopy', 'Voice analysis');
    if (patient?.age >= 40 && !hasCough) {
      suggestions.push({ name: 'Vocal Cord Lesion (nodule/polyp)', confidence: 40, icd10: 'J38.1', rationale: 'Persistent hoarseness >3 weeks warrants visualization of vocal cords, especially in professional voice users.' });
      tests.push('Stroboscopy');
    }
  }
  if (hasDysphagia) {
    suggestions.push({ name: 'Oropharyngeal Dysphagia', confidence: 55, icd10: 'R13.0', rationale: 'Difficulty swallowing requires differentiation of oropharyngeal vs esophageal etiology.' });
    tests.push('Flexible Endoscopic Evaluation of Swallowing (FEES)', 'Modified Barium Swallow');
  }
  if (hasCough && hasPostnasalDrip) {
    suggestions.push({ name: 'Upper Airway Cough Syndrome (Postnasal Drip)', confidence: 65, icd10: 'R05', rationale: 'Chronic cough with postnasal drip sensation suggests sinonasal etiology of cough.' });
    tests.push('Nasal endoscopy', 'Sinus CT');
  }
  if (hasGlobus) {
    suggestions.push({ name: 'Globus Pharyngeus', confidence: 55, icd10: 'F45.8', rationale: 'Lump sensation in throat without dysphagia is often globus, associated with stress or LPR.' });
    tests.push('Flexible laryngoscopy', 'Barium swallow');
  }
  if (hasSnoring) {
    suggestions.push({ name: 'Obstructive Sleep Apnea', confidence: 50, icd10: 'G47.33', rationale: 'Snoring with witnessed apneas suggests OSA, requiring sleep study for diagnosis.' });
    tests.push('Polysomnography (Sleep Study)', 'Epworth Sleepiness Scale', 'Nasal endoscopy');
  }
  if (hasNeckMass) {
    suggestions.push({ name: 'Cervical Lymphadenopathy', confidence: 55, icd10: 'R59.0', rationale: 'Neck mass requires thorough evaluation including ultrasound and possible FNA.' });
    tests.push('Neck Ultrasound', 'Fine Needle Aspiration (FNA)', 'CT Neck with contrast');
    if (patient?.age >= 45) {
      suggestions.push({ name: 'Head and Neck Neoplasm', confidence: 30, icd10: 'C76.0', rationale: 'Neck mass in older patient with risk factors requires malignancy workup.' });
    }
  }

  // Cough - general
  if (hasCough && !hasPostnasalDrip) {
    suggestions.push({ name: 'Acute Bronchitis', confidence: 55, icd10: 'J20.9', rationale: 'Cough with or without sputum is commonly acute bronchitis.' });
    tests.push('Chest X-Ray');
  }

  // Default fallback
  if (suggestions.length === 0) {
    if (earSymptoms.length > 0) {
      suggestions.push({ name: 'Unspecified Ear Disorder', confidence: 40, icd10: 'H92.9', rationale: 'Ear-related symptoms present but no clear pattern identified.' });
    } else if (noseSymptoms.length > 0) {
      suggestions.push({ name: 'Unspecified Nasal Disorder', confidence: 40, icd10: 'J34.9', rationale: 'Nasal symptoms present but no clear pattern identified.' });
    } else if (throatSymptoms.length > 0) {
      suggestions.push({ name: 'Unspecified Throat Disorder', confidence: 40, icd10: 'R07.0', rationale: 'Throat symptoms present but no clear pattern identified.' });
    } else {
      suggestions.push({ name: 'General ENT Examination', confidence: 50, icd10: 'Z01.10', rationale: 'No specific ENT symptom pattern identified. Routine ENT evaluation recommended.' });
    }
  }

  // Tests dedup + attach common ENT labs
  if (hasFever || hasSoreThroat) tests.push('Complete Blood Count (CBC)', 'CRP');
  if (tests.length === 0) tests.push('Nasal endoscopy', 'Flexible laryngoscopy', 'Audiometry');

  // Treatments
  if (hasEarPain || hasOtorrhea) {
    treatments.push({ medication: 'Amoxicillin 500mg', dosage: '500 mg', duration: '7 days', notes: 'First-line for acute otitis media; adjust if penicillin-allergic' });
    treatments.push({ medication: 'Acetaminophen 500mg', dosage: '500 mg', duration: '5 days', notes: 'For fever and pain as needed' });
  }
  if (hasRhinorrhea || hasNasalObstruction) {
    treatments.push({ medication: 'Fluticasone Propionate Nasal Spray', dosage: '2 sprays each nostril daily', duration: 'Ongoing', notes: 'First-line for allergic rhinitis; full effect in 1-2 weeks' });
    treatments.push({ medication: 'Saline Nasal Spray/Rinse', dosage: 'As needed', duration: 'As needed', notes: 'For nasal hygiene, safe for long-term use' });
  }
  if (hasFacialPain || hasNasalObstruction) {
    treatments.push({ medication: 'Amoxicillin-Clavulanate 875/125mg', dosage: '875/125 mg', duration: '10 days', notes: 'For acute sinusitis; cover resistant organisms' });
  }
  if (hasSoreThroat) {
    treatments.push({ medication: 'Acetaminophen 500mg', dosage: '500 mg', duration: '5 days', notes: 'For throat pain and fever' });
  }
  if (hasHoarseness) {
    treatments.push({ medication: 'Voice rest', dosage: 'As needed', duration: '7-10 days', notes: 'Minimal speaking, no whispering; avoid vocal strain' });
    treatments.push({ medication: 'Omeprazole 20mg', dosage: '20 mg', duration: '8 weeks', notes: 'If LPR suspected; take before meals' });
  }
  if (hasVertigo) {
    treatments.push({ medication: 'Betahistine 16mg', dosage: '16 mg', duration: '4 weeks', notes: 'For vestibular symptoms; take 2-3 times daily' });
  }
  if (hasSnoring) {
    treatments.push({ medication: 'CPAP therapy evaluation', dosage: 'Per sleep study', duration: 'Ongoing', notes: 'Refer to sleep medicine for titration' });
  }
  if (symptoms?.length && treatments.length === 0) {
    treatments.push({ medication: 'Acetaminophen 500mg', dosage: '500 mg', duration: '5 days', notes: 'For symptomatic relief as needed' });
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    diagnoses: suggestions.slice(0, 5),
    tests: [...new Set(tests)].slice(0, 8),
    treatments: treatments.slice(0, 5),
    notes: 'ENT AI-assisted assessment based on presenting symptoms and clinical findings. All diagnoses should be confirmed by clinical examination, endoscopic evaluation, and audiological testing as indicated.',
  };
}

function mockDentalDiagnosis({ symptoms, vitals, patient }) {
  const suggestions = [];
  const tests = [];
  const treatments = [];

  const hasToothache = symptoms?.some(s => /toothache|tooth.*pain|dental.*pain|ache/i.test(s.name));
  const hasSensitivity = symptoms?.some(s => /sensitivity|sensitive.*cold|sensitive.*hot|sensitive.*sweet/i.test(s.name));
  const hasSwelling = symptoms?.some(s => /swelling|swollen|facial.*swell|gum.*swell|abscess|cellulitis/i.test(s.name));
  const hasBleedingGums = symptoms?.some(s => /bleeding.*gum|gum.*bleed|blood.*gum/i.test(s.name));
  const hasHalitosis = symptoms?.some(s => /halitosis|bad.*breath/i.test(s.name));
  const hasJawPain = symptoms?.some(s => /jaw.*pain|clicking.*jaw|TMJ|temporomandibular/i.test(s.name));
  const hasLooseTeeth = symptoms?.some(s => /loose.*tooth|loose.*teeth|tooth.*mobile/i.test(s.name));
  const hasDryMouth = symptoms?.some(s => /dry.*mouth|xerostomia/i.test(s.name));
  const hasUlcers = symptoms?.some(s => /ulcer|aphthous|canker|sore.*mouth|stomatitis/i.test(s.name));
  const hasPainChewing = symptoms?.some(s => /pain.*chew|pain.*bite|discomfort.*chew/i.test(s.name));
  const hasBrokenTooth = symptoms?.some(s => /broken.*tooth|fractured.*tooth|chipped.*tooth|cracked.*tooth/i.test(s.name));
  const hasBadTaste = symptoms?.some(s => /bad.*taste|metallic.*taste|unpleasant.*taste/i.test(s.name));
  const hasTrismus = symptoms?.some(s => /trismus|limited.*open|can.*open.*mouth/i.test(s.name));
  const hasNumbness = symptoms?.some(s => /numb|paresthesia|tingling/i.test(s.name));

  const hasFever = symptoms?.some(s => /fever/i.test(s.name));
  const highTemp = vitals?.temperature >= 38;

  // Caries & pulp conditions
  if (hasToothache && hasSensitivity) {
    suggestions.push({ name: 'Reversible Pulpitis', confidence: 65, icd10: 'K04.01', rationale: 'Toothache with sensitivity to cold/sweet suggests reversible pulpitis, typically due to caries or recent restoration.' });
    suggestions.push({ name: 'Irreversible Pulpitis', confidence: 50, icd10: 'K04.02', rationale: 'If pain is spontaneous, prolonged, or worse at night, consider irreversible pulpitis requiring root canal.' });
    tests.push('Pulp vitality testing (thermal/EPT)', 'Periapical X-ray', 'Percussion test');
  }
  if (hasToothache && (hasSwelling || hasFever)) {
    suggestions.push({ name: 'Periapical Abscess', confidence: 75, icd10: 'K04.7', rationale: 'Toothache with swelling and/or fever suggests periapical abscess with pulpal necrosis.' });
    if (highTemp) suggestions.push({ name: 'Acute Apical Periodontitis', confidence: 60, icd10: 'K04.4', rationale: 'Painful tooth with systemic signs suggests acute apical infection.' });
    tests.push('Periapical X-ray', 'Panoramic radiograph', 'Pulp vitality testing');
    if (highTemp || hasTrismus) tests.push('CBCT', 'Complete Blood Count (CBC)');
  }
  if (hasPainChewing && hasToothache) {
    suggestions.push({ name: 'Cracked Tooth Syndrome', confidence: 55, icd10: 'K03.81', rationale: 'Pain on chewing/biting with no obvious caries suggests cracked tooth, often missed on routine X-ray.' });
    tests.push('Bite test (Tooth Slooth)', 'Transillumination', 'Periapical X-ray', 'CBCT if clinical suspicion high');
  }

  // Periodontal conditions
  if (hasBleedingGums) {
    suggestions.push({ name: 'Chronic Gingivitis', confidence: 70, icd10: 'K05.10', rationale: 'Bleeding gums with plaque accumulation suggests plaque-induced gingivitis.' });
    suggestions.push({ name: 'Chronic Periodontitis', confidence: 40, icd10: 'K05.30', rationale: 'Bleeding with possible pocket formation suggests periodontitis, especially in older patients or smokers.' });
    tests.push('Periodontal probing (6 sites/tooth)', 'Full mouth X-ray or panoramic', 'Bleeding on probing (BOP) scoring');
    if (hasHalitosis) tests.push('Microbiological culture if refractory');
  }
  if (hasLooseTeeth) {
    suggestions.push({ name: 'Chronic Periodontitis (generalized severe)', confidence: 70, icd10: 'K05.323', rationale: 'Loose teeth with bleeding suggests advanced generalized periodontitis with significant attachment loss.' });
    suggestions.push({ name: 'Aggressive Periodontitis', confidence: 35, icd10: 'K05.20', rationale: 'Consider aggressive form if patient is young with rapid attachment loss.' });
    tests.push('Full periodontal charting', 'Mobility grading (0-III)', 'Panoramic radiograph', 'CBCT for furcation assessment');
  }

  // Oral lesions
  if (hasUlcers) {
    suggestions.push({ name: 'Recurrent Aphthous Ulcers', confidence: 70, icd10: 'K12.0', rationale: 'Recurrent painful oral ulcers with well-defined borders suggest minor aphthous ulcers.' });
    if (hasFever) {
      suggestions.push({ name: 'Herpetic Gingivostomatitis', confidence: 50, icd10: 'B00.2', rationale: 'Multiple vesicles/ulcers with fever suggest primary herpetic infection.' });
    }
    tests.push('Visual examination', 'Biopsy if non-healing >2 weeks');
  }

  // TMJ / Jaw
  if (hasJawPain) {
    suggestions.push({ name: 'Temporomandibular Joint Disorder', confidence: 65, icd10: 'K07.6', rationale: 'Jaw pain with clicking/popping suggests TMD, often associated with bruxism or malocclusion.' });
    tests.push('TMJ examination (ROM, deviation, palpation, joint sounds)', 'Panoramic radiograph', 'CBCT or MRI TMJ if persistent');
  }

  // Dry mouth
  if (hasDryMouth) {
    suggestions.push({ name: 'Xerostomia', confidence: 60, icd10: 'K11.7', rationale: 'Dry mouth is commonly medication-induced or may indicate Sjogren syndrome.' });
    tests.push('Salivary flow rate measurement', 'Sialography if obstruction suspected');
  }

  // Broken tooth / trauma
  if (hasBrokenTooth) {
    suggestions.push({ name: 'Fracture of Tooth', confidence: 75, icd10: 'S02.5XXA', rationale: 'Broken/chipped tooth from trauma requires radiographic evaluation to assess pulp involvement.' });
    tests.push('Periapical X-ray', 'Pulp vitality testing');
  }

  // Bad taste / infection
  if (hasBadTaste && (hasSwelling || hasPainChewing)) {
    suggestions.push({ name: 'Periapical Abscess without Sinus', confidence: 65, icd10: 'K04.7', rationale: 'Bad taste with pain/swelling suggests drainage from periapical abscess.' });
    tests.push('Periapical X-ray', 'Panoramic radiograph');
  }

  // Dry socket (post-extraction)
  if (hasPainChewing && hasBadTaste && !hasToothache) {
    suggestions.push({ name: 'Alveolitis (Dry Socket)', confidence: 60, icd10: 'M27.3', rationale: 'Pain 2-4 days post-extraction with bad taste suggests alveolar osteitis.' });
    tests.push('Clinical examination', 'Periapical X-ray to rule out retained root');
  }

  // Impacted wisdom teeth
  if (hasJawPain && hasTrismus) {
    suggestions.push({ name: 'Pericoronitis', confidence: 60, icd10: 'K05.22', rationale: 'Jaw pain with limited opening around erupting wisdom tooth suggests pericoronitis.' });
    suggestions.push({ name: 'Impacted Wisdom Tooth', confidence: 50, icd10: 'K01.1', rationale: 'Impacted third molar causing recurrent pericoronitis.' });
    tests.push('Panoramic radiograph', 'Periodontal probing around operculum');
  }

  // Default fallbacks
  if (suggestions.length === 0) {
    if (hasToothache || hasSensitivity) {
      suggestions.push({ name: 'Dental Caries, Unspecified', confidence: 45, icd10: 'K02.9', rationale: 'Dental pain present but specific pattern not clearly identified.' });
    } else if (hasBleedingGums || hasHalitosis) {
      suggestions.push({ name: 'Periodontal Disease, Unspecified', confidence: 40, icd10: 'K05.6', rationale: 'Gum-related symptoms present but require further clinical evaluation.' });
    } else {
      suggestions.push({ name: 'Dental Examination with Abnormal Findings', confidence: 50, icd10: 'Z01.21', rationale: 'Dental symptoms present but no clear pattern identified. Comprehensive oral examination recommended.' });
    }
  }

  // Common dental tests
  if (tests.length === 0) tests.push('Comprehensive oral examination', 'Panoramic radiograph', 'Periapical X-ray as indicated');
  if (hasFever || hasSwelling) tests.push('Complete Blood Count (CBC)');
  if (vitals?.bloodGlucose && vitals.bloodGlucose > 100) tests.push('HbA1c (uncontrolled diabetes affects periodontal health)');

  // Treatments
  if (hasToothache || hasSensitivity) {
    treatments.push({ medication: 'Ibuprofen 400mg', dosage: '400 mg', duration: '5 days', notes: 'Take with food q6h for dental pain; max 2400mg/day' });
    treatments.push({ medication: 'Acetaminophen 500mg', dosage: '500 mg', duration: '5 days', notes: 'Alternative if NSAIDs contraindicated; max 3000mg/day' });
  }
  if (hasSwelling || hasFever) {
    treatments.push({ medication: 'Amoxicillin 500mg', dosage: '500 mg', duration: '7 days', notes: 'First-line for odontogenic infection; adjust if penicillin-allergic' });
    treatments.push({ medication: 'Chlorhexidine 0.12% Mouthwash', dosage: '15 mL BID', duration: '7 days', notes: 'Use after brushing; avoid eating/drinking for 30 min' });
  }
  if (hasBleedingGums) {
    treatments.push({ medication: 'Chlorhexidine 0.12% Mouthwash', dosage: '15 mL BID', duration: '14 days', notes: 'Short-term for plaque control; long-term use causes staining' });
    treatments.push({ medication: 'Warm Saline Rinse', dosage: 'As needed', duration: '7 days', notes: 'Gentle rinsing 3-4 times daily for gum inflammation' });
  }
  if (hasUlcers) {
    treatments.push({ medication: 'Topical Triamcinolone 0.1% in Orabase', dosage: 'Apply to lesion TID', duration: '5 days', notes: 'Apply after meals; avoid food/drink for 30 min' });
    treatments.push({ medication: 'Lidocaine 2% Viscous', dosage: '5 mL swish and spit TID', duration: 'As needed', notes: 'For pain relief before meals' });
  }
  if (hasJawPain) {
    treatments.push({ medication: 'Ibuprofen 600mg', dosage: '600 mg', duration: '7 days', notes: 'For TMJ inflammation; take with food q6h' });
    treatments.push({ medication: 'Cyclobenzaprine 5mg', dosage: '5 mg', duration: '14 days', notes: 'For muscle spasm in TMD; take at bedtime' });
  }
  if (hasDryMouth) {
    treatments.push({ medication: 'Saliva Substitute (Artificial Saliva)', dosage: 'Spray PRN', duration: 'As needed', notes: 'For symptomatic relief of xerostomia' });
    treatments.push({ medication: 'Fluoride 5000ppm Toothpaste', dosage: 'Apply daily', duration: 'Ongoing', notes: 'High-fluoride toothpaste for caries prevention with dry mouth' });
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    diagnoses: suggestions.slice(0, 5),
    tests: [...new Set(tests)].slice(0, 8),
    treatments: treatments.slice(0, 5),
    notes: 'Dental AI-assisted assessment based on presenting symptoms and clinical findings. All diagnoses should be confirmed by thorough clinical examination, appropriate radiographs, and vitality testing as indicated. Treatment plan should consider patient\'s medical history, allergies, and medication interactions.',
  };
}

function mockGlaucomaDiagnosis({ symptoms, vitals, patient }) {
  const suggestions = [];
  const tests = [];
  const treatments = [];

  const hasSuddenVisionLoss = symptoms?.some(s => /sudden.*vision.*loss|acute.*vision.*loss/i.test(s.name));
  const hasGradualVisionLoss = symptoms?.some(s => /gradual.*vision.*loss|slow.*vision.*loss|blurred.*vision|blurry/i.test(s.name));
  const hasEyePain = symptoms?.some(s => /eye.*pain|pain.*eye|ocular.*pain/i.test(s.name));
  const hasHalos = symptoms?.some(s => /halos|rainbow|halo.*light|color.*ring/i.test(s.name));
  const hasHeadache = symptoms?.some(s => /headache|head.*pain/i.test(s.name));
  const hasRedEye = symptoms?.some(s => /red.*eye|bloodshot|inject/i.test(s.name));
  const hasNauseaVomit = symptoms?.some(s => /nausea|vomit/i.test(s.name));
  const hasFieldLoss = symptoms?.some(s => /peripheral.*vision|side.*vision|field.*loss|tunnel.*vision/i.test(s.name));
  const hasNightVisionLoss = symptoms?.some(s => /night.*vision|dark.*adapt|nyctalopia/i.test(s.name));
  const hasPhotophobia = symptoms?.some(s => /photophobia|light.*sensitive/i.test(s.name));
  const hasBlurredVision = symptoms?.some(s => /blurred|blurry|cloudy.*vision|dim/i.test(s.name));
  const hasFloaters = symptoms?.some(s => /floaters|spots|strings|cobweb/i.test(s.name));
  const hasFlashes = symptoms?.some(s => /flash|photopsia|light.*streak/i.test(s.name));
  const hasTransientBlur = symptoms?.some(s => /transient.*blur|exercise.*blur|intermittent.*blur/i.test(s.name));
  const hasAsymptomatic = symptoms?.some(s => /asymptomatic|routine|incidental|no.*complaint|screening/i.test(s.name));
  const hasTearyEye = symptoms?.some(s => /teary|watery.*eye|epiphora/i.test(s.name));
  const hasBrowAche = symptoms?.some(s => /brow.*ache|brow.*pain|eye.*ache/i.test(s.name));
  const hasPhotophobiaInfant = symptoms?.some(s => /photophobia.*infant|child.*light|baby.*light/i.test(s.name));
  const hasCornealClouding = symptoms?.some(s => /corneal.*cloud|corneal.*haze|buphthalmos|large.*cornea/i.test(s.name));

  const highBP = vitals?.bloodPressureSystolic >= 140;
  const highBG = vitals?.bloodGlucose >= 126;
  const hasDiabetes = patient?.diabetesType && patient?.diabetesType !== 'NONE';
  const hasDM = patient?.chronicConditions?.some(c => /diabetes|dm/i.test(c));
  const hasHTN = patient?.chronicConditions?.some(c => /hyper|hypertension/i.test(c));
  const hasSteroids = patient?.chronicConditions?.some(c => /steroid|asthma|rheumatoid| lupus|transplant/i.test(c));
  const isOlder = patient?.age >= 60;
  const isYoung = patient?.age <= 40;
  const isFemale = patient?.gender === 'FEMALE';

  // Acute Angle-Closure Glaucoma — EMERGENCY
  if (hasEyePain && hasHalos && hasRedEye) {
    suggestions.push({ name: 'Acute Primary Angle-Closure Glaucoma', confidence: 88, icd10: 'H40.211', rationale: 'Triad of eye pain, rainbow halos, and red eye is highly suggestive of acute angle-closure glaucoma — an ocular emergency requiring IMMEDIATE IOP lowering and laser iridotomy.' });
    suggestions.push({ name: 'Acute Iritis/Anterior Uveitis', confidence: 40, icd10: 'H20.9', rationale: 'Pain, photophobia, and redness may also indicate iritis; differentiate by shallow AC and very high IOP in AACG.' });
    tests.push('URGENT: Goldmann applanation tonometry', 'Gonioscopy (closed angles)', 'Slit lamp exam (corneal edema, shallow AC, mid-dilated pupil)', 'CCT pachymetry');
    if (hasNauseaVomit) suggestions.push({ name: 'Acute Angle-Closure with Autonomic Symptoms', confidence: 92, icd10: 'H40.211', rationale: 'Severe eye pain with nausea/vomiting suggests very high IOP (40-80 mmHg) from acute angle-closure — may be misdiagnosed as migraine or gastroenteritis.' });
  }
  if (hasHalos && !hasEyePain) {
    suggestions.push({ name: 'Intermittent Angle-Closure Glaucoma', confidence: 60, icd10: 'H40.231', rationale: 'Intermittent halos with blurred vision in dim light suggests episodic angle closure, often resolving spontaneously.' });
    suggestions.push({ name: 'Corneal Edema from Ocular Hypertension', confidence: 45, icd10: 'H40.02', rationale: 'Halos around lights may also result from corneal edema due to elevated IOP without angle closure.' });
    tests.push('Gonioscopy (narrow but open between attacks)', 'Van Herick angle estimation', 'Dark room provocative testing', 'Anterior segment OCT');
  }

  // POAG — primary open-angle
  if (hasGradualVisionLoss && !hasEyePain && !hasHalos) {
    suggestions.push({ name: 'Primary Open-Angle Glaucoma (POAG)', confidence: 75, icd10: 'H40.111', rationale: 'Gradual, painless vision loss with elevated IOP in an older patient is classic for POAG, the most common form of glaucoma.' });
    suggestions.push({ name: 'Chronic Angle-Closure Glaucoma', confidence: 40, icd10: 'H40.221', rationale: 'Can present similarly to POAG but with slow angle closure over time; gonioscopy is essential for differentiation.' });
    tests.push('Goldmann applanation tonometry (IOP OU)', 'Gonioscopy (Shaffer grading 4 quadrants)', 'Stereoscopic optic disc exam (C/D ratio, rim, ISNT)', 'CCT pachymetry', 'Humphrey VF 24-2 SITA Standard', 'OCT peripapillary RNFL + macular GCIPL', 'Optic disc photography');
  }
  if (hasFieldLoss && !hasEyePain) {
    suggestions.push({ name: 'Primary Open-Angle Glaucoma with Visual Field Defects', confidence: 82, icd10: 'H40.112', rationale: 'Characteristic arcuate scotoma/nasal step on VF confirms functional damage from glaucoma; stage as moderate (7th digit 2).' });
    suggestions.push({ name: 'Advanced POAG with Tunnel Vision', confidence: 65, icd10: 'H40.113', rationale: 'Severe field loss including central fixation suggests advanced stage (7th digit 3); may need low vision rehabilitation.' });
    tests.push('Humphrey VF 24-2 (consider 10-2 for advanced)', 'OCT RNFL + GCIPL trend analysis', 'Gonioscopy', 'Target IOP assessment');
  }

  // Normal-Tension Glaucoma
  if (hasGradualVisionLoss && isOlder && isFemale && !highBP) {
    suggestions.push({ name: 'Normal-Tension Glaucoma (NTG)', confidence: 60, icd10: 'H40.121', rationale: 'Older female with normal IOP but progressive optic neuropathy and VF defects — consider NTG. Rule out compressive lesion if unilateral.' });
    tests.push('Diurnal IOP curve (multiple readings)', 'CCT pachymetry', 'OCT RNFL + GCIPL', 'Humphrey VF 24-2', 'MRI brain/orbits (if unilateral)', 'Autoimmune/inflammatory workup');
    suggestions.push({ name: 'POAG with Low Baseline IOP', confidence: 35, icd10: 'H40.111', rationale: 'Some patients have POAG with presenting IOP in low-normal range but require significant lowering.' });
  }

  // Pseudoexfoliative Glaucoma
  if (hasGradualVisionLoss && isOlder) {
    suggestions.push({ name: 'Pseudoexfoliative Glaucoma (PEXG)', confidence: 55, icd10: 'H40.141', rationale: 'Older patient with high IOP and wide fluctuation; examine for PEX material on lens capsule (bulls-eye pattern) and pupillary margin.' });
    tests.push('Slit lamp exam (PEX on lens capsule, pupillary margin)', 'Gonioscopy (TM pigmentation, Sampaolesi line)', 'CCT', 'Dilated fundus exam');
  }

  // Pigmentary Glaucoma
  if (hasTransientBlur && !hasEyePain && isYoung) {
    suggestions.push({ name: 'Pigmentary Glaucoma', confidence: 65, icd10: 'H40.131', rationale: 'Transient blurring after exercise in a young myopic male is characteristic of pigment dispersion; pigment release from iris pigment epithelium obstructs TM.' });
    suggestions.push({ name: 'Pigment Dispersion Syndrome', confidence: 50, icd10: 'H40.01', rationale: 'Pigment dispersion without glaucomatous damage; at risk for developing pigmentary glaucoma.' });
    tests.push('Slit lamp (Krukenberg spindle, iris transillumination defects)', 'Gonioscopy (dense TM pigmentation, 360 degrees)', 'CCT', 'OCT RNFL/GCIPL', 'VF');
  }

  // Neovascular Glaucoma
  if (hasEyePain && hasRedEye && (hasDiabetes || hasDM || hasHTN || highBP)) {
    suggestions.push({ name: 'Neovascular Glaucoma (NVG)', confidence: 75, icd10: 'H40.5', rationale: 'Painful red eye in diabetic/hypertensive patient with very high IOP — suspect NVG from rubeosis iridis; URGENT: PRP + anti-VEGF + IOP control.' });
    suggestions.push({ name: 'CRVO with Neovascular Glaucoma', confidence: 55, icd10: 'H34.811', rationale: 'CRVO can lead to anterior segment neovascularization and NVG within 3 months (90-day glaucoma).' });
    tests.push('URGENT: Slit lamp (rubeosis iridis, ectropion uveae, NVA)', 'Gonioscopy (NVA, angle closure from fibrovascular membrane)', 'Dilated fundus exam (CRVO/BRVO/PDR findings)', 'FA if media clear', 'HbA1c', 'BP monitoring');
  }

  // Uveitic Glaucoma
  if (hasEyePain && hasPhotophobia && hasBlurredVision) {
    suggestions.push({ name: 'Uveitic Glaucoma', confidence: 55, icd10: 'H40.4', rationale: 'Inflammation-induced IOP elevation from blocked TM; may be compounded by steroid response from treatment.' });
    suggestions.push({ name: 'Anterior Uveitis (Iritis) with Secondary Glaucoma', confidence: 50, icd10: 'H20.9', rationale: 'Differentiate primary uveitic glaucoma from iritis with secondary IOP elevation; cells/flare in AC, posterior synechiae, keratic precipitates.' });
    tests.push('Slit lamp (cells/flare grading, KP, synechiae)', 'Gonioscopy (PAS, angle inflammation)', 'IOP', 'CBC, ESR, CRP', 'Autoimmune workup (ANA, RF, ACE, lysozyme)', 'Chest X-ray (sarcoid/TB)');
  }

  // Steroid-Induced Glaucoma
  if (hasBlurredVision && isOlder && hasSteroids) {
    suggestions.push({ name: 'Steroid-Induced Glaucoma', confidence: 70, icd10: 'H40.6', rationale: 'Elevated IOP in patient with history of steroid use (topical/systemic/inhaled); discontinue steroids if possible or substitute.' });
    tests.push('IOP measurement', 'CCT', 'Gonioscopy (open angles)', 'OCT RNFL');
  }

  // Congenital Glaucoma (infant)
  if (hasTearyEye && hasPhotophobiaInfant && hasCornealClouding) {
    suggestions.push({ name: 'Primary Congenital Glaucoma (Buphthalmos)', confidence: 80, icd10: 'Q15.0', rationale: 'Infant with photophobia, epiphora, corneal enlargement/clouding is classic for congenital glaucoma from angle dysgenesis.' });
    suggestions.push({ name: 'Nasolacrimal Duct Obstruction', confidence: 25, icd10: 'H04.51', rationale: 'More common cause of epiphora in infants; differentiate by absence of corneal enlargement, photophobia, and elevated IOP.' });
    tests.push('IOP (awake/sedated or exam under anesthesia)', 'Corneal diameter measurement', 'Gonioscopy (angle dysgenesis)', 'Optic disc exam (C/D ratio)', 'Ultrasound pachymetry', 'Axial length measurement');
  }

  // Ocular Hypertension / Preglaucoma
  if (hasAsymptomatic && !hasEyePain) {
    suggestions.push({ name: 'Ocular Hypertension (OHT)', confidence: 70, icd10: 'H40.01', rationale: 'Elevated IOP without optic nerve damage or VF defects; risk factor for developing POAG. Consider OHTS criteria for treatment.' });
    suggestions.push({ name: 'Preglaucoma (Borderline Glaucoma Suspect)', confidence: 45, icd10: 'H40.00', rationale: 'Borderline IOP with suspicious optic disc findings or risk factors but no definite glaucomatous damage.' });
    tests.push('Goldmann applanation tonometry (multiple visits)', 'CCT', 'Gonioscopy', 'Baseline stereoscopic disc photography', 'OCT RNFL/GCIPL', 'Humphrey VF 24-2 (baseline)');
  }

  // High IOP with no ocular findings specified
  if (hasBlurredVision && hasBrowAche && !hasEyePain) {
    suggestions.push({ name: 'Ocular Hypertension with Corneal Edema', confidence: 55, icd10: 'H40.02', rationale: 'Blurred vision with brow ache suggests elevated IOP causing corneal edema; check for steroid use, recent ocular surgery.' });
    tests.push('Goldmann tonometry', 'Slit lamp (corneal edema, Descemet folds)', 'CCT', 'Gonioscopy');
  }

  // 10-2 VF / Advanced disease
  if (hasNightVisionLoss && hasFieldLoss) {
    suggestions.push({ name: 'Advanced Glaucoma with Central Fixation Threat', confidence: 60, icd10: 'H40.113', rationale: 'Night vision difficulty and severe field loss suggests advanced glaucoma with central VF involvement; consider 10-2 VF testing.' });
    tests.push('Humphrey 10-2 VF', 'OCT RNFL + GCIPL', 'Low vision assessment');
  }

  // PXF with no IOP mentioned
  if (hasFloaters && isOlder) {
    suggestions.push({ name: 'Pseudoexfoliation Syndrome (PEX)', confidence: 40, icd10: 'H26.89', rationale: 'PEX material on lens capsule may be incidental finding; monitor for developing PEXG and cataract surgery challenges (poor dilation, zonular weakness).' });
    tests.push('Slit lamp exam (dilated: PEX on lens, pupillary margin)', 'Gonioscopy', 'IOP');
  }

  // Default fallbacks
  if (suggestions.length === 0) {
    if (hasEyePain || hasRedEye) {
      suggestions.push({ name: 'Glaucoma Suspect — Acute Presentation', confidence: 40, icd10: 'H40.9', rationale: 'Eye pain with redness requires urgent comprehensive glaucoma evaluation including IOP, gonioscopy, and slit lamp exam.' });
    } else if (hasGradualVisionLoss || hasFieldLoss) {
      suggestions.push({ name: 'Open-Angle Glaucoma, Unspecified', confidence: 35, icd10: 'H40.10X0', rationale: 'Chronic vision loss pattern consistent with glaucoma but requires complete diagnostic workup.' });
    } else if (hasBlurredVision) {
      suggestions.push({ name: 'Glaucoma Suspect — Blurred Vision', confidence: 30, icd10: 'H40.00', rationale: 'Blurred vision with no clear pattern; rule out glaucoma as part of comprehensive eye exam.' });
    } else {
      suggestions.push({ name: 'Routine Glaucoma Evaluation', confidence: 50, icd10: 'Z01.00', rationale: 'No specific glaucoma symptoms identified. Comprehensive glaucoma screening recommended based on risk factors.' });
    }
  }

  // Common glaucoma tests
  if (tests.length === 0) tests.push('Comprehensive ophthalmic examination (dilated)', 'Goldmann applanation tonometry', 'Gonioscopy', 'CCT pachymetry', 'OCT RNFL + GCIPL', 'Humphrey VF 24-2');
  if (highBP || hasHTN) tests.push('Blood pressure monitoring', 'Consider 24-hour ambulatory BP');
  if (highBG || hasDiabetes || hasDM) tests.push('HbA1c');
  if (isOlder) tests.push('Cataract assessment (co-management)');
  if (hasHTN || hasDiabetes) tests.push('Systemic disease optimization (affects IOP and progression)');

  // Treatments
  if (suggestions.some(d => /acute.*angle|aacg/i.test(d.name))) {
    treatments.push({ medication: 'URGENT: Topical IOP lowering — Timolol 0.5% + Brimonidine 0.15% + Dorzolamide 2%', dosage: '1 drop each, STAT', duration: 'Immediate then QID', notes: 'IOP q5min if possible; monitor for systemic effects' });
    treatments.push({ medication: 'Acetazolamide 500mg', dosage: '500 mg IV or PO', duration: 'STAT then QID', notes: 'For acute IOP lowering; monitor electrolytes and renal function' });
    treatments.push({ medication: 'Pilocarpine 2%', dosage: '1 drop, repeat in 15 min if no response', duration: 'Per acute need', notes: 'Use only after IOP starts to lower (to avoid paradoxical worsening in malignant glaucoma)' });
    treatments.push({ medication: 'Osmotic agents (Glycerin 50% 1 mL/kg PO or Mannitol 20% 1-2 g/kg IV)', dosage: 'Per weight', duration: 'Single dose', notes: 'For very high IOP; caution in cardiac/renal patients' });
    treatments.push({ medication: 'Laser Iridotomy', dosage: 'Per eye', duration: 'Definitive treatment', notes: 'Perform as soon as cornea clears; consider prophylactic LPI in fellow eye' });
  }
  if (suggestions.some(d => /neovascular|nvg/i.test(d.name))) {
    treatments.push({ medication: 'Anti-VEGF injection (bevacizumab/ranibizumab/aflibercept)', dosage: '1.25-2 mg IVT', duration: 'STAT then PRN', notes: 'PRP should follow promptly after IOP controlled' });
    treatments.push({ medication: 'Panretinal Photocoagulation (PRP)', dosage: '1200-1600 burns', duration: '2-4 sessions', notes: 'Treat underlying retinal ischemia; may need to complete in stages' });
    treatments.push({ medication: 'Topical IOP lowering (maximal medical therapy)', dosage: 'As above', duration: 'Ongoing', notes: 'Medical therapy alone often insufficient in NVG' });
    treatments.push({ medication: 'Glaucoma Drainage Device (Ahmed/Baerveldt)', dosage: 'Per surgical plan', duration: 'Surgical', notes: 'Consider if IOP remains uncontrolled despite maximal medical therapy + PRP/anti-VEGF' });
  }
  if (suggestions.some(d => /poag|primary.*open/i.test(d.name) || /ocular.*hyper|oht|preglau/i.test(d.name))) {
    treatments.push({ medication: 'Latanoprost 0.005% ophthalmic solution', dosage: '1 drop QHS OU', duration: 'Ongoing', notes: 'First-line monotherapy; best IOP reduction among PGAs; educate on iris/brow/lash changes' });
    treatments.push({ medication: 'Timolol 0.5% ophthalmic solution', dosage: '1 drop BID OU', duration: 'Ongoing', notes: 'Contraindicated in asthma/bradycardia/CHF; may add or substitute as second agent' });
    treatments.push({ medication: 'Brimonidine 0.15% ophthalmic solution', dosage: '1 drop TID OU', duration: 'Ongoing', notes: 'Third-line; monitor for allergic conjunctivitis (common after 3-9 months)' });
    treatments.push({ medication: 'Selective Laser Trabeculoplasty (SLT)', dosage: '360 degrees, 50-60 spots', duration: 'Single session', notes: 'Consider as first-line alternative to drops or as adjunct; effect lasts 1-5 years' });
  }
  if (suggestions.some(d => /ntg|normal.*tension/i.test(d.name))) {
    treatments.push({ medication: 'Target IOP < 15 mmHg (or 30% reduction from baseline)', dosage: 'Per eye', duration: 'Ongoing', notes: 'NTG requires lower target IOP; consider monotherapy first then combine' });
    treatments.push({ medication: 'Latanoprost 0.005% QHS', dosage: '1 drop QHS OU', duration: 'Ongoing', notes: 'PGA first-line; may need combination therapy for adequate IOP reduction' });
    treatments.push({ medication: 'Consider SLT or filtering surgery', dosage: 'Per clinical need', duration: 'As indicated', notes: 'NTG may require surgery if medical therapy cannot achieve target IOP' });
  }
  if (suggestions.some(d => /pigmentary/i.test(d.name))) {
    treatments.push({ medication: 'Latanoprost 0.005% QHS', dosage: '1 drop QHS OU', duration: 'Ongoing', notes: 'PGA first-line; avoid pilocarpine (can worsen pigment dispersion by miosis)' });
    treatments.push({ medication: 'Laser Iridotomy (if reverse pupillary block)', dosage: 'Per eye', duration: 'Once', notes: 'Controversial; may reduce pigment dispersion in some cases' });
  }
  if (suggestions.some(d => /pex|pseudoexfoliat/i.test(d.name))) {
    treatments.push({ medication: 'Latanoprost 0.005% QHS', dosage: '1 drop QHS OU', duration: 'Ongoing', notes: 'PEXG often has higher IOP and wider fluctuations; may require combination therapy early' });
    treatments.push({ medication: 'Consider SLT or trabeculectomy', dosage: 'Per clinical need', duration: 'As indicated', notes: 'PEXG responds well to surgery but has higher post-op complication risk' });
  }
  if (suggestions.some(d => /uveitic/i.test(d.name))) {
    treatments.push({ medication: 'Prednisolone Acetate 1%', dosage: '1 drop QID-Q2H', duration: 'Taper over 4-12 weeks', notes: 'Treat inflammation first; monitor IOP closely (steroid responder)' });
    treatments.push({ medication: 'Cyclopentolate 1%/Atropine 1%', dosage: 'TID-BID', duration: 'For posterior synechiae prevention', notes: 'Cycloplegia for comfort and to break/prevent synechiae' });
    treatments.push({ medication: 'IOP-lowering drops as needed', dosage: 'Avoid PGAs (can worsen inflammation)', duration: 'As needed', notes: 'Consider timolol, brimonidine, dorzolamide first; avoid latanoprost' });
  }
  if (suggestions.some(d => /congenital|buphthalmos/i.test(d.name))) {
    treatments.push({ medication: 'Surgical: Goniotomy or Trabeculotomy', dosage: 'Per eye', duration: 'Surgical', notes: 'First-line for congenital glaucoma; angle surgery within 1-2 months of diagnosis' });
    treatments.push({ medication: 'Trabeculectomy or GDD if angle surgery fails', dosage: 'Per surgical plan', duration: 'Surgical', notes: 'Second-line; higher complication rate in infants' });
  }
  if (suggestions.some(d => /steroid/i.test(d.name))) {
    treatments.push({ medication: 'Discontinue or reduce corticosteroid use', dosage: 'As directed', duration: 'Immediate', notes: 'IOP usually normalizes within 2-4 weeks of discontinuation' });
    treatments.push({ medication: 'IOP-lowering drops until IOP normalizes', dosage: 'As needed', duration: 'Short-term', notes: 'Typically responsive to medical therapy; rarely requires surgery' });
  }
  if (!suggestions.some(d => /acute|neovascular|congenital|emerge/i.test(d.name)) && treatments.length === 0) {
    treatments.push({ medication: 'Latanoprost 0.005% QHS', dosage: '1 drop QHS OU', duration: 'Ongoing', notes: 'First-line PGA if treatment indicated based on IOP level and risk factors' });
    treatments.push({ medication: 'Routine follow-up with IOP, VF, and OCT', dosage: 'Per risk stratification', duration: 'Ongoing', notes: 'Stable: 6-12 months; moderate: 4-6 months; advanced/progressing: 1-3 months' });
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    diagnoses: suggestions.slice(0, 5),
    tests: [...new Set(tests)].slice(0, 8),
    treatments: treatments.slice(0, 5),
    notes: 'Glaucoma AI-assisted assessment based on presenting symptoms and clinical findings. All diagnoses should be confirmed by comprehensive glaucoma evaluation including Goldmann applanation tonometry, gonioscopy, CCT pachymetry, stereoscopic optic disc examination with slit lamp biomicroscopy (78D/90D lens through dilated pupil), OCT peripapillary RNFL and macular GCIPL imaging with normative comparison, and Humphrey visual field 24-2 SITA Standard perimetry. Acute angle-closure and neovascular glaucoma require immediate ophthalmology intervention. Treatment decisions should consider disease stage, rate of progression, target IOP, patient age, life expectancy, adherence, and systemic comorbidities.',
  };
}

function mockRetinaDiagnosis({ symptoms, vitals, patient }) {
  const suggestions = [];
  const tests = [];
  const treatments = [];

  const hasSuddenVisionLoss = symptoms?.some(s => /sudden.*vision.*loss|acute.*vision.*loss/i.test(s.name));
  const hasGradualVisionLoss = symptoms?.some(s => /gradual.*vision.*loss|slow.*vision.*loss|blurred.*vision|blurry/i.test(s.name));
  const hasFloaters = symptoms?.some(s => /floaters|spots|strings|cobweb/i.test(s.name));
  const hasFlashes = symptoms?.some(s => /flash|photopsia|light.*streak/i.test(s.name));
  const hasMetamorphopsia = symptoms?.some(s => /metamorphopsia|distortion|wavy.*vision|bent.*vision/i.test(s.name));
  const hasScotoma = symptoms?.some(s => /scotoma|blind.*spot|missing.*vision|gap.*vision/i.test(s.name));
  const hasCurtain = symptoms?.some(s => /curtain|veil|shadow.*over.*vision|shade/i.test(s.name));
  const hasNightVisionLoss = symptoms?.some(s => /night.*vision|dark.*vision|nyctalopia/i.test(s.name));
  const hasEyePain = symptoms?.some(s => /eye.*pain|pain.*eye|pain.*move|ocular.*pain/i.test(s.name));
  const hasPhotophobia = symptoms?.some(s => /photophobia|light.*sensitive|light.*sensitiv/i.test(s.name));
  const hasColorChanges = symptoms?.some(s => /color.*vision|faded.*color|washed.*color|dull.*color/i.test(s.name));
  const hasFieldLoss = symptoms?.some(s => /peripheral.*vision|side.*vision|field.*loss/i.test(s.name));
  const hasMicropsia = symptoms?.some(s => /micropsia|smaller|object.*small/i.test(s.name));
  const hasDiplopia = symptoms?.some(s => /diplopia|double.*vision/i.test(s.name));

  const highBP = vitals?.bloodPressureSystolic >= 140;
  const highBG = vitals?.bloodGlucose >= 126;
  const hasDiabetes = patient?.diabetesType && patient.diabetesType !== 'NONE';
  const hasHypertension = patient?.chronicConditions?.some(c => /hyper/i.test(c));
  const hasDM = patient?.chronicConditions?.some(c => /diabetes|dm/i.test(c));

  // Retinal detachment
  if (hasFloaters && hasFlashes) {
    suggestions.push({ name: 'Posterior Vitreous Detachment (PVD)', confidence: 75, icd10: 'H43.82', rationale: 'Acute floaters with flashes suggest PVD, the most common cause of this symptom complex.' });
    suggestions.push({ name: 'Retinal Tear without Detachment', confidence: 55, icd10: 'H33.31', rationale: 'Flashes and floaters may indicate a retinal tear; urgent dilated exam required.' });
    tests.push('Dilated fundus examination (indirect ophthalmoscopy)', 'B-scan ultrasound if media opacity', 'Widefield fundus photography');
    if (hasCurtain) {
      suggestions.push({ name: 'Rhegmatogenous Retinal Detachment', confidence: 85, icd10: 'H33.001', rationale: 'Floaters, flashes, and curtain/veil over vision is highly suggestive of retinal detachment.' });
      suggestions.push({ name: 'Retinal Dialysis', confidence: 35, icd10: 'H33.031', rationale: 'Consider especially in younger patients with trauma history.' });
      tests.push('Urgent dilated fundus exam', 'B-scan ultrasound', 'Scleral depression');
    }
  }
  if (hasSuddenVisionLoss && !hasFloaters && !hasFlashes) {
    suggestions.push({ name: 'Central Retinal Artery Occlusion (CRAO)', confidence: 60, icd10: 'H34.11', rationale: 'Painless sudden vision loss suggests vascular occlusion; screen for embolic source.' });
    suggestions.push({ name: 'Amaurosis Fugax', confidence: 45, icd10: 'G45.3', rationale: 'Transient monocular vision loss may indicate TIA or carotid disease.' });
    tests.push('Urgent ophthalmology evaluation', 'Carotid duplex ultrasound', 'Echocardiogram', 'CBC, ESR, CRP', 'Fluorescein angiography');
    if (highBP) suggestions.push({ name: 'Hypertensive Retinopathy (Malignant)', confidence: 40, icd10: 'H35.04', rationale: 'Sudden vision loss with severe hypertension suggests malignant HTN retinopathy.' });
  }

  // AMD - Age related macular degeneration
  if (hasGradualVisionLoss && !hasFloaters && !hasFlashes) {
    suggestions.push({ name: 'Dry (Nonexudative) Age-Related Macular Degeneration', confidence: 65, icd10: 'H35.311', rationale: 'Gradual central vision loss in older adult is most commonly dry AMD with drusen and geographic atrophy.' });
    suggestions.push({ name: 'Wet (Exudative) Age-Related Macular Degeneration', confidence: 40, icd10: 'H35.321', rationale: 'If metamorphopsia or rapid decline, suspect CNV activity.' });
    tests.push('Dilated fundus examination', 'SD-OCT macula (both eyes)', 'Fundus autofluorescence (FAF)', 'Fluorescein angiography', 'Amsler grid testing');
    if (hasMetamorphopsia) {
      suggestions.push({ name: 'Choroidal Neovascularization (CNV) in AMD', confidence: 75, icd10: 'H31.111', rationale: 'Metamorphopsia with gradual vision loss is highly suggestive of wet AMD with active CNV.' });
      tests.push('OCT angiography', 'Fluorescein angiography (FA)', 'Indocyanine green angiography (ICGA)');
    }
  }

  // Diabetic retinopathy
  if (hasDiabetes || hasDM || highBG) {
    if (hasGradualVisionLoss) {
      suggestions.push({ name: 'Nonproliferative Diabetic Retinopathy (NPDR) with Macular Edema', confidence: 70, icd10: 'E11.321', rationale: 'Diabetic patient with gradual vision loss most commonly from DME.' });
      suggestions.push({ name: 'Proliferative Diabetic Retinopathy (PDR)', confidence: 45, icd10: 'E11.351', rationale: 'Advanced diabetic eye disease with neovascularization; high risk if floaters from vitreous hemorrhage.' });
      tests.push('Dilated fundus exam', 'OCT macula for DME assessment', 'OCT angiography', 'Fluorescein angiography', 'Widefield fundus photography', 'HbA1c');
    }
    if (hasFloaters || hasSuddenVisionLoss) {
      suggestions.push({ name: 'Vitreous Hemorrhage from PDR', confidence: 75, icd10: 'H43.81', rationale: 'Sudden floaters or vision loss in diabetic patient suggests vitreous hemorrhage from PDR.' });
      tests.push('B-scan ultrasound (to rule out RD)', 'Dilated exam of both eyes', 'HbA1c');
    }
  }

  // Retinal vein occlusion
  if (hasSuddenVisionLoss && (highBP || hasHypertension)) {
    suggestions.push({ name: 'Central Retinal Vein Occlusion (CRVO)', confidence: 65, icd10: 'H34.21', rationale: 'Sudden painless vision loss in hypertensive patient is classic for CRVO.' });
    suggestions.push({ name: 'Branch Retinal Vein Occlusion (BRVO)', confidence: 50, icd10: 'H34.831', rationale: 'If vision loss is in one quadrant/hemifield, BRVO may be more likely.' });
    tests.push('Dilated fundus exam', 'OCT macula (for macular edema)', 'Fluorescein angiography', 'CBC, ESR, CRP', 'Coagulation panel');
    if (highBP) tests.push('24-hour ambulatory BP monitoring');
    if (hasDiabetes) tests.push('HbA1c');
  }

  // Macular pathology
  if (hasMetamorphopsia && !hasGradualVisionLoss) {
    suggestions.push({ name: 'Epiretinal Membrane (ERM)', confidence: 65, icd10: 'H35.84', rationale: 'Metamorphopsia from ERM is common, especially in older patients.' });
    suggestions.push({ name: 'Macular Hole (Stage 2-4)', confidence: 45, icd10: 'H35.821', rationale: 'Metamorphopsia with central scotoma suggests full-thickness macular hole.' });
    tests.push('SD-OCT macula (to assess ERM/hole stage, central foveal thickness)', 'OCT angiography', 'Fundus autofluorescence');
  }
  if (hasScotoma && !hasCurtain && !hasFloaters) {
    suggestions.push({ name: 'Geographic Atrophy (Advanced Dry AMD)', confidence: 60, icd10: 'H35.314', rationale: 'Central scotoma with well-demarcated atrophy suggests geographic atrophy of AMD.' });
    suggestions.push({ name: 'Macular Hole', confidence: 40, icd10: 'H35.822', rationale: 'Central scotoma may represent full-thickness macular hole.' });
    tests.push('OCT macula', 'Fundus autofluorescence', 'Microperimetry');
  }

  // Inflammatory / Uveitis
  if (hasEyePain && hasPhotophobia) {
    suggestions.push({ name: 'Anterior Uveitis (Iritis)', confidence: 60, icd10: 'H20.9', rationale: 'Eye pain with photophobia is classic for anterior uveitis.' });
    suggestions.push({ name: 'Panuveitis', confidence: 35, icd10: 'H44.111', rationale: 'Anterior and posterior inflammation requires systemic workup.' });
    tests.push('Slit lamp exam with cells/flare grading', 'Dilated fundus exam', 'CBC, ESR, CRP', 'Autoimmune panel (ANA, RF, ACE, lysozyme)', 'Chest X-ray (for sarcoid/TB)');
    suggestions.push({ name: 'Posterior Uveitis/Chorioretinitis', confidence: 40, icd10: 'H30.011', rationale: 'Eye pain with posterior inflammation may indicate infectious or autoimmune uveitis.' });
    tests.push('FA/ICGA', 'OCT macula', 'Infectious workup (syphilis, TB, toxoplasma, HSV, VZV, CMV)');
    if (hasFloaters) tests.push('B-scan ultrasound');
  }

  // Night vision / inherited
  if (hasNightVisionLoss && !hasGradualVisionLoss) {
    suggestions.push({ name: 'Retinitis Pigmentosa', confidence: 50, icd10: 'H35.52', rationale: 'Nyctalopia is a hallmark of retinitis pigmentosa and other rod-cone dystrophies.' });
    suggestions.push({ name: 'Vitamin A Deficiency', confidence: 30, icd10: 'E50.5', rationale: 'Night blindness can result from vitamin A deficiency, especially with malnutrition/malabsorption.' });
    tests.push('Full-field ERG', 'Goldmann visual field', 'OCT macula', 'Fundus autofluorescence', 'Serum vitamin A level', 'Genetic testing (if RP suspected)');
  }

  // Color vision changes
  if (hasColorChanges && !hasGradualVisionLoss) {
    suggestions.push({ name: 'Optic Neuropathy', confidence: 40, icd10: 'H47.01', rationale: 'Color desaturation, especially red, is a key sign of optic nerve dysfunction.' });
    tests.push('Color vision testing (Ishihara, Hardy-Rand-Rittler)', 'Humphrey visual field', 'OCT optic nerve head', 'MRI brain/orbits');
  }

  // Epiretinal membrane only
  if (hasMicropsia) {
    suggestions.push({ name: 'Epiretinal Membrane causing metamorphopsia', confidence: 60, icd10: 'H35.84', rationale: 'Micropsia (objects appear smaller) is a classic symptom of ERM causing contracture.' });
    tests.push('OCT macula', 'M-charts (for metamorphopsia quantification)');
  }

  // Default fallbacks
  if (suggestions.length === 0) {
    if (hasFloaters || hasFlashes) {
      suggestions.push({ name: 'Posterior Vitreous Detachment', confidence: 55, icd10: 'H43.82', rationale: 'Acute onset floaters/flashes most commonly PVD; requires dilated exam to exclude retinal tear.' });
    } else if (hasGradualVisionLoss) {
      suggestions.push({ name: 'Retinal Disorder, Unspecified', confidence: 40, icd10: 'H35.9', rationale: 'Gradual vision loss requires comprehensive retinal evaluation.' });
    } else if (hasSuddenVisionLoss) {
      suggestions.push({ name: 'Acute Visual Disturbance', confidence: 35, icd10: 'H53.13', rationale: 'Sudden visual change requires urgent ophthalmology evaluation.' });
    } else {
      suggestions.push({ name: 'Routine Eye Examination', confidence: 50, icd10: 'Z01.00', rationale: 'No specific symptom pattern identified. Comprehensive eye exam recommended.' });
    }
  }

  // Common retina tests
  if (tests.length === 0) tests.push('Comprehensive ophthalmic examination (dilated)', 'SD-OCT macula', 'Fundus photography');
  if (highBP) tests.push('Blood pressure monitoring');
  if (highBG || hasDiabetes || hasDM) tests.push('HbA1c');

  // Treatments
  if (hasCurtain || (hasFloaters && hasFlashes && hasSuddenVisionLoss)) {
    treatments.push({ medication: 'Urgent vitreoretinal surgical evaluation', dosage: 'Immediate', duration: 'Emergency', notes: 'Possible pneumatic retinopexy, scleral buckle, or PPV with gas/SO tamponade' });
  }
  if (hasMetamorphopsia || hasGradualVisionLoss) {
    treatments.push({ medication: 'Anti-VEGF injection (aflibercept/faricimab)', dosage: '2 mg/0.05 mL IVT', duration: 'Monthly x3 loading then PRN', notes: 'For neovascular AMD, DME, or RVO with macular edema' });
    treatments.push({ medication: 'AREDS2 vitamin supplementation', dosage: 'Capsules BID', duration: 'Long-term', notes: 'For intermediate dry AMD; contains lutein, zeaxanthin, vitamin C/E, zinc' });
    treatments.push({ medication: 'Amsler grid daily self-monitoring', dosage: 'Daily each eye', duration: 'Ongoing', notes: 'For early detection of CNV conversion or progression' });
  }
  if (hasDiabetes || hasDM || highBG) {
    treatments.push({ medication: 'Optimize glycemic control', dosage: 'Target HbA1c < 7%', duration: 'Ongoing', notes: 'Tight glucose control reduces risk of DR progression' });
    treatments.push({ medication: 'Consider focal/grid laser', dosage: 'Per eye, as indicated', duration: '1-2 sessions', notes: 'For clinically significant DME not responsive to anti-VEGF' });
    treatments.push({ medication: 'Consider PRP (panretinal photocoagulation)', dosage: 'Per eye, 1200-1600 burns', duration: '2-4 sessions', notes: 'For high-risk PDR' });
  }
  if (highBP || hasHypertension) {
    treatments.push({ medication: 'Optimize blood pressure control', dosage: 'Target < 130/80', duration: 'Ongoing', notes: 'HTN management reduces RVO risk and DR progression' });
  }
  if (hasEyePain || hasPhotophobia) {
    treatments.push({ medication: 'Prednisolone Acetate 1% drops', dosage: '1 drop QID', duration: 'Taper over 4-6 weeks', notes: 'For anterior uveitis; monitor IOP' });
    treatments.push({ medication: 'Cyclopentolate 1% drops', dosage: '1 drop BID-TID', duration: 'For comfort and posterior synechiae prevention', notes: 'Cycloplegic agent for ciliary spasm relief' });
  }
  if (hasNightVisionLoss) {
    treatments.push({ medication: 'Vitamin A palmitate 15,000 IU', dosage: '15,000 IU daily', duration: 'Ongoing under medical supervision', notes: 'Only for retinitis pigmentosa; monitor liver function and serum retinol levels' });
  }
  if (symptoms?.length && treatments.length === 0) {
    treatments.push({ medication: 'Observation with monitoring', dosage: 'As needed', duration: 'Follow-up in 3-6 months', notes: 'If symptoms are mild/non-progressive without high-risk features' });
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    diagnoses: suggestions.slice(0, 5),
    tests: [...new Set(tests)].slice(0, 8),
    treatments: treatments.slice(0, 5),
    notes: 'Retina AI-assisted assessment based on presenting symptoms and clinical findings. All diagnoses should be confirmed by comprehensive dilated fundus examination, appropriate retinal imaging (OCT, FA, ICGA), and clinical correlation. Any acute vision loss requires same-day ophthalmology evaluation. Treatment decisions should consider ocular and systemic comorbidities, patient preferences, and risk-benefit profile.',
  };
}
