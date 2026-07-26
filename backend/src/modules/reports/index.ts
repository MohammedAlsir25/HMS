import { Router } from 'express';
import revenueRoutes from './routes/revenue.routes.js';
import patientRoutes from './routes/patient.routes.js';
import occupancyRoutes from './routes/occupancy.routes.js';
import pharmacyRoutes from './routes/pharmacy.routes.js';
import labRoutes from './routes/lab.routes.js';
import surgeryRoutes from './routes/surgery.routes.js';
import hrRoutes from './routes/hr.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';

const router = Router();
router.use('/', revenueRoutes);
router.use('/', patientRoutes);
router.use('/', occupancyRoutes);
router.use('/', pharmacyRoutes);
router.use('/', labRoutes);
router.use('/', surgeryRoutes);
router.use('/', hrRoutes);
router.use('/', dashboardRoutes);

export default router;
