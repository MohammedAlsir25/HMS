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
  const costCenters = await prisma.costCenter.findMany({
    orderBy: { code: 'asc' },
    take: limit ? parseInt(limit) : 100,
    skip: offset ? parseInt(offset) : 0,
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  res.json(costCenters);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_COST_CENTER', 'CostCenter'), asyncHandler(async (req, res) => {
  const { code, name, departmentId } = req.body;
  if (!code || !name || !departmentId) throw new ValidationError('code, name, and departmentId are required');
  const costCenter = await prisma.costCenter.create({
    data: { code, name, departmentId },
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  res.status(201).json(costCenter);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('UPDATE_COST_CENTER', 'CostCenter'), asyncHandler(async (req, res) => {
  const { code, name, departmentId, isActive } = req.body;
  const data: Record<string, unknown> = {};
  if (code !== undefined) data.code = code;
  if (name !== undefined) data.name = name;
  if (departmentId !== undefined) data.departmentId = departmentId;
  if (isActive !== undefined) data.isActive = isActive;
  const costCenter = await prisma.costCenter.update({
    where: { id: req.params.id! },
    data,
    include: { department: { select: { id: true, name: true, slug: true } } },
  });
  res.json(costCenter);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('DELETE_COST_CENTER', 'CostCenter'), asyncHandler(async (req, res) => {
  const cc = await prisma.costCenter.findUnique({ where: { id: req.params.id! } });
  if (!cc) throw new NotFoundError('Cost center not found');
  await prisma.costCenter.update({ where: { id: req.params.id! }, data: { isActive: false } });
  res.json({ message: 'Cost center deactivated' });
}));

router.get('/:id/report', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const cc = await prisma.costCenter.findUnique({
    where: { id: req.params.id! },
    include: { department: { select: { id: true, name: true } } },
  });
  if (!cc) throw new NotFoundError('Cost center not found');

  const departmentId = cc.departmentId;

  const [expenses, revenue] = await Promise.all([
    prisma.expense.aggregate({
      where: { departmentId },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: { departmentId },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalExpenses = Number(expenses._sum.amount) || 0;
  const totalRevenue = Number(revenue._sum.amount) || 0;

  res.json({
    costCenter: { id: cc.id, code: cc.code, name: cc.name, department: cc.department },
    expenses: { total: totalExpenses, count: expenses._count },
    revenue: { total: totalRevenue, count: revenue._count },
    netResult: totalRevenue - totalExpenses,
  });
}));

export default router;
