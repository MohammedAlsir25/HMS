// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { getSupabase, getBucket } from '../../lib/supabase.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createPatientSchema, checkInSchema } from '../../schemas/reception.schema.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../../utils/errors.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

async function resolveClinic(identifier) {
  let clinic = await prisma.clinic.findUnique({ where: { id: identifier } });
  if (!clinic) clinic = await prisma.clinic.findUnique({ where: { slug: identifier } });
  return clinic;
}

function generateMRN() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `MRN-${year}-${rand}`;
}

async function nextToken(clinicId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = await prisma.apppointment.findFirst({
    where: { clinicId, createdAt: { gte: today } },
    orderBy: { token: 'desc' },
  });
  return (last?.token || 0) + 1;
}

router.get('/search', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { mrn: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { nationalId: { contains: q } },
      ],
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });
  res.json(patients);
}));

router.post('/patients', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), validate(createPatientSchema), asyncHandler(async (req, res) => {
  const { fullName, phone, nationalId, email, dateOfBirth, gender, diabetesType, address, notes } = req.body;
  if (nationalId) {
    const existing = await prisma.patient.findUnique({ where: { nationalId } });
    if (existing) throw new ConflictError('Patient with this national ID already exists');
  }
  const mrn = generateMRN();
  const patient = await prisma.patient.create({
    data: {
      mrn,
      fullName,
      phone: phone || null,
      nationalId: nationalId || null,
      email: email || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || null,
      diabetesType: diabetesType || 'NONE',
      address: address || null,
      notes: notes || null,
      createdById: req.user.id,
    },
  });
  res.status(201).json(patient);
}));

router.post('/check-in', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), auditMiddleware('CHECK_IN'), validate(checkInSchema), asyncHandler(async (req, res) => {
  const { patientId, clinicId, type, visitType, priority, notes, collectPayment, paymentMethod } = req.body;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');
  const clinic = await resolveClinic(clinicId);
  if (!clinic) throw new NotFoundError('Clinic not found');
  if (collectPayment) {
    if (!req.user.permissions.includes(PERMISSIONS.ACCOUNTING_WRITE)) {
      throw new ForbiddenError('Insufficient permissions to collect payment');
    }
    const fee = visitType === 'FOLLOW_UP' ? clinic.followUpFee : clinic.consultationFee;
    if (!fee || Number(fee) <= 0) throw new ValidationError('No fee configured for this clinic');
  }
  const token = await nextToken(clinic.id);
  const appointment = await prisma.apppointment.create({
    data: {
      token,
      type: type || 'WALKIN',
      status: 'WAITING',
      priority: typeof priority === 'number' ? priority : 0,
      visitType: visitType || 'NEW_VISIT',
      notes: notes || null,
      patientId,
      clinicId: clinic.id,
      doctorId: req.user.id,
    },
    include: { patient: { select: { fullName: true, mrn: true, nationalId: true } } },
  });
  let transaction = null;
  if (collectPayment) {
    const fee = visitType === 'FOLLOW_UP' ? clinic.followUpFee : clinic.consultationFee;
    const department = await prisma.department.findFirst({ where: { clinicId: clinic.id } });
    let shift = await prisma.shift.findFirst({ where: { userId: req.user.id, closedAt: null } });
    if (!shift) {
      shift = await prisma.shift.create({ data: { userId: req.user.id } });
    }
    transaction = await prisma.transaction.create({
      data: {
        type: 'RECEPTION',
        amount: fee,
        paymentMethod: paymentMethod || 'CASH',
        description: `${visitType === 'FOLLOW_UP' ? 'Follow-up' : 'Consultation'} fee - ${clinic.name}`,
        shiftId: shift.id,
        cashierId: req.user.id,
        departmentId: department ? department.id : null,
      },
    });
  }
  res.status(201).json({ appointment, transaction });
}));

router.post('/reservations', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const { patientId, clinicId, notes } = req.body;
  if (!patientId || !clinicId) throw new ValidationError('patientId and clinicId are required');
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');
  const clinic = await resolveClinic(clinicId);
  if (!clinic) throw new NotFoundError('Clinic not found');
  const token = await nextToken(clinic.id);
  const appointment = await prisma.apppointment.create({
    data: {
      token,
      type: 'RESERVATION',
      status: 'RESERVED',
      priority: 0,
      notes: notes || null,
      patientId,
      clinicId: clinic.id,
      doctorId: req.user.id,
    },
    include: { patient: { select: { fullName: true, mrn: true, nationalId: true } } },
  });
  res.status(201).json(appointment);
}));

