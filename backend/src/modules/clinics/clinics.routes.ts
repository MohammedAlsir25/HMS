import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { completeScreeningSchema, scheduleFollowUpSchema } from '../../schemas/clinics.schema.js';
import { completeScreening, generatePrintData } from './clinics.helpers.js';

const router = Router();
import prisma from '../../lib/prisma.js';
import { nextToken } from '../reception/reception.utils.js';

router.get('/', authenticate, asyncHandler(async (_req, res) => {
  const clinics = await prisma.clinic.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(clinics);
}));

router.get('/:slug/dashboard', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');

  const patients = await prisma.patient.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
  const appointments = await prisma.appointment.findMany({
    where: { clinicId: clinic.id, status: { in: ['WAITING', 'IN_PROGRESS'] } },
    include: { patient: { select: { fullName: true, mrn: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  res.json({ clinic, patients, appointments });
}));

router.post('/:slug/record', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');

  const { patientId, diagnosis, prescriptions, clinicSpecificJson, notes, vitalSigns, symptoms, medications } = req.body;
  if (!patientId) throw new ValidationError('patientId is required');

  const record = await prisma.clinicalRecord.create({
    data: {
      patientId,
      clinicId: clinic.id,
      diagnosis: diagnosis || null,
      prescriptions: prescriptions || null,
      clinicSpecificJson: clinicSpecificJson || {},
      notes: notes || null,
      vitalSigns: vitalSigns ? {
        create: {
          bloodPressureSystolic: vitalSigns.bloodPressureSystolic || null,
          bloodPressureDiastolic: vitalSigns.bloodPressureDiastolic || null,
          heartRate: vitalSigns.heartRate || null,
          temperature: vitalSigns.temperature || null,
          spo2: vitalSigns.spo2 || null,
          bloodGlucose: vitalSigns.bloodGlucose || null,
          weight: vitalSigns.weight || null,
        },
      } : undefined,
      symptoms: (symptoms as Array<Record<string, unknown>>)?.length ? {
        create: (symptoms as Array<Record<string, unknown>>).map(s => ({
          name: s.name as string,
          bodyArea: (s.bodyArea as string) || null,
          onset: (s.onset as string) || null,
          duration: (s.duration as string) || null,
          severity: (s.severity as string) || null,
          description: (s.description as string) || null,
        })),
      } as unknown as Exclude<Prisma.ClinicalRecordCreateInput['symptoms'], undefined> : undefined,
      medications: (medications as Array<Record<string, unknown>>)?.length ? {
        create: (medications as Array<Record<string, unknown>>).map(m => ({
          drugName: m.drugName as string,
          dosage: (m.dosage as string) || null,
          frequency: (m.frequency as string) || null,
          duration: (m.duration as string) || null,
          route: (m.route as string) || null,
          notes: (m.notes as string) || null,
        })),
      } : undefined,
    },
    include: {
      vitalSigns: true,
      symptoms: true,
      medications: true,
    },
  });

  res.status(201).json(record);
}));

router.get('/:slug/records', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');

  const { patientId } = req.query as { patientId?: string };
  const where: Record<string, unknown> = { clinicId: clinic.id };
  if (patientId) where.patientId = patientId;

  const records = await prisma.clinicalRecord.findMany({
    where,
    include: {
      patient: { select: { fullName: true, mrn: true } },
      vitalSigns: true,
      symptoms: true,
      medications: true,
    },
    orderBy: { encounterDate: 'desc' },
    take: 50,
  });

  res.json(records);
}));

router.get('/:slug/queue', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const queue = await prisma.appointment.findMany({
    where: {
      clinicId: clinic.id,
      status: { in: ['WAITING', 'CALLED'] },
      createdAt: { gte: today },
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true, phone: true, gender: true, dateOfBirth: true, chronicConditions: true, diabetesType: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  // Include optometry record data if this appointment has an optometryRecordId
  const optometryRecordIds = queue.map(a => a.optometryRecordId).filter(Boolean) as string[];
  const optometryRecords = optometryRecordIds.length > 0
    ? await prisma.clinicalRecord.findMany({
        where: { id: { in: optometryRecordIds } },
        select: { id: true, diagnosis: true, clinicSpecificJson: true, encounterDate: true },
      })
    : [];

  const optometryRecordMap = new Map(optometryRecords.map(r => [r.id, r]));

  const enrichedQueue = queue.map(a => ({
    ...a,
    optometryReport: a.optometryRecordId && optometryRecordMap.has(a.optometryRecordId)
      ? optometryRecordMap.get(a.optometryRecordId)
      : null,
  }));

  res.json(enrichedQueue);
}));

router.get('/:slug/stats', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalPatients, todayAppointments, todayRecords, chronicPatients] = await Promise.all([
    prisma.clinicalRecord.groupBy({
      by: ['patientId'],
      where: { clinicId: clinic.id },
    }),
    prisma.appointment.count({
      where: { clinicId: clinic.id, createdAt: { gte: today } },
    }),
    prisma.clinicalRecord.count({
      where: { clinicId: clinic.id, createdAt: { gte: today } },
    }),
    prisma.patient.count({
      where: { chronicConditions: { isEmpty: false } },
    }),
  ]);

  res.json({
    totalPatients: totalPatients.length,
    todayAppointments,
    todayRecords,
    chronicPatients,
  });
}));

