import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getSupabase, getBucket } from '../../lib/supabase.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createPatientSchema } from '../../schemas/reception.schema.js';
import { updatePatientSchema, checkDuplicatesSchema, mergePatientsSchema } from '../../schemas/patients.schema.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { Prisma, $Enums } from '@prisma/client';

const router = Router();
import prisma from '../../lib/prisma.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF and image files (JPEG, PNG, WebP) are allowed'));
  },
});

async function generateMRN(hospitalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastPatient = await prisma.patient.findFirst({
    where: {
      hospitalId,
      mrn: { startsWith: `MRN-${year}-` },
    },
    orderBy: { mrn: 'desc' },
    select: { mrn: true },
  });
  let sequence = 1;
  if (lastPatient) {
    const lastSeq = parseInt(lastPatient.mrn.split('-')[2]!);
    sequence = lastSeq + 1;
  }
  return `MRN-${year}-${String(sequence).padStart(5, '0')}`;
}

router.get('/search', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const { q, clinicSlug } = req.query as Record<string, string>;
  if (!q || q.length < 2) return res.json([]);
  const where: Record<string, unknown> = {
    hospitalId: req.user!.hospitalId!,
    OR: [
      { fullName: { contains: q, mode: 'insensitive' as const } },
      { mrn: { contains: q, mode: 'insensitive' as const } },
      { phone: { contains: q } },
      { nationalId: { contains: q } },
    ],
  };
  if (clinicSlug) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    where.appointments = {
      some: {
        clinic: { slug: clinicSlug },
        status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
        createdAt: { gte: todayStart },
      },
    };
  }
  const patients = await prisma.patient.findMany({
    where: where as Prisma.PatientWhereInput,
    take: 20,
    orderBy: { createdAt: 'desc' },
  });
  res.json(patients);
}));

router.post('/check-duplicates', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), validate(checkDuplicatesSchema), asyncHandler(async (req: Request, res: Response) => {
  const { fullName, dateOfBirth, phone, nationalId } = req.body;
  const hospitalId = req.user!.hospitalId!;
  const orConditions: Prisma.PatientWhereInput[] = [];

  if (nationalId) {
    orConditions.push({ nationalId, hospitalId });
  }

  if (phone) {
    orConditions.push({ phone, hospitalId });
  }

  if (fullName && dateOfBirth) {
    const dob = new Date(dateOfBirth);
    const nextDay = new Date(dob);
    nextDay.setDate(nextDay.getDate() + 1);
    orConditions.push({
      fullName: { contains: fullName, mode: 'insensitive' },
      dateOfBirth: { gte: dob, lt: nextDay },
      hospitalId,
    });
  }

  if (orConditions.length === 0) {
    return res.json({ matches: [] });
  }

  const matches = await prisma.patient.findMany({
    where: { OR: orConditions },
    select: {
      id: true,
      fullName: true,
      mrn: true,
      dateOfBirth: true,
      phone: true,
      nationalId: true,
      gender: true,
    },
    take: 10,
  });

  res.json({ matches });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), validate(createPatientSchema), asyncHandler(async (req: Request, res: Response) => {
  const { fullName, phone, dateOfBirth, gender, diabetesType, address, notes } = req.body as Record<string, unknown>;
  const mrn = await generateMRN(req.user!.hospitalId!);
  const patient = await prisma.patient.create({
    data: {
      mrn,
      fullName: fullName as string,
      phone: phone as string,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth as string) : null,
      gender: (gender as string) || null,
      diabetesType: (diabetesType as $Enums.DiabetesType) || 'NONE',
      address: (address as string) || null,
      notes: (notes as string) || null,
      hospitalId: req.user!.hospitalId!,
      createdById: req.user!.id,
    } as unknown as Prisma.PatientCreateInput,
  });
  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entity: 'Patient',
      entityId: patient.id,
      details: { mrn: patient.mrn, fullName: patient.fullName },
      userId: req.user!.id,
      hospitalId: req.user!.hospitalId!,
    },
  });
  res.status(201).json(patient);
}));

