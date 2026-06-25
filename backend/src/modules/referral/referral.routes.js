import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createReferralSchema, updateReferralStatusSchema } from '../../schemas/referral.schema.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

const REFERRAL_INCLUDE = {
  patient: { select: { fullName: true, mrn: true } },
  fromClinic: { select: { name: true, slug: true } },
  toClinic: { select: { name: true, slug: true } },
  medications: true,
  tests: { include: { test: true } },
};

async function resolveClinic(identifier) {
  let clinic = await prisma.clinic.findUnique({ where: { id: identifier } });
  if (!clinic) clinic = await prisma.clinic.findUnique({ where: { slug: identifier } });
  return clinic;
}

router.get('/', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const { patientId, fromClinicId } = req.query;
  const where = {};
  if (patientId) where.patientId = patientId;
  if (fromClinicId) {
    const clinic = await resolveClinic(fromClinicId);
    if (clinic) where.fromClinicId = clinic.id;
  }
  const referrals = await prisma.referral.findMany({
    where,
    include: REFERRAL_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(referrals);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), auditMiddleware('CREATE_REFERRAL'), validate(createReferralSchema), asyncHandler(async (req, res) => {
  const { patientId, fromClinicId, toClinicId, type, notes, medications, testIds } = req.body;
  const fromClinic = await resolveClinic(fromClinicId);
  if (!fromClinic) throw new NotFoundError('From clinic not found');
  let resolvedToClinicId = toClinicId || null;
  if (resolvedToClinicId) {
    const toClinic = await resolveClinic(resolvedToClinicId);
    resolvedToClinicId = toClinic ? toClinic.id : null;
  }

  const data = {
    patientId,
    fromClinicId: fromClinic.id,
    toClinicId: resolvedToClinicId,
    type,
    notes: notes || null,
  };

  if (type === 'PHARMACY_DISPATCH' && medications?.length) {
    data.medications = {
      create: medications.map((m) => ({
        drugName: m.drugName,
        dosage: m.dosage || null,
        frequency: m.frequency || null,
        duration: m.duration || null,
        route: m.route || null,
        notes: m.notes || null,
      })),
    };
  }

  if (type === 'LAB_DISPATCH' && testIds?.length) {
    data.tests = {
      create: testIds.map((testId) => ({ testId })),
    };
  }

  const referral = await prisma.referral.create({
    data,
    include: REFERRAL_INCLUDE,
  });

  if (type === 'LAB_DISPATCH' && testIds?.length) {
    await prisma.diagnosticOrder.create({
      data: {
        orderType: 'LAB',
        patientId,
        fromClinicId: fromClinic.id,
        requestedById: req.user.id,
        referralId: referral.id,
        clinicalNotes: notes || null,
        tests: { create: testIds.map((testId) => ({ testId })) },
      },
    });
  }

  res.status(201).json(referral);
}));

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), auditMiddleware('UPDATE_REFERRAL_STATUS'), validate(updateReferralStatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const referral = await prisma.referral.update({
    where: { id: req.params.id },
    data: { status },
    include: REFERRAL_INCLUDE,
  });
  res.json(referral);
}));

export default router;
