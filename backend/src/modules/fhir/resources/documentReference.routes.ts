import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const count = await prisma.patientFile.count({ where });
    const files = await prisma.patientFile.findMany({
      where,
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const entries = files.map(f => ({
      resourceType: 'DocumentReference',
      id: toFhirId(f.id),
      meta: { lastUpdated: f.updated_at?.toISOString() || new Date().toISOString() },
      status: 'current',
      type: { coding: [{ display: f.mimeType || 'clinical-document' }] },
      subject: { reference: `Patient/${toFhirId(f.patientId)}` },
      content: [{ attachment: { contentType: f.mimeType, url: f.storedPath, title: f.originalName } }],
      created: f.createdAt?.toISOString(),
    }));

    return fhirResponse(res, fhirBundle(entries, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const file = await prisma.patientFile.findUnique({ where: { id: req.params.id } });
    if (!file) return fhirError(res, 404, 'not-found', `DocumentReference ${req.params.id} not found`);

    const fhir = {
      resourceType: 'DocumentReference',
      id: toFhirId(file.id),
      meta: { lastUpdated: file.updated_at?.toISOString() || new Date().toISOString() },
      status: 'current',
      type: { coding: [{ display: file.mimeType || 'clinical-document' }] },
      subject: { reference: `Patient/${toFhirId(file.patientId)}` },
      content: [{ attachment: { contentType: file.mimeType, url: file.storedPath, title: file.originalName } }],
      created: file.createdAt?.toISOString(),
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