router.post('/:patientId/files', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), upload.array('files', 10), asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findFirst({ where: { id: req.params.patientId, hospitalId: req.user!.hospitalId! } });
  if (!patient) throw new NotFoundError('Patient not found');
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) throw new ValidationError('No files uploaded');
  const records = await Promise.all(
    (req.files as Express.Multer.File[]).map(async (f) => {
      const supabase = await getSupabase();
      const bucket = await getBucket();
      const storagePath = `patients/${req.params.patientId}/${Date.now()}-${f.originalname}`;
      const { error } = await supabase.storage.from(bucket).upload(storagePath, f.buffer, {
        contentType: f.mimetype,
        upsert: false,
      });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      return prisma.patientFile.create({
        data: { originalName: f.originalname, storedPath: storagePath, mimeType: f.mimetype, size: f.size, patientId: req.params.patientId } as unknown as Prisma.PatientFileCreateInput,
      });
    }),
  );
  res.status(201).json(records);
}));

router.get('/:patientId/files', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findFirst({ where: { id: req.params.patientId, hospitalId: req.user!.hospitalId! } });
  if (!patient) throw new NotFoundError('Patient not found');
  const files = await prisma.patientFile.findMany({
    where: { patientId: req.params.patientId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(files);
}));

router.get('/files/:id/download', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const file = await prisma.patientFile.findUnique({ where: { id: req.params.id } });
  if (!file) throw new NotFoundError('File not found');
  const supabase = await getSupabase();
  const bucket = await getBucket();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(file.storedPath, 3600);
  if (error || !data) throw new NotFoundError('Failed to generate download link');
  res.redirect(data.signedUrl);
}));

router.get('/', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const { q, page: pageStr, limit: limitStr, sortBy, sortOrder } = req.query as Record<string, string | undefined>;
  const page = Math.max(1, parseInt(pageStr || '') || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitStr || '') || 20));
  const skip = (page - 1) * limit;
  const allowedSort = ['fullName', 'mrn', 'createdAt', 'phone'] as const;
  type SortField = (typeof allowedSort)[number];
  const orderField: SortField = allowedSort.includes(sortBy as SortField) ? (sortBy as SortField) : 'createdAt';
  const orderDir = sortOrder === 'asc' ? 'asc' as const : 'desc' as const;
  const where: Prisma.PatientWhereInput = { hospitalId: req.user!.hospitalId! };
  if (q && q.length >= 2) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' as const } },
      { mrn: { contains: q, mode: 'insensitive' as const } },
      { phone: { contains: q } },
      { nationalId: { contains: q } },
    ];
  }
  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [orderField]: orderDir },
    }),
    prisma.patient.count({ where }),
  ]);
  res.json({ patients, total, page, limit, totalPages: Math.ceil(total / limit) });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findFirst({
    where: { id: req.params.id, hospitalId: req.user!.hospitalId! },
    include: {
      createdBy: { select: { id: true, fullName: true } },
      appointments: { take: 10, orderBy: { createdAt: 'desc' }, include: { clinic: { select: { name: true, slug: true } } } },
      clinicalRecords: { take: 10, orderBy: { createdAt: 'desc' } },
      files: { orderBy: { createdAt: 'desc' } },
      surgeries: { orderBy: { createdAt: 'desc' } },
      transactions: { take: 10, orderBy: { createdAt: 'desc' } },
      beds: { where: { dischargedAt: null }, include: { ward: { select: { name: true } } } },
      referrals: { orderBy: { createdAt: 'desc' } },
      preoperativeRequests: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!patient) throw new NotFoundError('Patient not found');
  res.json(patient);
}));

