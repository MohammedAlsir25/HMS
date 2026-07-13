import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { shiftId } = req.query;
  const where: Record<string, unknown> = {};
  if (shiftId) where.shiftId = shiftId;
  const movements = await prisma.cashMovement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullName: true } } },
  });
  res.json(movements);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { shiftId, type, amount, reason } = req.body;
  if (!['PICKUP', 'DROP', 'ADJUSTMENT'].includes(type)) {
    throw new ValidationError('type must be PICKUP, DROP, or ADJUSTMENT');
  }
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, closedAt: null },
  });
  if (!shift) throw new ValidationError('Shift not found or already closed');
  const movement = await prisma.cashMovement.create({
    data: { shiftId, type, amount, reason: reason || null, userId: req.user!.id },
    include: { user: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(movement);
}));

export default router;
