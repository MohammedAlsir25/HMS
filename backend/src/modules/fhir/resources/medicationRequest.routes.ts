import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId, FhirResource } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const records = await prisma.clinicalRecord.findMany({
      where,
      include: { medications: true },
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const meds: FhirResource[] = [];
    for (const record of records) {
      for (let i = 0; i < record.medications.length; i++) {
        const med = record.medications[i]!;
        meds.push({
          resourceType: 'MedicationRequest',
          id: toFhirId(`${record.id}-med-${i}`),
          meta: { lastUpdated: record.updatedAt?.toISOString() || new Date().toISOString() },
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: { coding: [{ display: med.drugName }] },
          subject: { reference: `Patient/${toFhirId(record.patientId)}` },
          authoredOn: record.createdAt?.toISOString(),
          dosageInstruction: med.dosage ? [{ text: med.dosage }] : undefined,
        });
      }
    }

    return fhirResponse(res, fhirBundle(meds, meds.length), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const parts = req.params.id.split('-');
    const idx = parseInt(parts.pop() || '0');
    const recordId = parts.join('-');
    const record = await prisma.clinicalRecord.findFirst({
      where: { id: recordId },
      include: { medications: true },
    });
    if (!record) return fhirError(res, 404, 'not-found', `MedicationRequest ${req.params.id} not found`);

    const med = record.medications[idx];
    if (!med) return fhirError(res, 404, 'not-found', `MedicationRequest ${req.params.id} not found`);

    const fhir = {
      resourceType: 'MedicationRequest',
      id: toFhirId(`${record.id}-med-${idx}`),
      meta: { lastUpdated: record.updatedAt?.toISOString() || new Date().toISOString() },
      status: 'active',
      intent: 'order',
      medicationCodeableConcept: { coding: [{ display: med.drugName }] },
      subject: { reference: `Patient/${toFhirId(record.patientId)}` },
      authoredOn: record.createdAt?.toISOString(),
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
