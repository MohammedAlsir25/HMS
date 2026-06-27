import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createReferralSchema, updateReferralStatusSchema } from '../../schemas/referral.schema.js';
import { NotFoundError } from '../../utils/errors.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { $Enums, Prisma } from '@prisma/client';

const router = Router();
import prisma from '../../lib/prisma.js';

const REFERRAL_INCLUDE = {
  patient: { select: { fullName: true, mrn: true } },
  fromClinic: { select: { name: true, slug: true } },
  toClinic: { select: { name: true, slug: true } },
  medications: true,
  tests: { include: { test: true } },
};

async function resolveClinic(identifier: string) {
  let clinic = await prisma.clinic.findUnique({ where: { id: identifier } });
  if (!clinic) clinic = await prisma.clinic.findUnique({ where: { slug: identifier } });
  return clinic;
}

router.get('/', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const { patientId, fromClinicId } = req.query as { patientId?: string; fromClinicId?: string };
  const where: Record<string, unknown> = {};
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

router.post('/', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), auditMiddleware('CREATE_REFERRAL', 'Referral'), validate(createReferralSchema), asyncHandler(async (req, res) => {
  const body = req.body as {
    patientId?: string;
    fromClinicId?: string;
    toClinicId?: string;
    type?: string;
    notes?: string;
    medications?: Array<Record<string, unknown>>;
    testIds?: string[];
  };
  const { patientId, fromClinicId, toClinicId, type, notes, medications, testIds } = body;
  const fromClinic = await resolveClinic(fromClinicId!);
  if (!fromClinic) throw new NotFoundError('From clinic not found');
  let resolvedToClinicId = toClinicId ?? null;
  if (resolvedToClinicId) {
    const toClinic = await resolveClinic(resolvedToClinicId);
    resolvedToClinicId = toClinic ? toClinic.id : null;
  }

  const data: Record<string, unknown> = {
    patientId,
    fromClinicId: fromClinic.id,
    toClinicId: resolvedToClinicId,
    type,
    notes: notes || null,
  };

  if (type === 'PHARMACY_DISPATCH' && medications?.length) {
    data.medications = {
      create: medications.map((m: Record<string, unknown>) => ({
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
      create: testIds.map((testId: string) => ({ testId })),
    };
  }

  const referral = await prisma.referral.create({
    data: data as Prisma.ReferralCreateInput,
    include: REFERRAL_INCLUDE,
  });

  if (type === 'LAB_DISPATCH' && testIds?.length) {
    await prisma.diagnosticOrder.create({
      data: {
        orderType: 'LAB',
        patientId: patientId as string,
        fromClinicId: fromClinic.id,
        requestedById: req.user!.id,
        referralId: referral.id,
        clinicalNotes: (notes as string) || null,
        tests: { create: (testIds as string[]).map((testId: string) => ({ testId })) },
      },
    });
  }

  res.status(201).json(referral);
}));

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), auditMiddleware('UPDATE_REFERRAL_STATUS', 'Referral'), validate(updateReferralStatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body as { status?: string };
  const referral = await prisma.referral.update({
    where: { id: req.params.id },
    data: { status: status as $Enums.ReferralStatus },
    include: REFERRAL_INCLUDE,
  });
  res.json(referral);
}));

export default router;

