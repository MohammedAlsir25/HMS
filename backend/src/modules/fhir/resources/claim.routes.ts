import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId } from '../utils/fhirHelpers.js';

const STATUS_MAP: Record<string, string> = {
  DRAFT: 'draft',
  SUBMITTED: 'active',
  UNDER_REVIEW: 'active',
  APPROVED: 'active',
  PARTIALLY_APPROVED: 'active',
  REJECTED: 'error',
  SETTLED: 'complete',
  CLOSED: 'complete',
};

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, status, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;
    if (status) where.status = { equals: status as string, mode: 'insensitive' };

    const count = await prisma.insuranceClaim.count({ where });
    const claims = await prisma.insuranceClaim.findMany({
      where,
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { created_at: 'desc' },
    });

    const entries = claims.map(c => ({
      resourceType: 'Claim',
      id: toFhirId(c.id),
      meta: { lastUpdated: c.updated_at?.toISOString() || new Date().toISOString() },
      status: STATUS_MAP[c.status] || 'draft',
      type: { coding: [{ display: c.claimNumber }] },
      patient: { reference: `Patient/${toFhirId(c.patientId)}` },
      total: { value: Number(c.claimAmount), currency: 'SDG' },
      created: c.created_at?.toISOString(),
    }));

    return fhirResponse(res, fhirBundle(entries, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const claim = await prisma.insuranceClaim.findUnique({ where: { id: req.params.id } });
    if (!claim) return fhirError(res, 404, 'not-found', `Claim ${req.params.id} not found`);

    const fhir = {
      resourceType: 'Claim',
      id: toFhirId(claim.id),
      meta: { lastUpdated: claim.updated_at?.toISOString() || new Date().toISOString() },
      status: STATUS_MAP[claim.status] || 'draft',
      patient: { reference: `Patient/${toFhirId(claim.patientId)}` },
      total: { value: Number(claim.claimAmount), currency: 'SDG' },
      created: claim.created_at?.toISOString(),
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
