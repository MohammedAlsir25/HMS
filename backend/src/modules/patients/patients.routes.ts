import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getSupabase, getBucket } from '../../lib/supabase.js';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createPatientSchema } from '../../schemas/reception.schema.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { Prisma, $Enums } from '@prisma/client';

const router = Router();
import prisma from '../../lib/prisma.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'));
  },
});

function generateMRN() {
  const year = new Date().getFullYear();
  const rand = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
  return `MRN-${year}-${rand}`;
}

router.get('/search', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query as Record<string, string>;
  if (!q || q.length < 2) return res.json([]);
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' as const } },
        { mrn: { contains: q, mode: 'insensitive' as const } },
        { phone: { contains: q } },
        { nationalId: { contains: q } },
      ],
    },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });
  res.json(patients);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), validate(createPatientSchema), asyncHandler(async (req: Request, res: Response) => {
  const { fullName, phone, nationalId, email, dateOfBirth, gender, diabetesType, address, notes } = req.body as Record<string, unknown>;
  if (nationalId) {
    const existing = await prisma.patient.findUnique({ where: { nationalId: nationalId as string } });
    if (existing) throw new ConflictError('Patient with this national ID already exists');
  }
  const mrn = generateMRN();
  const patient = await prisma.patient.create({
    data: {
      mrn,
      fullName: fullName as string,
      phone: (phone as string) || null,
      nationalId: (nationalId as string) || null,
      email: (email as string) || null,
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

export default router;
