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
  const invoiceId = req.query.invoiceId as string | undefined;
  const status = req.query.status as string | undefined;
  const where: Record<string, unknown> = {};
  if (invoiceId) where.invoiceId = invoiceId;
  if (status) where.status = status as $Enums.RefundStatus;
  const [refunds, totalCount] = await Promise.all([
    prisma.refund.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, total: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.refund.count({ where }),
  ]);
  res.json({ refunds, totalCount });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_REFUND', 'Refund'), asyncHandler(async (req, res) => {
  const { invoiceId, transactionId, amount, reason, refundMethod } = req.body;
  if (!invoiceId || !amount || !reason) {
    throw new ValidationError('invoiceId, amount, and reason are required');
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.voided) throw new ValidationError('Cannot refund a voided invoice');

  const refundAmount = parseFloat(amount);
  if (refundAmount <= 0) throw new ValidationError('Amount must be positive');

  const refundCount = await prisma.refund.count({ where: { hospitalId: invoice.hospitalId } });
  const year = new Date().getFullYear();
  const refundNumber = `RF-${year}-${String(refundCount + 1).padStart(5, '0')}`;

  const newAmountPaid = Math.max(0, Number(invoice.amountPaid) - refundAmount);
  const newStatus: $Enums.PaymentStatus = newAmountPaid >= Number(invoice.total)
    ? 'PaidInFull'
    : newAmountPaid > 0
      ? 'PartialPayment'
      : 'Pending';

  const [refund] = await prisma.$transaction([
    prisma.refund.create({
      data: {
        refundNumber,
        invoiceId,
        transactionId: transactionId || null,
        amount: refundAmount,
        reason,
        refundMethod: refundMethod || 'ORIGINAL',
        createdById: req.user!.id,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: { amountPaid: newAmountPaid, paymentStatus: newStatus },
    }),
    prisma.transaction.create({
      data: {
        type: 'RECEPTION',
        amount: -refundAmount,
        paymentMethod: (refundMethod as $Enums.PaymentMethod) || 'CASH',
        description: `Refund ${refundNumber} for invoice ${invoice.invoiceNumber}: ${reason}`,
        shiftId: req.user!.id,
        cashierId: req.user!.id,
        patientId: invoice.patientId,
      },
    }),
  ]);

  res.status(201).json(refund);
}));

export default router;
