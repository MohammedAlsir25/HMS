import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/summary', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
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

    res.json({
      today: { total: sum(todayTx), count: todayTx.length, byMethod: byMethod(todayTx), byType: byType(todayTx) },
      week: { total: sum(weekTx), count: weekTx.length },
      month: { total: sum(monthTx), count: monthTx.length },
      allTime: { total: sum(totalTx), count: totalTx.length },
      openShift: openShift || null,
    });
  } catch (err) {
    console.error('Accounting summary error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/transactions', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Transaction list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/revenue-by-day', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Revenue by day error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/revenue-by-type', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany();
    const typeMap = {};
    for (const t of transactions) {
      typeMap[t.type] = (typeMap[t.type] || 0) + Number(t.amount);
    }
    const result = Object.entries(typeMap).map(([type, total]) => ({ type, total }));
    res.json(result);
  } catch (err) {
    console.error('Revenue by type error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/shifts/open', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), async (req, res) => {
  try {
    const existing = await prisma.shift.findFirst({ where: { closedAt: null } });
    if (existing) {
      return res.status(400).json({ message: 'A shift is already open. Close it first.' });
    }
    const shift = await prisma.shift.create({
      data: {
        userId: req.user.id,
        openedAt: new Date(),
      },
      include: { user: { select: { id: true, fullName: true } } },
    });
    res.status(201).json(shift);
  } catch (err) {
    console.error('Open shift error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/shifts/close', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), async (req, res) => {
  try {
    const shift = await prisma.shift.findFirst({ where: { closedAt: null }, include: { transactions: true } });
    if (!shift) {
      return res.status(400).json({ message: 'No open shift to close.' });
    }
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
  } catch (err) {
    console.error('Close shift error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/transactions', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), async (req, res) => {
  try {
    const { type, amount, paymentMethod, description, departmentId } = req.body;
    if (!type || !amount || !paymentMethod) {
      return res.status(400).json({ message: 'type, amount, and paymentMethod are required' });
    }
    let shift = await prisma.shift.findFirst({ where: { closedAt: null } });
    if (!shift) {
      shift = await prisma.shift.create({
        data: { userId: req.user.id, openedAt: new Date() },
      });
    }
    const tx = await prisma.transaction.create({
      data: {
        type,
        amount,
        paymentMethod,
        description: description || '',
        shiftId: shift.id,
        cashierId: req.user.id,
        departmentId: departmentId || null,
      },
      include: { cashier: { select: { id: true, fullName: true } }, department: { select: { id: true, name: true, slug: true } } },
    });
    res.status(201).json(tx);
  } catch (err) {
    console.error('Create transaction error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/shifts', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: { openedAt: 'desc' },
      take: 50,
      include: {
        user: { select: { id: true, fullName: true } },
        _count: { select: { transactions: true } },
      },
    });
    const shiftsWithTotal = shifts.map((s) => ({
      ...s,
      transactionTotal: s._count.transactions,
      _count: undefined,
    }));
    res.json(shiftsWithTotal);
  } catch (err) {
    console.error('Shift list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/shifts/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
    const shift = await prisma.shift.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, fullName: true } },
        transactions: { orderBy: { createdAt: 'desc' }, include: { department: { select: { id: true, name: true, slug: true } } } },
      },
    });
    if (!shift) return res.status(404).json({ message: 'Shift not found' });
    res.json(shift);
  } catch (err) {
    console.error('Shift detail error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/expenses', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
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
        where,
        orderBy: { date: 'desc' },
        take: limit ? parseInt(limit) : 100,
        skip: offset ? parseInt(offset) : 0,
        include: { department: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.expense.count({ where }),
    ]);
    res.json({ expenses, totalCount });
  } catch (err) {
    console.error('Expense list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/expenses', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), async (req, res) => {
  try {
    const { amount, category, description, date, paidTo, paymentMethod, notes, receiptUrl, departmentId } = req.body;
    if (!amount || !category || !description) {
      return res.status(400).json({ message: 'amount, category, and description are required' });
    }
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description,
        date: date ? new Date(date) : new Date(),
        paidTo,
        paymentMethod,
        notes,
        receiptUrl,
        departmentId: departmentId || null,
      },
      include: { department: { select: { id: true, name: true, slug: true } } },
    });
    res.status(201).json(expense);
  } catch (err) {
    console.error('Expense create error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/expenses/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), async (req, res) => {
  try {
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
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Expense not found' });
    console.error('Expense update error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/expenses/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Expense not found' });
    console.error('Expense delete error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/pnl', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
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
    const [transactions, expenses] = await Promise.all([
      prisma.transaction.findMany({
        where: dateFilter,
        include: { department: { select: { id: true, name: true, slug: true } } },
      }),
      prisma.expense.findMany({
        where: expenseDateFilter,
        include: { department: { select: { id: true, name: true, slug: true } } },
      }),
    ]);
    const deptData = {};
    for (const t of transactions) {
      const key = t.departmentId || 'uncategorized';
      if (!deptData[key]) deptData[key] = { departmentId: t.departmentId, department: t.department, revenue: 0, expense: 0, txCount: 0, expenseCount: 0 };
      deptData[key].revenue += Number(t.amount);
      deptData[key].txCount += 1;
    }
    for (const e of expenses) {
      const key = e.departmentId || 'uncategorized';
      if (!deptData[key]) deptData[key] = { departmentId: e.departmentId, department: e.department, revenue: 0, expense: 0, txCount: 0, expenseCount: 0 };
      deptData[key].expense += Number(e.amount);
      deptData[key].expenseCount += 1;
    }
    const departments = Object.values(deptData).map((d) => ({
      ...d,
      net: d.revenue - d.expense,
    }));
    const totals = departments.reduce((acc, d) => ({
      revenue: acc.revenue + d.revenue,
      expense: acc.expense + d.expense,
      net: acc.net + d.net,
      txCount: acc.txCount + d.txCount,
      expenseCount: acc.expenseCount + d.expenseCount,
    }), { revenue: 0, expense: 0, net: 0, txCount: 0, expenseCount: 0 });
    res.json({ departments, totals });
  } catch (err) {
    console.error('PNL error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/revenue-by-department', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Revenue by department error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
