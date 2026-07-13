import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { limit, offset } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  const type = req.query.type as string | undefined;
  const paymentMethod = req.query.paymentMethod as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  if (type) where.type = type;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    where.createdAt = {} as Record<string, unknown>;
    if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = end;
    }
  }
  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
      include: {
        cashier: { select: { id: true, fullName: true } },
        department: { select: { id: true, name: true, slug: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);
  res.json({ transactions, totalCount });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const tx = await prisma.transaction.findUnique({
    where: { id: req.params.id },
    include: {
      cashier: { select: { id: true, fullName: true } },
      department: { select: { id: true, name: true, slug: true } },
      inventoryTransactions: {
        include: { item: { select: { id: true, name: true, packSize: true } } },
      },
    },
  });
  if (!tx) throw new NotFoundError('Transaction not found');
  res.json(tx);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_TRANSACTION', 'Transaction'), asyncHandler(async (req, res) => {
  const { type, amount, paymentMethod, description, departmentId } = req.body;
  if (!type || !amount || !paymentMethod) throw new ValidationError('type, amount, and paymentMethod are required');
  let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
  if (!shift) {
    shift = await prisma.shift.create({ data: { userId: req.user!.id, openedAt: new Date() } });
  }
  const tx = await prisma.transaction.create({
    data: {
      type, amount, paymentMethod, description: description || '',
      shiftId: shift.id, cashierId: req.user!.id, departmentId: departmentId || null,
    },
    include: { cashier: { select: { id: true, fullName: true } }, department: { select: { id: true, name: true, slug: true } } },
  });
  res.status(201).json(tx);
}));

export default router;
