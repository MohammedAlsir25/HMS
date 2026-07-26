import { Router } from 'express';
import { GenderType } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { generateMRN } from '../../reception/reception.utils.js';

const router = Router();

router.get('/check-patient', authenticate, requirePermission(PERMISSIONS.EMERGENCY_READ), asyncHandler(async (req, res) => {
  const { phone, name } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;
  let patient = null;
  if (phone?.trim()) {
    patient = await prisma.patient.findFirst({ where: { phone: phone.trim(), hospitalId } });
  }
  if (!patient && name?.trim()) {
    patient = await prisma.patient.findFirst({
      where: { fullName: { contains: name.trim(), mode: 'insensitive' }, hospitalId },
    });
  }
  res.json({ patient: patient ? { id: patient.id, fullName: patient.fullName, mrn: patient.mrn, phone: patient.phone } : null });
}));

router.post('/register', authenticate, requirePermission(PERMISSIONS.EMERGENCY_WRITE), asyncHandler(async (req, res) => {
  const { fullName, phone, dateOfBirth, gender, chiefComplaint } = req.body as Record<string, string>;
  if (!fullName || !fullName.trim()) throw new ValidationError('fullName is required');
  if (!chiefComplaint || !chiefComplaint.trim()) throw new ValidationError('chiefComplaint is required');

  const hospitalId = req.user!.hospitalId!;
  let patient = null;
  let existingPatient = false;

  if (phone && phone.trim()) {
    patient = await prisma.patient.findFirst({
      where: { phone: phone.trim(), hospitalId },
    });
  }

  if (patient) {
    existingPatient = true;
  } else {
    const mrn = await generateMRN(hospitalId);
    patient = await prisma.patient.create({
      data: {
        mrn,
        fullName: fullName.trim(),
        phone: phone?.trim() || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: (gender?.toUpperCase() as GenderType) || null,
        createdById: req.user!.id,
        hospitalId,
      },
    });
  }

  const triageAssessment = await prisma.triageAssessment.create({
    data: {
      patientId: patient.id,
      acuity: 'URGENT',
      chiefComplaint: chiefComplaint.trim(),
      triageNurseId: req.user!.id,
      hospitalId,
    },
  });

  res.status(201).json({ patient, triageAssessment, existingPatient });
}));

export default router;
