import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
import prisma from '../../lib/prisma.js';

router.get('/', authenticate, requirePermission(PERMISSIONS.DEPARTMENT_READ), asyncHandler(async (req, res) => {
  const { type } = req.query as { type?: string };
  const where: Record<string, unknown> = { isActive: true, hospitalId: req.user!.hospitalId };
  if (type) where.type = type;
  const departments = await prisma.department.findMany({
    where,
    include: {
      clinic: { select: { id: true, slug: true, name: true } },
      _count: { select: { employees: true, expenses: true, surgeries: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(departments);
}));

router.get('/stats', authenticate, requirePermission(PERMISSIONS.DEPARTMENT_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId;
  const [total, byType, employeeCount, activeCount] = await Promise.all([
    prisma.department.count({ where: { hospitalId, is_deleted: false } }),
    prisma.department.groupBy({
      by: ['type'],
      where: { hospitalId, is_deleted: false },
      _count: { id: true },
    }),
    prisma.department.findMany({
      where: { hospitalId, is_deleted: false },
      select: {
        id: true,
        name: true,
        type: true,
        _count: { select: { employees: true } },
      },
    }),
    prisma.department.count({ where: { hospitalId, isActive: true, is_deleted: false } }),
  ]);
  res.json({
    total,
    activeCount,
    inactiveCount: total - activeCount,
    byType: byType.map((b) => ({ type: b.type, count: b._count.id })),
    employeeBreakdown: employeeCount.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      employeeCount: d._count.employees,
    })),
  });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.DEPARTMENT_READ), asyncHandler(async (req, res) => {
  const department = await prisma.department.findFirst({
    where: { id: req.params.id, hospitalId: req.user!.hospitalId },
    include: {
      clinic: { select: { id: true, slug: true, name: true } },
      _count: { select: { employees: true, expenses: true, surgeries: true } },
    },
  });
  if (!department) throw new NotFoundError('Department not found');
  res.json(department);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.DEPARTMENT_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, slug, type, clinicId } = req.body;
  if (!name || !slug || !type) throw new ValidationError('name, slug, and type are required');
  const department = await prisma.department.create({
    data: {
      name,
      nameAr,
      slug,
      type,
      clinicId: clinicId || null,
      hospitalId: req.user!.hospitalId,
    },
    include: { clinic: { select: { id: true, slug: true, name: true } } },
  });
  res.status(201).json(department);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.DEPARTMENT_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, slug, type, isActive, clinicId } = req.body as Record<string, unknown>;
  const existing = await prisma.department.findFirst({
    where: { id: req.params.id, hospitalId: req.user!.hospitalId },
  });
  if (!existing) throw new NotFoundError('Department not found');
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (nameAr !== undefined) data.nameAr = nameAr;
  if (slug !== undefined) data.slug = slug;
  if (type !== undefined) data.type = type;
  if (isActive !== undefined) data.isActive = isActive;
  if (clinicId !== undefined) data.clinicId = clinicId || null;

  const department = await prisma.department.update({
    where: { id: req.params.id },
    data,
    include: { clinic: { select: { id: true, slug: true, name: true } } },
  });
  res.json(department);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.DEPARTMENT_WRITE), asyncHandler(async (req, res) => {
  const existing = await prisma.department.findFirst({
    where: { id: req.params.id, hospitalId: req.user!.hospitalId },
  });
  if (!existing) throw new NotFoundError('Department not found');
  await prisma.department.update({
    where: { id: req.params.id },
    data: { is_deleted: true, isActive: false },
  });
  res.json({ message: 'Department deleted' });
}));

export default router;
