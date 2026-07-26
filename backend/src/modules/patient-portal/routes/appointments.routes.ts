import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { authenticatePatient } from '../middleware/authenticatePatient.js';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../../../utils/errors.js';

const router = Router();

router.get('/available-slots', asyncHandler(async (req, res) => {
  const { clinicId, doctorId, date } = req.query as { clinicId?: string; doctorId?: string; date?: string };
  if (!clinicId || !date) {
    throw new ValidationError('clinicId and date are required');
  }
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) {
    throw new ValidationError('Invalid date format');
  }
  const dayStart = new Date(dateObj);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateObj);
  dayEnd.setHours(23, 59, 59, 999);
  const doctorFilter: Record<string, unknown> = { clinicId };
  if (doctorId) {
    doctorFilter['id'] = doctorId;
  }
  const doctors = await prisma.user.findMany({
    where: doctorFilter,
    select: { id: true, fullName: true },
  });
  const doctorIds = doctors.map((d) => d.id);
  if (doctorIds.length === 0) {
    res.json({ slots: [] });
    return;
  }
  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      doctorId: { in: doctorIds },
      clinicId,
      scheduledAt: { gte: dayStart, lte: dayEnd },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    },
    select: { doctorId: true, scheduledAt: true },
  });
  const bookedSlots = new Map<string, Set<string>>();
  for (const appt of bookedAppointments) {
    if (!appt.scheduledAt) continue;
    const timeStr = `${String(appt.scheduledAt.getHours()).padStart(2, '0')}:${String(appt.scheduledAt.getMinutes()).padStart(2, '0')}`;
    if (!bookedSlots.has(appt.doctorId)) {
      bookedSlots.set(appt.doctorId, new Set());
    }
    bookedSlots.get(appt.doctorId)!.add(timeStr);
  }
  const allSlots: string[] = [];
  for (let hour = 9; hour < 17; hour++) {
    if (hour === 12) continue;
    if (hour === 13) continue;
    allSlots.push(`${String(hour).padStart(2, '0')}:00`);
    allSlots.push(`${String(hour).padStart(2, '0')}:30`);
  }
  const slots = doctors.map((doctor) => {
    const booked = bookedSlots.get(doctor.id) ?? new Set();
    return {
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      slots: allSlots.map((time) => ({
        time,
        available: !booked.has(time),
      })),
    };
  });
  res.json({ date, clinicId, doctors: slots });
}));

router.get('/', authenticatePatient, asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const { status } = req.query as { status?: string };
  const where: Record<string, unknown> = { patientId };
  const now = new Date();
  if (status === 'upcoming') {
    where['scheduledAt'] = { gte: now };
    where['status'] = { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] };
  } else if (status === 'past') {
    where['OR'] = [
      { scheduledAt: { lt: now } },
      { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } },
    ];
  }
  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      clinic: { select: { name: true } },
      doctor: { select: { fullName: true } },
    },
    orderBy: { scheduledAt: 'desc' },
  });
  res.json({
    appointments: appointments.map((a) => ({
      id: a.id,
      date: a.scheduledAt?.toISOString() ?? a.createdAt.toISOString(),
      time: a.scheduledAt
        ? `${String(a.scheduledAt.getHours()).padStart(2, '0')}:${String(a.scheduledAt.getMinutes()).padStart(2, '0')}`
        : null,
      doctorName: a.doctor.fullName,
      clinic: a.clinic.name,
      status: a.status,
      type: a.type,
      visitType: a.visitType,
      token: a.token,
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}));

router.get('/:id', authenticatePatient, asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const appointment = await prisma.appointment.findFirst({
    where: { id: req.params['id']!, patientId },
    include: {
      clinic: { select: { name: true } },
      doctor: { select: { fullName: true } },
    },
  });
  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }
  res.json({
    id: appointment.id,
    date: appointment.scheduledAt?.toISOString() ?? appointment.createdAt.toISOString(),
    time: appointment.scheduledAt
      ? `${String(appointment.scheduledAt.getHours()).padStart(2, '0')}:${String(appointment.scheduledAt.getMinutes()).padStart(2, '0')}`
      : null,
    doctorName: appointment.doctor.fullName,
    clinic: appointment.clinic.name,
    status: appointment.status,
    type: appointment.type,
    visitType: appointment.visitType,
    token: appointment.token,
    notes: appointment.notes,
    createdAt: appointment.createdAt.toISOString(),
  });
}));

router.post('/', authenticatePatient, asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const hospitalId = req.patient!.hospitalId;
  const { clinicId, doctorId, date, time } = req.body as {
    clinicId?: string;
    doctorId?: string;
    date?: string;
    time?: string;
  };
  if (!clinicId || !date || !time) {
    throw new ValidationError('clinicId, date, and time are required');
  }
  const [hours, minutes] = time.split(':').map(Number);
  if (hours === undefined || minutes === undefined) {
    throw new ValidationError('Invalid time format');
  }
  const scheduledAt = new Date(date);
  scheduledAt.setHours(hours, minutes, 0, 0);
  if (doctorId) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        scheduledAt,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    });
    if (conflict) {
      throw new ConflictError('This time slot is already booked');
    }
  }
  const lastAppointment = await prisma.appointment.findFirst({
    where: {
      clinicId,
      scheduledAt: {
        gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
      },
    },
    orderBy: { token: 'desc' },
    select: { token: true },
  });
  const nextToken = (lastAppointment?.token ?? 0) + 1;
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId },
    select: { name: true },
  });
  const appointment = await prisma.appointment.create({
    data: {
      patientId,
      clinicId,
      doctorId: doctorId ?? '',
      scheduledAt,
      token: nextToken,
      type: 'RESERVATION',
      status: 'RESERVED',
      hospitalId,
    },
  });
  res.status(201).json({
    appointment: {
      id: appointment.id,
      date: scheduledAt.toISOString().split('T')[0],
      time,
      doctor: doctorId ?? null,
      clinic: clinic?.name ?? null,
      status: appointment.status,
      type: appointment.type,
      visitType: appointment.visitType,
      token: appointment.token,
    },
  });
}));

router.patch('/:id/cancel', authenticatePatient, asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const appointment = await prisma.appointment.findFirst({
    where: { id: req.params['id']!, patientId },
  });
  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }
  if (appointment.status === 'CANCELLED') {
    throw new ValidationError('Appointment is already cancelled');
  }
  if (appointment.status === 'COMPLETED') {
    throw new ForbiddenError('Cannot cancel a completed appointment');
  }
  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: { status: 'CANCELLED' },
  });
  res.json({
    appointment: {
      id: updated.id,
      status: updated.status,
    },
  });
}));

export default router;