router.get('/:slug/doctors', authenticate, asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');
  const doctors = await prisma.user.findMany({
    where: { clinicId: clinic.id, isActive: true, role: { name: { contains: 'doctor', mode: 'insensitive' } } },
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  });
  res.json(doctors);
}));

router.get('/:slug/medications', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const { search } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isActive: true, category: { contains: 'medication', mode: 'insensitive' as const } };
  if (search && search.length >= 2) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { sku: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  const items = await prisma.inventoryItem.findMany({ where: where as Prisma.InventoryItemWhereInput, orderBy: { name: 'asc' }, take: 20 });
  res.json(items);
}));

router.post('/:slug/complete-screening', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), validate(completeScreeningSchema), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');

  if (!req.body.optometryAppointmentId) throw new NotFoundError('optometryAppointmentId is required');
  const result = await completeScreening(req.body.optometryAppointmentId, req.user!.id, {
    diagnosis: req.body.diagnosis,
    diagnosisIcd10: req.body.diagnosisIcd10,
    prescriptions: req.body.prescriptions,
    notes: req.body.notes,
    vitalSigns: req.body.vitalSigns,
    symptoms: req.body.symptoms,
    medications: req.body.medications,
    autorefraction: req.body.autorefraction,
  });

  res.status(201).json(result);
}));

router.get('/:slug/print-report/:recordId', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  if (!req.params.recordId) throw new NotFoundError('Record ID is required');
  const printData = await generatePrintData(req.params.recordId);
  res.json(printData);
}));

router.get('/:slug/screening-queue', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const screeningAppts = await prisma.appointment.findMany({
    where: {
      clinicId: clinic.id,
      status: 'WAITING',
      targetClinicId: { not: null },
      createdAt: { gte: today },
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true, phone: true, gender: true, dateOfBirth: true, chronicConditions: true, diabetesType: true } },
      targetClinic: { select: { id: true, name: true, nameAr: true, slug: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json(screeningAppts);
}));

router.get('/:slug/history', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');

  const { q, from, to, page: pageStr, limit: limitStr } = req.query as Record<string, string>;
  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10) || 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    clinicId: clinic.id,
    status: { in: ['COMPLETED', 'NO_SHOW', 'CANCELLED'] },
  };

  if (q && q.length >= 2) {
    where.patient = {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' as const } },
        { mrn: { contains: q, mode: 'insensitive' as const } },
      ],
    };
  }

  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to);
    where.updatedAt = dateFilter;
  }

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where: where as Prisma.AppointmentWhereInput,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true, gender: true, dateOfBirth: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.appointment.count({ where: where as Prisma.AppointmentWhereInput }),
  ]);

  const apptPatientIds = [...new Set(appointments.map(a => a.patientId))];
  const clinicalRecords = apptPatientIds.length > 0
    ? await prisma.clinicalRecord.findMany({
        where: { patientId: { in: apptPatientIds }, clinicId: clinic.id },
        select: { id: true, patientId: true, diagnosis: true, prescriptions: true, notes: true, encounterDate: true },
        orderBy: { encounterDate: 'desc' },
      })
    : [];
  const recordMap = new Map<string, typeof clinicalRecords[0]>();
  for (const r of clinicalRecords) {
    if (!recordMap.has(r.patientId)) recordMap.set(r.patientId, r);
  }

  const enriched = appointments.map(a => ({
    ...a,
    clinicalRecord: recordMap.get(a.patientId) || null,
  }));

  res.json({
    data: enriched,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}));

router.get('/:slug/upcoming-follow-ups', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');
  const followUps = await prisma.appointment.findMany({
    where: {
      clinicId: clinic.id,
      status: 'RESERVED',
      visitType: 'FOLLOW_UP',
      scheduledAt: { gte: new Date() },
    },
    include: { patient: { select: { id: true, fullName: true, mrn: true, phone: true } } },
    orderBy: { scheduledAt: 'asc' },
    take: 50,
  });
  res.json(followUps);
}));

router.post('/:slug/schedule-follow-up', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), validate(scheduleFollowUpSchema), asyncHandler(async (req, res) => {
  const clinic = await prisma.clinic.findUnique({ where: { slug: req.params.slug } });
  if (!clinic) throw new NotFoundError('Clinic not found');
  const { patientId, scheduledDate, notes } = req.body;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');
  const token = await nextToken(clinic.id);
  const appointment = await prisma.appointment.create({
    data: {
      token,
      type: 'RESERVATION',
      status: 'RESERVED',
      visitType: 'FOLLOW_UP',
      scheduledAt: new Date(scheduledDate),
      notes: notes || null,
      patientId,
      clinicId: clinic.id,
      doctorId: req.user!.id,
    },
    include: { patient: { select: { fullName: true, mrn: true } }, clinic: { select: { name: true } } },
  });
  res.status(201).json(appointment);
}));

export default router;

