import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

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
      include: {
        patient: { select: { fullName: true, mrn: true } },
        fromClinic: { select: { name: true, slug: true } },
        toClinic: { select: { name: true, slug: true } },
      },
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
    const { patientId, fromClinicId, toClinicId, type, notes } = req.body;
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
    const referral = await prisma.referral.create({
      data: {
        patientId,
        fromClinicId: fromClinic.id,
        toClinicId: resolvedToClinicId,
        type,
        notes: notes || null,
      },
      include: {
        patient: { select: { fullName: true, mrn: true } },
        fromClinic: { select: { name: true, slug: true } },
        toClinic: { select: { name: true, slug: true } },
      },
    });
    res.status(201).json(referral);
  } catch (err) {
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
      include: {
        patient: { select: { fullName: true, mrn: true } },
        fromClinic: { select: { name: true, slug: true } },
        toClinic: { select: { name: true, slug: true } },
      },
    });
    res.json(referral);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Referral not found' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
