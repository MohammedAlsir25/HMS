import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.post('/open', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const existing = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (existing) throw new ValidationError('A shift is already open. Close it first.');
  const shift = await prisma.shift.create({
    data: { userId: req.user!.id, openedAt: new Date() },
    include: { user: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(shift);
}));

router.post('/close', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findFirst({ where: { closedAt: null }, include: { transactions: true } });
  if (!shift) throw new ValidationError('No open shift to close.');
  const { expectedTotal, actualTotal, notes } = req.body;
  const computedTotal = shift.transactions.reduce((acc, t) => acc + Number(t.amount), 0);
  const closed = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      closedAt: new Date(),
      expectedTotal: expectedTotal !== undefined ? expectedTotal : computedTotal,
      actualTotal: actualTotal !== undefined ? actualTotal : computedTotal,
      notes: notes || null,
    },
    include: { user: { select: { id: true, fullName: true } } },
  });
  res.json(closed);
}));

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (_req, res) => {
  const shifts = await prisma.shift.findMany({
    orderBy: { openedAt: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, fullName: true } },
      _count: { select: { transactions: true } } as unknown as Record<string, number>,
    },
  });
  const shiftsWithTotal = shifts.map((s) => ({
    id: s.id, openedAt: s.openedAt, closedAt: s.closedAt,
    userId: s.userId, user: s.user,
    transactionTotal: (s as unknown as { _count: Record<string, number> })._count.transactions,
  }));
  res.json(shiftsWithTotal);
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.id! },
    include: {
      user: { select: { id: true, fullName: true } },
      transactions: { orderBy: { createdAt: 'desc' }, include: { department: { select: { id: true, name: true, slug: true } } } },
    },
  });
  if (!shift) throw new NotFoundError('Shift not found');
  res.json(shift);
}));

export default router;
