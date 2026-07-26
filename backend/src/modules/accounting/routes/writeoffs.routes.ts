import { Router } from 'express';
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
  const where: Record<string, unknown> = {};
  if (invoiceId) where.invoiceId = invoiceId;
  const [writeoffs, totalCount] = await Promise.all([
    prisma.badDebtWriteOff.findMany({
      where,
      orderBy: { writeOffDate: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
      include: {
        invoice: { select: { id: true, invoiceNumber: true, total: true, patientId: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.badDebtWriteOff.count({ where }),
  ]);
  res.json({ writeoffs, totalCount });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_WRITE_OFF', 'BadDebtWriteOff'), asyncHandler(async (req, res) => {
  const { invoiceId, amount, reason } = req.body;
  if (!invoiceId || !amount || !reason) {
    throw new ValidationError('invoiceId, amount, and reason are required');
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new NotFoundError('Invoice not found');
  if (invoice.voided) throw new ValidationError('Cannot write off a voided invoice');

  const writeOffAmount = parseFloat(amount);
  if (writeOffAmount <= 0) throw new ValidationError('Amount must be positive');

  const [writeOff] = await prisma.$transaction([
    prisma.badDebtWriteOff.create({
      data: {
        invoiceId,
        amount: writeOffAmount,
        reason,
        createdById: req.user!.id,
      },
    }),
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentStatus: 'PaidInFull',
        notes: `BAD DEBT WRITE-OFF: ${reason}`,
      },
    }),
  ]);

  res.status(201).json(writeOff);
}));

export default router;
