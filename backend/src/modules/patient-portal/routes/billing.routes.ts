import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { authenticatePatient } from '../middleware/authenticatePatient.js';
import { NotFoundError, ValidationError } from '../../../utils/errors.js';
import { createTapCheckoutSession } from '../../billing/services/tapPayment.js';

const router = Router();
router.use(authenticatePatient);

router.get('/invoices', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const { status } = req.query as { status?: string };
  const where: Record<string, unknown> = { patientId };
  if (status === 'pending') {
    where['paymentStatus'] = { in: ['Pending', 'PartialPayment'] };
  } else if (status === 'paid') {
    where['paymentStatus'] = 'PaidInFull';
  }
  const invoices = await prisma.invoice.findMany({
    where,
    include: { items: true },
    orderBy: { created_at: 'desc' },
  });
  res.json({
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.created_at?.toISOString() ?? inv.updated_at.toISOString(),
      subtotal: inv.subtotal.toNumber(),
      discount: inv.discount.toNumber(),
      tax: inv.tax.toNumber(),
      total: inv.total.toNumber(),
      amountPaid: inv.amountPaid.toNumber(),
      amountDue: inv.total.toNumber() - inv.amountPaid.toNumber(),
      paymentStatus: inv.paymentStatus,
      items: inv.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        total: item.total.toNumber(),
      })),
    })),
  });
}));

router.post('/invoices/:id/pay', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const { id } = req.params;
  const { amount, cardLast4 } = req.body as { amount?: number; cardLast4?: string };
  if (!amount || amount <= 0) {
    throw new ValidationError('A valid payment amount is required');
  }
  const invoice = await prisma.invoice.findFirst({
    where: { id, patientId },
  });
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }
  const balance = invoice.total.toNumber() - invoice.amountPaid.toNumber();
  if (amount > balance) {
    throw new ValidationError('Payment amount exceeds balance due');
  }
  const success = Math.random() < 0.9;
  if (!success) {
    res.status(402).json({
      success: false,
      error: { code: 'PAYMENT_FAILED', message: 'Payment was declined. Please try again.' },
    });
    return;
  }
  const newAmountPaid = invoice.amountPaid.toNumber() + amount;
  const newStatus = newAmountPaid >= invoice.total.toNumber() ? 'PaidInFull' : 'PartialPayment';
  const transactionId = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      amountPaid: newAmountPaid,
      paymentStatus: newStatus as 'PaidInFull' | 'PartialPayment' | 'Pending',
    },
  });
  res.json({
    payment: {
      transactionId,
      invoiceId: invoice.id,
      amount,
      status: 'SUCCESS',
      message: `Payment of ${amount} processed successfully via card ending ${cardLast4 ?? '****'}`,
      receiptUrl: null,
    },
  });
}));

router.get('/payment-history', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const invoices = await prisma.invoice.findMany({
    where: { patientId, paymentStatus: { in: ['PaidInFull', 'PartialPayment'] } },
    orderBy: { updated_at: 'desc' },
  });
  const payments = invoices.map((inv) => ({
    id: inv.id,
    amount: inv.amountPaid.toNumber(),
    paymentMethod: 'CARD',
    description: `Payment for ${inv.invoiceNumber}`,
    createdAt: inv.updated_at.toISOString(),
    invoiceNumber: inv.invoiceNumber,
  }));
  res.json({ payments });
}));

router.post('/tap/checkout', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const hospitalId = req.patient!.hospitalId;
  const { invoiceId, amount, currency, patientName, email, phone } = req.body as Record<string, unknown>;

  if (!invoiceId || !amount || !currency) {
    throw new ValidationError('invoiceId, amount, and currency are required');
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: String(invoiceId), patientId },
  });
  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  const baseUrl = process.env['FRONTEND_URL'] || req.headers.origin || 'http://localhost:5173';
  const redirectUrl = `${baseUrl}/portal/billing?payment=callback&invoiceId=${invoiceId}`;

  const result = await createTapCheckoutSession(
    parseFloat(String(amount)),
    String(currency),
    {
      name: String(patientName || 'Patient'),
      email: String(email || ''),
      phone: phone ? String(phone) : undefined,
    },
    {
      hospitalId: hospitalId || '',
      patientId,
      invoiceId: String(invoiceId),
    },
    redirectUrl,
  );

  res.json({ url: result.url, id: result.id });
}));

export default router;
