import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

const acuityPriority = {
  RESUSCITATION: 10,
  EMERGENT: 8,
  URGENT: 5,
  LESS_URGENT: 2,
  NON_URGENT: 1,
} as Record<string, number>;

router.post('/refer', authenticate, requirePermission(PERMISSIONS.EMERGENCY_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { patientId, triageId, clinicId, doctorId, notes } = req.body as Record<string, string>;
  if (!patientId) throw new ValidationError('patientId is required');
  if (!triageId) throw new ValidationError('triageId is required');
  if (!clinicId) throw new ValidationError('clinicId is required');

  const hospitalId = req.user!.hospitalId!;

  const triage = await prisma.triageAssessment.findFirst({ where: { id: triageId, hospitalId } });
  if (!triage) throw new ValidationError('Triage assessment not found');

  const lastAppointment = await prisma.appointment.findFirst({
    where: { clinicId, hospitalId },
    orderBy: { token: 'desc' },
    select: { token: true },
  });
  const nextToken = (lastAppointment?.token || 0) + 1;

  const priority = acuityPriority[triage.acuity] || 10;

  const appointment = await prisma.appointment.create({
    data: {
      token: nextToken,
      type: 'WALKIN',
      status: 'WAITING',
      priority,
      notes: notes || `Emergency referral: ${triage.chiefComplaint}`,
      patientId,
      clinicId,
      doctorId: doctorId || clinicId,
      hospitalId,
      scheduledAt: new Date(),
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      clinic: { select: { id: true, name: true } },
    },
  });

  await prisma.triageAssessment.update({
    where: { id: triageId },
    data: { seenByDoctorAt: new Date() },
  });

  res.status(201).json(appointment);
}));

router.get('/consultation-queue', authenticate, requirePermission(PERMISSIONS.EMERGENCY_READ), asyncHandler(async (req: Request, res: Response) => {
  const hospitalId = req.user!.hospitalId!;

  const appointments = await prisma.appointment.findMany({
    where: { hospitalId, notes: { contains: 'Emergency referral' }, status: 'WAITING' },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      clinic: { select: { id: true, name: true } },
    },
  });

  const now = Date.now();
  const acuityReverse = Object.fromEntries(
    Object.entries(acuityPriority).map(([k, v]) => [v, k])
  );

  const result = appointments.map((a: any) => {
    const waitTime = Math.round((now - new Date(a.createdAt).getTime()) / 60000);
    const acu = acuityReverse[a.priority] || 'URGENT';
    const acuityColorMap: Record<string, string> = {
      RESUSCITATION: '#ef4444',
      EMERGENT: '#f97316',
      URGENT: '#eab308',
      LESS_URGENT: '#22c55e',
      NON_URGENT: '#3b82f6',
    };
    return {
      appointmentId: a.id,
      patientName: (a.patient as any).fullName,
      mrn: (a.patient as any).mrn,
      acuity: acu,
      color: acuityColorMap[acu] || '#6b7280',
      priority: a.priority,
      chiefComplaint: a.notes?.replace('Emergency referral: ', '') || '',
      waitTime,
      clinicName: (a.clinic as any).name,
    };
  });

  res.json(result);
}));

export default router;
