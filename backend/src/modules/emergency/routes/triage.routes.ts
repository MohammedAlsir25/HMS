import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.post('/', authenticate, requirePermission(PERMISSIONS.EMERGENCY_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { patientId, acuity, chiefComplaint, vitalSigns, triageNotes } = req.body as Record<string, unknown>;
  if (!patientId || typeof patientId !== 'string') throw new ValidationError('patientId is required');
  if (!acuity || typeof acuity !== 'string') throw new ValidationError('acuity is required');
  if (!chiefComplaint || typeof chiefComplaint !== 'string') throw new ValidationError('chiefComplaint is required');

  const hospitalId = req.user!.hospitalId!;
  const assessment = await prisma.triageAssessment.create({
    data: {
      patientId,
      acuity: acuity as any,
      chiefComplaint,
      vitalSigns: vitalSigns ? (vitalSigns as object) : undefined,
      triageNotes: triageNotes as string | undefined,
      triageNurseId: req.user!.id,
      hospitalId,
    },
    include: { patient: { select: { id: true, fullName: true, mrn: true, phone: true } } },
  });
  res.status(201).json(assessment);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.EMERGENCY_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { acuity, chiefComplaint, vitalSigns, triageNotes, disposition, seenByDoctorAt } = req.body as Record<string, unknown>;
  const existing = await prisma.triageAssessment.findFirst({ where: { id } });
  if (!existing) throw new ValidationError('Triage assessment not found');

  const assessment = await prisma.triageAssessment.update({
    where: { id },
    data: {
      ...(acuity ? { acuity: acuity as any } : {}),
      ...(chiefComplaint ? { chiefComplaint: chiefComplaint as string } : {}),
      ...(vitalSigns ? { vitalSigns: vitalSigns as object } : {}),
      ...(triageNotes !== undefined ? { triageNotes: triageNotes as string | null } : {}),
      ...(disposition ? { disposition: disposition as string } : {}),
      ...(seenByDoctorAt ? { seenByDoctorAt: new Date(seenByDoctorAt as string) } : {}),
    },
    include: { patient: { select: { id: true, fullName: true, mrn: true, phone: true } } },
  });
  res.json(assessment);
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.EMERGENCY_READ), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const hospitalId = req.user!.hospitalId!;
  const assessment = await prisma.triageAssessment.findFirst({
    where: { id, hospitalId },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true, phone: true, dateOfBirth: true, gender: true } },
      triageNurse: { select: { id: true, fullName: true } },
    },
  });
  if (!assessment) throw new ValidationError('Triage assessment not found');
  res.json(assessment);
}));

router.get('/active', authenticate, requirePermission(PERMISSIONS.EMERGENCY_READ), asyncHandler(async (req: Request, res: Response) => {
  const hospitalId = req.user!.hospitalId!;
  const assessments = await prisma.triageAssessment.findMany({
    where: { hospitalId },
    include: { patient: { select: { id: true, fullName: true, mrn: true } } },
    orderBy: { triageTime: 'desc' },
  });
  const now = Date.now();
  const withWait = assessments.map((a: any) => ({
    ...a,
    waitTimeMinutes: Math.round((now - new Date(a.triageTime).getTime()) / 60000),
  }));

  const awaitingTriage: typeof withWait = [];
  const activeTriage: typeof withWait = [];
  const completedTriage: typeof withWait = [];

  for (const a of withWait) {
    if (a.disposition === 'ADMITTED' || a.disposition === 'DISCHARGED' || a.disposition === 'TRANSFERRED') {
      completedTriage.push(a);
    } else if (a.vitalSigns || a.triageNotes) {
      activeTriage.push(a);
    } else {
      awaitingTriage.push(a);
    }
  }

  res.json({ awaitingTriage, activeTriage, completedTriage });
}));

router.get('/history', authenticate, requirePermission(PERMISSIONS.EMERGENCY_READ), asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, acuityFilter } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;
  const where: Record<string, unknown> = { hospitalId };
  if (acuityFilter) where.acuity = acuityFilter;

  const triageTime: Record<string, Date> = {};
  if (startDate) {
    triageTime.gte = new Date(startDate);
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    triageTime.gte = d;
  }
  if (endDate) triageTime.lte = new Date(endDate);
  where.triageTime = triageTime;

  const assessments = await prisma.triageAssessment.findMany({
    where,
    take: 200,
    include: { patient: { select: { id: true, fullName: true, mrn: true } } },
    orderBy: { triageTime: 'desc' },
  });
  res.json(assessments);
}));

export default router;
