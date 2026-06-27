import { Router } from 'express';
import summaryRoutes from './routes/summary.routes.js';
import transactionRoutes from './routes/transactions.routes.js';
import expenseRoutes from './routes/expenses.routes.js';
import shiftRoutes from './routes/shifts.routes.js';

const router = Router();
router.use('/', summaryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/expenses', expenseRoutes);
router.use('/shifts', shiftRoutes);

export default router;
