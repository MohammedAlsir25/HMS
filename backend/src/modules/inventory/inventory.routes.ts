import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
import prisma from '../../lib/prisma.js';

router.get('/items', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), asyncHandler(async (req, res) => {
  const { search, category } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;
  const where: Record<string, unknown> = { isActive: true, hospitalId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { sku: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  if (category) where.category = category;
  const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
  res.json(items);
}));

router.get('/items/low-stock', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), asyncHandler(async (req, res) => {
  const items = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT * FROM "public"."inventory_items" WHERE "is_active" = true AND "quantity"::numeric <= "min_stock" AND "hospitalId" = $1 ORDER BY "quantity"::numeric ASC`,
    req.user!.hospitalId,
  );
  res.json(items);
}));

router.get('/items/:id', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const item = await prisma.inventoryItem.findFirst({
    where: { id: req.params.id, hospitalId },
    include: { locations: true, transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
  });
  if (!item) throw new NotFoundError('Item not found');
  res.json(item);
}));

router.post('/items', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, sku, category, quantity, price, costPrice, minStock } = req.body;
  if (!name || !sku || !category) throw new ValidationError('Name, SKU, and category are required');
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.inventoryItem.findFirst({ where: { sku, hospitalId } });
  if (existing) throw new ConflictError('Item with this SKU already exists');
  const item = await prisma.inventoryItem.create({
    data: { name, nameAr, sku, category, quantity: quantity || 0, price: price || 0, costPrice: costPrice || 0, minStock: minStock || 0, hospitalId },
  });
  res.status(201).json(item);
}));

router.patch('/items/:id', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, category, price, costPrice, minStock, isActive } = req.body;
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, hospitalId } });
  if (!existing) throw new NotFoundError('Item not found');
  const item = await prisma.inventoryItem.update({
    where: { id: req.params.id },
    data: { name, nameAr, category, price, costPrice, minStock, isActive },
  });
  res.json(item);
}));

router.delete('/items/:id', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.inventoryItem.findFirst({ where: { id: req.params.id, hospitalId } });
  if (!existing) throw new NotFoundError('Item not found');
  await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Item deactivated' });
}));

router.get('/transactions/:itemId', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), asyncHandler(async (req, res) => {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { itemId: req.params.itemId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transactions);
}));

router.post('/transactions', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_WRITE), asyncHandler(async (req, res) => {
  const { itemId, type, quantity, notes } = req.body;
  if (!itemId || !type || !quantity) throw new ValidationError('Item ID, type, and quantity are required');
  const hospitalId = req.user!.hospitalId!;
  const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, hospitalId } });
  if (!item) throw new NotFoundError('Item not found');
  const newQty = type === 'IN' ? Number(item.quantity) + quantity : Number(item.quantity) - quantity;
  if (newQty < 0) throw new ValidationError('Insufficient stock');
  const [transaction] = await prisma.$transaction([
    prisma.inventoryTransaction.create({ data: { itemId, type, quantity, notes } }),
    prisma.inventoryItem.update({ where: { id: itemId }, data: { quantity: newQty } }),
  ]);
  res.status(201).json(transaction);
}));

router.get('/locations', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const locations = await prisma.inventoryLocation.findMany({ where: { hospitalId }, include: { item: true } });
  res.json(locations);
}));

export default router;
