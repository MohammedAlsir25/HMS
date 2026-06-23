import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/items', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), async (req, res) => {
  try {
    const { search, category } = req.query;
    const where = { isActive: true };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
    res.json(items);
  } catch (err) {
    console.error('Inventory list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/items/low-stock', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({ where: { isActive: true } });
    const lowStock = items.filter((i) => i.quantity <= i.minStock).sort((a, b) => a.quantity - b.quantity);
    res.json(lowStock);
  } catch (err) {
    console.error('Low stock error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/items/:id', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), async (req, res) => {
  try {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: req.params.id },
      include: { locations: true, transactions: { orderBy: { createdAt: 'desc' }, take: 50 } },
    });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    console.error('Inventory item error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/items', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_WRITE), async (req, res) => {
  try {
    const { name, nameAr, sku, category, quantity, price, minStock } = req.body;
    if (!name || !sku || !category) {
      return res.status(400).json({ message: 'Name, SKU, and category are required' });
    }
    const existing = await prisma.inventoryItem.findUnique({ where: { sku } });
    if (existing) return res.status(409).json({ message: 'Item with this SKU already exists' });
    const item = await prisma.inventoryItem.create({
      data: { name, nameAr, sku, category, quantity: quantity || 0, price: price || 0, minStock: minStock || 0 },
    });
    res.status(201).json(item);
  } catch (err) {
    console.error('Inventory create error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/items/:id', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_WRITE), async (req, res) => {
  try {
    const { name, nameAr, category, price, minStock, isActive } = req.body;
    const item = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: { name, nameAr, category, price, minStock, isActive },
    });
    res.json(item);
  } catch (err) {
    console.error('Inventory update error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/items/:id', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_WRITE), async (req, res) => {
  try {
    await prisma.inventoryItem.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Item deactivated' });
  } catch (err) {
    console.error('Inventory deactivate error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/transactions/:itemId', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), async (req, res) => {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { itemId: req.params.itemId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(transactions);
  } catch (err) {
    console.error('Transaction list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/transactions', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_WRITE), async (req, res) => {
  try {
    const { itemId, type, quantity, notes } = req.body;
    if (!itemId || !type || !quantity) {
      return res.status(400).json({ message: 'Item ID, type, and quantity are required' });
    }
    const item = await prisma.inventoryItem.findUnique({ where: { id: itemId } });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const newQty = type === 'IN' ? item.quantity + quantity : item.quantity - quantity;
    if (newQty < 0) return res.status(400).json({ message: 'Insufficient stock' });
    const [transaction] = await prisma.$transaction([
      prisma.inventoryTransaction.create({ data: { itemId, type, quantity, notes } }),
      prisma.inventoryItem.update({ where: { id: itemId }, data: { quantity: newQty } }),
    ]);
    res.status(201).json(transaction);
  } catch (err) {
    console.error('Transaction create error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/locations', authenticate, requirePermission(PERMISSIONS.WAREHOUSE_READ), async (req, res) => {
  try {
    const locations = await prisma.inventoryLocation.findMany({ include: { item: true } });
    res.json(locations);
  } catch (err) {
    console.error('Locations error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
