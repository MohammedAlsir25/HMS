import { Router } from 'express';
import { $Enums } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

function formatSupplierInvoice(inv: any) {
  return {
    id: inv.id,
    source: (inv as any).category,
    creditor: (inv.supplier as any)?.name,
    invoiceNumber: (inv as any).invoiceNumber,
    invoiceTotal: Number((inv as any).invoiceTotal),
    amountPaid: Number((inv as any).amountPaid),
    balance: Number((inv as any).invoiceTotal) - Number((inv as any).amountPaid),
    status: (inv as any).paymentStatus,
    date: (inv as any).receivedAt,
    items: inv.items?.map((it: any) => ({
      id: it.id,
      itemName: it.item?.name || '',
      quantityReceived: it.quantityReceived,
      unitCost: Number(it.unitCost),
      totalLineCost: Number(it.totalLineCost),
    })),
  };
}

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (_req, res) => {
  const [supplierInvoices, hospitalDebts] = await Promise.all([
    prisma.supplierInvoice.findMany({
      where: { paymentStatus: { not: 'PaidInFull' as $Enums.PaymentStatus } },
      include: {
        supplier: { select: { id: true, name: true } },
        items: { include: { item: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.accountsPayable.findMany({
      where: { paymentStatus: { not: 'PaidInFull' as $Enums.PaymentStatus } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const pharmacyDebts = (supplierInvoices as any[]).filter((i: any) => i.category === 'pharmacy').map(formatSupplierInvoice);
  const opticsDebts = (supplierInvoices as any[]).filter((i: any) => i.category === 'optics').map(formatSupplierInvoice);
  const hospitalItems = hospitalDebts.map((d: any) => ({
    id: d.id,
    source: 'hospital',
    creditor: d.creditor,
    invoiceNumber: null,
    description: d.description,
    invoiceTotal: Number(d.amount),
    amountPaid: Number(d.amountPaid),
    balance: Number(d.amount) - Number(d.amountPaid),
    status: d.paymentStatus,
    date: d.createdAt,
    dueDate: d.dueDate,
    notes: d.notes,
    items: null,
  }));

  const allDebts = [...pharmacyDebts, ...opticsDebts, ...hospitalItems];

  const summary = { totalDebt: 0, totalUnpaid: 0, bySource: { pharmacy: { total: 0, unpaid: 0 }, optics: { total: 0, unpaid: 0 }, hospital: { total: 0, unpaid: 0 } } };
  for (const d of allDebts) {
    const src = d.source as keyof typeof summary.bySource;
    summary.totalDebt += d.invoiceTotal;
    summary.totalUnpaid += d.balance;
    if (summary.bySource[src]) {
      summary.bySource[src].total += d.invoiceTotal;
      summary.bySource[src].unpaid += d.balance;
    }
  }

  res.json({ summary, debts: allDebts });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const invoice = await prisma.supplierInvoice.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { item: true } }, createdBy: { select: { fullName: true } } },
  });
  if (invoice) return res.json({ type: 'supplier_invoice', ...formatSupplierInvoice(invoice) });
  const debt = await prisma.accountsPayable.findUnique({ where: { id } });
  if (debt) return res.json({ type: 'accounts_payable', id: debt.id, source: 'hospital', creditor: debt.creditor, description: debt.description, invoiceTotal: Number(debt.amount), amountPaid: Number(debt.amountPaid), balance: Number(debt.amount) - Number(debt.amountPaid), status: debt.paymentStatus, date: debt.createdAt, dueDate: debt.dueDate, notes: debt.notes });
  throw new NotFoundError('Debt not found');
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { creditor, description, amount, dueDate, notes } = req.body;
  if (!creditor || !description || !amount) throw new ValidationError('creditor, description, and amount are required');
  const debt = await prisma.accountsPayable.create({
    data: { creditor, description, amount: parseFloat(amount), dueDate: dueDate ? new Date(dueDate) : null, notes: notes || null },
  });
  res.status(201).json(debt);
}));

router.put('/:id/payment', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount: paymentAmount } = req.body;
  if (!paymentAmount || parseFloat(paymentAmount) <= 0) throw new ValidationError('Valid payment amount is required');

  const supplierInvoice = await prisma.supplierInvoice.findUnique({ where: { id }, include: { supplier: true } });
  if (supplierInvoice) {
    const newAmountPaid = Number(supplierInvoice.amountPaid) + parseFloat(paymentAmount);
    const total = Number(supplierInvoice.invoiceTotal);
    const newStatus: $Enums.PaymentStatus = newAmountPaid >= total ? 'PaidInFull' : 'PartialPayment';
    const updated = await prisma.supplierInvoice.update({
      where: { id }, data: { amountPaid: newAmountPaid, paymentStatus: newStatus },
    });
    if (supplierInvoice.expenseId) {
      await prisma.expense.update({ where: { id: supplierInvoice.expenseId }, data: { amount: newAmountPaid } });
    }
    return res.json({ type: 'supplier_invoice', id: updated.id, source: updated.category, creditor: supplierInvoice.supplier.name, invoiceTotal: Number(updated.invoiceTotal), amountPaid: Number(updated.amountPaid), balance: Number(updated.invoiceTotal) - Number(updated.amountPaid), status: updated.paymentStatus });
  }

  const hospitalDebt = await prisma.accountsPayable.findUnique({ where: { id } });
  if (hospitalDebt) {
    const newAmountPaid = Number(hospitalDebt.amountPaid) + parseFloat(paymentAmount);
    const total = Number(hospitalDebt.amount);
    const newStatus: $Enums.PaymentStatus = newAmountPaid >= total ? 'PaidInFull' : 'PartialPayment';
    const updated = await prisma.accountsPayable.update({
      where: { id }, data: { amountPaid: newAmountPaid, paymentStatus: newStatus },
    });
    return res.json({ type: 'accounts_payable', id: updated.id, source: 'hospital', creditor: updated.creditor, invoiceTotal: Number(updated.amount), amountPaid: Number(updated.amountPaid), balance: Number(updated.amount) - Number(updated.amountPaid), status: updated.paymentStatus });
  }

  throw new NotFoundError('Debt not found');
}));

export default router;
