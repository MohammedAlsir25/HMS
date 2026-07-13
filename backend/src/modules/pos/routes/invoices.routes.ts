import { Router } from 'express';
import { $Enums } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router({ mergeParams: true });

const VALID_CATEGORIES = ['pharmacy', 'optics', 'hospital'];
const VALID_STATUSES = ['PaidInFull', 'PartialPayment', 'Pending'];

function validateCategory(category: string) {
  if (!VALID_CATEGORIES.includes(category)) throw new ValidationError('Invalid category');
}

const getNextRef = (category: string) => {
  const prefix = category === 'pharmacy' ? 'PH' : category === 'optics' ? 'OP' : 'HO';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  return { prefix, dateStr };
};

router.get('/next-ref', authenticate, asyncHandler(async (req, res) => {
  const category = req.params.category!;
  validateCategory(category);
  const { prefix, dateStr } = getNextRef(category);
  const last = await prisma.supplierInvoice.findFirst({
    where: { invoiceNumber: { startsWith: `${prefix}-${dateStr}-` }, category },
    orderBy: { createdAt: 'desc' },
  });
  const nextNum = last
    ? String(parseInt(last.invoiceNumber!.slice(-3), 10) + 1).padStart(3, '0')
    : '001';
  res.json({ ref: `${prefix}-${dateStr}-${nextNum}` });
}));

router.get('/', authenticate, asyncHandler(async (req, res) => {
  const category = req.params.category!;
  validateCategory(category);
  const invoices = await prisma.supplierInvoice.findMany({
    where: { category },
    include: { supplier: true, items: { include: { item: true } }, createdBy: { select: { fullName: true } } },
    orderBy: { receivedAt: 'desc' },
  });
  res.json(invoices);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const category = req.params.category!;
  validateCategory(category);
  const { supplierId, invoiceNumber, invoiceTotal, amountPaid, paymentStatus, receivedAt, notes, items } = req.body;

  if (!supplierId) throw new ValidationError('supplierId is required');
  if (!invoiceTotal || invoiceTotal <= 0) throw new ValidationError('invoiceTotal must be positive');
  if (paymentStatus && !VALID_STATUSES.includes(paymentStatus)) throw new ValidationError('Invalid paymentStatus');
  if (!items || !Array.isArray(items) || items.length === 0) throw new ValidationError('At least one item is required');

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new NotFoundError('Supplier not found');

  const invoice = await prisma.supplierInvoice.create({
    data: {
      supplierId,
      invoiceNumber,
      invoiceTotal: Number(invoiceTotal),
      amountPaid: Number(amountPaid) || 0,
      paymentStatus: (paymentStatus as $Enums.PaymentStatus) || 'Pending',
      category,
      notes,
      receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      createdById: req.user!.id,
      items: {
        create: items.map((it: { itemId: string; quantityReceived: number; unitCost: number }) => {
          if (!it.itemId || !it.quantityReceived || it.quantityReceived < 1) throw new ValidationError('Each item needs itemId and quantityReceived >= 1');
          const unitCost = Number(it.unitCost) || 0;
          return {
            itemId: it.itemId,
            quantityReceived: it.quantityReceived,
            unitCost,
            totalLineCost: unitCost * it.quantityReceived,
          };
        }),
      },
    },
  });

  const invoiceItems = await prisma.supplierInvoiceItem.findMany({
    where: { invoiceId: invoice.id },
  });

  const dbItems = await prisma.inventoryItem.findMany({
    where: { id: { in: invoiceItems.map((i) => i.itemId) } },
  });
  const itemMap = new Map(dbItems.map((i) => [i.id, i]));

  await Promise.all(invoiceItems.map(async (item) => {
    const dbItem = itemMap.get(item.itemId);
    if (!dbItem) return;
    const existingQty = Number(dbItem.quantity);
    const existingCost = Number(dbItem.costPrice) || 0;
    const receivedQty = item.quantityReceived;
    const receivedUnitCost = Number(item.unitCost);
    const newQty = existingQty + receivedQty;
    const newCostPrice = newQty > 0
      ? ((existingQty * existingCost) + (receivedQty * receivedUnitCost)) / newQty
      : receivedUnitCost;

    await prisma.inventoryItem.update({
      where: { id: item.itemId },
      data: {
        quantity: { increment: receivedQty },
        costPrice: newCostPrice,
      },
    });
    await prisma.inventoryTransaction.create({
      data: {
        type: 'IN',
        quantity: receivedQty,
        unitCost: receivedUnitCost,
        notes: `Delivery #${invoice.id.slice(0, 8)}${invoiceNumber ? ` (${invoiceNumber})` : ''}`,
        itemId: item.itemId,
      },
    });
  }));
  const paidAmount = Number(amountPaid) || 0;
  if (category !== 'hospital') {
    const deptSlug = category === 'pharmacy' ? 'pharmacy-dept' : 'optics-dept';
    const department = await prisma.department.findUnique({ where: { slug: deptSlug } });
    if (department) {
      const expense = await prisma.expense.create({
        data: {
          amount: Number(invoiceTotal),
          category: 'SUPPLIES',
          description: `Supplier delivery ${invoiceNumber || invoice.id} — ${paidAmount.toLocaleString()} SDG paid of ${Number(invoiceTotal).toLocaleString()} SDG`,
          paidTo: supplier.name,
          departmentId: department.id,
        },
      });
      await prisma.supplierInvoice.update({
        where: { id: invoice.id },
        data: { expenseId: expense.id },
      });
    }
  }

  const fullInvoice = await prisma.supplierInvoice.findUnique({
    where: { id: invoice.id },
    include: { items: { include: { item: true } }, supplier: true, expense: true, createdBy: { select: { fullName: true } } },
  });
  res.status(201).json(fullInvoice);
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const category = req.params.category!;
  validateCategory(category);
  const invoice = await prisma.supplierInvoice.findFirst({
    where: { id, category },
    include: { supplier: true, items: { include: { item: true } }, createdBy: { select: { fullName: true } } },
  });
  if (!invoice) throw new NotFoundError('Invoice not found');
  res.json(invoice);
}));

