import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
import prisma from '../../lib/prisma.js';

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

  const queue = await prisma.appointment.findMany({
    where: {
      clinicId: clinic.id,
      status: { in: ['WAITING', 'CALLED', 'IN_PROGRESS'] },
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true, phone: true, gender: true, dateOfBirth: true, chronicConditions: true, diabetesType: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  res.json(queue);
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

export default router;

