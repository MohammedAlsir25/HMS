import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId, FhirResource } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const count = await prisma.clinicalRecord.count({ where });
    const records = await prisma.clinicalRecord.findMany({
      where,
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const conditions: FhirResource[] = [];
    for (const record of records) {
      if (!record.diagnosis) continue;
      conditions.push({
        resourceType: 'Condition',
        id: toFhirId(record.id),
        meta: { lastUpdated: record.updatedAt?.toISOString() || new Date().toISOString() },
        clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
        code: { text: record.diagnosis },
        subject: { reference: `Patient/${toFhirId(record.patientId)}` },
        recordedDate: record.createdAt?.toISOString(),
      });
    }

    return fhirResponse(res, fhirBundle(conditions, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await prisma.clinicalRecord.findFirst({ where: { id: req.params.id } });
    if (!record) return fhirError(res, 404, 'not-found', `Condition ${req.params.id} not found`);

    const fhir = {
      resourceType: 'Condition',
      id: toFhirId(record.id),
      meta: { lastUpdated: record.updatedAt?.toISOString() || new Date().toISOString() },
      clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
      code: { text: record.diagnosis || 'Unknown' },
      subject: { reference: `Patient/${toFhirId(record.patientId)}` },
      recordedDate: record.createdAt?.toISOString(),
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