router.get('/:id/audit', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entity: 'Patient', entityId: req.params.id },
      include: { user: { select: { id: true, fullName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({
      where: { entity: 'Patient', entityId: req.params.id },
    }),
  ]);

  res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.PATIENT_UPDATE), validate(updatePatientSchema), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.patient.findFirst({
    where: { id: req.params.id, hospitalId: req.user!.hospitalId! },
  });
  if (!existing) throw new NotFoundError('Patient not found');

  const { fullName, phone, nationalId, email, dateOfBirth, gender, chronicConditions, address, notes, diabetesType } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (phone !== undefined) data.phone = phone;
  if (nationalId !== undefined) data.nationalId = nationalId;
  if (email !== undefined) data.email = email;
  if (dateOfBirth !== undefined) data.dateOfBirth = new Date(dateOfBirth as string);
  if (gender !== undefined) data.gender = gender;
  if (chronicConditions !== undefined) data.chronicConditions = chronicConditions;
  if (address !== undefined) data.address = address;
  if (notes !== undefined) data.notes = notes;
  if (diabetesType !== undefined) data.diabetesType = diabetesType;

  const patient = await prisma.patient.update({
    where: { id: req.params.id },
    data: data as Prisma.PatientUpdateInput,
  });

  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, newVal] of Object.entries(data)) {
    const oldVal = existing[key as keyof typeof existing];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }
  if (Object.keys(changes).length > 0) {
    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entity: 'Patient',
        entityId: req.params.id,
        details: { changes },
        userId: req.user!.id,
        hospitalId: req.user!.hospitalId!,
      },
    });
  }

  res.json(patient);
}));

router.post('/:id/merge', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), validate(mergePatientsSchema), asyncHandler(async (req: Request, res: Response) => {
  const targetId = req.params.id;
  const { sourcePatientId } = req.body;

  if (sourcePatientId === targetId) {
    throw new ValidationError('Cannot merge a patient into themselves');
  }

  const [target, source] = await Promise.all([
    prisma.patient.findFirst({
      where: { id: targetId, hospitalId: req.user!.hospitalId! },
    }),
    prisma.patient.findFirst({
      where: { id: sourcePatientId, hospitalId: req.user!.hospitalId! },
    }),
  ]);

  if (!target) throw new NotFoundError('Target patient not found');
  if (!source) throw new NotFoundError('Source patient not found');

  const activeBed = await prisma.bed.findFirst({
    where: { patientId: sourcePatientId, dischargedAt: null },
  });
  if (activeBed) {
    throw new ValidationError('Source patient has an active admission — discharge first');
  }

  const result = await prisma.$transaction(async (tx) => {
    const transfers: Record<string, number> = {};

    const models = [
      { name: 'appointments', model: tx.appointment },
      { name: 'clinicalRecords', model: tx.clinicalRecord },
      { name: 'diagnosticOrders', model: tx.diagnosticOrder },
      { name: 'referrals', model: tx.referral },
      { name: 'surgeries', model: tx.surgery },
      { name: 'preoperativeRequests', model: tx.preoperativeRequest },
      { name: 'transactions', model: tx.transaction },
      { name: 'patientFiles', model: tx.patientFile },
      { name: 'postOpFollowUps', model: tx.postOpFollowUp },
    ];

    for (const { name, model } of models) {
      const r = await (model as any).updateMany({
        where: { patientId: sourcePatientId },
        data: { patientId: targetId },
      });
      transfers[name] = r.count;
    }

    await tx.patient.update({
      where: { id: sourcePatientId },
      data: { is_deleted: true },
    });

    return transfers;
  });

  await prisma.auditLog.create({
    data: {
      action: 'MERGE',
      entity: 'Patient',
      entityId: targetId,
      details: {
        sourcePatientId,
        sourceMRN: source.mrn,
        targetMRN: target.mrn,
        transferredCounts: result,
      },
      userId: req.user!.id,
      hospitalId: req.user!.hospitalId!,
    },
  });

  res.json({
    message: 'Patients merged successfully',
    target: { id: target.id, mrn: target.mrn, fullName: target.fullName },
    source: { id: source.id, mrn: source.mrn, fullName: source.fullName },
    transferred: result,
  });
}));

export default router;
