import { Router } from 'express';
import notificationsRoutes from './routes/notifications.routes.js';
import costCentersRoutes from './routes/costCenters.routes.js';
import requisitionsRoutes from './routes/requisitions.routes.js';
import purchaseOrdersRoutes from './routes/purchaseOrders.routes.js';
import fixedAssetsRoutes from './routes/fixedAssets.routes.js';

const router = Router();

router.use('/notifications', notificationsRoutes);
router.use('/cost-centers', costCentersRoutes);
router.use('/requisitions', requisitionsRoutes);
router.use('/purchase-orders', purchaseOrdersRoutes);
router.use('/assets', fixedAssetsRoutes);

export default router;
