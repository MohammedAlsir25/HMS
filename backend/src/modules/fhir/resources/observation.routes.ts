import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId, FhirResource } from '../utils/fhirHelpers.js';

const VITAL_CODES: Record<string, { code: string; display: string; unit: string }> = {
  bloodPressureSystolic: { code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg' },
  bloodPressureDiastolic: { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg' },
  heartRate: { code: '8867-4', display: 'Heart rate', unit: '/min' },
  temperature: { code: '8310-5', display: 'Body temperature', unit: 'Cel' },
  spo2: { code: '59408-5', display: 'Oxygen saturation', unit: '%' },
  weight: { code: '29463-7', display: 'Body weight', unit: 'kg' },
  bloodGlucose: { code: '2345-7', display: 'Glucose [Mass/volume] in Serum or Plasma', unit: 'mg/dL' },
};

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, code, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const count = await prisma.vitalSign.count({ where });
    const vitals = await prisma.vitalSign.findMany({
      where,
      include: { clinicalRecord: true },
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { recordedAt: 'desc' },
    });

    const observations: FhirResource[] = [];
    for (const v of vitals) {
      const vitalFields: Record<string, unknown> = {
        bloodPressureSystolic: v.bloodPressureSystolic,
        bloodPressureDiastolic: v.bloodPressureDiastolic,
        heartRate: v.heartRate,
        temperature: v.temperature ? Number(v.temperature) : undefined,
        spo2: v.spo2,
        weight: v.weight ? Number(v.weight) : undefined,
        bloodGlucose: v.bloodGlucose,
      };
      for (const [key, val] of Object.entries(vitalFields)) {
        if (val === null || val === undefined) continue;
        const mapping = VITAL_CODES[key];
        if (!mapping) continue;
        if (code && mapping.code !== code) continue;
        observations.push({
          resourceType: 'Observation',
          id: toFhirId(`${v.id}-${key}`),
          meta: { lastUpdated: v.updated_at?.toISOString() || new Date().toISOString() },
          status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
          code: { coding: [{ system: 'http://loinc.org', code: mapping.code, display: mapping.display }] },
          subject: { reference: `Patient/${toFhirId(v.clinicalRecord.patientId)}` },
          effectiveDateTime: v.recordedAt?.toISOString(),
          valueQuantity: { value: Number(val), unit: mapping.unit, system: 'http://unitsofmeasure.org', code: mapping.unit },
        });
      }
    }

    return fhirResponse(res, fhirBundle(observations, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const vital = await prisma.vitalSign.findUnique({
      where: { id: req.params.id },
      include: { clinicalRecord: true },
    });
    if (!vital) return fhirError(res, 404, 'not-found', `Observation ${req.params.id} not found`);

    const vitalFields: Record<string, unknown> = {
      bloodPressureSystolic: vital.bloodPressureSystolic,
      bloodPressureDiastolic: vital.bloodPressureDiastolic,
      heartRate: vital.heartRate,
      temperature: vital.temperature ? Number(vital.temperature) : undefined,
      spo2: vital.spo2,
      weight: vital.weight ? Number(vital.weight) : undefined,
      bloodGlucose: vital.bloodGlucose,
    };
    const firstKey = Object.entries(vitalFields).find(([, v]) => v !== null && v !== undefined)?.[0] || 'heartRate';
    const mapping = VITAL_CODES[firstKey]!;

    const fhir = {
      resourceType: 'Observation',
      id: toFhirId(vital.id),
      meta: { lastUpdated: vital.updated_at?.toISOString() || new Date().toISOString() },
      status: 'final',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
      code: { coding: [{ system: 'http://loinc.org', code: mapping.code, display: mapping.display }] },
      subject: { reference: `Patient/${toFhirId(vital.clinicalRecord.patientId)}` },
      effectiveDateTime: vital.recordedAt?.toISOString(),
      valueQuantity: { value: Number(vitalFields[firstKey]), unit: mapping.unit, system: 'http://unitsofmeasure.org', code: mapping.unit },
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
