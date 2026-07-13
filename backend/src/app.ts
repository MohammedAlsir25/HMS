import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
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
import imagingRoutes from './modules/imaging/imaging.routes.js';
import opticLabRoutes from './modules/optic-lab/optic-lab.routes.js';
import preoperativeRoutes from './modules/preoperative/preoperative.routes.js';
import wardsRoutes from './modules/preoperative/wards.routes.js';

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

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'development' ? 500 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Try again later.' },
});
app.use('/api', globalLimiter);

const syncBurstLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'development' ? 2000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Sync burst limit exceeded. Slow down.' },
});
app.use('/api/sync', syncBurstLimiter);

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
app.use('/api/imaging', imagingRoutes);
app.use('/api/optic-lab', opticLabRoutes);
app.use('/api/preoperative', preoperativeRoutes);
app.use('/api/wards', wardsRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use(errorHandler);

export default app;
