import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';

const router = Router();

router.get('/dashboard', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todaySalesResult = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: {
      type: 'PHARMACY',
      createdAt: { gte: startOfDay },
      hospitalId,
    },
  });
  const todaySales = Number(todaySalesResult._sum.amount) || 0;

  const topSelling = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT
      ii.id,
      ii.name,
      ii.sku,
      ABS(SUM(it.quantity))::int as "totalSold"
    FROM inventory_transactions it
    JOIN inventory_items ii ON it."itemId" = ii.id
    WHERE it.type = 'SALE'
      AND it."createdAt" >= $1
      AND ii.category = 'pharmacy'
      AND ii."hospitalId" = $2
    GROUP BY ii.id, ii.name, ii.sku
    ORDER BY "totalSold" DESC
    LIMIT 10
  `, startOfDay, hospitalId);

  const stockValueResult = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT COALESCE(SUM("quantity" * "costPrice"), 0)::float as "stockValue"
    FROM inventory_items
    WHERE category = 'pharmacy'
      AND "isActive" = true
      AND "hospitalId" = $1
  `, hospitalId);
  const stockValue = stockValueResult[0]?.stockValue || 0;

  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const [within30, within60, within90] = await Promise.all([
    prisma.inventoryItem.count({
      where: { category: 'pharmacy', isActive: true, hospitalId, expiryDate: { not: null, lte: in30Days, gte: now } },
    }),
    prisma.inventoryItem.count({
      where: { category: 'pharmacy', isActive: true, hospitalId, expiryDate: { not: null, lte: in60Days, gte: now } },
    }),
    prisma.inventoryItem.count({
      where: { category: 'pharmacy', isActive: true, hospitalId, expiryDate: { not: null, lte: in90Days, gte: now } },
    }),
  ]);

  const lowStockCount = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT COUNT(*)::int as count
    FROM inventory_items
    WHERE category = 'pharmacy'
      AND "isActive" = true
      AND "hospitalId" = $1
      AND "quantity" <= "minStock"
  `, hospitalId);

  const recentSales = await prisma.transaction.findMany({
    where: { type: 'PHARMACY', hospitalId },
    include: { cashier: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  res.json({
    todaySales,
    topSelling,
    stockValue,
    expiringCounts: { within30, within60, within90 },
    lowStockCount: lowStockCount[0]?.count || 0,
    recentSales,
  });
}));

router.get('/sales-report', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { from, to, interval = 'daily' } = req.query as Record<string, string>;

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  let dateTrunc: string;
  switch (interval) {
    case 'weekly': dateTrunc = 'week'; break;
    case 'monthly': dateTrunc = 'month'; break;
    default: dateTrunc = 'day';
  }

  const data = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT
      date_trunc($1, t."createdAt")::date as date,
      SUM(t.amount)::float as "totalAmount",
      COUNT(t.id)::int as "transactionCount"
    FROM transactions t
    WHERE t.type = 'PHARMACY'
      AND t."hospitalId" = $2
      AND t."createdAt" >= $3
      AND t."createdAt" <= $4
    GROUP BY date_trunc($1, t."createdAt")
    ORDER BY date_trunc($1, t."createdAt") ASC
  `, dateTrunc, hospitalId, fromDate, toDate);

  const summary = await prisma.transaction.aggregate({
    _sum: { amount: true },
    _count: { id: true },
    where: {
      type: 'PHARMACY',
      hospitalId,
      createdAt: { gte: fromDate, lte: toDate },
    },
  });

  const totalItemCount = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
    SELECT COALESCE(SUM(ABS(it.quantity))::int, 0) as "totalItems"
    FROM inventory_transactions it
    JOIN inventory_items ii ON it."itemId" = ii.id
    WHERE it.type = 'SALE'
      AND ii.category = 'pharmacy'
      AND ii."hospitalId" = $1
      AND it."createdAt" >= $2
      AND it."createdAt" <= $3
  `, hospitalId, fromDate, toDate);

  res.json({
    data,
    summary: {
      totalAmount: Number(summary._sum.amount) || 0,
      totalTransactions: summary._count.id || 0,
      totalItems: totalItemCount[0]?.totalItems || 0,
    },
  });
}));

export default router;
