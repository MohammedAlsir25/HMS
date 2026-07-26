import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';
import { generateClaimNumber } from '../utils/claimNumberGenerator.js';

const router = Router();

const VALID_CLAIM_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SUBMITTED', 'CLOSED'],
  SUBMITTED: ['UNDER_REVIEW', 'CLOSED'],
  UNDER_REVIEW: ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CLOSED'],
  APPROVED: ['SETTLED', 'CLOSED'],
  PARTIALLY_APPROVED: ['SETTLED', 'CLOSED'],
  REJECTED: ['CLOSED'],
  SETTLED: ['CLOSED'],
  CLOSED: [],
};

function validateClaimTransition(current: string, next: string): void {
  const allowed = VALID_CLAIM_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new ValidationError(`Invalid status transition: ${current} → ${next}`);
  }
}

router.get('/dashboard', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const where: Record<string, unknown> = { hospitalId };

  const [statusCounts, amountSums, claims, totalClaims] = await Promise.all([
    prisma.insuranceClaim.groupBy({
      by: ['status'],
      where,
      _count: { id: true },
    }),
    prisma.insuranceClaim.aggregate({
      where,
      _sum: { claimAmount: true, approvedAmount: true, paidAmount: true },
    }),
    prisma.insuranceClaim.findMany({
      where: { ...where, submittedAt: { not: null } },
      select: { submittedAt: true, status: true },
    }),
    prisma.insuranceClaim.count({ where }),
  ]);

  const now = new Date();
  const agingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const activeStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED'];

  for (const claim of claims) {
    if (!activeStatuses.includes(claim.status) || !claim.submittedAt) continue;
    const daysSince = Math.floor((now.getTime() - new Date(claim.submittedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 30) agingBuckets['0-30']++;
    else if (daysSince <= 60) agingBuckets['31-60']++;
    else if (daysSince <= 90) agingBuckets['61-90']++;
    else agingBuckets['90+']++;
  }

  const byStatus: Record<string, number> = {};
  for (const s of statusCounts) {
    byStatus[s.status] = s._count.id;
  }

  const rejectedCount = byStatus['REJECTED'] || 0;
  const submittedCount = totalClaims;
  const rejectionRate = submittedCount > 0 ? Math.round((rejectedCount / submittedCount) * 10000) / 100 : 0;

  res.json({
    totalClaims,
    byStatus,
    totalClaimed: Number(amountSums._sum.claimAmount) || 0,
    totalApproved: Number(amountSums._sum.approvedAmount) || 0,
    totalPaid: Number(amountSums._sum.paidAmount) || 0,
    agingBuckets,
    rejectionRate,
  });
}));

router.get('/pending-reviews', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const claims = await prisma.insuranceClaim.findMany({
    where: {
      hospitalId,
      status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
    },
    orderBy: { submittedAt: 'asc' },
    take: 50,
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });
  res.json(claims);
}));

