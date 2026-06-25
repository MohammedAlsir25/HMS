import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { posTransactSchema } from '../../schemas/pos.schema.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.post("/pharmacy/items", authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, sku, price, costPrice, initialQuantity, minStock, expiryDate } = req.body;
  if (!name || !sku) throw new ValidationError("Name and SKU are required");
  const existing = await prisma.inventoryItem.findUnique({ where: { sku } });
  if (existing) throw new ConflictError("Item with this SKU already exists");
  const item = await prisma.inventoryItem.create({
    data: {
      name, nameAr, sku, category: "pharmacy", quantity: initialQuantity || 0,
      price: price || 0, costPrice: costPrice || 0, minStock: minStock || 0,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });
  res.status(201).json(item);
}));

router.post("/optics/items", authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const { name, nameAr, sku, price, costPrice, initialQuantity, minStock } = req.body;
  if (!name || !sku) throw new ValidationError("Name and SKU are required");
  const existing = await prisma.inventoryItem.findUnique({ where: { sku } });
  if (existing) throw new ConflictError("Item with this SKU already exists");
  const item = await prisma.inventoryItem.create({
    data: {
      name, nameAr, sku, category: "optics", quantity: initialQuantity || 0,
      price: price || 0, costPrice: costPrice || 0, minStock: minStock || 0,
    },
  });
  res.status(201).json(item);
}));

router.get("/pharmacy/items", authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const { search } = req.query;
  const where = { category: { equals: "pharmacy", mode: "insensitive" }, isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: "asc" } });
  res.json(items);
}));

router.get("/optics/items", authenticate, requirePermission(PERMISSIONS.OPTICS_READ), asyncHandler(async (req, res) => {
  const { search } = req.query;
  const where = { category: { equals: "optics", mode: "insensitive" }, isActive: true };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: "asc" } });
  res.json(items);
}));

router.post("/pharmacy/items/:id/adjust", authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, quantity, notes } = req.body;
  if (!type || !["IN", "OUT"].includes(type)) throw new ValidationError("type must be IN or OUT");
  if (!quantity || quantity < 1) throw new ValidationError("quantity must be a positive integer");
  const item = await prisma.inventoryItem.findFirst({ where: { id, category: "pharmacy" } });
  if (!item) throw new NotFoundError("Item not found");
  const qty = type === "IN" ? quantity : -quantity;
  await prisma.inventoryTransaction.create({
    data: { type, quantity: qty, notes: notes || null, itemId: id },
  });
  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { quantity: { increment: qty } },
  });
  res.json(updated);
}));

router.put("/pharmacy/items/:id", authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, nameAr, sku, price, minStock, expiryDate } = req.body;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, category: "pharmacy" } });
  if (!existing) throw new NotFoundError("Item not found");
  if (sku && sku !== existing.sku) {
    const dupe = await prisma.inventoryItem.findUnique({ where: { sku } });
    if (dupe) throw new ConflictError("SKU already in use");
  }
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name, nameAr, sku,
      price: price !== undefined ? parseFloat(price) : undefined,
      minStock: minStock !== undefined ? parseInt(minStock) : undefined,
      expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined,
    },
  });
  res.json(item);
}));

router.delete("/pharmacy/items/:id", authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, category: "pharmacy" } });
  if (!existing) throw new NotFoundError("Item not found");
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  res.json({ message: "Item deleted" });
}));

router.post("/optics/items/:id/adjust", authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { type, quantity, notes } = req.body;
  if (!type || !["IN", "OUT"].includes(type)) throw new ValidationError("type must be IN or OUT");
  if (!quantity || quantity < 1) throw new ValidationError("quantity must be a positive integer");
  const item = await prisma.inventoryItem.findFirst({ where: { id, category: "optics" } });
  if (!item) throw new NotFoundError("Item not found");
  const qty = type === "IN" ? quantity : -quantity;
  await prisma.inventoryTransaction.create({
    data: { type, quantity: qty, notes: notes || null, itemId: id },
  });
  const updated = await prisma.inventoryItem.update({
    where: { id },
    data: { quantity: { increment: qty } },
  });
  res.json(updated);
}));

router.put("/optics/items/:id", authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, nameAr, sku, price, minStock } = req.body;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, category: "optics" } });
  if (!existing) throw new NotFoundError("Item not found");
  if (sku && sku !== existing.sku) {
    const dupe = await prisma.inventoryItem.findUnique({ where: { sku } });
    if (dupe) throw new ConflictError("SKU already in use");
  }
  const item = await prisma.inventoryItem.update({
    where: { id },
    data: {
      name, nameAr, sku,
      price: price !== undefined ? parseFloat(price) : undefined,
      minStock: minStock !== undefined ? parseInt(minStock) : undefined,
    },
  });
  res.json(item);
}));

