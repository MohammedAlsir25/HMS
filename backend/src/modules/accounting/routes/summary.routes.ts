import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/summary', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (_req, res) => {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - now.getDay());
  startWeek.setHours(0, 0, 0, 0);
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayTx, weekTx, monthTx, totalTx, openShift] = await Promise.all([
    prisma.transaction.findMany({ where: { createdAt: { gte: startToday } } }),
    prisma.transaction.findMany({ where: { createdAt: { gte: startWeek } } }),
    prisma.transaction.findMany({ where: { createdAt: { gte: startMonth } } }),
    prisma.transaction.findMany(),
    prisma.shift.findFirst({ where: { closedAt: null }, include: { transactions: true, user: true } }),
  ]);

  const sum = (txs: Array<Record<string, unknown>>) => txs.reduce((acc: number, t) => acc + Number(t.amount), 0);
  const sumCogs = (txs: Array<Record<string, unknown>>) => txs.reduce((acc: number, t) => acc + Number(t.cogs || 0), 0);
  const byMethod = (txs: Array<Record<string, unknown>>) => {
    const map: Record<string, number> = {};
    txs.forEach((t) => { const m = t.paymentMethod as string; map[m] = (map[m] || 0) + Number(t.amount); });
    return map;
  };
  const byType = (txs: Array<Record<string, unknown>>) => {
    const map: Record<string, number> = {};
    txs.forEach((t) => { const m = t.type as string; map[m] = (map[m] || 0) + Number(t.amount); });
    return map;
  };

  const format = (txs: Array<Record<string, unknown>>) => ({
    total: sum(txs), cogs: sumCogs(txs), grossProfit: sum(txs) - sumCogs(txs),
    count: txs.length, byMethod: byMethod(txs), byType: byType(txs),
  });

  res.json({
    today: format(todayTx), week: format(weekTx), month: format(monthTx),
    allTime: format(totalTx), openShift: openShift || null,
  });
}));

router.get('/revenue-by-day', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: startDate } },
    orderBy: { createdAt: 'asc' },
  });

  const dailyMap: Record<string, { date: string; total: number; count: number }> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dailyMap[d.toISOString().slice(0, 10)] = { date: d.toISOString().slice(0, 10), total: 0, count: 0 };
  }
  for (const t of transactions) {
    const key = t.createdAt.toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].total += Number(t.amount);
      dailyMap[key].count += 1;
    }
  }
  res.json(Object.values(dailyMap));
}));

router.get('/revenue-by-type', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (_req, res) => {
  const transactions = await prisma.transaction.findMany();
  const typeMap: Record<string, number> = {};
  for (const t of transactions) {
    typeMap[t.type] = (typeMap[t.type] || 0) + Number(t.amount);
  }
  const result = Object.entries(typeMap).map(([type, total]) => ({ type, total }));
  res.json(result);
}));

router.get('/revenue-by-department', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.createdAt = {} as Record<string, unknown>;
    if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate);
  }
  const transactions = await prisma.transaction.findMany({
    where,
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  const deptMap: Record<string, { departmentId: string | null; department: typeof transactions[0]['department']; total: number; count: number }> = {};
  for (const t of transactions) {
    const key = t.departmentId || 'uncategorized';
    if (!deptMap[key]) deptMap[key] = { departmentId: t.departmentId, department: t.department, total: 0, count: 0 };
    deptMap[key].total += Number(t.amount);
    deptMap[key].count += 1;
  }
  res.json(Object.values(deptMap));
}));

router.get('/pnl', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const dateFilter: Record<string, unknown> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {} as Record<string, unknown>;
    if (startDate) (dateFilter.createdAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (dateFilter.createdAt as Record<string, unknown>).lte = new Date(endDate);
  }
  const expenseDateFilter: Record<string, unknown> = {};
  if (startDate || endDate) {
    expenseDateFilter.date = {} as Record<string, unknown>;
    if (startDate) (expenseDateFilter.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (expenseDateFilter.date as Record<string, unknown>).lte = new Date(endDate);
  }
  const [txGroups, expenseGroups, departments] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['departmentId'],
      where: dateFilter,
      _sum: { amount: true, cogs: true },
      _count: true,
    }),
    prisma.expense.groupBy({
      by: ['departmentId'],
      where: expenseDateFilter,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.department.findMany({ select: { id: true, name: true, slug: true } }),
  ]);
  interface DeptRow {
    departmentId: string | null; department: { id: string; name: string; slug: string } | null;
    revenue: number; cogs: number; expense: number;
    txCount: number; expenseCount: number; grossProfit?: number; net?: number;
  }
  const deptMap: Record<string, DeptRow> = {};
  for (const g of txGroups) {
    const key = g.departmentId || 'uncategorized';
    deptMap[key] = {
      departmentId: g.departmentId,
      department: departments.find((d) => d.id === g.departmentId) || null,
      revenue: Number(g._sum.amount) || 0,
      cogs: Number(g._sum.cogs) || 0,
      expense: 0, txCount: g._count, expenseCount: 0,
    };
  }
  for (const g of expenseGroups) {
    const key = g.departmentId || 'uncategorized';
    if (!deptMap[key]) {
      deptMap[key] = {
        departmentId: g.departmentId,
        department: departments.find((d) => d.id === g.departmentId) || null,
        revenue: 0, cogs: 0, expense: 0, txCount: 0, expenseCount: 0,
      };
    }
    deptMap[key].expense += Number(g._sum.amount) || 0;
    deptMap[key].expenseCount += g._count;
  }
  const deptRows = Object.values(deptMap).map((d) => ({
    ...d, grossProfit: Number(d.revenue) - Number(d.cogs), net: Number(d.revenue) - Number(d.cogs) - Number(d.expense),
  }));
  const totals = deptRows.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue, cogs: acc.cogs + d.cogs,
    expense: acc.expense + d.expense, grossProfit: acc.grossProfit + d.grossProfit,
    net: acc.net + d.net, txCount: acc.txCount + d.txCount,
    expenseCount: acc.expenseCount + d.expenseCount,
  }), { revenue: 0, cogs: 0, expense: 0, grossProfit: 0, net: 0, txCount: 0, expenseCount: 0 });
  res.json({ departments: deptRows, totals });
}));

export default router;
