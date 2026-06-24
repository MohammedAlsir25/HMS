import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();


router.post("/pharmacy/items", authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), async (req, res) => {
  try {
    const { name, nameAr, sku, price, costPrice, initialQuantity, minStock, expiryDate } = req.body;
    if (!name || !sku) return res.status(400).json({ message: "Name and SKU are required" });
    const existing = await prisma.inventoryItem.findUnique({ where: { sku } });
    if (existing) return res.status(409).json({ message: "Item with this SKU already exists" });
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        nameAr,
        sku,
        category: "pharmacy",
        quantity: initialQuantity || 0,
        price: price || 0,
        costPrice: costPrice || 0,
        minStock: minStock || 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    console.error("Pharmacy item create error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/optics/items", authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), async (req, res) => {
  try {
    const { name, nameAr, sku, price, costPrice, initialQuantity, minStock } = req.body;
    if (!name || !sku) return res.status(400).json({ message: "Name and SKU are required" });
    const existing = await prisma.inventoryItem.findUnique({ where: { sku } });
    if (existing) return res.status(409).json({ message: "Item with this SKU already exists" });
    const item = await prisma.inventoryItem.create({
      data: {
        name,
        nameAr,
        sku,
        category: "optics",
        quantity: initialQuantity || 0,
        price: price || 0,
        costPrice: costPrice || 0,
        minStock: minStock || 0,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    console.error("Optics item create error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/pharmacy/items", authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/optics/items", authenticate, requirePermission(PERMISSIONS.OPTICS_READ), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/pharmacy/items/:id/adjust", authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity, notes } = req.body;
    if (!type || !["IN", "OUT"].includes(type)) return res.status(400).json({ message: "type must be IN or OUT" });
    if (!quantity || quantity < 1) return res.status(400).json({ message: "quantity must be a positive integer" });
    const item = await prisma.inventoryItem.findFirst({ where: { id, category: "pharmacy" } });
    if (!item) return res.status(404).json({ message: "Item not found" });
    const qty = type === "IN" ? quantity : -quantity;
    await prisma.inventoryTransaction.create({
      data: { type, quantity: qty, notes: notes || null, itemId: id },
    });
    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: { increment: qty } },
    });
    res.json(updated);
  } catch (err) {
    console.error("Pharmacy stock adjust error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/pharmacy/items/:id", authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nameAr, sku, price, minStock, expiryDate } = req.body;
    const existing = await prisma.inventoryItem.findFirst({ where: { id, category: "pharmacy" } });
    if (!existing) return res.status(404).json({ message: "Item not found" });
    if (sku && sku !== existing.sku) {
      const dupe = await prisma.inventoryItem.findUnique({ where: { sku } });
      if (dupe) return res.status(409).json({ message: "SKU already in use" });
    }
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { name, nameAr, sku, price: price !== undefined ? parseFloat(price) : undefined, minStock: minStock !== undefined ? parseInt(minStock) : undefined, expiryDate: expiryDate !== undefined ? (expiryDate ? new Date(expiryDate) : null) : undefined },
    });
    res.json(item);
  } catch (err) {
    console.error("Pharmacy item update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/pharmacy/items/:id", authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.inventoryItem.findFirst({ where: { id, category: "pharmacy" } });
    if (!existing) return res.status(404).json({ message: "Item not found" });
    await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("Pharmacy item delete error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/optics/items/:id/adjust", authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), async (req, res) => {
  try {
    const { id } = req.params;
    const { type, quantity, notes } = req.body;
    if (!type || !["IN", "OUT"].includes(type)) return res.status(400).json({ message: "type must be IN or OUT" });
    if (!quantity || quantity < 1) return res.status(400).json({ message: "quantity must be a positive integer" });
    const item = await prisma.inventoryItem.findFirst({ where: { id, category: "optics" } });
    if (!item) return res.status(404).json({ message: "Item not found" });
    const qty = type === "IN" ? quantity : -quantity;
    await prisma.inventoryTransaction.create({
      data: { type, quantity: qty, notes: notes || null, itemId: id },
    });
    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: { increment: qty } },
    });
    res.json(updated);
  } catch (err) {
    console.error("Optics stock adjust error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/optics/items/:id", authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, nameAr, sku, price, minStock } = req.body;
    const existing = await prisma.inventoryItem.findFirst({ where: { id, category: "optics" } });
    if (!existing) return res.status(404).json({ message: "Item not found" });
    if (sku && sku !== existing.sku) {
      const dupe = await prisma.inventoryItem.findUnique({ where: { sku } });
      if (dupe) return res.status(409).json({ message: "SKU already in use" });
    }
    const item = await prisma.inventoryItem.update({
      where: { id },
      data: { name, nameAr, sku, price: price !== undefined ? parseFloat(price) : undefined, minStock: minStock !== undefined ? parseInt(minStock) : undefined },
    });
    res.json(item);
  } catch (err) {
    console.error("Optics item update error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/optics/items/:id", authenticate, requirePermission(PERMISSIONS.OPTICS_WRITE), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.inventoryItem.findFirst({ where: { id, category: "optics" } });
    if (!existing) return res.status(404).json({ message: "Item not found" });
    await prisma.inventoryItem.update({ where: { id }, data: { isActive: false } });
    res.json({ message: "Item deleted" });
  } catch (err) {
    console.error("Optics item delete error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/alerts", authenticate, async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

const VALID_TYPES = { PHARMACY: 'PHARMACY', OPTICS: 'OPTICS' };

router.get('/items', authenticate, async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = { isActive: true };
    if (category) where.category = { contains: category, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/shift/current', authenticate, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/shift/close', authenticate, async (req, res) => {
  try {
    const { expectedTotal, actualTotal, notes } = req.body;
    const shift = await prisma.shift.findFirst({
      where: { userId: req.user.id, closedAt: null },
    });
    if (!shift) return res.status(404).json({ message: 'No open shift found' });
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

const TYPE_DEPT_SLUG = { PHARMACY: 'pharmacy', OPTICS: 'optics' };

router.post('/transact', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), async (req, res) => {
  try {
    const { type, items, paymentMethod, amount, description, patientName, departmentId } = req.body;
    if (!type || !['PHARMACY', 'OPTICS'].includes(type)) {
      return res.status(400).json({ message: 'type must be PHARMACY or OPTICS' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items array is required' });
    }
    if (!paymentMethod || !['CASH', 'CARD', 'INSURANCE', 'BANK_TRANSFER'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }
    if (amount === undefined || amount === null) {
      return res.status(400).json({ message: 'amount is required' });
    }

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

    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount,
        paymentMethod,
        description: description || (patientName ? `Sale for ${patientName}` : null),
        shiftId: shift.id,
        cashierId: req.user.id,
        departmentId: resolvedDepartmentId,
      },
    });

    for (const item of items) {
      await prisma.inventoryTransaction.create({
        data: {
          type: 'SALE',
          quantity: -(item.quantity || 1),
          notes: item.name || null,
          itemId: item.id,
        },
      });
      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: { quantity: { decrement: item.quantity || 1 } },
      });
    }

    res.status(201).json({ transaction, shift });
  } catch (err) {
    console.error('POS transact error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
