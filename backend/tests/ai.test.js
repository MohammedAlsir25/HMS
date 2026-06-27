import { describe, it, expect, jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';

import {
  buildPrompt,
  parseAIResponse,
  mockDiagnosis,
  mockENTDiagnosis,
  mockDentalDiagnosis,
  mockRetinaDiagnosis,
  mockGlaucomaDiagnosis,
  getAIDiagnosis,
} from '../src/modules/ai/ai.service.js';

const baseInput = {
  symptoms: [],
  vitals: {},
  patient: {},
};

const mkSymptom = (name, opts = {}) => ({ name, ...opts });

describe('ai.service – buildPrompt', () => {
  it('includes symptom details in prompt', () => {
    const prompt = buildPrompt({
      ...baseInput,
      symptoms: [mkSymptom('fever', { severity: '7/10', duration: '3 days' })],
      specialty: 'medicine',
    });
    expect(prompt).toContain('fever');
    expect(prompt).toContain('7/10');
    expect(prompt).toContain('3 days');
  });

  it('includes vitals in prompt', () => {
    const prompt = buildPrompt({
      ...baseInput,
      vitals: { bloodPressureSystolic: 140, heartRate: 100 },
      specialty: 'cardiologia',
    });
    expect(prompt).toContain('BP: 140');
    expect(prompt).toContain('HR: 100');
  });

  it('includes patient chronic conditions', () => {
    const prompt = buildPrompt({
      ...baseInput,
      patient: { age: 55, chronicConditions: ['diabetes', 'hypertension'] },
      specialty: 'medicine',
    });
    expect(prompt).toContain('Age: 55');
    expect(prompt).toContain('diabetes');
    expect(prompt).toContain('hypertension');
  });
});

describe('ai.service – parseAIResponse', () => {
  it('extracts JSON from AI response', () => {
    const text = 'Some text\n{"diagnoses":[{"name":"Test"}],"tests":[]}\nmore text';
    const result = parseAIResponse(text);
    expect(result).toEqual({ diagnoses: [{ name: 'Test' }], tests: [] });
  });

  it('returns null when no JSON found', () => {
    expect(parseAIResponse('No JSON here')).toBeNull();
  });

  it('returns null for invalid JSON braces', () => {
    expect(parseAIResponse('{ invalid }')).toBeNull();
  });
});

describe('mockDiagnosis (general medicine)', () => {
  it('returns diagnoses for fever + cough', () => {
    const result = mockDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('fever'), mkSymptom('cough')],
      specialty: 'medicine',
    });
    expect(result.diagnoses.length).toBeGreaterThan(0);
    expect(result.diagnoses[0].name).toMatch(/respiratory|tract|bronchitis|pneumonia/i);
    expect(result.tests).toContain('Chest X-Ray');
    expect(result.treatments.length).toBeGreaterThan(0);
  });

  it('returns diagnoses for chest pain with hypertension history', () => {
    const result = mockDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('chest pain')],
      patient: { chronicConditions: ['hypertension'] },
      specialty: 'medicine',
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /gerd|angina|reflux/i.test(n))).toBe(true);
    expect(result.tests).toContain('ECG');
  });

  it('detects high blood glucose as diabetes', () => {
    const result = mockDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('fatigue')],
      vitals: { bloodGlucose: 180 },
      specialty: 'medicine',
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /diabetes|glucose/i.test(n))).toBe(true);
    expect(result.treatments.some(t => t.medication.includes('Metformin'))).toBe(true);
  });

  it('detects pneumonia when low SpO2 with fever + cough', () => {
    const result = mockDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('fever'), mkSymptom('cough')],
      vitals: { spo2: 90 },
      specialty: 'medicine',
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /pneumonia/i.test(n))).toBe(true);
  });

  it('returns general exam when no symptoms', () => {
    const result = mockDiagnosis({
      ...baseInput,
      symptoms: [],
      specialty: 'medicine',
    });
    expect(result.diagnoses.length).toBe(1);
    expect(result.diagnoses[0].name).toMatch(/examination/i);
  });

  it('sorts diagnoses by confidence descending', () => {
    const result = mockDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('fever'), mkSymptom('cough'), mkSymptom('shortness of breath')],
      specialty: 'medicine',
    });
    for (let i = 1; i < result.diagnoses.length; i++) {
      expect(result.diagnoses[i].confidence).toBeLessThanOrEqual(result.diagnoses[i - 1].confidence);
    }
  });
});

