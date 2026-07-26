import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const count = await prisma.surgery.count({ where });
    const surgeries = await prisma.surgery.findMany({
      where,
      include: { operationType: true },
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { startTime: 'desc' },
    });

    const entries = surgeries.map(s => ({
      resourceType: 'Procedure',
      id: toFhirId(s.id),
      meta: { lastUpdated: s.updatedAt?.toISOString() || new Date().toISOString() },
      status: s.status === 'COMPLETED' ? 'completed' : s.status === 'IN_SURGERY' ? 'in-progress' : 'not-done',
      code: { text: s.operationType?.name || s.anesthesiaType || 'Surgery' },
      subject: { reference: `Patient/${toFhirId(s.patientId)}` },
      performedDateTime: s.startTime?.toISOString(),
    }));

    return fhirResponse(res, fhirBundle(entries, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const surgery = await prisma.surgery.findUnique({
      where: { id: req.params.id },
      include: { operationType: true },
    });
    if (!surgery) return fhirError(res, 404, 'not-found', `Procedure ${req.params.id} not found`);

    const fhir = {
      resourceType: 'Procedure',
      id: toFhirId(surgery.id),
      meta: { lastUpdated: surgery.updatedAt?.toISOString() || new Date().toISOString() },
      status: surgery.status === 'COMPLETED' ? 'completed' : surgery.status === 'IN_SURGERY' ? 'in-progress' : 'not-done',
      code: { text: surgery.operationType?.name || surgery.anesthesiaType || 'Surgery' },
      subject: { reference: `Patient/${toFhirId(surgery.patientId)}` },
      performedDateTime: surgery.startTime?.toISOString(),
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
