import { Router } from 'express';
import patientRoutes from './routes/patients.routes.js';
import fileRoutes from './routes/files.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';
import queueRoutes from './routes/queue.routes.js';
import labPaymentsRoutes from './routes/labPayments.routes.js';

const router = Router();
router.use('/', patientRoutes);
router.use('/', fileRoutes);
router.use('/', appointmentRoutes);
router.use('/', queueRoutes);
router.use('/', labPaymentsRoutes);

export default router;
