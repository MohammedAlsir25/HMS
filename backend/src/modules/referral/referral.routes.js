import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
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

router.get('/', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), async (req, res) => {
  try {
    const { patientId, fromClinicId, toClinicId, type, notes, medications, testIds } = req.body;
    if (!patientId || !fromClinicId || !type) {
      return res.status(400).json({ message: 'patientId, fromClinicId, and type are required' });
    }
    const fromClinic = await resolveClinic(fromClinicId);
    if (!fromClinic) return res.status(404).json({ message: 'From clinic not found' });
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
  } catch (err) {
    console.error('Referral create error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['PENDING', 'DISPATCHED', 'FULFILLED', 'CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const referral = await prisma.referral.update({
      where: { id: req.params.id },
      data: { status },
      include: REFERRAL_INCLUDE,
    });
    res.json(referral);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Referral not found' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
