// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/summary', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
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

  const sum = (txs) => txs.reduce((acc, t) => acc + Number(t.amount), 0);
  const sumCogs = (txs) => txs.reduce((acc, t) => acc + Number(t.cogs || 0), 0);
  const byMethod = (txs) => {
    const map = {};
    txs.forEach((t) => { map[t.paymentMethod] = (map[t.paymentMethod] || 0) + Number(t.amount); });
    return map;
  };
  const byType = (txs) => {
    const map = {};
    txs.forEach((t) => { map[t.type] = (map[t.type] || 0) + Number(t.amount); });
    return map;
  };

  const format = (txs) => ({
    total: sum(txs), cogs: sumCogs(txs), grossProfit: sum(txs) - sumCogs(txs),
    count: txs.length, byMethod: byMethod(txs), byType: byType(txs),
  });

  res.json({
    today: format(todayTx), week: format(weekTx), month: format(monthTx),
    allTime: format(totalTx), openShift: openShift || null,
  });
}));

router.get('/transactions', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { type, paymentMethod, startDate, endDate, limit, offset } = req.query;
  const where = {};
  if (type) where.type = type;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
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

router.get('/revenue-by-day', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { gte: startDate } },
    orderBy: { createdAt: 'asc' },
  });

  const dailyMap = {};
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

router.get('/revenue-by-type', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const transactions = await prisma.transaction.findMany();
  const typeMap = {};
  for (const t of transactions) {
    typeMap[t.type] = (typeMap[t.type] || 0) + Number(t.amount);
  }
  const result = Object.entries(typeMap).map(([type, total]) => ({ type, total }));
  res.json(result);
}));

router.post('/shifts/open', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const existing = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (existing) throw new ValidationError('A shift is already open. Close it first.');
  const shift = await prisma.shift.create({
    data: { userId: req.user.id, openedAt: new Date() },
    include: { user: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(shift);
}));

router.post('/shifts/close', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
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

router.post('/transactions', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { type, amount, paymentMethod, description, departmentId } = req.body;
  if (!type || !amount || !paymentMethod) throw new ValidationError('type, amount, and paymentMethod are required');
  let shift = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (!shift) {
    shift = await prisma.shift.create({ data: { userId: req.user.id, openedAt: new Date() } });
  }
  const tx = await prisma.transaction.create({
    data: {
      type, amount, paymentMethod, description: description || '',
      shiftId: shift.id, cashierId: req.user.id, departmentId: departmentId || null,
    },
    include: { cashier: { select: { id: true, fullName: true } }, department: { select: { id: true, name: true, slug: true } } },
  });
  res.status(201).json(tx);
}));

router.get('/shifts', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const shifts = await prisma.shift.findMany({
    orderBy: { openedAt: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, fullName: true } },
      _count: { select: { transactions: true } },
    },
  });
  const shiftsWithTotal = shifts.map((s) => ({
    ...s, transactionTotal: s._count.transactions, _count: undefined,
  }));
  res.json(shiftsWithTotal);
}));

router.get('/shifts/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, fullName: true } },
      transactions: { orderBy: { createdAt: 'desc' }, include: { department: { select: { id: true, name: true, slug: true } } } },
    },
  });
  if (!shift) throw new NotFoundError('Shift not found');
  res.json(shift);
}));

router.get('/expenses', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { category, departmentId, startDate, endDate, limit, offset } = req.query;
  const where = {};
  if (category) where.category = category;
  if (departmentId) where.departmentId = departmentId;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }
  const [expenses, totalCount] = await Promise.all([
    prisma.expense.findMany({
      where, orderBy: { date: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
      include: { department: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.expense.count({ where }),
  ]);
  res.json({ expenses, totalCount });
}));

router.post('/expenses', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { amount, category, description, date, paidTo, paymentMethod, notes, receiptUrl, departmentId } = req.body;
  if (!amount || !category || !description) throw new ValidationError('amount, category, and description are required');
  const expense = await prisma.expense.create({
    data: {
      amount: parseFloat(amount), category, description,
      date: date ? new Date(date) : new Date(), paidTo, paymentMethod,
      notes, receiptUrl, departmentId: departmentId || null,
    },
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  res.status(201).json(expense);
}));

router.patch('/expenses/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { amount, category, description, date, paidTo, paymentMethod, notes, receiptUrl, departmentId } = req.body;
  const data = {};
  if (amount !== undefined) data.amount = parseFloat(amount);
  if (category !== undefined) data.category = category;
  if (description !== undefined) data.description = description;
  if (date !== undefined) data.date = new Date(date);
  if (paidTo !== undefined) data.paidTo = paidTo;
  if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
  if (notes !== undefined) data.notes = notes;
  if (receiptUrl !== undefined) data.receiptUrl = receiptUrl;
  if (departmentId !== undefined) data.departmentId = departmentId || null;
  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data,
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  res.json(expense);
}));

router.delete('/expenses/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  res.json({ message: 'Expense deleted' });
}));

router.get('/pnl', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.lte = new Date(endDate);
  }
  const expenseDateFilter = {};
  if (startDate || endDate) {
    expenseDateFilter.date = {};
    if (startDate) expenseDateFilter.date.gte = new Date(startDate);
    if (endDate) expenseDateFilter.date.lte = new Date(endDate);
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
  const deptMap = {};
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
    ...d, grossProfit: d.revenue - d.cogs, net: d.revenue - d.cogs - d.expense,
  }));
  const totals = deptRows.reduce((acc, d) => ({
    revenue: acc.revenue + d.revenue, cogs: acc.cogs + d.cogs,
    expense: acc.expense + d.expense, grossProfit: acc.grossProfit + d.grossProfit,
    net: acc.net + d.net, txCount: acc.txCount + d.txCount,
    expenseCount: acc.expenseCount + d.expenseCount,
  }), { revenue: 0, cogs: 0, expense: 0, grossProfit: 0, net: 0, txCount: 0, expenseCount: 0 });
  res.json({ departments: deptRows, totals });
}));

router.get('/revenue-by-department', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }
  const transactions = await prisma.transaction.findMany({
    where,
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  const deptMap = {};
  for (const t of transactions) {
    const key = t.departmentId || 'uncategorized';
    if (!deptMap[key]) deptMap[key] = { departmentId: t.departmentId, department: t.department, total: 0, count: 0 };
    deptMap[key].total += Number(t.amount);
    deptMap[key].count += 1;
  }
  res.json(Object.values(deptMap));
}));

export default router;
