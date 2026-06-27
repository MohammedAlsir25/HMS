import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { $Enums } from '@prisma/client';

const router = Router();
import prisma from '../../lib/prisma.js';

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as Record<string, string>;
  const valid = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
  if (!valid.includes(status!)) throw new ValidationError('Invalid status');
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: status as $Enums.AppointmentStatus },
    include: { patient: { select: { fullName: true, mrn: true } as const } },
  });
  res.json(appointment);
}));

router.patch('/:id/priority', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { priority } = req.body as Record<string, unknown>;
  if (typeof priority !== 'number' || priority < 0 || priority > 10) {
    throw new ValidationError('Priority must be a number 0–10');
  }
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { priority },
    include: { patient: { select: { fullName: true, mrn: true } as const } },
  });
  res.json(appointment);
}));

export default router;
