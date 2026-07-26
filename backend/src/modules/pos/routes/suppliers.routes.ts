import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (req, res) => {
  const { category } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;
  const where: Record<string, unknown> = { hospitalId };
  if (category) where.category = category;
  const suppliers = await prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
  res.json(suppliers);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { name, contactPerson, phone, email, category } = req.body;
  if (!name) throw new ValidationError('Supplier name is required');
  const hospitalId = req.user!.hospitalId!;
  const supplier = await prisma.supplier.create({
    data: { name, contactPerson, phone, email, category: category || 'pharmacy', hospitalId },
  });
  res.status(201).json(supplier);
}));

router.put('/:id', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.supplier.findFirst({ where: { id, hospitalId } });
  if (!existing) throw new NotFoundError('Supplier not found');
  const { name, contactPerson, phone, email, category } = req.body;
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: name ?? undefined,
      contactPerson: contactPerson ?? undefined,
      phone: phone ?? undefined,
      email: email ?? undefined,
      category: category ?? undefined,
    },
  });
  res.json(supplier);
}));

router.get('/:id/balance', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hospitalId = req.user!.hospitalId!;
  const supplier = await prisma.supplier.findFirst({ where: { id, hospitalId } });
  if (!supplier) throw new NotFoundError('Supplier not found');
  const invoices = await prisma.supplierInvoice.findMany({
    where: { supplierId: id, hospitalId },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { item: { select: { id: true, name: true } } } } },
  });
  const totalInvoiced = invoices.reduce((s, i) => s + Number(i.invoiceTotal), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.amountPaid), 0);
  res.json({
    supplier: { id: supplier.id, name: supplier.name },
    totalInvoiced,
    totalPaid,
    balance: totalInvoiced - totalPaid,
    invoices: invoices.map((inv) => ({
      id: inv.id, invoiceNumber: inv.invoiceNumber, invoiceTotal: Number(inv.invoiceTotal),
      amountPaid: Number(inv.amountPaid), balance: Number(inv.invoiceTotal) - Number(inv.amountPaid),
      paymentStatus: inv.paymentStatus, receivedAt: inv.receivedAt, category: inv.category,
      items: inv.items.map((it) => ({ itemName: it.item?.name || '', quantityReceived: it.quantityReceived, unitCost: Number(it.unitCost), totalLineCost: Number(it.totalLineCost) })),
    })),
  });
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.supplier.findFirst({ where: { id, hospitalId } });
  if (!existing) throw new NotFoundError('Supplier not found');
  const hasInvoices = await prisma.supplierInvoice.findFirst({ where: { supplierId: id, hospitalId } });
  if (hasInvoices) {
    await prisma.supplier.update({ where: { id }, data: { name: `${existing.name} (archived)` } });
    return res.json({ message: 'Supplier archived (has existing invoices)' });
  }
  await prisma.supplier.delete({ where: { id } });
  res.json({ message: 'Supplier deleted' });
}));

export default router;
