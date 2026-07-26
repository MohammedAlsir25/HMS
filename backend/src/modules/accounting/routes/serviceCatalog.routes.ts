import { Router } from 'express';
import { $Enums } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { limit, offset } = req.query as Record<string, string>;
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const where: Record<string, unknown> = {};
  if (category) where.category = category as $Enums.ServiceItemCategory;
  if (search) where.name = { contains: search, mode: 'insensitive' };
  const [items, totalCount] = await Promise.all([
    prisma.serviceItem.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
    }),
    prisma.serviceItem.count({ where }),
  ]);
  res.json({ items, totalCount });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_SERVICE_ITEM', 'ServiceItem'), asyncHandler(async (req, res) => {
  const { name, nameAr, category, price, costPrice } = req.body;
  if (!name || !category || price === undefined) throw new ValidationError('name, category, and price are required');
  const item = await prisma.serviceItem.create({
    data: {
      name, nameAr: nameAr || null,
      category: category as $Enums.ServiceItemCategory,
      price: parseFloat(price),
      costPrice: costPrice ? parseFloat(costPrice) : 0,
    },
  });
  res.status(201).json(item);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('UPDATE_SERVICE_ITEM', 'ServiceItem'), asyncHandler(async (req, res) => {
  const { name, nameAr, category, price, costPrice, isActive } = req.body;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (nameAr !== undefined) data.nameAr = nameAr || null;
  if (category !== undefined) data.category = category;
  if (price !== undefined) data.price = parseFloat(price);
  if (costPrice !== undefined) data.costPrice = parseFloat(costPrice);
  if (isActive !== undefined) data.isActive = isActive;
  const item = await prisma.serviceItem.update({ where: { id: req.params.id! }, data });
  res.json(item);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('DELETE_SERVICE_ITEM', 'ServiceItem'), asyncHandler(async (req, res) => {
  const item = await prisma.serviceItem.findUnique({ where: { id: req.params.id! } });
  if (!item) throw new NotFoundError('Service item not found');
  await prisma.serviceItem.update({ where: { id: req.params.id! }, data: { isActive: false } });
  res.json({ message: 'Service item deactivated' });
}));

export default router;
