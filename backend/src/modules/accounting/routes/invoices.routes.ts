import { Router } from 'express';
import { $Enums } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { limit, offset } = req.query as Record<string, string>;
  const patientId = req.query.patientId as string | undefined;
  const sourceType = req.query.sourceType as string | undefined;
  const paymentStatus = req.query.paymentStatus as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (sourceType) where.sourceType = sourceType as $Enums.SourceType;
  if (paymentStatus) where.paymentStatus = paymentStatus as $Enums.PaymentStatus;
  if (startDate || endDate) {
    where.created_at = {} as Record<string, unknown>;
    if (startDate) (where.created_at as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.created_at as Record<string, unknown>).lte = end;
    }
  }
  const [invoices, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
      include: { patient: { select: { id: true, fullName: true, mrn: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ invoices, totalCount });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_INVOICE', 'Invoice'), asyncHandler(async (req, res) => {
  const { patientId, sourceType, sourceId, items, discount, tax, notes } = req.body;
  if (!patientId || !sourceType || !items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError('patientId, sourceType, and items array are required');
  }

  const year = new Date().getFullYear();
  const countResult = await prisma.$queryRawUnsafe<{ max_seq: number | null }[]>(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 11) AS INTEGER)), 0) + 1 as max_seq FROM invoices WHERE invoice_number LIKE $1`,
    `INV-${year}-%`,
  );
  const seq = Number(countResult[0]?.max_seq ?? 1);
  const invoiceNumber = `INV-${year}-${String(seq).padStart(5, '0')}`;

  let subtotal = 0;
  for (const item of items) {
    const qty = parseInt(item.quantity) || 1;
    const unitPrice = parseFloat(item.unitPrice);
    subtotal += qty * unitPrice;
  }

  const discountAmount = discount ? parseFloat(discount) : 0;
  const taxAmount = tax ? parseFloat(tax) : 0;
  const total = subtotal - discountAmount + taxAmount;

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      patientId,
      sourceType: sourceType as $Enums.SourceType,
      sourceId: sourceId || null,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      total,
      notes: notes || null,
      created_by: req.user!.id,
      items: {
        createMany: {
          data: items.map((item: Record<string, unknown>) => ({
            serviceItemId: item.serviceItemId as string,
            description: item.description as string,
            quantity: parseInt(item.quantity as string) || 1,
            unitPrice: parseFloat(item.unitPrice as string),
            total: (parseInt(item.quantity as string) || 1) * parseFloat(item.unitPrice as string),
          })),
        },
      },
    },
    include: {
      items: { include: { serviceItem: true } },
      patient: { select: { id: true, fullName: true, mrn: true } },
    },
  });
  res.status(201).json(invoice);
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id! },
    include: {
      items: { include: { serviceItem: true } },
      patient: { select: { id: true, fullName: true, mrn: true, phone: true } },
    },
  });
  if (!invoice) throw new NotFoundError('Invoice not found');
  res.json(invoice);
}));

router.patch('/:id/payment', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('RECORD_INVOICE_PAYMENT', 'Invoice'), asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (!amount || parseFloat(amount) <= 0) throw new ValidationError('Valid payment amount is required');

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id! } });
  if (!invoice) throw new NotFoundError('Invoice not found');

  const paymentAmount = parseFloat(amount);
  const newAmountPaid = Number(invoice.amountPaid) + paymentAmount;
  const invoiceTotal = Number(invoice.total);
  let newStatus: $Enums.PaymentStatus;
  if (newAmountPaid >= invoiceTotal) {
    newStatus = 'PaidInFull';
  } else if (newAmountPaid > 0) {
    newStatus = 'PartialPayment';
  } else {
    newStatus = 'Pending';
  }

  const updated = await prisma.invoice.update({
    where: { id: req.params.id! },
    data: { amountPaid: newAmountPaid, paymentStatus: newStatus },
    include: {
      items: { include: { serviceItem: true } },
      patient: { select: { id: true, fullName: true, mrn: true } },
    },
  });
  res.json(updated);
}));

router.get('/:id/receipt', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id! },
    include: {
      items: { include: { serviceItem: true } },
      patient: { select: { id: true, fullName: true, mrn: true, phone: true, address: true } },
    },
  });
  if (!invoice) throw new NotFoundError('Invoice not found');

  const hospital = invoice.hospitalId
    ? await prisma.hospital.findUnique({ where: { id: invoice.hospitalId }, select: { name: true, address: true, phone: true, logoUrl: true } })
    : null;

  const itemsTotal = invoice.items.reduce((sum, item) => sum + Number(item.total), 0);
  const balance = Number(invoice.total) - Number(invoice.amountPaid);

  res.json({
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      sourceType: invoice.sourceType,
      subtotal: Number(invoice.subtotal),
      discount: Number(invoice.discount),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      amountPaid: Number(invoice.amountPaid),
      paymentStatus: invoice.paymentStatus,
      notes: invoice.notes,
      created_at: invoice.created_at,
    },
    items: invoice.items.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
      serviceName: item.serviceItem.name,
    })),
    patient: invoice.patient,
    hospital,
    computed: { balance, itemsTotal },
  });
}));

router.post('/:id/void', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('VOID_INVOICE', 'Invoice'), asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new ValidationError('Void reason is required');

  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id! } });
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.voided) throw new ValidationError('Invoice is already voided');
  if (Number(invoice.amountPaid) > 0) {
    throw new ValidationError('Cannot void an invoice with payments. Create a refund first.');
  }

  const year = new Date().getFullYear();
  const memoCount = await prisma.creditMemo.count({ where: { hospitalId: invoice.hospitalId } });
  const memoNumber = `CM-VOID-${year}-${String(memoCount + 1).padStart(5, '0')}`;

  const [voidedInvoice] = await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        voided: true,
        voidedAt: new Date(),
        paymentStatus: 'PaidInFull',
      },
    }),
    prisma.creditMemo.create({
      data: {
        memoNumber,
        invoiceId: invoice.id,
        amount: Number(invoice.total),
        reason: `VOID: ${reason}`,
        type: 'VOID',
        status: 'APPLIED',
        createdById: req.user!.id,
      },
    }),
  ]);

  res.json(voidedInvoice);
}));

export default router;
