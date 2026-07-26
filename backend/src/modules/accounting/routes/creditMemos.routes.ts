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
  if (status) where.status = status as $Enums.CreditMemoStatus;
  const [memos, totalCount] = await Promise.all([
    prisma.creditMemo.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, total: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.creditMemo.count({ where }),
  ]);
  res.json({ memos, totalCount });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_CREDIT_MEMO', 'CreditMemo'), asyncHandler(async (req, res) => {
  const { invoiceId, amount, reason, type } = req.body;
  if (!invoiceId || !amount || !reason) {
    throw new ValidationError('invoiceId, amount, and reason are required');
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.voided) throw new ValidationError('Cannot create credit memo for voided invoice');

  const creditAmount = parseFloat(amount);
  if (creditAmount <= 0) throw new ValidationError('Amount must be positive');

  const memoCount = await prisma.creditMemo.count({ where: { hospitalId: invoice.hospitalId } });
  const year = new Date().getFullYear();
  const memoNumber = `CM-${year}-${String(memoCount + 1).padStart(5, '0')}`;

  const newTotal = Number(invoice.total) - creditAmount;
  const newAmountPaid = Math.min(Number(invoice.amountPaid), newTotal);

  const [memo] = await prisma.$transaction([
    prisma.creditMemo.create({
      data: {
        memoNumber,
        invoiceId,
        amount: creditAmount,
        reason,
        type: (type as $Enums.CreditMemoType) || 'CREDIT',
        createdById: req.user!.id,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        total: Math.max(0, newTotal),
        amountPaid: Math.max(0, newAmountPaid),
        paymentStatus: Math.max(0, newAmountPaid) >= Math.max(0, newTotal) ? 'PaidInFull' : Number(invoice.amountPaid) > 0 ? 'PartialPayment' : 'Pending',
      },
    }),
  ]);

  res.status(201).json(memo);
}));

router.post('/:id/apply', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('APPLY_CREDIT_MEMO', 'CreditMemo'), asyncHandler(async (req, res) => {
  const { targetInvoiceId } = req.body;
  if (!targetInvoiceId) throw new ValidationError('targetInvoiceId is required');

  const memo = await prisma.creditMemo.findUnique({ where: { id: req.params.id! } });
  if (!memo) throw new NotFoundError('Credit memo not found');
  if (memo.status === 'APPLIED') throw new ValidationError('Credit memo already applied');
  if (memo.status === 'REJECTED') throw new ValidationError('Cannot apply a rejected credit memo');

  const target = await prisma.invoice.findUnique({ where: { id: targetInvoiceId } });
  if (!target) throw new NotFoundError('Target invoice not found');

  const applied = await prisma.$transaction([
    prisma.creditMemo.update({
      where: { id: memo.id },
      data: { status: 'APPLIED' },
    }),
    prisma.invoice.update({
      where: { id: targetInvoiceId },
      data: {
        total: Math.max(0, Number(target.total) - Number(memo.amount)),
      },
    }),
  ]);

  res.json(applied[0]);
}));

export default router;
