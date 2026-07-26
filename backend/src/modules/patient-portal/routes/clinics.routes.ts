import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { NotFoundError } from '../../../utils/errors.js';

const router = Router();

router.get('/', asyncHandler(async (_req, res) => {
  const clinics = await prisma.clinic.findMany({
    where: { isActive: true, is_deleted: false },
    select: { id: true, name: true, hospitalId: true, type: true, consultationFee: true },
    orderBy: { name: 'asc' },
  });
  res.json({ clinics });
}));

router.get('/:id/doctors', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const clinic = await prisma.clinic.findFirst({
    where: { id, isActive: true, is_deleted: false },
    select: { id: true },
  });
  if (!clinic) {
    throw new NotFoundError('Clinic not found');
  }
  const doctors = await prisma.user.findMany({
    where: { clinicId: id, isActive: true },
    select: { id: true, fullName: true, phone: true },
    orderBy: { fullName: 'asc' },
  });
  res.json({ doctors });
}));

export default router;
