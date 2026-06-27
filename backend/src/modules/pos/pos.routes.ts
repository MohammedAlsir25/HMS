import { Router } from 'express';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import opticsRoutes from './routes/optics.routes.js';
import transactionRoutes from './routes/transactions.routes.js';
import supplierRoutes from './routes/suppliers.routes.js';
import invoiceRoutes from './routes/invoices.routes.js';

const router = Router();
router.use('/pharmacy/items', pharmacyRoutes);
router.use('/optics/items', opticsRoutes);
router.use('/', transactionRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/:category/invoices', invoiceRoutes);

export default router;
