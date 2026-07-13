import { Router } from 'express';
import summaryRoutes from './routes/summary.routes.js';
import transactionRoutes from './routes/transactions.routes.js';
import expenseRoutes from './routes/expenses.routes.js';
import shiftRoutes from './routes/shifts.routes.js';
import debtRoutes from './routes/debts.routes.js';
import cashMovementRoutes from './routes/cashMovements.routes.js';

const router = Router();
router.use('/', summaryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/expenses', expenseRoutes);
router.use('/shifts', shiftRoutes);
router.use('/debts', debtRoutes);
router.use('/cash-movements', cashMovementRoutes);

export default router;
