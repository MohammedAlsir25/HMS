import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { validate } from '../../../middleware/validate.js';
import { createPatientSchema } from '../../../schemas/reception.schema.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { generateMRN } from '../reception.utils.js';

const router = Router();

router.get('/search', authenticate, requirePermission(PERMISSIONS.PATIENT_READ), asyncHandler(async (req, res) => {
  const q = req.query.q as string | undefined;
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
  const { fullName, phone, dateOfBirth, gender, diabetesType, address, notes } = req.body;
  const mrn = await generateMRN(req.user!.hospitalId!);
  const patient = await prisma.patient.create({
    data: {
      mrn,
      fullName,
      phone,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender: gender || null,
      diabetesType: diabetesType || 'NONE',
      address: address || null,
      notes: notes || null,
      createdById: req.user!.id,
    },
  });
  res.status(201).json(patient);
}));

export default router;
