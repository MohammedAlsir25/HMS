import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { getSupabase, getBucket } from '../../lib/supabase.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
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

router.get('/search', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/patients', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), async (req, res) => {
  try {
    const { fullName, phone, nationalId, email, dateOfBirth, gender, diabetesType, address, notes } = req.body;
    if (!fullName) return res.status(400).json({ message: 'fullName is required' });
    if (nationalId) {
      const existing = await prisma.patient.findUnique({ where: { nationalId } });
      if (existing) return res.status(409).json({ message: 'Patient with this national ID already exists', patient: existing });
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
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'National ID already exists' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/check-in', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), async (req, res) => {
  try {
    const { patientId, clinicId, type, visitType, priority, notes, collectPayment, paymentMethod } = req.body;
    if (!patientId || !clinicId) return res.status(400).json({ message: 'patientId and clinicId are required' });
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const clinic = await resolveClinic(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
    if (collectPayment) {
      if (!req.user.permissions.includes(PERMISSIONS.ACCOUNTING_WRITE)) {
        return res.status(403).json({ message: 'Insufficient permissions to collect payment' });
      }
      const fee = visitType === 'FOLLOW_UP' ? clinic.followUpFee : clinic.consultationFee;
      if (!fee || Number(fee) <= 0) {
        return res.status(400).json({ message: 'No fee configured for this clinic' });
      }
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
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/reservations', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), async (req, res) => {
  try {
    const { patientId, clinicId, notes } = req.body;
    if (!patientId || !clinicId) return res.status(400).json({ message: 'patientId and clinicId are required' });
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
    const clinic = await resolveClinic(clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/reservations', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/reservations/:id/arrive', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), async (req, res) => {
  try {
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
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Reservation not found' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/files', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), upload.array('files', 10), async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });
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
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ message: err.message || 'Internal server error' });
  }
});

router.get('/files/:patientId', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), async (req, res) => {
  try {
    const files = await prisma.patientFile.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/files/download/:id', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), async (req, res) => {
  try {
    const file = await prisma.patientFile.findUnique({ where: { id: req.params.id } });
    if (!file) return res.status(404).json({ message: 'File not found' });
    const supabase = await getSupabase();
    const bucket = await getBucket();
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(file.storedPath, 3600);
    if (error || !data) return res.status(500).json({ message: 'Failed to generate download link' });
    res.redirect(data.signedUrl);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/queue/stats', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), async (_req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/queue/:clinicId', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), async (req, res) => {
  try {
    const clinic = await resolveClinic(req.params.clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/queue/:clinicId/call-next', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), async (req, res) => {
  try {
    const clinic = await resolveClinic(req.params.clinicId);
    if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
    const next = await prisma.apppointment.findFirst({
      where: {
        clinicId: clinic.id,
        status: 'WAITING',
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      include: { patient: { select: { fullName: true, mrn: true } } },
    });
    if (!next) return res.status(404).json({ message: 'No waiting patients' });
    const updated = await prisma.apppointment.update({
      where: { id: next.id },
      data: { status: 'CALLED' },
      include: { patient: { select: { fullName: true, mrn: true } } },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/appointments/:id/status', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const appointment = await prisma.apppointment.update({
      where: { id: req.params.id },
      data: { status },
      include: { patient: { select: { fullName: true, mrn: true } } },
    });
    res.json(appointment);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Appointment not found' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/appointments/:id/priority', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), async (req, res) => {
  try {
    const { priority } = req.body;
    if (typeof priority !== 'number' || priority < 0 || priority > 10) {
      return res.status(400).json({ message: 'Priority must be a number 0–10' });
    }
    const appointment = await prisma.apppointment.update({
      where: { id: req.params.id },
      data: { priority },
      include: { patient: { select: { fullName: true, mrn: true } } },
    });
    res.json(appointment);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Appointment not found' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/waiting-room', async (_req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
