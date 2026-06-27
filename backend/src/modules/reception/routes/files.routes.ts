import { Router } from 'express';
import { getSupabase, getBucket } from '../../../lib/supabase.js';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { upload } from '../reception.utils.js';

const router = Router();

router.post('/files', authenticate, requirePermission(PERMISSIONS.PATIENT_CREATE), upload.array('files', 10), asyncHandler(async (req, res) => {
  const { patientId } = req.body;
  if (!patientId) throw new ValidationError('patientId is required');
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) throw new ValidationError('No files uploaded');
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');
  const records = await Promise.all(
    files.map(async (f) => {
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
    where: { patientId: req.params.patientId! },
    orderBy: { createdAt: 'desc' },
  });
  res.json(files);
}));

router.get('/files/download/:id', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req, res) => {
  const file = await prisma.patientFile.findUnique({ where: { id: req.params.id! } });
  if (!file) throw new NotFoundError('File not found');
  const supabase = await getSupabase();
  const bucket = await getBucket();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(file.storedPath, 3600);
  if (error || !data) throw new NotFoundError('Failed to generate download link');
  res.redirect(data.signedUrl);
}));

export default router;