describe('mockENTDiagnosis', () => {
  it('diagnoses otitis media with ear pain + fever', () => {
    const result = mockENTDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('ear pain'), mkSymptom('fever')],
      vitals: { temperature: 38.5 },
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /otitis/i.test(n))).toBe(true);
  });

  it('diagnoses BPPV with positional vertigo', () => {
    const result = mockENTDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('vertigo')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /bppv|vertigo/i.test(n))).toBe(true);
  });

  it('diagnoses acute sinusitis with facial pain + nasal obstruction', () => {
    const result = mockENTDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('facial pain'), mkSymptom('nasal obstruction')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /sinusitis/i.test(n))).toBe(true);
  });

  it('diagnoses strep pharyngitis with sore throat + high fever', () => {
    const result = mockENTDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('sore throat'), mkSymptom('fever')],
      vitals: { temperature: 39 },
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /pharyngitis|strep|peritonsillar/i.test(n))).toBe(true);
  });
});

describe('mockDentalDiagnosis', () => {
  it('diagnoses pulpitis with toothache + sensitivity', () => {
    const result = mockDentalDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('toothache'), mkSymptom('sensitivity to cold')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /pulpitis/i.test(n))).toBe(true);
  });

  it('diagnoses periapical abscess with toothache + swelling + fever', () => {
    const result = mockDentalDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('toothache'), mkSymptom('facial swelling'), mkSymptom('fever')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /abscess/i.test(n))).toBe(true);
  });

  it('diagnoses gingivitis with bleeding gums', () => {
    const result = mockDentalDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('bleeding gums')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /gingivitis|periodontitis/i.test(n))).toBe(true);
  });

  it('diagnoses TMJ disorder with jaw pain', () => {
    const result = mockDentalDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('jaw pain')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /tmj|temporomandibular/i.test(n))).toBe(true);
  });
});

describe('mockRetinaDiagnosis', () => {
  it('diagnoses PVD with floaters + flashes', () => {
    const result = mockRetinaDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('floaters'), mkSymptom('flashes')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /vitreous|detachment|tear/i.test(n))).toBe(true);
  });

  it('diagnoses retinal detachment with floaters + flashes + curtain', () => {
    const result = mockRetinaDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('floaters'), mkSymptom('flashes'), mkSymptom('curtain over vision')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /retinal detachment|dialysis|tear/i.test(n))).toBe(true);
  });

  it('diagnoses dry AMD with gradual vision loss in older patient', () => {
    const result = mockRetinaDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('gradual vision loss')],
      patient: { age: 70 },
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /macular|amd|degeneration/i.test(n))).toBe(true);
  });

  it('diagnoses vitreous hemorrhage in diabetic with sudden floaters', () => {
    const result = mockRetinaDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('sudden vision loss'), mkSymptom('floaters')],
      patient: { diabetesType: 'TYPE2' },
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /vitreous hemorrhage|pdr|proliferative/i.test(n))).toBe(true);
  });
});

describe('mockGlaucomaDiagnosis', () => {
  it('diagnoses AACG with eye pain + halos + red eye', () => {
    const result = mockGlaucomaDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('eye pain'), mkSymptom('halos around lights'), mkSymptom('red eye')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /acute.*angle.*closure|aacg/i.test(n))).toBe(true);
  });

  it('diagnoses POAG with gradual vision loss', () => {
    const result = mockGlaucomaDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('gradual vision loss')],
      patient: { age: 65 },
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /open.*angle|poag/i.test(n))).toBe(true);
  });

  it('diagnoses ocular hypertension in asymptomatic patient', () => {
    const result = mockGlaucomaDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('asymptomatic')],
    });
    const names = result.diagnoses.map(d => d.name);
    expect(names.some(n => /ocular hypertension|preglaucom/i.test(n))).toBe(true);
  });
});

describe('getAIDiagnosis – fallback to mock', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to mock when fetch fails', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    const result = await getAIDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('fever'), mkSymptom('cough')],
      specialty: 'medicine',
    });
    expect(result).not.toBeNull();
    expect(result.diagnoses.length).toBeGreaterThan(0);
    expect(result.diagnoses[0]).toHaveProperty('name');
    expect(result.diagnoses[0]).toHaveProperty('confidence');
    expect(result.diagnoses[0]).toHaveProperty('icd10');
    expect(result.diagnoses[0]).toHaveProperty('rationale');
    expect(result).toHaveProperty('tests');
    expect(result).toHaveProperty('treatments');
    expect(result).toHaveProperty('notes');
  });

  it('falls back to mock when API returns non-ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited'),
    });
    const result = await getAIDiagnosis({
      ...baseInput,
      symptoms: [mkSymptom('fever')],
      specialty: 'medicine',
    });
    expect(result).not.toBeNull();
    expect(result.diagnoses.length).toBeGreaterThan(0);
  });
});

describe('POST /api/ai/diagnose – auth', () => {
  it('returns 401 without token', async () => {
    const res = await request(app)
      .post('/api/ai/diagnose')
      .send({ patientId: 'any' });
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .post('/api/ai/diagnose')
      .set('Authorization', 'Bearer invalid-token')
      .send({ patientId: 'any' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/ai/icd10 – auth', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/ai/icd10');
    expect(res.status).toBe(401);
  });
});
