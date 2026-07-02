import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.post('/', authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, sku, price, costPrice, initialQuantity, minStock } = req.body;
  if (!name || !sku) throw new ValidationError('Name and SKU are required');
  const existing = await prisma.inventoryItem.findUnique({ where: { sku } });
  if (existing) throw new ConflictError('Item with this SKU already exists');
  const item = await prisma.inventoryItem.create({
    data: {
      name, nameAr, sku, category: 'optics', quantity: initialQuantity || 0,
      price: price || 0, costPrice: costPrice || 0, minStock: minStock || 0,
    },
  });
  res.status(201).json(item);
}));

router.get('/', authenticate, requirePermission(PERMISSIONS.OPTICS_READ), asyncHandler(async (req, res) => {
  const { search } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { category: 'optics', isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { sku: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where: where as Prisma.InventoryItemWhereInput, orderBy: { name: 'asc' } });
  res.json(items);
}));

router.post('/:id/adjust', authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const { type, quantity, notes } = req.body;
  if (!type || !['IN', 'OUT'].includes(type as string)) throw new ValidationError('type must be IN or OUT');
  if (!quantity || quantity < 1) throw new ValidationError('quantity must be a positive integer');
  const item = await prisma.inventoryItem.findFirst({ where: { id, category: 'optics' } });
  if (!item) throw new NotFoundError('Item not found');
  const qty = type === 'IN' ? (quantity as number) : -(quantity as number);
  await prisma.inventoryTransaction.create({
    data: { type: type as never, quantity: qty, notes: (notes as string) || null, itemId: id },
  });
  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { quantity: { increment: qty } },
  });
  res.json(updated);
}));

router.put('/:id', authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, nameAr, sku, price, costPrice, minStock } = req.body;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, category: 'optics' } });
  if (!existing) throw new NotFoundError('Item not found');
  if (sku && sku !== existing.sku) {
    const dupe = await prisma.inventoryItem.findUnique({ where: { sku } });
    if (dupe) throw new ConflictError('SKU already in use');
  }
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name, nameAr, sku,
      price: price !== undefined ? parseFloat(price) : undefined,
      costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
      minStock: minStock !== undefined ? parseInt(minStock) : undefined,
    },
  });
  res.json(item);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, category: 'optics' } });
  if (!existing) throw new NotFoundError('Item not found');
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  res.json({ message: 'Item deleted' });
}));

export default router;
