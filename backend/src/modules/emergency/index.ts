import { Router } from 'express';
import registrationRoutes from './routes/registration.routes.js';
import triageRoutes from './routes/triage.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import admissionRoutes from './routes/admission.routes.js';
import consultationRoutes from './routes/consultation.routes.js';
import statsRoutes from './routes/stats.routes.js';

const router = Router();

router.use('/', registrationRoutes);
router.use('/triage', triageRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/', admissionRoutes);
router.use('/', consultationRoutes);
router.use('/stats', statsRoutes);

export default router;
