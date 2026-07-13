import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { validate } from '../../../middleware/validate.js';
import { checkInSchema } from '../../../schemas/reception.schema.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../utils/errors.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { resolveClinic, nextToken, generateMRN } from '../reception.utils.js';

const router = Router();

router.post('/check-in', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), auditMiddleware('CHECK_IN', 'Appointment'), validate(checkInSchema), asyncHandler(async (req, res) => {
  const { patientId, clinicId, type, visitType, priority, notes, collectPayment, paymentMethod } = req.body;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');
  const clinic = await resolveClinic(clinicId);
  if (!clinic) throw new NotFoundError('Clinic not found');

  // If clinic requires optometry pre-screening, route to optometry instead
  if (clinic.optometryPreScreeningRequired) {
    const optometryClinic = await prisma.clinic.findFirst({
      where: { type: 'OPTOMETRY', isActive: true },
    });
    if (!optometryClinic) throw new NotFoundError('Optometry clinic not found');

    if (collectPayment) {
      if (!req.user!.permissions.includes(PERMISSIONS.ACCOUNTING_WRITE)) {
        throw new ForbiddenError('Insufficient permissions to collect payment');
      }
    }

    const optometryToken = await nextToken(optometryClinic.id);
    const optometryAppointment = await prisma.appointment.create({
      data: {
        token: optometryToken,
        type: type || 'WALKIN',
        status: 'WAITING',
        priority: typeof priority === 'number' ? priority : 0,
        visitType: visitType || 'NEW_VISIT',
        notes: notes || null,
        patientId,
        clinicId: optometryClinic.id,
        doctorId: req.user!.id,
        targetClinicId: clinic.id,
      },
      include: { patient: { select: { fullName: true, mrn: true, nationalId: true } } },
    });

    let transaction = null;
    if (collectPayment) {
      const fee = visitType === 'FOLLOW_UP' ? clinic.followUpFee : clinic.consultationFee;
      const department = await prisma.department.findFirst({ where: { clinicId: optometryClinic.id } });
      let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
      if (!shift) {
        shift = await prisma.shift.create({ data: { userId: req.user!.id } });
      }
      transaction = await prisma.transaction.create({
        data: {
          type: 'RECEPTION',
          amount: Number(fee) || 0,
          paymentMethod: paymentMethod || 'CASH',
          description: `Pre-screening fee - ${clinic.name}`,
          shiftId: shift.id,
          cashierId: req.user!.id,
          departmentId: department ? department.id : null,
        },
        include: { cashier: { select: { id: true, fullName: true } } },
      });
    }

    return res.status(201).json({
      appointment: optometryAppointment,
      transaction,
      optometryRouting: true,
      targetClinic: { id: clinic.id, name: clinic.name, slug: clinic.slug },
      message: `Patient routed to Optometry for pre-screening before ${clinic.name}`,
    });
  }

  if (collectPayment) {
    if (!req.user!.permissions.includes(PERMISSIONS.ACCOUNTING_WRITE)) {
      throw new ForbiddenError('Insufficient permissions to collect payment');
    }
    const fee = visitType === 'FOLLOW_UP' ? clinic.followUpFee : clinic.consultationFee;
    if (!fee || Number(fee) <= 0) throw new ValidationError('No fee configured for this clinic');
  }
  const token = await nextToken(clinic.id);
  const appointment = await prisma.appointment.create({
    data: {
      token,
      type: type || 'WALKIN',
      status: 'WAITING',
      priority: typeof priority === 'number' ? priority : 0,
      visitType: visitType || 'NEW_VISIT',
      notes: notes || null,
      patientId,
      clinicId: clinic.id,
      doctorId: req.user!.id,
    },
    include: { patient: { select: { fullName: true, mrn: true, nationalId: true } } },
  });
  let transaction = null;
  if (collectPayment) {
    const fee = visitType === 'FOLLOW_UP' ? clinic.followUpFee : clinic.consultationFee;
    const department = await prisma.department.findFirst({ where: { clinicId: clinic.id } });
    let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
    if (!shift) {
      shift = await prisma.shift.create({ data: { userId: req.user!.id } });
    }
    transaction = await prisma.transaction.create({
      data: {
        type: 'RECEPTION',
        amount: Number(fee) || 0,
        paymentMethod: paymentMethod || 'CASH',
        description: `${visitType === 'FOLLOW_UP' ? 'Follow-up' : 'Consultation'} fee - ${clinic.name}`,
        shiftId: shift.id,
        cashierId: req.user!.id,
        departmentId: department ? department.id : null,
      },
      include: { cashier: { select: { id: true, fullName: true } } },
    });
  }
  res.status(201).json({ appointment, transaction });
}));

