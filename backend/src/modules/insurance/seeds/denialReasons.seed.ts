import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

const DENIAL_REASONS = [
  { code: 'MISSING_DOCUMENTATION', description: 'Missing or incomplete documentation', category: 'Documentation' },
  { code: 'AUTHORIZATION_EXPIRED', description: 'Pre-authorization has expired', category: 'Authorization' },
  { code: 'NOT_COVERED', description: 'Service not covered under patient policy', category: 'Coverage' },
  { code: 'DUPLICATE_CLAIM', description: 'Duplicate claim submission', category: 'Submission' },
  { code: 'INVALID_PATIENT_ID', description: 'Patient ID does not match records', category: 'Patient Data' },
  { code: 'EXCEEDS_MAX_COVERAGE', description: 'Amount exceeds maximum coverage', category: 'Coverage' },
  { code: 'OUT_OF_NETWORK', description: 'Provider not in network', category: 'Network' },
  { code: 'LATE_SUBMISSION', description: 'Claim submitted after deadline', category: 'Submission' },
  { code: 'INVALID_DIAGNOSIS_CODE', description: 'Diagnosis code is invalid or outdated', category: 'Clinical' },
  { code: 'PROCEDURE_NOT_MEDICAL', description: 'Procedure not deemed medically necessary', category: 'Clinical' },
  { code: 'PATIENT_NOT_ELIGIBLE', description: 'Patient not eligible on date of service', category: 'Eligibility' },
  { code: 'PRE_AUTH_REQUIRED', description: 'Pre-authorization required but not obtained', category: 'Authorization' },
  { code: 'WRONG_PAYER', description: 'Claim sent to incorrect payer', category: 'Submission' },
  { code: 'INCOMPLETE_PATIENT_INFO', description: 'Patient demographic information incomplete', category: 'Patient Data' },
  { code: 'BUNDLING_VIOLATION', description: 'Services should be bundled under single code', category: 'Coding' },
  { code: 'MODIFIER_INVALID', description: 'Invalid or missing modifier', category: 'Coding' },
  { code: 'QUANTITY_EXCEEDS_LIMIT', description: 'Service quantity exceeds allowed limit', category: 'Coverage' },
  { code: 'REFERRAL_MISSING', description: 'Required referral not attached', category: 'Authorization' },
  { code: 'COORDINATION_OF_BENEFITS', description: 'Coordination of benefits not properly documented', category: 'COB' },
  { code: 'OTHER', description: 'Other — see notes', category: 'Other' },
];

router.post('/denial-reasons/seed', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), asyncHandler(async (_req, res) => {
  const hospitalId = _req.user!.hospitalId!;

  const existing = await prisma.denialReason.findMany({
    where: { hospitalId, code: { in: DENIAL_REASONS.map((r) => r.code) } },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((r) => r.code));

  const toCreate = DENIAL_REASONS
    .filter((r) => !existingCodes.has(r.code))
    .map((r) => ({
      code: r.code,
      description: r.description,
      category: r.category,
      hospitalId,
    }));

  if (toCreate.length > 0) {
    await prisma.denialReason.createMany({ data: toCreate, skipDuplicates: true });
  }

  const results = [
    ...toCreate.map((r) => ({ action: 'created', code: r.code })),
    ...existing.map((r) => ({ action: 'skipped', code: r.code })),
  ];

  res.json({ message: 'Denial reasons seeded', results, count: toCreate.length });
}));

router.get('/denial-reasons', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const reasons = await prisma.denialReason.findMany({
    where: { hospitalId, isActive: true },
    orderBy: { code: 'asc' },
  });
  res.json(reasons);
}));

export default router;
