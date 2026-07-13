import { Router } from 'express';
import { Prisma, $Enums } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { validate } from '../../../middleware/validate.js';
import { posTransactSchema } from '../../../schemas/pos.schema.js';
import { NotFoundError } from '../../../utils/errors.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/alerts', authenticate, asyncHandler(async (req, res) => {
  const { category } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isActive: true };
  if (category) where.category = { equals: category, mode: 'insensitive' as const };
  const items = await prisma.inventoryItem.findMany({ where: where as Prisma.InventoryItemWhereInput, orderBy: { name: 'asc' } });
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const alerts: { lowStock: Array<Record<string, unknown>>; expired: Array<Record<string, unknown>>; expiringSoon: Array<Record<string, unknown>> } = { lowStock: [], expired: [], expiringSoon: [] };
  for (const item of items) {
    if (Number(item.quantity) <= item.minStock) alerts.lowStock.push(item);
    if (item.expiryDate) {
      if (new Date(item.expiryDate) < now) alerts.expired.push(item);
      else if (new Date(item.expiryDate) <= in30Days) alerts.expiringSoon.push(item);
    }
  }
  res.json(alerts);
}));

router.get('/items', authenticate, asyncHandler(async (req, res) => {
  const { category, search } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isActive: true };
  if (category) where.category = { contains: category, mode: 'insensitive' as const };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { sku: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where: where as Prisma.InventoryItemWhereInput, orderBy: { name: 'asc' } });
  res.json(items);
}));

router.get('/shift/current', authenticate, asyncHandler(async (req, res) => {
  let shift = await prisma.shift.findFirst({
    where: { userId: req.user!.id, closedAt: null },
    include: { transactions: true },
  });
  if (!shift) {
    shift = await prisma.shift.create({
      data: { userId: req.user!.id },
      include: { transactions: true },
    });
  }
  res.json(shift);
}));

router.post('/shift/close', authenticate, auditMiddleware('UPDATE', 'Shift'), asyncHandler(async (req, res) => {
  const { expectedTotal, actualTotal, notes } = req.body;
  const shift = await prisma.shift.findFirst({
    where: { userId: req.user!.id, closedAt: null },
  });
  if (!shift) throw new NotFoundError('No open shift found');
  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      closedAt: new Date(),
      expectedTotal: expectedTotal !== undefined ? expectedTotal : null,
      actualTotal: actualTotal !== undefined ? actualTotal : null,
      notes: notes || null,
    },
  });
  res.json(updated);
}));

const TYPE_DEPT_SLUG = { PHARMACY: 'pharmacy', OPTICS: 'optics' };

router.post('/transact', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), auditMiddleware('CREATE', 'Transaction'), validate(posTransactSchema), asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const type = body.type as string;
  const items = body.items as Array<Record<string, unknown>>;
  const paymentMethod = body.paymentMethod as string;
  const amount = body.amount as string | undefined;
  const description = body.description as string | undefined;
  const patientName = body.patientName as string | undefined;
  const departmentId = body.departmentId as string | undefined;
  const referralId = body.referralId as string | undefined;

  let resolvedDepartmentId = departmentId || null;
  const typeDeptSlug = TYPE_DEPT_SLUG as Record<string, string>;
  if (!resolvedDepartmentId && typeDeptSlug[type]) {
    const dept = await prisma.department.findUnique({ where: { slug: typeDeptSlug[type] } });
    if (dept) resolvedDepartmentId = dept.id;
  }

  let shift = await prisma.shift.findFirst({
    where: { userId: req.user!.id, closedAt: null },
  });
  if (!shift) {
    shift = await prisma.shift.create({ data: { userId: req.user!.id } });
  }

  let totalCogs = 0;
  const inventoryTxData = [];

  const itemIds = items.map((i) => (i as { id: string }).id);
  const dbItems = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
  });
  const itemMap = new Map(dbItems.map((i) => [i.id, i]));

  for (const item of items) {
    const item2 = item as { id: string; quantity?: number; name?: string };
    const dbItem = itemMap.get(item2.id);
    const unitCost = Number(dbItem?.costPrice) || 0;
    const stripQty = item2.quantity || 1;
    const packSize = dbItem?.packSize || 1;
    const boxQty = stripQty / packSize;
    totalCogs += unitCost * boxQty;
    inventoryTxData.push({ item: item2, unitCost, qty: boxQty });
  }

  const transaction = await prisma.transaction.create({
    data: {
      type: type as $Enums.TransactionType, amount: Number(amount) as unknown as Prisma.TransactionCreateInput['amount'], cogs: totalCogs, paymentMethod: paymentMethod as $Enums.PaymentMethod,
      description: description || (patientName ? `Sale for ${patientName}` : null),
      shiftId: shift.id, cashierId: req.user!.id, departmentId: resolvedDepartmentId,
    },
  });

  await Promise.all(inventoryTxData.map(async ({ item, unitCost, qty }) => {
    const item3 = item as { id: string; name?: string };
    await prisma.inventoryTransaction.create({
      data: { type: 'SALE', quantity: -qty, unitCost, notes: item3.name || null, itemId: item3.id },
    });
    await prisma.inventoryItem.update({
      where: { id: item3.id },
      data: { quantity: { decrement: qty } },
    });
  }));

  if (referralId) {
    const refType = type === 'PHARMACY' ? 'PHARMACY_DISPATCH' : 'OPTICS_DISPATCH';
    await prisma.referral.updateMany({
      where: { id: referralId, type: refType, status: 'PENDING' },
      data: { status: 'FULFILLED' },
    });
  }

  const full = await prisma.transaction.findUnique({
    where: { id: transaction.id },
    include: {
      cashier: { select: { id: true, fullName: true } },
    },
  });
  res.status(201).json({ transaction: full, shift });
}));

export default router;