router.put('/:id/payment', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amountPaid, paymentStatus } = req.body;
  const existing = await prisma.supplierInvoice.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Invoice not found');
  if (paymentStatus && !VALID_STATUSES.includes(paymentStatus)) throw new ValidationError('Invalid paymentStatus');
  const invoice = await prisma.supplierInvoice.update({
    where: { id },
    data: {
      amountPaid: amountPaid !== undefined ? Number(amountPaid) : undefined,
      paymentStatus: paymentStatus as $Enums.PaymentStatus ?? undefined,
    },
  });

  const newAmountPaid = amountPaid !== undefined ? Number(amountPaid) : Number(existing.amountPaid);
  if (existing.category !== 'hospital') {
    if (existing.expenseId) {
      await prisma.expense.update({
        where: { id: existing.expenseId },
        data: { amount: newAmountPaid },
      });
    } else if (newAmountPaid > 0) {
      const deptSlug = existing.category === 'pharmacy' ? 'pharmacy-dept' : 'optics-dept';
      const department = await prisma.department.findUnique({ where: { slug: deptSlug } });
      if (department) {
        const supplier = await prisma.supplier.findUnique({ where: { id: existing.supplierId } });
        const expense = await prisma.expense.create({
          data: {
            amount: newAmountPaid,
            category: 'SUPPLIES',
            description: `Supplier delivery for invoice ${existing.invoiceNumber || existing.id}`,
            paidTo: supplier?.name,
            departmentId: department.id,
          },
        });
        await prisma.supplierInvoice.update({
          where: { id: existing.id },
          data: { expenseId: expense.id },
        });
      }
    }
  }

  res.json(invoice);
}));

export default router;
