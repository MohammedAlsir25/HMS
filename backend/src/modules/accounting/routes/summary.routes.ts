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

  const [todayTx, weekTx, monthTx, totalAgg, openShift] = await Promise.all([
    prisma.transaction.findMany({ where: { createdAt: { gte: startToday } } }),
    prisma.transaction.findMany({ where: { createdAt: { gte: startWeek } } }),
    prisma.transaction.findMany({ where: { createdAt: { gte: startMonth } } }),
    prisma.transaction.aggregate({
      _sum: { amount: true, cogs: true },
      _count: true,
    }),
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
    allTime: {
      total: Number(totalAgg._sum.amount) || 0,
      cogs: Number(totalAgg._sum.cogs) || 0,
      grossProfit: (Number(totalAgg._sum.amount) || 0) - (Number(totalAgg._sum.cogs) || 0),
      count: totalAgg._count,
    }, openShift: openShift || null,
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
  const groups = await prisma.transaction.groupBy({
    by: ['type'],
    _sum: { amount: true },
    _count: true,
  });
  const result = groups.map((g) => ({ type: g.type, total: Number(g._sum.amount) || 0 }));
  res.json(result);
}));

router.get('/revenue-by-department', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const where: Record<string, unknown> = {};
  if (startDate || endDate) {
    where.createdAt = {} as Record<string, unknown>;
    if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = end;
    }
  }
  const [txGroups, departments] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['departmentId'],
      where,
      _sum: { amount: true },
      _count: true,
    }),
    prisma.department.findMany({ select: { id: true, name: true, slug: true } }),
  ]);
  const deptMap = new Map(departments.map((d) => [d.id, d]));
  const result = txGroups.map((g) => ({
    departmentId: g.departmentId,
    department: g.departmentId ? deptMap.get(g.departmentId) || null : null,
    total: Number(g._sum.amount) || 0,
    count: g._count,
  }));
  res.json(result);
}));

router.get('/pnl', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const dateFilter: Record<string, unknown> = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {} as Record<string, unknown>;
    if (startDate) (dateFilter.createdAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (dateFilter.createdAt as Record<string, unknown>).lte = end;
    }
  }
  const expenseDateFilter: Record<string, unknown> = {};
  if (startDate || endDate) {
    expenseDateFilter.date = {} as Record<string, unknown>;
    if (startDate) (expenseDateFilter.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (expenseDateFilter.date as Record<string, unknown>).lte = end;
    }
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

router.get('/balance-sheet', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const asOfDate = req.query.asOfDate as string | undefined;
  const date = asOfDate ? new Date(asOfDate) : new Date();
  date.setHours(23, 59, 59, 999);

  const allLines = await prisma.journalEntryLine.findMany({
    where: { entry: { date: { lte: date } } },
    include: { account: true },
  });

  const accountBalances: Record<string, { accountId: string; accountCode: string; accountName: string; accountType: string; debit: number; credit: number }> = {};

  for (const line of allLines) {
    const key = line.accountId;
    if (!accountBalances[key]) {
      accountBalances[key] = {
        accountId: line.accountId,
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        debit: 0,
        credit: 0,
      };
    }
    accountBalances[key].debit += Number(line.debit);
    accountBalances[key].credit += Number(line.credit);
  }

  const accountsByType: Record<string, Array<{ code: string; name: string; balance: number }>> = {
    ASSET: [], LIABILITY: [], EQUITY: [], REVENUE: [], EXPENSE: [],
  };

  for (const ab of Object.values(accountBalances)) {
    let balance: number;
    if (ab.accountType === 'ASSET' || ab.accountType === 'EXPENSE') {
      balance = ab.debit - ab.credit;
    } else {
      balance = ab.credit - ab.debit;
    }
    accountsByType[ab.accountType]?.push({
      code: ab.accountCode,
      name: ab.accountName,
      balance,
    });
  }

  const assetsTotal = (accountsByType.ASSET ?? []).reduce((s, a) => s + a.balance, 0);
  const liabilitiesTotal = (accountsByType.LIABILITY ?? []).reduce((s, a) => s + a.balance, 0);
  const equityTotal = (accountsByType.EQUITY ?? []).reduce((s, a) => s + a.balance, 0);
  const revenueTotal = (accountsByType.REVENUE ?? []).reduce((s, a) => s + a.balance, 0);
  const expenseTotal = (accountsByType.EXPENSE ?? []).reduce((s, a) => s + a.balance, 0);
  const netIncome = revenueTotal - expenseTotal;
  const totalEquity = equityTotal + netIncome;
  const balanceCheck = Math.abs(assetsTotal - (liabilitiesTotal + totalEquity)) < 0.02;

  res.json({
    asOfDate: date,
    assets: { total: assetsTotal, byAccount: accountsByType.ASSET ?? [] },
    liabilities: { total: liabilitiesTotal, byAccount: accountsByType.LIABILITY ?? [] },
    equity: { total: totalEquity, byAccount: [...(accountsByType.EQUITY ?? []), { code: '0000', name: 'Net Income', balance: netIncome }] },
    revenue: { total: revenueTotal, byAccount: accountsByType.REVENUE ?? [] },
    expenses: { total: expenseTotal, byAccount: accountsByType.EXPENSE ?? [] },
    balanceCheck,
  });
}));

export default router;
