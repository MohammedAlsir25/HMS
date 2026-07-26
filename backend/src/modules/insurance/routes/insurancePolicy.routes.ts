import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const patientId = req.query.patientId as string | undefined;
  const insuranceCompanyId = req.query.insuranceCompanyId as string | undefined;
  const isActive = req.query.isActive as string | undefined;

  const where: Record<string, unknown> = { hospitalId };
  if (patientId) where.patientId = patientId;
  if (insuranceCompanyId) where.insuranceCompanyId = insuranceCompanyId;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [policies, totalCount] = await Promise.all([
    prisma.insurancePolicy.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        insuranceCompany: { select: { id: true, name: true, isTpa: true } },
      },
    }),
    prisma.insurancePolicy.count({ where }),
  ]);

  res.json({ policies, totalCount });
}));

router.get('/patients/:patientId/policies', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const policies = await prisma.insurancePolicy.findMany({
    where: {
      patientId: req.params.patientId!,
      hospitalId,
      isActive: true,
    },
    include: {
      insuranceCompany: { select: { id: true, name: true, isTpa: true } },
    },
    orderBy: [{ isPrimary: 'desc' }, { effectiveTo: 'desc' }],
  });
  res.json(policies);
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const policy = await prisma.insurancePolicy.findFirst({
    where: { id: req.params.id!, hospitalId },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true, phone: true } },
      insuranceCompany: { select: { id: true, name: true, isTpa: true, phone: true, email: true } },
    },
  });
  if (!policy) throw new NotFoundError('Insurance policy not found');
  res.json(policy);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('CREATE', 'InsurancePolicy'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const {
    policyNumber, patientId, insuranceCompanyId, coveragePercent, maxCoverageAmount,
    effectiveFrom, effectiveTo, networkType, cardNumber, groupNumber, isPrimary, notes,
  } = req.body as Record<string, unknown>;

  if (!policyNumber || !patientId || !insuranceCompanyId || coveragePercent === undefined || !effectiveFrom || !effectiveTo) {
    throw new ValidationError('policyNumber, patientId, insuranceCompanyId, coveragePercent, effectiveFrom, effectiveTo are required');
  }

  const company = await prisma.insuranceCompany.findFirst({
    where: { id: insuranceCompanyId as string, hospitalId },
  });
  if (!company) throw new ValidationError('Insurance company not found');

  const patient = await prisma.patient.findFirst({
    where: { id: patientId as string, hospitalId },
  });
  if (!patient) throw new ValidationError('Patient not found');

  if ((isPrimary as boolean) ?? true) {
    await prisma.insurancePolicy.updateMany({
      where: { patientId: patientId as string, hospitalId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const policy = await prisma.insurancePolicy.create({
    data: {
      policyNumber: policyNumber as string,
      patientId: patientId as string,
      insuranceCompanyId: insuranceCompanyId as string,
      coveragePercent: parseFloat(coveragePercent as string),
      maxCoverageAmount: maxCoverageAmount ? parseFloat(maxCoverageAmount as string) : null,
      effectiveFrom: new Date(effectiveFrom as string),
      effectiveTo: new Date(effectiveTo as string),
      networkType: (networkType as string) || null,
      cardNumber: (cardNumber as string) || null,
      groupNumber: (groupNumber as string) || null,
      isPrimary: (isPrimary as boolean) ?? true,
      notes: (notes as string) || null,
      hospitalId,
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(policy);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('UPDATE', 'InsurancePolicy'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insurancePolicy.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Insurance policy not found');

  const {
    policyNumber, patientId, insuranceCompanyId, coveragePercent, maxCoverageAmount,
    effectiveFrom, effectiveTo, networkType, cardNumber, groupNumber, isPrimary, isActive, notes,
  } = req.body as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (policyNumber !== undefined) data.policyNumber = policyNumber;
  if (patientId !== undefined) data.patientId = patientId;
  if (insuranceCompanyId !== undefined) data.insuranceCompanyId = insuranceCompanyId;
  if (coveragePercent !== undefined) data.coveragePercent = parseFloat(coveragePercent as string);
  if (maxCoverageAmount !== undefined) data.maxCoverageAmount = maxCoverageAmount ? parseFloat(maxCoverageAmount as string) : null;
  if (effectiveFrom !== undefined) data.effectiveFrom = new Date(effectiveFrom as string);
  if (effectiveTo !== undefined) data.effectiveTo = new Date(effectiveTo as string);
  if (networkType !== undefined) data.networkType = networkType || null;
  if (cardNumber !== undefined) data.cardNumber = cardNumber || null;
  if (groupNumber !== undefined) data.groupNumber = groupNumber || null;
  if (isPrimary !== undefined) {
    if (isPrimary) {
      await prisma.insurancePolicy.updateMany({
        where: { patientId: existing.patientId, hospitalId, isPrimary: true, id: { not: req.params.id! } },
        data: { isPrimary: false },
      });
    }
    data.isPrimary = isPrimary;
  }
  if (isActive !== undefined) data.isActive = isActive;
  if (notes !== undefined) data.notes = notes || null;

  const policy = await prisma.insurancePolicy.update({
    where: { id: req.params.id! },
    data,
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      insuranceCompany: { select: { id: true, name: true } },
    },
  });
  res.json(policy);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('DELETE', 'InsurancePolicy'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insurancePolicy.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Insurance policy not found');

  await prisma.insurancePolicy.update({
    where: { id: req.params.id! },
    data: { isActive: false },
  });
  res.json({ message: 'Insurance policy deactivated' });
}));

export default router;
