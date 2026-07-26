import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { buildDateWhere, formatCurrency } from '../utils/reportHelpers.js';

const router = Router();

router.get('/pharmacy', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const where = buildDateWhere(req, 'createdAt');

  const salesTransactions = await prisma.inventoryTransaction.findMany({
    where: { ...where, type: 'SALE' },
    select: { itemId: true, quantity: true, unitCost: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const itemSalesMap: Record<string, { itemId: string; quantity: number; revenue: number }> = {};
  for (const t of salesTransactions) {
    const existing = itemSalesMap[t.itemId];
    if (!existing) itemSalesMap[t.itemId] = { itemId: t.itemId, quantity: Number(t.quantity), revenue: Number(t.unitCost || 0) * Number(t.quantity) };
    else {
      existing.quantity += Number(t.quantity);
      existing.revenue += Number(t.unitCost || 0) * Number(t.quantity);
    }
  }

  const itemIds = Object.keys(itemSalesMap);
  const items = itemIds.length > 0
    ? await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds }, hospitalId },
        select: { id: true, name: true, category: true, quantity: true, price: true, minStock: true, expiryDate: true },
      })
    : [];
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const topSelling = Object.values(itemSalesMap)
    .map((s) => ({
      item: itemMap.get(s.itemId)?.name || 'Unknown',
      category: itemMap.get(s.itemId)?.category || 'Unknown',
      quantity: s.quantity,
      revenue: s.revenue,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);

  const allItems = await prisma.inventoryItem.findMany({
    where: { hospitalId, isActive: true },
    select: { id: true, name: true, quantity: true, price: true, minStock: true, expiryDate: true, category: true },
  });

  const stockValue = allItems.reduce((sum, i) => sum + Number(i.quantity) * Number(i.price), 0);

  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const expiringSoon = allItems
    .filter((i) => i.expiryDate && new Date(i.expiryDate) <= ninetyDays)
    .map((i) => ({
      item: i.name,
      quantity: Number(i.quantity),
      expiryDate: i.expiryDate,
      daysUntilExpiry: Math.ceil((new Date(i.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const lowStockCount = allItems.filter((i) => Number(i.quantity) <= i.minStock).length;

  const categoryMap: Record<string, number> = {};
  for (const t of salesTransactions) {
    const item = itemMap.get(t.itemId);
    const cat = item?.category || 'Uncategorized';
    categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.quantity);
  }

  const monthlyMap: Record<string, number> = {};
  for (const t of salesTransactions) {
    const key = t.createdAt.toISOString().slice(0, 7);
    monthlyMap[key] = (monthlyMap[key] || 0) + Number(t.unitCost || 0) * Number(t.quantity);
  }

  res.json({
    topSelling,
    stockValue,
    stockValueFormatted: formatCurrency(stockValue),
    expiringSoon,
    expiring30Days: expiringSoon.filter((e) => e.daysUntilExpiry <= 30).length,
    expiring60Days: expiringSoon.filter((e) => e.daysUntilExpiry <= 60).length,
    expiring90Days: expiringSoon.filter((e) => e.daysUntilExpiry <= 90).length,
    lowStockCount,
    salesByCategory: Object.entries(categoryMap)
      .map(([category, quantity]) => ({ category, quantity }))
      .sort((a, b) => b.quantity - a.quantity),
    monthlyTrend: Object.entries(monthlyMap)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    totalSales: salesTransactions.length,
    totalRevenue: topSelling.reduce((s, i) => s + i.revenue, 0),
  });
}));

export default router;
