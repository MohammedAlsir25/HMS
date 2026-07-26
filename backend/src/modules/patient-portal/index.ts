import { Router } from 'express';
import authRoutes from './routes/auth.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import clinicsRoutes from './routes/clinics.routes.js';
import medicalRecordsRoutes from './routes/medicalRecords.routes.js';
import billingRoutes from './routes/billing.routes.js';
import profileRoutes from './routes/profile.routes.js';
import adminRoutes from './routes/admin.routes.js';

const router = Router();
router.use('/auth', authRoutes);
router.use('/clinics', clinicsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/medical-records', medicalRecordsRoutes);
router.use('/billing', billingRoutes);
router.use('/', profileRoutes);
router.use('/admin', adminRoutes);

export default router;
