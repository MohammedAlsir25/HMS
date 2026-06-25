import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const { date, orRoom } = req.query as { date?: string; orRoom?: string };
  const where: Record<string, unknown> = {};
  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.startTime = { gte: dayStart, lt: dayEnd };
  }
  if (orRoom) where.orRoom = parseInt(orRoom, 10);

  const surgeries = await prisma.surgery.findMany({
    where,
    include: { patient: { select: { fullName: true, mrn: true } } },
    orderBy: [{ orRoom: 'asc' }, { startTime: 'asc' }],
  });
  res.json(surgeries);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { patientId, orRoom, startTime, endTime, notes } = req.body as Record<string, unknown>;
  if (!patientId || !orRoom || !startTime || !endTime) {
    throw new ValidationError('patientId, orRoom, startTime, endTime are required');
  }
  const surgery = await prisma.surgery.create({
    data: {
      patientId: patientId as string,
      orRoom: parseInt(orRoom as string, 10),
      startTime: new Date(startTime as string),
      endTime: new Date(endTime as string),
      notes: (notes as string) || null,
    },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.status(201).json(surgery);
}));

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  type SurgeryStatus = 'SCHEDULED' | 'PREP' | 'IN_SURGERY' | 'RECOVERY' | 'COMPLETED' | 'CANCELLED';
  const { status } = req.body as { status?: SurgeryStatus };
  const valid: SurgeryStatus[] = ['SCHEDULED', 'PREP', 'IN_SURGERY', 'RECOVERY', 'COMPLETED', 'CANCELLED'];
  if (!status || !valid.includes(status)) throw new ValidationError('Invalid status');
  const surgery = await prisma.surgery.update({
    where: { id: req.params.id },
    data: { status },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(surgery);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { startTime, endTime, orRoom, notes } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (startTime) data.startTime = new Date(startTime as string);
  if (endTime) data.endTime = new Date(endTime as string);
  if (orRoom) data.orRoom = parseInt(orRoom as string, 10);
  if (notes !== undefined) data.notes = notes;
  const surgery = await prisma.surgery.update({
    where: { id: req.params.id },
    data,
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(surgery);
}));

export default router;
