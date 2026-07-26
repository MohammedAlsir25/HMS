import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const count = await prisma.clinicalRecord.count({ where });
    const records = await prisma.clinicalRecord.findMany({
      where,
      include: { patient: true, clinic: true },
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const entries = records.map(r => ({
      resourceType: 'Encounter',
      id: toFhirId(r.id),
      meta: { lastUpdated: r.updatedAt?.toISOString() || new Date().toISOString() },
      status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: r.clinic?.type || 'AMB' },
      type: [{ coding: [{ display: r.clinic?.name || r.diagnosis || 'Consultation' }] }],
      subject: { reference: `Patient/${toFhirId(r.patientId)}` },
      period: { start: r.encounterDate?.toISOString(), end: r.updatedAt?.toISOString() },
    }));

    return fhirResponse(res, fhirBundle(entries, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const record = await prisma.clinicalRecord.findUnique({
      where: { id: req.params.id },
      include: { patient: true, clinic: true },
    });
    if (!record) return fhirError(res, 404, 'not-found', `Encounter ${req.params.id} not found`);

    const fhir = {
      resourceType: 'Encounter',
      id: toFhirId(record.id),
      meta: { lastUpdated: record.updatedAt?.toISOString() || new Date().toISOString() },
      status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: record.clinic?.type || 'AMB' },
      subject: { reference: `Patient/${toFhirId(record.patientId)}` },
      period: { start: record.encounterDate?.toISOString(), end: record.updatedAt?.toISOString() },
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
