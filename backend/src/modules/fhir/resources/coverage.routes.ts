import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { fhirResponse, fhirError, fhirBundle, toFhirId } from '../utils/fhirHelpers.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { patient, _count, _offset } = req.query;
    const where: Record<string, unknown> = {};
    if (patient) where.patientId = patient as string;

    const count = await prisma.insurancePolicy.count({ where });
    const policies = await prisma.insurancePolicy.findMany({
      where,
      include: { insuranceCompany: true },
      skip: parseInt(_offset as string) || 0,
      take: parseInt(_count as string) || 20,
      orderBy: { created_at: 'desc' },
    });

    const entries = policies.map(p => ({
      resourceType: 'Coverage',
      id: toFhirId(p.id),
      meta: { lastUpdated: p.updated_at?.toISOString() || new Date().toISOString() },
      status: p.isActive ? 'active' : 'cancelled',
      type: { coding: [{ display: p.networkType || 'health' }] },
      beneficiary: { reference: `Patient/${toFhirId(p.patientId)}` },
      period: { start: p.effectiveFrom?.toISOString(), end: p.effectiveTo?.toISOString() },
      payor: [{ reference: p.insuranceCompanyId ? `Organization/${toFhirId(p.insuranceCompanyId)}` : undefined }],
    }));

    return fhirResponse(res, fhirBundle(entries, count), req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const policy = await prisma.insurancePolicy.findUnique({
      where: { id: req.params.id },
      include: { insuranceCompany: true },
    });
    if (!policy) return fhirError(res, 404, 'not-found', `Coverage ${req.params.id} not found`);

    const fhir = {
      resourceType: 'Coverage',
      id: toFhirId(policy.id),
      meta: { lastUpdated: policy.updated_at?.toISOString() || new Date().toISOString() },
      status: policy.isActive ? 'active' : 'cancelled',
      beneficiary: { reference: `Patient/${toFhirId(policy.patientId)}` },
      period: { start: policy.effectiveFrom?.toISOString(), end: policy.effectiveTo?.toISOString() },
    };
    return fhirResponse(res, fhir, req.headers.accept as string);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return fhirError(res, 500, 'exception', message);
  }
});

export default router;
