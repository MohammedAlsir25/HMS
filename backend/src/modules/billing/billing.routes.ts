import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { createTapCharge, createTapRefund } from './services/tapPayment.js';
import tapWebhookRoutes from './routes/tapWebhook.routes.js';
import currencyRoutes from './routes/currency.routes.js';
import arabicPdfRoutes from './routes/arabicPdf.routes.js';

const router = Router();

router.use(tapWebhookRoutes);
router.use(currencyRoutes);
router.use(arabicPdfRoutes);

router.post('/tap/charge', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { amount, currency, invoiceId, patientId, description } = req.body as Record<string, unknown>;

  if (!amount || !currency) {
    throw new ValidationError('amount and currency are required');
  }

  const result = await createTapCharge(
    parseFloat(String(amount)),
    String(currency),
    {
      hospitalId: req.user!.hospitalId || '',
      patientId: String(patientId || ''),
      invoiceId: String(invoiceId || ''),
      description: String(description || 'HMS Payment'),
    },
  );

  res.json(result);
}));

router.post('/tap/refund', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { chargeId, amount } = req.body as Record<string, unknown>;

  if (!chargeId || !amount) {
    throw new ValidationError('chargeId and amount are required');
  }

  const result = await createTapRefund(String(chargeId), parseFloat(String(amount)));
  res.json(result);
}));

router.get('/tap/status', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (_req, res) => {
  const hasApiKey = !!process.env['TAP_API_KEY'];
  res.json({
    configured: hasApiKey,
    mode: process.env['TAP_API_KEY']?.startsWith('sk_test') ? 'test' : hasApiKey ? 'live' : 'mock',
  });
}));

export default router;