router.get('/reservations', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), asyncHandler(async (req, res) => {
  const { clinicId, q } = req.query;
  const where = { status: 'RESERVED' };
  if (clinicId) {
    const clinic = await resolveClinic(clinicId);
    if (clinic) where.clinicId = clinic.id;
  }
  if (q && q.length >= 2) {
    where.patient = {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { nationalId: { contains: q } },
      ],
    };
  }
  const appointments = await prisma.apppointment.findMany({
    where,
    include: { patient: { select: { fullName: true, mrn: true, nationalId: true } }, clinic: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(appointments);
}));

router.patch('/reservations/:id/arrive', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const { priority, visitType } = req.body;
  const appointment = await prisma.apppointment.update({
    where: { id: req.params.id },
    data: {
      status: 'WAITING',
      priority: typeof priority === 'number' ? priority : 5,
      visitType: visitType || 'NEW_VISIT',
    },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(appointment);
}));

router.post('/files', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), upload.array('files', 10), asyncHandler(async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) throw new ValidationError('patientId is required');
  if (!req.files || req.files.length === 0) throw new ValidationError('No files uploaded');
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');
  const records = await Promise.all(
    req.files.map(async (f) => {
      const supabase = await getSupabase();
      const bucket = await getBucket();
      const storagePath = `patients/${patientId}/${Date.now()}-${f.originalname}`;
      const { error } = await supabase.storage.from(bucket).upload(storagePath, f.buffer, {
        contentType: f.mimetype,
        upsert: false,
      });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      return prisma.patientFile.create({
        data: { originalName: f.originalname, storedPath: storagePath, mimeType: f.mimetype, size: f.size, patientId },
      });
    }),
  );
  res.status(201).json(records);
}));

router.get('/files/:patientId', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req, res) => {
  const files = await prisma.patientFile.findMany({
    where: { patientId: req.params.patientId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(files);
}));

router.get('/files/download/:id', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req, res) => {
  const file = await prisma.patientFile.findUnique({ where: { id: req.params.id } });
  if (!file) throw new NotFoundError('File not found');
  const supabase = await getSupabase();
  const bucket = await getBucket();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(file.storedPath, 3600);
  if (error || !data) throw new NotFoundError('Failed to generate download link');
  res.redirect(data.signedUrl);
}));

router.get('/queue/stats', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), asyncHandler(async (_req, res) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const appointments = await prisma.apppointment.findMany({
    where: {
      createdAt: { gte: now },
      status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED'] },
    },
    include: { clinic: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ clinicId: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  });
  const byClinic = {};
  for (const a of appointments) {
    const key = a.clinicId;
    if (!byClinic[key]) byClinic[key] = { id: key, name: a.clinic.name, slug: a.clinic.slug, waiting: 0, inProgress: 0, completed: 0, avgMins: 10 };
    if (a.status === 'WAITING' || a.status === 'CALLED') byClinic[key].waiting++;
    if (a.status === 'IN_PROGRESS') byClinic[key].inProgress++;
    if (a.status === 'COMPLETED') byClinic[key].completed++;
  }
  res.json(Object.values(byClinic));
}));

router.get('/queue/:clinicId', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), asyncHandler(async (req, res) => {
  const clinic = await resolveClinic(req.params.clinicId);
  if (!clinic) throw new NotFoundError('Clinic not found');
  const appointments = await prisma.apppointment.findMany({
    where: {
      clinicId: clinic.id,
      status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
    },
    include: { patient: { select: { fullName: true, mrn: true, dateOfBirth: true, phone: true, notes: true } } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
  const waitingCount = appointments.filter(a => a.status === 'WAITING').length;
  const result = appointments.map((a, idx) => {
    const waitOrder = appointments.filter(x => x.status === 'WAITING').findIndex(x => x.id === a.id);
    return {
      ...a,
      estimatedWaitMins: a.status === 'WAITING' ? (waitOrder + 1) * 10 : 0,
      position: a.status === 'WAITING' ? waitOrder + 1 : null,
    };
  });
  res.json(result);
}));

router.post('/queue/:clinicId/call-next', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const clinic = await resolveClinic(req.params.clinicId);
  if (!clinic) throw new NotFoundError('Clinic not found');
  const next = await prisma.apppointment.findFirst({
    where: {
      clinicId: clinic.id,
      status: 'WAITING',
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  if (!next) throw new NotFoundError('No waiting patients');
  const updated = await prisma.apppointment.update({
    where: { id: next.id },
    data: { status: 'CALLED' },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(updated);
}));

router.patch('/appointments/:id/status', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
  if (!valid.includes(status)) throw new ValidationError('Invalid status');
  const appointment = await prisma.apppointment.update({
    where: { id: req.params.id },
    data: { status },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(appointment);
}));

router.patch('/appointments/:id/priority', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const { priority } = req.body;
  if (typeof priority !== 'number' || priority < 0 || priority > 10) {
    throw new ValidationError('Priority must be a number 0–10');
  }
  const appointment = await prisma.apppointment.update({
    where: { id: req.params.id },
    data: { priority },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(appointment);
}));

router.get('/waiting-room', asyncHandler(async (_req, res) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const appointments = await prisma.apppointment.findMany({
    where: {
      createdAt: { gte: now },
      status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
    },
    include: { clinic: { select: { name: true, slug: true } } },
    orderBy: [{ clinicId: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  });
  const grouped = {};
  for (const a of appointments) {
    const key = a.clinic.slug;
    if (!grouped[key]) grouped[key] = { clinic: a.clinic.name, queue: [] };
    grouped[key].queue.push({
      token: a.token,
      status: a.status,
      type: a.type,
      priority: a.priority,
    });
  }
  res.json(grouped);
}));

export default router;
