import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { getAIDiagnosis, type Symptom, type VitalSigns, type PatientInfo } from './ai.service.js';

const router = Router();
import prisma from '../../lib/prisma.js';

router.post('/diagnose', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const { patientId, symptoms, vitals, specialty } = req.body as { patientId?: string; symptoms?: Symptom[]; vitals?: VitalSigns; specialty?: string };
  if (!patientId) throw new ValidationError('patientId is required');

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');

  const patientInfo = {
    age: patient.dateOfBirth
      ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null,
    gender: patient.gender,
    chronicConditions: patient.chronicConditions,
    diabetesType: patient.diabetesType,
  };

  const result = await getAIDiagnosis({ symptoms: (symptoms || []) as Symptom[], vitals: (vitals || {}) as VitalSigns, patient: patientInfo as PatientInfo, specialty: specialty || 'medicine' });

  res.json({
    patientId: patient.id,
    patientName: patient.fullName,
    diagnoses: result?.diagnoses || [],
    tests: result?.tests || [],
    treatments: result?.treatments || [],
    notes: result?.notes || '',
  });
}));

router.get('/icd10', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const { q, category, code } = req.query as { q?: string; category?: string; code?: string };

  if (code) {
    const exact = await prisma.icd10Code.findUnique({ where: { code } });
    return res.json(exact ? [exact] : []);
  }

  const where: Record<string, unknown> = {};

  if (q && q.length >= 2) {
    where.OR = [
      { code: { contains: q, mode: 'insensitive' as const } },
      { name: { contains: q, mode: 'insensitive' as const } },
    ];
  }

  if (category) {
    where.category = { contains: category, mode: 'insensitive' as const };
  }

  const codes = await prisma.icd10Code.findMany({
    where,
    orderBy: { code: 'asc' },
    take: 50,
  });
  res.json(codes);
}));

export default router;