router.get('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const patientId = req.query.patientId as string | undefined;
  const insuranceCompanyId = req.query.insuranceCompanyId as string | undefined;
  const status = req.query.status as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const where: Record<string, unknown> = { hospitalId };
  if (patientId) where.patientId = patientId;
  if (insuranceCompanyId) where.insuranceCompanyId = insuranceCompanyId;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.created_at = {} as Record<string, unknown>;
    if (startDate) (where.created_at as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.created_at as Record<string, unknown>).lte = end;
    }
  }

  const [claims, totalCount] = await Promise.all([
    prisma.insuranceClaim.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        insurancePolicy: { select: { id: true, policyNumber: true } },
        insuranceCompany: { select: { id: true, name: true } },
      },
    }),
    prisma.insuranceClaim.count({ where }),
  ]);

  res.json({ claims, totalCount });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const claim = await prisma.insuranceClaim.findFirst({
    where: { id: req.params.id!, hospitalId },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true, phone: true } },
      insurancePolicy: true,
      insuranceCompany: { select: { id: true, name: true, contactPerson: true, phone: true, email: true } },
      invoice: {
        include: { items: { include: { serviceItem: { select: { id: true, name: true } } } } },
      },
      preAuthorization: true,
      createdBy: { select: { id: true, fullName: true } },
      settlements: true,
    },
  });
  if (!claim) throw new NotFoundError('Insurance claim not found');
  res.json(claim);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('CREATE', 'InsuranceClaim'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const userId = req.user!.id;
  const {
    patientId, insurancePolicyId, insuranceCompanyId, invoiceId,
    preAuthorizationId, notes,
  } = req.body as Record<string, unknown>;

  if (!patientId || !insurancePolicyId || !insuranceCompanyId) {
    throw new ValidationError('patientId, insurancePolicyId, insuranceCompanyId are required');
  }

  const claimNumber = await generateClaimNumber(hospitalId);

  let claimAmount = 0;
  let clinicalRecords: unknown = null;
  let labResults: unknown = null;

  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId as string, hospitalId },
      include: { items: true },
    });
    if (!invoice) throw new ValidationError('Invoice not found');
    claimAmount = Number(invoice.total);
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [recentRecords, recentLabs] = await Promise.all([
    prisma.clinicalRecord.findMany({
      where: {
        patientId: patientId as string,
        hospitalId,
        createdAt: { gte: threeMonthsAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, diagnosis: true, notes: true, createdAt: true },
    }),
    prisma.diagnosticOrder.findMany({
      where: {
        patientId: patientId as string,
        hospitalId,
        createdAt: { gte: threeMonthsAgo },
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, createdAt: true },
    }),
  ]);

  if (recentRecords.length > 0) clinicalRecords = recentRecords;
  if (recentLabs.length > 0) labResults = recentLabs;

  const claim = await prisma.insuranceClaim.create({
    data: {
      claimNumber,
      patientId: patientId as string,
      insurancePolicyId: insurancePolicyId as string,
      insuranceCompanyId: insuranceCompanyId as string,
      invoiceId: (invoiceId as string) || null,
      preAuthorizationId: (preAuthorizationId as string) || null,
      claimAmount,
      clinicalRecords: clinicalRecords as object,
      labResults: labResults as object,
      notes: (notes as string) || null,
      createdById: userId,
      hospitalId,
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(claim);
}));

router.patch('/:id/submit', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('SUBMIT', 'InsuranceClaim'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insuranceClaim.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Insurance claim not found');
  validateClaimTransition(existing.status, 'SUBMITTED');

  const claim = await prisma.insuranceClaim.update({
    where: { id: req.params.id! },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
    include: { patient: { select: { id: true, fullName: true } } },
  });
  res.json(claim);
}));

router.patch('/:id/approve', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('APPROVE', 'InsuranceClaim'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insuranceClaim.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Insurance claim not found');
  validateClaimTransition(existing.status, 'APPROVED');

  const { approvedAmount } = req.body as Record<string, unknown>;
  if (approvedAmount === undefined) throw new ValidationError('approvedAmount is required');

  const claim = await prisma.insuranceClaim.update({
    where: { id: req.params.id! },
    data: { status: 'APPROVED', approvedAmount: parseFloat(approvedAmount as string) },
    include: { patient: { select: { id: true, fullName: true } } },
  });
  res.json(claim);
}));

router.patch('/:id/reject', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('REJECT', 'InsuranceClaim'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insuranceClaim.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Insurance claim not found');
  validateClaimTransition(existing.status, 'REJECTED');

  const { rejectionReason } = req.body as Record<string, unknown>;
  if (!rejectionReason) throw new ValidationError('rejectionReason is required');

  const claim = await prisma.insuranceClaim.update({
    where: { id: req.params.id! },
    data: { status: 'REJECTED', rejectionReason: rejectionReason as string },
    include: { patient: { select: { id: true, fullName: true } } },
  });
  res.json(claim);
}));

router.patch('/:id/settle', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('SETTLE', 'InsuranceClaim'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insuranceClaim.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Insurance claim not found');
  validateClaimTransition(existing.status, 'SETTLED');

  const { paidAmount } = req.body as Record<string, unknown>;
  if (paidAmount === undefined) throw new ValidationError('paidAmount is required');

  const claim = await prisma.insuranceClaim.update({
    where: { id: req.params.id! },
    data: { status: 'SETTLED', paidAmount: parseFloat(paidAmount as string), settledAt: new Date() },
    include: { patient: { select: { id: true, fullName: true } } },
  });
  res.json(claim);
}));

export default router;
