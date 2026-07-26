import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';
import { generatePreAuthRefNumber } from '../utils/preAuthRefGenerator.js';

const router = Router();

const VALID_PREAUTH_TRANSITIONS: Record<string, string[]> = {
  SUBMITTED: ['UNDER_REVIEW', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CANCELLED'],
  PARTIALLY_APPROVED: ['CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  EXPIRED: [],
};

function validatePreAuthTransition(current: string, next: string): void {
  const allowed = VALID_PREAUTH_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new ValidationError(`Invalid status transition: ${current} → ${next}`);
  }
}

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
    where.submittedAt = {} as Record<string, unknown>;
    if (startDate) (where.submittedAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.submittedAt as Record<string, unknown>).lte = end;
    }
  }

  const [authorizations, totalCount] = await Promise.all([
    prisma.preAuthorization.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        insurancePolicy: { select: { id: true, policyNumber: true } },
        insuranceCompany: { select: { id: true, name: true } },
        submittedBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.preAuthorization.count({ where }),
  ]);

  res.json({ authorizations, totalCount });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const auth = await prisma.preAuthorization.findFirst({
    where: { id: req.params.id!, hospitalId },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true, phone: true } },
      insurancePolicy: true,
      insuranceCompany: { select: { id: true, name: true, contactPerson: true, phone: true, email: true } },
      submittedBy: { select: { id: true, fullName: true } },
      reviewedBy: { select: { id: true, fullName: true } },
    },
  });
  if (!auth) throw new NotFoundError('Pre-authorization not found');
  res.json(auth);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('CREATE', 'PreAuthorization'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const userId = req.user!.id;
  const {
    patientId, insurancePolicyId, insuranceCompanyId, diagnosis, diagnosisCode,
    plannedProcedures, estimatedTotalCost, clinicalNotes, expiresAt,
  } = req.body as Record<string, unknown>;

  if (!patientId || !insurancePolicyId || !insuranceCompanyId || !diagnosis || !plannedProcedures || estimatedTotalCost === undefined) {
    throw new ValidationError('patientId, insurancePolicyId, insuranceCompanyId, diagnosis, plannedProcedures, estimatedTotalCost are required');
  }

  const referenceNumber = await generatePreAuthRefNumber(hospitalId);

  const auth = await prisma.preAuthorization.create({
    data: {
      referenceNumber,
      patientId: patientId as string,
      insurancePolicyId: insurancePolicyId as string,
      insuranceCompanyId: insuranceCompanyId as string,
      diagnosis: diagnosis as string,
      diagnosisCode: (diagnosisCode as string) || null,
      plannedProcedures: plannedProcedures as object,
      estimatedTotalCost: parseFloat(estimatedTotalCost as string),
      clinicalNotes: (clinicalNotes as string) || null,
      submittedById: userId,
      expiresAt: expiresAt ? new Date(expiresAt as string) : null,
      hospitalId,
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(auth);
}));

router.patch('/:id/approve', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('APPROVE', 'PreAuthorization'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const userId = req.user!.id;
  const existing = await prisma.preAuthorization.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Pre-authorization not found');
  validatePreAuthTransition(existing.status, 'APPROVED');

  const { approvedAmount } = req.body as Record<string, unknown>;
  if (approvedAmount === undefined) throw new ValidationError('approvedAmount is required');

  const auth = await prisma.preAuthorization.update({
    where: { id: req.params.id! },
    data: {
      status: 'APPROVED',
      approvedAmount: parseFloat(approvedAmount as string),
      reviewedById: userId,
      reviewedAt: new Date(),
    },
    include: {
      patient: { select: { id: true, fullName: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });
  res.json(auth);
}));

router.patch('/:id/partial-approve', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('PARTIAL_APPROVE', 'PreAuthorization'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const userId = req.user!.id;
  const existing = await prisma.preAuthorization.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Pre-authorization not found');
  validatePreAuthTransition(existing.status, 'PARTIALLY_APPROVED');

  const { approvedAmount } = req.body as Record<string, unknown>;
  if (approvedAmount === undefined) throw new ValidationError('approvedAmount is required');

  const auth = await prisma.preAuthorization.update({
    where: { id: req.params.id! },
    data: {
      status: 'PARTIALLY_APPROVED',
      approvedAmount: parseFloat(approvedAmount as string),
      reviewedById: userId,
      reviewedAt: new Date(),
    },
    include: {
      patient: { select: { id: true, fullName: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });
  res.json(auth);
}));

router.patch('/:id/reject', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('REJECT', 'PreAuthorization'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const userId = req.user!.id;
  const existing = await prisma.preAuthorization.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Pre-authorization not found');
  validatePreAuthTransition(existing.status, 'REJECTED');

  const { rejectionReason } = req.body as Record<string, unknown>;
  if (!rejectionReason) throw new ValidationError('rejectionReason is required');

  const auth = await prisma.preAuthorization.update({
    where: { id: req.params.id! },
    data: {
      status: 'REJECTED',
      rejectionReason: rejectionReason as string,
      reviewedById: userId,
      reviewedAt: new Date(),
    },
    include: {
      patient: { select: { id: true, fullName: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });
  res.json(auth);
}));

router.patch('/:id/cancel', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('CANCEL', 'PreAuthorization'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.preAuthorization.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Pre-authorization not found');
  validatePreAuthTransition(existing.status, 'CANCELLED');

  const auth = await prisma.preAuthorization.update({
    where: { id: req.params.id! },
    data: { status: 'CANCELLED' },
    include: {
      patient: { select: { id: true, fullName: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });
  res.json(auth);
}));

export default router;
