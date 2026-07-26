import { Router } from 'express';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import prisma from '../../../lib/prisma.js';
import { verifyTapWebhook } from '../services/tapPayment.js';

const processedWebhooks = new Set<string>();

const router = Router();

router.post('/tap/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['x-tap-signature'] as string || '';
  const payload = req.body as Record<string, unknown>;

  if (!payload.id || !payload.status) {
    res.status(400).json({ message: 'Invalid webhook payload' });
    return;
  }

  const isValid = verifyTapWebhook(payload, signature);
  if (!isValid) {
    res.status(401).json({ message: 'Invalid webhook signature' });
    return;
  }

  const idempotencyKey = payload.id as string;

  if (processedWebhooks.has(idempotencyKey)) {
    res.json({ message: 'Webhook already processed', idempotencyKey });
    return;
  }

  const tapStatus = payload.status as string;
  const metadata = (payload.metadata || {}) as Record<string, string>;
  const invoiceId = metadata.invoiceId || null;
  const amountRaw = payload.amount as number;
  const amount = typeof amountRaw === 'number' ? amountRaw / 100 : 0;

  if (tapStatus === 'CAPTURED' || tapStatus === 'SUCCESS') {
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (invoice && !invoice.voided) {
        const newPaid = Number(invoice.amountPaid) + amount;
        const newStatus = newPaid >= Number(invoice.total) ? 'Paid' : 'Partial';
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            amountPaid: newPaid,
            paymentStatus: newStatus as never,
          },
        });
      }
    }
    processedWebhooks.add(idempotencyKey);
    res.json({ message: 'Payment recorded', idempotencyKey });
  } else if (tapStatus === 'FAILED' || tapStatus === 'DECLINED') {
    processedWebhooks.add(idempotencyKey);
    res.json({ message: 'Payment failed — no invoice updated', tapStatus });
  } else {
    res.json({ message: 'Webhook acknowledged', tapStatus });
  }
}));

export default router;
