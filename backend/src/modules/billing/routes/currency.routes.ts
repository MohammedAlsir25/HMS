import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { convertAmount, formatCurrency, getSupportedCurrencies, getExchangeRate } from '../utils/currency.js';

const router = Router();

router.get('/currencies', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (_req, res) => {
  const currencies = getSupportedCurrencies();
  res.json({ currencies });
}));

router.post('/convert', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { amount, fromCurrency, toCurrency } = req.body;

  if (amount === undefined || !fromCurrency || !toCurrency) {
    throw new ValidationError('amount, fromCurrency, and toCurrency are required');
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount < 0) {
    throw new ValidationError('amount must be a non-negative number');
  }

  const converted = convertAmount(numAmount, fromCurrency, toCurrency);
  const rate = getExchangeRate(fromCurrency, toCurrency);
  const formatted = formatCurrency(converted, toCurrency);

  res.json({
    original: { amount: numAmount, currency: fromCurrency.toUpperCase() },
    converted: { amount: converted, currency: toCurrency.toUpperCase(), formatted },
    exchangeRate: rate,
  });
}));

export default router;