router.post('/reservations', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const { patientId, clinicId, doctorId, scheduledAt, fullName, phone, notes } = req.body;
  if (!clinicId) throw new ValidationError('clinicId is required');
  if (!patientId && !fullName) throw new ValidationError('patientId or fullName is required');
  const clinic = await resolveClinic(clinicId);
  if (!clinic) throw new NotFoundError('Clinic not found');
  let patient;
  if (patientId) {
    patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundError('Patient not found');
  } else {
    patient = await prisma.patient.create({
      data: {
        fullName,
        phone: phone || null,
        mrn: generateMRN(),
        createdBy: { connect: { id: req.user!.id } },
      },
    });
  }
  if (doctorId) {
    const doctor = await prisma.user.findFirst({ where: { id: doctorId, clinicId: clinic.id, isActive: true } });
    if (!doctor) throw new ValidationError('Doctor not found or not assigned to this clinic');
  }
  const token = await nextToken(clinic.id);
  const appointment = await prisma.appointment.create({
    data: {
      token,
      type: 'RESERVATION',
      status: 'RESERVED',
      priority: 0,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes: notes || null,
      patientId: patient.id,
      clinicId: clinic.id,
      doctorId: doctorId || req.user!.id,
    },
    include: { patient: { select: { fullName: true, mrn: true, nationalId: true, phone: true } }, doctor: { select: { fullName: true } }, clinic: { select: { name: true } } },
  });
  if (patient.phone) {
    console.log(`[SMS] To ${patient.phone}: Appointment at ${appointment.clinic.name} with Dr. ${(appointment as any).doctor.fullName} on ${appointment.scheduledAt?.toISOString() || 'soon'}`);
  }
  try {
    const { NotificationService } = await import('../../procurement/services/NotificationService.js');
    await NotificationService.notify(req.user!.id, 'New Reservation', `Reservation created for ${patient.fullName} at ${clinic.name}`);
  } catch {}
  res.status(201).json(appointment);
}));

router.get('/reservations', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), asyncHandler(async (req, res) => {
  const { clinicId, q } = req.query as { clinicId?: string; q?: string };
  const where: Record<string, unknown> = { status: 'RESERVED' };
  if (clinicId) {
    const clinic = await resolveClinic(clinicId);
    if (clinic) where.clinicId = clinic.id;
  }
  if (q && q.length >= 2) {
    where.patient = {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { nationalId: { contains: q } },
      ],
    };
  }
  const appointments = await prisma.appointment.findMany({
    where: where as Prisma.AppointmentWhereInput,
    include: { patient: { select: { fullName: true, mrn: true, nationalId: true } }, clinic: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(appointments);
}));

router.patch('/reservations/:id/arrive', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const { priority, visitType } = req.body;
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id! },
    data: {
      status: 'WAITING',
      priority: typeof priority === 'number' ? priority : 5,
      visitType: visitType || 'NEW_VISIT',
    },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(appointment);
}));

router.patch('/appointments/:id/status', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const valid = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
  if (!valid.includes(status)) throw new ValidationError('Invalid status');
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id! },
    data: { status },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(appointment);
}));

router.patch('/appointments/:id/priority', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req, res) => {
  const { priority } = req.body;
  if (typeof priority !== 'number' || priority < 0 || priority > 10) {
    throw new ValidationError('Priority must be a number 0–10');
  }
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id! },
    data: { priority },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(appointment);
}));

router.get('/follow-ups', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_READ), asyncHandler(async (req, res) => {
  const { clinicId, dateFrom, dateTo, q } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { status: 'RESERVED', visitType: 'FOLLOW_UP' };
  if (clinicId) where.clinicId = clinicId;
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = new Date(dateFrom);
    if (dateTo) dateFilter.lte = new Date(dateTo);
    where.scheduledAt = dateFilter;
  }
  if (q && q.length >= 2) {
    where.patient = {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' as const } },
        { mrn: { contains: q } },
      ],
    };
  }
  const followUps = await prisma.appointment.findMany({
    where: where as Prisma.AppointmentWhereInput,
    include: {
      patient: { select: { fullName: true, mrn: true, phone: true } },
      clinic: { select: { name: true, slug: true, id: true } },
      doctor: { select: { fullName: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 100,
  });
  res.json(followUps);
}));

export default router;
