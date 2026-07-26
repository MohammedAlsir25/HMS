import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { validate } from '../../../middleware/validate.js';
import { NotFoundError, ValidationError } from '../../../utils/errors.js';
import { queueStatusSchema } from '../../../schemas/reception.schema.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { resolveClinic } from '../reception.utils.js';

const router = Router();

const VALID_TRANSITIONS: Record<string, string[]> = {
  WAITING: ['CALLED', 'CANCELLED', 'NO_SHOW'],
  CALLED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
};

router.get('/queue/stats', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const appointments = await prisma.appointment.findMany({
    where: {
      hospitalId,
      createdAt: { gte: now },
      status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED'] },
    },
    include: { clinic: { select: { id: true, name: true, slug: true } } },
    orderBy: [{ clinicId: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  });
  const byClinic: Record<string, { id: string; name: string; slug: string; waiting: number; inProgress: number; completed: number; avgMins: number }> = {};
  for (const a of appointments) {
    const key = a.clinicId;
    if (!byClinic[key]) byClinic[key] = { id: key, name: a.clinic.name, slug: a.clinic.slug, waiting: 0, inProgress: 0, completed: 0, avgMins: 10 };
    if (a.status === 'WAITING' || a.status === 'CALLED') byClinic[key].waiting++;
    if (a.status === 'IN_PROGRESS') byClinic[key].inProgress++;
    if (a.status === 'COMPLETED') byClinic[key].completed++;
  }
  res.json(Object.values(byClinic));
}));

router.get('/queue/:clinicId', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const clinic = await resolveClinic(req.params.clinicId!);
  if (!clinic) throw new NotFoundError('Clinic not found');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appointments = await prisma.appointment.findMany({
    where: {
      hospitalId,
      clinicId: clinic.id,
      status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
      createdAt: { gte: today },
    },
    include: { patient: { select: { fullName: true, mrn: true, dateOfBirth: true, phone: true, notes: true } } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
  const result = appointments.map((a, _idx) => {
    const waitOrder = appointments.filter(x => x.status === 'WAITING').findIndex(x => x.id === a.id);
    return {
      ...a,
      estimatedWaitMins: a.status === 'WAITING' ? (waitOrder + 1) * 10 : 0,
      position: a.status === 'WAITING' ? waitOrder + 1 : null,
    };
  });
  res.json(result);
}));

router.post('/queue/:clinicId/call-next', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const clinic = await resolveClinic(req.params.clinicId!);
  if (!clinic) throw new NotFoundError('Clinic not found');
  const next = await prisma.appointment.findFirst({
    where: {
      hospitalId,
      clinicId: clinic.id,
      status: 'WAITING',
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  if (!next) throw new NotFoundError('No waiting patients');
  const updated = await prisma.appointment.update({
    where: { id: next.id },
    data: { status: 'CALLED', calledAt: new Date() },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(updated);
}));

router.put('/queue/:appointmentId/status', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), validate(queueStatusSchema), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { status } = req.body;
  const appointment = await prisma.appointment.findFirst({
    where: { id: req.params.appointmentId!, hospitalId },
  });
  if (!appointment) throw new NotFoundError('Appointment not found');

  const allowed = VALID_TRANSITIONS[appointment.status];
  if (!allowed || !allowed.includes(status)) {
    throw new ValidationError(`Cannot transition from ${appointment.status} to ${status}`);
  }

  const updateData: Prisma.AppointmentUpdateInput = { status: status as any };
  if (status === 'CALLED') {
    updateData.calledAt = new Date();
  }
  if (status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  const updated = await prisma.appointment.update({
    where: { id: req.params.appointmentId! },
    data: updateData,
    include: {
      patient: { select: { fullName: true, mrn: true } },
      clinic: { select: { name: true, slug: true } },
    },
  });
  res.json(updated);
}));

router.get('/waiting-room', asyncHandler(async (req, res) => {
  const hospitalId = req.user?.hospitalId;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const where: Prisma.AppointmentWhereInput = {
    createdAt: { gte: now },
    status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
  };
  if (hospitalId) where.hospitalId = hospitalId;

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      clinic: { select: { name: true, slug: true } },
      patient: { select: { fullName: true, mrn: true } },
    },
    orderBy: [{ clinicId: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
  });
  const grouped: Record<string, { clinic: string; queue: Array<Record<string, unknown>> }> = {};
  for (const a of appointments) {
    const key = a.clinic.slug;
    if (!grouped[key]) grouped[key] = { clinic: a.clinic.name, queue: [] };
    grouped[key].queue.push({
      token: a.token,
      status: a.status,
      type: a.type,
      priority: a.priority,
      patientName: a.patient.fullName,
      mrn: a.patient.mrn,
    });
  }
  res.json(grouped);
}));

export default router;
