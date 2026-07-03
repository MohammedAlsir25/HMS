import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import clinicsRoutes from './modules/clinics/clinics.routes.js';
import receptionRoutes from './modules/reception/reception.routes.js';
import surgeryRoutes from './modules/surgery/surgery.routes.js';
import referralRoutes from './modules/referral/referral.routes.js';
import posRoutes from './modules/pos/pos.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import accountingRoutes from './modules/accounting/accounting.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import hrRoutes from './modules/hr/hr.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import labRoutes from './modules/lab/lab.routes.js';
import departmentsRoutes from './modules/departments/departments.routes.js';
import patientsRoutes from './modules/patients/patients.routes.js';
import appointmentsRoutes from './modules/appointments/appointments.routes.js';
import procurementRoutes from './modules/procurement/procurement.routes.js';
import syncRoutes from './modules/sync/sync.routes.js';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
const capacitorOrigins = [
  'capacitor://localhost',
  'http://localhost',
  'ionic://localhost',
  'tauri://localhost',
  'https://tauri.localhost',
  'http://tauri.localhost',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const normalize = (s: string) => s.replace(/\/+$/, '');
    const allowed = [
      normalize(config.frontendUrl),
      ...capacitorOrigins.map((o) => normalize(o)),
    ];
    cb(null, allowed.includes(normalize(origin)));
  },
  credentials: true,
}));
app.use(compression({ level: 6 }));
app.use(morgan('short'));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clinics', clinicsRoutes);
app.use('/api/reception', receptionRoutes);
app.use('/api/surgeries', surgeryRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/procurement', procurementRoutes);
app.use('/api/sync', syncRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

export default app;
