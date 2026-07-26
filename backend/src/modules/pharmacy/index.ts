import { Router } from 'express';
import pharmacyRoutes from './pharmacy.routes.js';

const router = Router();
router.use('/', pharmacyRoutes);
export default router;
