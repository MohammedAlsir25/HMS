import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const costCenters = await prisma.costCenter.findMany({
      include: { department: true },
      orderBy: { name: 'asc' },
    });
    res.json(costCenters);
  }),
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const { name, code, departmentId } = req.body as Record<string, unknown>;
    if (!name || !code || !departmentId) throw new ValidationError('Name, code, and department are required');
    const costCenter = await prisma.costCenter.create({
      data: {
        name: name as string,
        code: code as string,
        departmentId: departmentId as string,
      },
      include: { department: true },
    });
    res.status(201).json(costCenter);
  }),
);

router.patch(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const { name, code, departmentId, isActive } = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (code !== undefined) data.code = code;
    if (departmentId !== undefined) data.departmentId = departmentId;
    if (isActive !== undefined) data.isActive = isActive;
    const costCenter = await prisma.costCenter.update({
      where: { id: req.params.id },
      data,
      include: { department: true },
    });
    res.json(costCenter);
  }),
);

router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    await prisma.costCenter.delete({ where: { id: req.params.id } });
    res.json({ message: 'Cost center deleted' });
  }),
);

export default router;