router.delete("/optics/items/:id", authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.inventoryItem.findFirst({ where: { id, category: "optics" } });
  if (!existing) throw new NotFoundError("Item not found");
  await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
  res.json({ message: "Item deleted" });
}));

router.get("/alerts", authenticate, asyncHandler(async (req, res) => {
  const { category } = req.query;
  const where = { isActive: true };
  if (category) where.category = { equals: category, mode: "insensitive" };
  const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: "asc" } });
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const alerts = { lowStock: [], expired: [], expiringSoon: [] };
  for (const item of items) {
    if (item.quantity <= item.minStock) alerts.lowStock.push(item);
    if (item.expiryDate) {
      if (new Date(item.expiryDate) < now) alerts.expired.push(item);
      else if (new Date(item.expiryDate) <= in30Days) alerts.expiringSoon.push(item);
    }
  }
  res.json(alerts);
}));

const VALID_TYPES = { PHARMACY: 'PHARMACY', OPTICS: 'OPTICS' };

router.get('/items', authenticate, asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  const where = { isActive: true };
  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
  res.json(items);
}));

router.get('/shift/current', authenticate, asyncHandler(async (req, res) => {
  let shift = await prisma.shift.findFirst({
    where: { userId: req.user.id, closedAt: null },
    include: { transactions: true },
  });
  if (!shift) {
    shift = await prisma.shift.create({
      data: { userId: req.user.id },
      include: { transactions: true },
    });
  }
  res.json(shift);
}));

router.post('/shift/close', authenticate, auditMiddleware('UPDATE', 'Shift'), asyncHandler(async (req, res) => {
  const { expectedTotal, actualTotal, notes } = req.body;
  const shift = await prisma.shift.findFirst({
    where: { userId: req.user.id, closedAt: null },
  });
  if (!shift) throw new NotFoundError('No open shift found');
  const updated = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      closedAt: new Date(),
      expectedTotal: expectedTotal !== undefined ? expectedTotal : null,
      actualTotal: actualTotal !== undefined ? actualTotal : null,
      notes: notes || null,
    },
  });
  res.json(updated);
}));

const TYPE_DEPT_SLUG = { PHARMACY: 'pharmacy', OPTICS: 'optics' };

router.post('/transact', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), auditMiddleware('CREATE', 'Transaction'), validate(posTransactSchema), asyncHandler(async (req, res) => {
  const { type, items, paymentMethod, amount, description, patientName, departmentId, referralId } = req.body;

  let resolvedDepartmentId = departmentId || null;
  if (!resolvedDepartmentId && TYPE_DEPT_SLUG[type]) {
    const dept = await prisma.department.findUnique({ where: { slug: TYPE_DEPT_SLUG[type] } });
    if (dept) resolvedDepartmentId = dept.id;
  }

  let shift = await prisma.shift.findFirst({
    where: { userId: req.user.id, closedAt: null },
  });
  if (!shift) {
    shift = await prisma.shift.create({ data: { userId: req.user.id } });
  }

  let totalCogs = 0;
  const inventoryTxData = [];
  for (const item of items) {
    const dbItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    const unitCost = dbItem?.costPrice || 0;
    const qty = item.quantity || 1;
    totalCogs += Number(unitCost) * qty;
    inventoryTxData.push({ item, unitCost, qty });
  }

  const transaction = await prisma.transaction.create({
    data: {
      type, amount, cogs: totalCogs, paymentMethod,
      description: description || (patientName ? `Sale for ${patientName}` : null),
      shiftId: shift.id, cashierId: req.user.id, departmentId: resolvedDepartmentId,
    },
  });

  for (const { item, unitCost, qty } of inventoryTxData) {
    await prisma.inventoryTransaction.create({
      data: { type: 'SALE', quantity: -qty, unitCost, notes: item.name || null, itemId: item.id },
    });
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: { decrement: qty } },
    });
  }

  if (referralId) {
    const refType = type === 'PHARMACY' ? 'PHARMACY_DISPATCH' : 'OPTICS_DISPATCH';
    await prisma.referral.updateMany({
      where: { id: referralId, type: refType, status: 'PENDING' },
      data: { status: 'FULFILLED' },
    });
  }

  res.status(201).json({ transaction, shift });
}));

export default router;
