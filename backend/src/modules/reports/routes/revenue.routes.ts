import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { buildDateWhere, formatCurrency } from '../utils/reportHelpers.js';

const router = Router();

router.get('/revenue', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { groupBy } = req.query as Record<string, string>;
  const group = groupBy === 'week' || groupBy === 'month' ? groupBy : 'day';
  const where = buildDateWhere(req, 'createdAt');

  const transactions = await prisma.transaction.findMany({
    where,
    select: { amount: true, cogs: true, paymentMethod: true, type: true, departmentId: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const dateKey = (d: Date): string => {
    if (group === 'month') return d.toISOString().slice(0, 7);
    if (group === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().slice(0, 10);
    }
    return d.toISOString().slice(0, 10);
  };

  interface DailyRow { date: string; total: number; cash: number; card: number; insurance: number; bankTransfer: number; other: number }
  const dailyMap: Record<string, DailyRow> = {};
  const dateRange = (where.createdAt as Record<string, unknown>) as { gte: Date; lte: Date };

  for (const t of transactions) {
    const key = dateKey(t.createdAt);
    if (!dailyMap[key]) {
      dailyMap[key] = { date: key, total: 0, cash: 0, card: 0, insurance: 0, bankTransfer: 0, other: 0 };
    }
    const row = dailyMap[key]!;
    row.total += Number(t.amount);
    const m = t.paymentMethod.toLowerCase();
    if (m === 'cash') row.cash += Number(t.amount);
    else if (m === 'card') row.card += Number(t.amount);
    else if (m === 'insurance') row.insurance += Number(t.amount);
    else if (m === 'bank_transfer') row.bankTransfer += Number(t.amount);
    else row.other += Number(t.amount);
  }

  const dailyData = Object.values(dailyMap);

  const byMethodMap: Record<string, number> = {};
  const byDepartmentMap: Record<string, number> = {};
  let gross = 0;
  let totalCogs = 0;

  for (const t of transactions) {
    gross += Number(t.amount);
    totalCogs += Number(t.cogs || 0);
    const m = t.paymentMethod;
    byMethodMap[m] = (byMethodMap[m] || 0) + Number(t.amount);
    const deptKey = t.departmentId || 'uncategorized';
    byDepartmentMap[deptKey] = (byDepartmentMap[deptKey] || 0) + Number(t.amount);
  }

  const prevStart = new Date(dateRange.gte);
  const prevEnd = new Date(dateRange.lte);
  const rangeMs = prevEnd.getTime() - prevStart.getTime();
  const prevWhere: Record<string, unknown> = {
    hospitalId,
    createdAt: { gte: new Date(prevStart.getTime() - rangeMs), lte: new Date(prevStart.getTime() - 1) },
  };
  const prevTotal = await prisma.transaction.aggregate({ where: prevWhere, _sum: { amount: true } });
  const currentTotal = gross;
  const prevAmount = Number(prevTotal._sum.amount) || 0;
  const periodComparison = prevAmount > 0
    ? Math.round(((currentTotal - prevAmount) / prevAmount) * 10000) / 100
    : null;

  res.json({
    dailyData,
    totals: {
      gross,
      net: gross - totalCogs,
      cogs: totalCogs,
      byMethod: Object.entries(byMethodMap).map(([method, total]) => ({ method, total })),
      byDepartment: Object.entries(byDepartmentMap).map(([deptId, total]) => ({ departmentId: deptId, total })),
    },
    periodComparison,
    summary: {
      gross: formatCurrency(gross),
      net: formatCurrency(gross - totalCogs),
      periodChange: periodComparison !== null ? `${periodComparison}%` : 'N/A',
    },
  });
}));

export default router;
