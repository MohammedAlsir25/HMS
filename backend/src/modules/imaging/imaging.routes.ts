import { Router } from 'express';
import multer from 'multer';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { getSupabase, getBucket } from '../../lib/supabase.js';
import { completeImagingOrder, dismissImagingOrder } from './imaging.helpers.js';

const router = Router();
import prisma from '../../lib/prisma.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom'];
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (allowed.includes(file.mimetype) || ext === 'dcm') cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, PDF, and DICOM files are allowed'));
  },
});

async function resolveOrder(id: string) {
  const order = await prisma.imagingOrder.findFirst({ where: { id } });
  if (!order) throw new NotFoundError('Imaging order not found');
  return order;
}

router.get('/', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const { clinicId, clinicSlug, status, patientId, search } = req.query as Record<string, string | undefined>;
  let resolvedClinicId = clinicId;
  if (clinicSlug && !resolvedClinicId) {
    const clinic = await prisma.clinic.findFirst({ where: { slug: clinicSlug } });
    if (clinic) resolvedClinicId = clinic.id;
  }
  const where: Record<string, unknown> = {};
  if (resolvedClinicId) where.clinicId = resolvedClinicId;
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const orders = await prisma.imagingOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const orderIds = orders.map(o => o.id);
  const patientIds = [...new Set(orders.map(o => o.patientId))];
  const clinicIds = [...new Set(orders.map(o => o.requestedByClinicId))];
  const [patients, clinics, allFiles] = await Promise.all([
    prisma.patient.findMany({ where: { id: { in: patientIds } }, select: { id: true, fullName: true, mrn: true, phone: true, gender: true, dateOfBirth: true } }),
    prisma.clinic.findMany({ where: { id: { in: clinicIds } }, select: { id: true, name: true, slug: true } }),
    prisma.imagingFile.findMany({ where: { imagingOrderId: { in: orderIds } }, orderBy: { createdAt: 'desc' } }),
  ]);
  const patientMap = new Map(patients.map(p => [p.id, p]));
  const clinicMap = new Map(clinics.map(c => [c.id, c]));
  const filesMap = new Map<string, typeof allFiles>();
  for (const f of allFiles) {
    const existing = filesMap.get(f.imagingOrderId) || [];
    existing.push(f);
    filesMap.set(f.imagingOrderId, existing);
  }

  const enriched = orders.map(o => ({
    ...o,
    patient: patientMap.get(o.patientId) || null,
    requestedByClinic: clinicMap.get(o.requestedByClinicId) || null,
    files: filesMap.get(o.id) || [],
  }));

  if (search) {
    const q = search.toLowerCase();
    return res.json(enriched.filter(o =>
      o.patient && (o.patient.fullName.toLowerCase().includes(q) || o.patient.mrn.toLowerCase().includes(q))
    ));
  }

  res.json(enriched);
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const order = await resolveOrder(id);
  const [patient, requestedByClinic, files] = await Promise.all([
    prisma.patient.findFirst({ where: { id: order.patientId }, select: { id: true, fullName: true, mrn: true, phone: true, gender: true, dateOfBirth: true } }),
    prisma.clinic.findFirst({ where: { id: order.requestedByClinicId }, select: { id: true, name: true, slug: true } }),
    prisma.imagingFile.findMany({ where: { imagingOrderId: id }, orderBy: { createdAt: 'desc' } }),
  ]);
  res.json({ ...order, patient, requestedByClinic, files });
}));

router.post('/:id/start', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const order = await prisma.imagingOrder.findFirst({ where: { id } });
  if (!order) throw new NotFoundError('Imaging order not found');
  if (order.status !== 'PENDING') throw new ValidationError('Order must be PENDING to start');

  const updated = await prisma.imagingOrder.update({
    where: { id },
    data: { status: 'IN_PROGRESS' },
  });
  res.json(updated);
}));

router.post('/:id/complete', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), auditMiddleware('COMPLETE_IMAGING', 'ImagingOrder'), asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const { findings, impression } = req.body as { findings?: string; impression?: string };
  const result = await completeImagingOrder(id, req.user!.id, { findings, impression });

  const order = await prisma.imagingOrder.findFirst({
    where: { id },
    include: { procedureType: { select: { name: true, price: true } } },
  });
  const price = order?.procedureType?.price || order?.price;
  if (price && Number(price) > 0) {
    let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
    if (!shift) shift = await prisma.shift.create({ data: { userId: req.user!.id } });
    await prisma.transaction.create({
      data: {
        type: 'IMAGING',
        amount: Number(price),
        paymentMethod: 'CASH',
        description: `Imaging: ${order?.procedureType?.name || order?.scanType || 'Procedure'}`,
        shiftId: shift.id,
        cashierId: req.user!.id,
        patientId: order!.patientId,
        imagingOrderId: id,
        departmentId: order!.clinicId || undefined,
      },
    });
  }

  res.json(result);
}));

router.post('/:id/dismiss', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const result = await dismissImagingOrder(id);
  res.json(result);
}));

router.post('/:id/upload', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), upload.array('files', 20), asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const order = await prisma.imagingOrder.findFirst({ where: { id } });
  if (!order) throw new NotFoundError('Imaging order not found');
  if (order.status === 'DISMISSED') throw new ValidationError('Cannot upload to a dismissed order');
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) throw new ValidationError('No files uploaded');

  const records = await Promise.all(
    (req.files as Express.Multer.File[]).map(async (f) => {
      const supabase = await getSupabase();
      const bucket = await getBucket();
      const storagePath = `imaging/${id}/${Date.now()}-${f.originalname}`;
      const { error } = await supabase.storage.from(bucket).upload(storagePath, f.buffer, {
        contentType: f.mimetype,
        upsert: false,
      });
      if (error) throw new Error(`Supabase upload failed: ${error.message}`);
      return prisma.imagingFile.create({
        data: {
          imagingOrderId: id,
          originalName: f.originalname,
          storedPath: storagePath,
          mimeType: f.mimetype,
          size: f.size,
        },
      });
    }),
  );

  res.status(201).json(records);
}));

router.get('/:id/files', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const id = req.params.id!;
  const files = await prisma.imagingFile.findMany({
    where: { imagingOrderId: id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(files);
}));

router.get('/files/:fileId/download', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const fileId = req.params.fileId!;
  const file = await prisma.imagingFile.findFirst({ where: { id: fileId } });
  if (!file) throw new NotFoundError('File not found');

  const supabase = await getSupabase();
  const bucket = await getBucket();
  const { data } = await supabase.storage.from(bucket).createSignedUrl(file.storedPath, 3600);
  if (!data?.signedUrl) throw new Error('Failed to generate download URL');

  res.json({ signedUrl: data.signedUrl, originalName: file.originalName, mimeType: file.mimeType, size: file.size });
}));

export default router;
