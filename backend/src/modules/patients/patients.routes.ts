import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getSupabase, getBucket } from '../../lib/supabase.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createPatientSchema } from '../../schemas/reception.schema.js';
import { updatePatientSchema } from '../../schemas/patients.schema.js';
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

function generateMRN() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `MRN-${year}-${rand}`;
}

router.get('/search', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const { q, clinicSlug } = req.query as Record<string, string>;
  if (!q || q.length < 2) return res.json([]);
  const where: Record<string, unknown> = {
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

router.post('/', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), validate(createPatientSchema), asyncHandler(async (req: Request, res: Response) => {
  const { fullName, phone, dateOfBirth, gender, diabetesType, address, notes } = req.body as Record<string, unknown>;
  const mrn = generateMRN();
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
      createdById: req.user!.id,
    } as unknown as Prisma.PatientCreateInput,
  });
  res.status(201).json(patient);
}));

router.post('/:patientId/files', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), upload.array('files', 10), asyncHandler(async (req: Request, res: Response) => {
  const patient = await prisma.patient.findUnique({ where: { id: req.params.patientId } });
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
  const where: Prisma.PatientWhereInput = {};
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
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id },
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

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.PATIENT_UPDATE), validate(updatePatientSchema), asyncHandler(async (req: Request, res: Response) => {
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
  res.json(patient);
}));

export default router;
