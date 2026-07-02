import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { $Enums } from '@prisma/client';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const limit = req.query.limit as string | undefined;
  const offset = req.query.offset as string | undefined;
  const where: Record<string, unknown> = {};
  const category = req.query.category as string | undefined;
  const departmentId = req.query.departmentId as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  if (category) where.category = category;
  if (departmentId) where.departmentId = departmentId;
  if (startDate || endDate) {
    where.date = {} as Record<string, unknown>;
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.date as Record<string, unknown>).lte = end;
    }
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

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const { notes, receiptUrl } = body;
  const amount = body.amount as string | undefined;
  const category = body.category as string | undefined;
  const description = body.description as string | undefined;
  const date = body.date as string | undefined;
  const paidTo = body.paidTo as string | undefined;
  const paymentMethod = body.paymentMethod as string | undefined;
  const departmentId = body.departmentId as string | undefined;
  if (!amount || !category || !description) throw new ValidationError('amount, category, and description are required');
  const expense = await prisma.expense.create({
    data: {
      amount: parseFloat(amount), category: category as $Enums.ExpenseCategory, description,
      date: date ? new Date(date) : new Date(), paidTo: paidTo || null, paymentMethod: paymentMethod || null,
      notes: (notes as string) || null, receiptUrl: (receiptUrl as string) || null, departmentId: (departmentId as string) || null,
    },
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  res.status(201).json(expense);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { amount, category, description, date, paidTo, paymentMethod, notes, receiptUrl, departmentId } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (amount !== undefined) data.amount = parseFloat(amount as string);
  if (category !== undefined) data.category = category;
  if (description !== undefined) data.description = description;
  if (date !== undefined) data.date = new Date(date as string);
  if (paidTo !== undefined) data.paidTo = paidTo;
  if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;
  if (notes !== undefined) data.notes = notes;
  if (receiptUrl !== undefined) data.receiptUrl = receiptUrl;
  if (departmentId !== undefined) data.departmentId = departmentId || null;
  const expense = await prisma.expense.update({
    where: { id: req.params.id! },
    data,
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  res.json(expense);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id! } });
  res.json({ message: 'Expense deleted' });
}));

export default router;
