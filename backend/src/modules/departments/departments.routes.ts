import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
import prisma from '../../lib/prisma.js';

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { type } = req.query as { type?: string };
  const where: Record<string, unknown> = { isActive: true };
  if (type) where.type = type;
  const departments = await prisma.department.findMany({
    where,
    include: { clinic: { select: { id: true, slug: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(departments);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const department = await prisma.department.findUnique({
    where: { id: req.params.id },
    include: { clinic: { select: { id: true, slug: true, name: true } } },
  });
  if (!department) throw new NotFoundError('Department not found');
  res.json(department);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (req, res) => {
  const { name, nameAr, slug, type, clinicId } = req.body;
  if (!name || !slug || !type) throw new ValidationError('name, slug, and type are required');
  const department = await prisma.department.create({
    data: { name, nameAr, slug, type, clinicId: clinicId || null },
    include: { clinic: { select: { id: true, slug: true, name: true } } },
  });
  res.status(201).json(department);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (req, res) => {
  const { name, nameAr, slug, type, isActive, clinicId } = req.body as Record<string, unknown>;
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

export default router;


