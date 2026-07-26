import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError, ConflictError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.post('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, sku, price, costPrice, initialQuantity, minStock, expiryDate, packSize, barcode } = req.body;
  if (!name || !sku) throw new ValidationError('Name and SKU are required');
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.inventoryItem.findFirst({ where: { sku, hospitalId } });
  if (existing) throw new ConflictError('Item with this SKU already exists');
  const item = await prisma.inventoryItem.create({
    data: {
      name, nameAr, sku, category: 'pharmacy', quantity: initialQuantity || 0,
      price: price || 0, costPrice: costPrice || 0, minStock: minStock || 0,
      packSize: packSize || 1,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      barcode: barcode || null,
      hospitalId,
    },
  });
  res.status(201).json(item);
}));

router.get('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const { search } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;
  const where: Record<string, unknown> = { category: 'pharmacy', isActive: true, hospitalId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { sku: { contains: search, mode: 'insensitive' as const } },
      { barcode: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where: where as Prisma.InventoryItemWhereInput, orderBy: { name: 'asc' } });
  res.json(items);
}));

router.post('/:id/adjust', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const { type, quantity, notes } = req.body;
  if (!type || !['IN', 'OUT'].includes(type as string)) throw new ValidationError('type must be IN or OUT');
  if (!quantity || quantity < 1) throw new ValidationError('quantity must be a positive integer');
  const hospitalId = req.user!.hospitalId!;
  const item = await prisma.inventoryItem.findFirst({ where: { id, category: 'pharmacy', hospitalId } });
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

router.put('/:id', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, nameAr, sku, price, costPrice, minStock, expiryDate, packSize, barcode } = req.body;
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, category: 'pharmacy', hospitalId } });
  if (!existing) throw new NotFoundError('Item not found');
  if (sku && sku !== existing.sku) {
    const dupe = await prisma.inventoryItem.findFirst({ where: { sku, hospitalId } });
    if (dupe) throw new ConflictError('SKU already in use');
  }
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name, nameAr, sku,
      price: price !== undefined ? parseFloat(price) : undefined,
      costPrice: costPrice !== undefined ? parseFloat(costPrice) : undefined,
      minStock: minStock !== undefined ? parseInt(minStock) : undefined,
      packSize: packSize !== undefined ? parseInt(packSize) : undefined,
      expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
      barcode: barcode !== undefined ? (barcode || null) : undefined,
    },
  });
  res.json(item);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, category: 'pharmacy', hospitalId } });
  if (!existing) throw new NotFoundError('Item not found');
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  res.json({ message: 'Item deleted' });
}));

export default router;
