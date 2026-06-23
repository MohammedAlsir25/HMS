import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { getAIDiagnosis } from './ai.service.js';

const router = Router();
const prisma = new PrismaClient();

router.post('/diagnose', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), async (req, res) => {
  try {
    const { patientId, symptoms, vitals, specialty } = req.body;
    if (!patientId) return res.status(400).json({ message: 'patientId is required' });

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ message: 'Patient not found' });

    const patientInfo = {
      age: patient.dateOfBirth
        ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null,
      gender: patient.gender,
      chronicConditions: patient.chronicConditions,
      diabetesType: patient.diabetesType,
    };

    const result = await getAIDiagnosis({ symptoms: symptoms || [], vitals: vitals || {}, patient: patientInfo, specialty: specialty || 'medicine' });

    res.json({
      patientId: patient.id,
      patientName: patient.fullName,
      diagnoses: result?.diagnoses || [],
      tests: result?.tests || [],
      treatments: result?.treatments || [],
      notes: result?.notes || '',
    });
  } catch (err) {
    console.error('AI diagnose error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/icd10', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), async (req, res) => {
  try {
    const { q } = req.query;
    const where = q && q.length >= 2
      ? { OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ] }
      : {};
    const codes = await prisma.icd10Code.findMany({
      where,
      orderBy: { code: 'asc' },
      take: 50,
    });
    res.json(codes);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
