import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { auditMiddleware } from '../../middleware/auditLog.js';

const router = Router();
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma.js';

router.get('/wards', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { is_deleted: false };
  if (departmentId) where.departmentId = departmentId;
  const wards = await prisma.ward.findMany({
    where,
    include: { beds: { orderBy: { bedNumber: 'asc' } } },
    orderBy: { name: 'asc' },
  });
  res.json(wards);
}));

router.get('/wards/dashboard', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (_req: Request, res: Response) => {
  const allBeds = await prisma.bed.findMany({
    select: { status: true, wardId: true, assignedAt: true, dischargedAt: true },
  });

  const statusCounts: Record<string, number> = { OCCUPIED: 0, VACANT: 0, RESERVED: 0, MAINTENANCE: 0 };
  for (const bed of allBeds) {
    statusCounts[bed.status] = (statusCounts[bed.status] || 0) + 1;
  }

  const totalBeds = allBeds.length;
  const occupiedBeds = statusCounts.OCCUPIED || 0;
  const vacantBeds = statusCounts.VACANT || 0;
  const reservedBeds = statusCounts.RESERVED || 0;
  const maintenanceBeds = statusCounts.MAINTENANCE || 0;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let admissionsToday = 0;
  let dischargesToday = 0;
  for (const bed of allBeds) {
    if (bed.assignedAt && bed.assignedAt >= today && bed.assignedAt < tomorrow) admissionsToday++;
    if (bed.dischargedAt && bed.dischargedAt >= today && bed.dischargedAt < tomorrow) dischargesToday++;
  }

  const wards = await prisma.ward.findMany({
    where: { is_deleted: false },
    select: { id: true, name: true },
  });

  const wardBedMap = new Map<string, { name: string; total: number; occupied: number }>();
  for (const ward of wards) {
    wardBedMap.set(ward.id, { name: ward.name, total: 0, occupied: 0 });
  }
  for (const bed of allBeds) {
    const entry = wardBedMap.get(bed.wardId);
    if (entry) {
      entry.total++;
      if (bed.status === 'OCCUPIED') entry.occupied++;
    }
  }

  const byWard = Array.from(wardBedMap.entries()).map(([wardId, data]) => ({
    wardId,
    wardName: data.name,
    total: data.total,
    occupied: data.occupied,
    rate: data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
  }));

  res.json({ totalBeds, occupiedBeds, vacantBeds, reservedBeds, maintenanceBeds, occupancyRate, byWard, admissionsToday, dischargesToday });
}));

router.get('/wards/dashboard/trends', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req: Request, res: Response) => {
  const daysParam = parseInt(req.query.days as string, 10);
  const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 90) : 7;

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const allBeds = await prisma.bed.findMany({
    select: { assignedAt: true, dischargedAt: true, status: true },
  });

  const dateEntries: Array<{ date: string; admissions: number; discharges: number; occupiedCount: number }> = [];

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(startDate);
    dayStart.setDate(dayStart.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    let admissions = 0;
    let discharges = 0;
    for (const bed of allBeds) {
      if (bed.assignedAt && bed.assignedAt >= dayStart && bed.assignedAt < dayEnd) admissions++;
      if (bed.dischargedAt && bed.dischargedAt >= dayStart && bed.dischargedAt < dayEnd) discharges++;
    }

    const occupiedCount = allBeds.filter((bed) => {
      if (bed.status !== 'OCCUPIED') return false;
      const assigned = bed.assignedAt ? bed.assignedAt.getTime() : 0;
      const discharged = bed.dischargedAt ? bed.dischargedAt.getTime() : dayEnd.getTime();
      return assigned < dayEnd.getTime() && discharged > dayStart.getTime();
    }).length;

    const dateStr = dayStart.toISOString().split('T')[0]!;
    dateEntries.push({ date: dateStr, admissions, discharges, occupiedCount });
  }

  res.json({ trends: dateEntries });
}));

router.post('/wards', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { name, nameAr, departmentId, dailyRate } = req.body as Record<string, unknown>;
  if (!name) throw new ValidationError('name is required');
  const ward = await prisma.ward.create({
    data: {
      name: name as string,
      nameAr: (nameAr as string) || null,
      departmentId: (departmentId as string) || null,
      dailyRate: dailyRate !== undefined && dailyRate !== null ? Number(dailyRate) : null,
    },
  });
  res.status(201).json(ward);
}));

router.get('/wards/:wardId/patients', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req: Request, res: Response) => {
  const beds = await prisma.bed.findMany({
    where: { wardId: req.params.wardId, status: 'OCCUPIED' },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      vitals: { orderBy: { recordedAt: 'desc' }, take: 1, select: { recordedAt: true } },
      _count: { select: { vitals: true } },
    },
    orderBy: { bedNumber: 'asc' },
  });

  const patients = beds.map((bed) => ({
    bedId: bed.id,
    bedNumber: bed.bedNumber,
    patientId: bed.patientId,
    patientMrn: bed.patient?.mrn ?? null,
    patientName: bed.patient?.fullName ?? null,
    assignedAt: bed.assignedAt,
    lastVitalsAt: bed.vitals[0]?.recordedAt ?? null,
    vitalsCount: bed._count.vitals,
  }));

  res.json({ patients });
}));

router.patch('/wards/:id', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { name, nameAr, isActive, dailyRate } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (nameAr !== undefined) data.nameAr = nameAr;
  if (isActive !== undefined) data.isActive = isActive;
  if (dailyRate !== undefined) data.dailyRate = dailyRate === null ? null : Number(dailyRate);
  const ward = await prisma.ward.update({ where: { id: req.params.id }, data: data as Prisma.WardUpdateInput });
  res.json(ward);
}));

router.delete('/wards/:id', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  await prisma.ward.update({ where: { id: req.params.id }, data: { is_deleted: true } });
  res.json({ success: true });
}));

router.get('/beds', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req: Request, res: Response) => {
  const { wardId, status } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (wardId) where.wardId = wardId;
  if (status) where.status = status;
  const beds = await prisma.bed.findMany({
    where,
    include: {
      ward: { select: { id: true, name: true } },
      patient: { select: { id: true, fullName: true, mrn: true } },
    },
    orderBy: [{ wardId: 'asc' }, { bedNumber: 'asc' }],
  });
  res.json(beds);
}));

router.get('/beds/available', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req: Request, res: Response) => {
  const { wardId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { status: 'VACANT' };
  if (wardId) where.wardId = wardId;
  const beds = await prisma.bed.findMany({
    where,
    include: { ward: { select: { id: true, name: true } } },
    orderBy: [{ wardId: 'asc' }, { bedNumber: 'asc' }],
  });
  res.json(beds);
}));

router.post('/beds', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { bedNumber, wardId } = req.body as Record<string, string>;
  if (!bedNumber || !wardId) throw new ValidationError('bedNumber and wardId are required');
  const bed = await prisma.bed.create({ data: { bedNumber, wardId } });
  res.status(201).json(bed);
}));

router.patch('/beds/:id/assign', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { patientId, surgeryId, admissionDate } = req.body as Record<string, string>;
  if (!patientId) throw new ValidationError('patientId is required');

  const bed = await prisma.bed.findUnique({ where: { id: req.params.id } });
  if (!bed) throw new ValidationError('Bed not found');
  if (bed.status !== 'VACANT') throw new ValidationError('Bed is not vacant');

  let assignedAt = new Date();
  if (admissionDate) {
    const parsed = new Date(admissionDate);
    if (isNaN(parsed.getTime())) throw new ValidationError('Invalid admissionDate');
    const now = new Date();
    if (parsed.getTime() > now.getTime()) throw new ValidationError('admissionDate cannot be in the future');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (parsed.getTime() < thirtyDaysAgo.getTime()) throw new ValidationError('admissionDate cannot be more than 30 days in the past');
    assignedAt = parsed;
  }

  const updated = await prisma.bed.update({
    where: { id: req.params.id },
    data: {
      status: 'OCCUPIED',
      patientId,
      surgeryId: surgeryId || null,
      assignedAt,
    },
    include: {
      ward: { select: { id: true, name: true } },
      patient: { select: { id: true, fullName: true, mrn: true } },
    },
  });
  res.json(updated);
}));

router.patch('/beds/:id/discharge', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), auditMiddleware('WARD_DISCHARGE', 'Bed'), asyncHandler(async (req: Request, res: Response) => {
  const { paymentMethod, dischargeDate, dischargeNotes } = req.body as { paymentMethod?: string; dischargeDate?: string; dischargeNotes?: string };
  const validMethods = ['CASH', 'CARD', 'INSURANCE', 'BANK_TRANSFER'] as const;
  type PaymentMethodVal = (typeof validMethods)[number];
  const method: PaymentMethodVal = paymentMethod && validMethods.includes(paymentMethod as PaymentMethodVal) ? paymentMethod as PaymentMethodVal : 'CASH';

  const bed = await prisma.bed.findUnique({
    where: { id: req.params.id },
    include: { ward: true, patient: { select: { id: true, fullName: true } } },
  });
  if (!bed) throw new ValidationError('Bed not found');
  if (bed.status !== 'OCCUPIED') throw new ValidationError('Bed is not occupied');

  let dischargedAt = new Date();
  if (dischargeDate) {
    const parsed = new Date(dischargeDate);
    if (isNaN(parsed.getTime())) throw new ValidationError('Invalid dischargeDate');
    dischargedAt = parsed;
  }

  const discharged = await prisma.bed.update({
    where: { id: req.params.id },
    data: { status: 'VACANT', patientId: null, surgeryId: null, dischargedAt },
  });

  const ward = await prisma.ward.findUnique({ where: { id: bed.wardId } });
  if (ward?.dailyRate && bed.assignedAt) {
    const billingDate = dischargedAt.getTime();
    const days = Math.max(1, Math.ceil((billingDate - bed.assignedAt.getTime()) / (1000 * 60 * 60 * 24)));
    const amount = Number(ward.dailyRate) * days;
    let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
    if (!shift) {
      shift = await prisma.shift.create({ data: { userId: req.user!.id } });
    }
    await prisma.transaction.create({
      data: {
        type: 'WARD',
        amount,
        paymentMethod: method,
        description: `Ward stay: ${ward.name} - Bed ${bed.bedNumber} (${days} day${days > 1 ? 's' : ''})`,
        departmentId: ward.departmentId || undefined,
        shiftId: shift.id,
        cashierId: req.user!.id,
        patientId: bed.patientId || undefined,
        cogs: 0,
      },
    });
  }

  res.json({ ...discharged, dischargeNotes: dischargeNotes || null });
}));

router.patch('/beds/:id/reserve', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { patientId, surgeryId } = req.body as Record<string, string>;
  const bed = await prisma.bed.findUnique({ where: { id: req.params.id } });
  if (!bed) throw new ValidationError('Bed not found');
  if (bed.status !== 'VACANT') throw new ValidationError('Bed is not vacant');

  const updated = await prisma.bed.update({
    where: { id: req.params.id },
    data: {
      status: 'RESERVED',
      patientId: patientId || null,
      surgeryId: surgeryId || null,
    },
    include: {
      ward: { select: { id: true, name: true } },
      patient: { select: { id: true, fullName: true, mrn: true } },
    },
  });
  res.json(updated);
}));

router.post('/beds/:id/transfer', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { targetBedId } = req.body as Record<string, string>;
  if (!targetBedId) throw new ValidationError('targetBedId is required');

  const source = await prisma.bed.findUnique({ where: { id: req.params.id } });
  if (!source) throw new ValidationError('Source bed not found');
  if (source.status !== 'OCCUPIED') throw new ValidationError('Source bed is not occupied');

  const target = await prisma.bed.findUnique({ where: { id: targetBedId } });
  if (!target) throw new ValidationError('Target bed not found');
  if (target.status !== 'VACANT') throw new ValidationError('Target bed is not vacant');

  const [updatedTarget] = await prisma.$transaction([
    prisma.bed.update({
      where: { id: targetBedId },
      data: {
        status: 'OCCUPIED',
        patientId: source.patientId,
        surgeryId: source.surgeryId,
        assignedAt: source.assignedAt,
      },
      include: {
        ward: { select: { id: true, name: true } },
        patient: { select: { id: true, fullName: true, mrn: true } },
      },
    }),
    prisma.bed.update({
      where: { id: req.params.id },
      data: { status: 'VACANT', patientId: null, surgeryId: null, dischargedAt: new Date() },
    }),
  ]);
  res.json(updatedTarget);
}));

router.patch('/beds/:id/maintenance', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const bed = await prisma.bed.findUnique({ where: { id: req.params.id } });
  if (!bed) throw new ValidationError('Bed not found');
  if (bed.status !== 'VACANT' && bed.status !== 'MAINTENANCE') throw new ValidationError('Only vacant beds can be marked for maintenance');
  const newStatus = bed.status === 'MAINTENANCE' ? 'VACANT' : 'MAINTENANCE';
  const updated = await prisma.bed.update({
    where: { id: req.params.id },
    data: { status: newStatus },
  });
  res.json(updated);
}));

router.delete('/beds/:id', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  await prisma.bed.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

router.get('/beds/:id/vitals', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req: Request, res: Response) => {
  const vitals = await prisma.inpatientVital.findMany({
    where: { bedId: req.params.id },
    include: { recordedBy: { select: { id: true, fullName: true } } },
    orderBy: { recordedAt: 'desc' },
  });
  res.json(vitals);
}));

router.post('/beds/:id/vitals', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { temperature, heartRate, bloodPressureSystolic, bloodPressureDiastolic, respiratoryRate, oxygenSaturation, painScore, notes } = req.body as Record<string, unknown>;
  if (temperature === undefined && heartRate === undefined && bloodPressureSystolic === undefined) {
    throw new ValidationError('At least one vital sign is required');
  }
  const vital = await prisma.inpatientVital.create({
    data: {
      bedId: req.params.id!,
      temperature: temperature !== undefined && temperature !== null ? Number(temperature) : null,
      heartRate: heartRate !== undefined && heartRate !== null ? Number(heartRate) : null,
      bloodPressureSystolic: bloodPressureSystolic !== undefined && bloodPressureSystolic !== null ? Number(bloodPressureSystolic) : null,
      bloodPressureDiastolic: bloodPressureDiastolic !== undefined && bloodPressureDiastolic !== null ? Number(bloodPressureDiastolic) : null,
      respiratoryRate: respiratoryRate !== undefined && respiratoryRate !== null ? Number(respiratoryRate) : null,
      oxygenSaturation: oxygenSaturation !== undefined && oxygenSaturation !== null ? Number(oxygenSaturation) : null,
      painScore: painScore !== undefined && painScore !== null ? Number(painScore) : null,
      notes: (notes as string) || null,
      recordedById: req.user!.id,
    },
    include: { recordedBy: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(vital);
}));

router.get('/beds/:id/notes', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req: Request, res: Response) => {
  const notes = await prisma.nursingNote.findMany({
    where: { bedId: req.params.id },
    include: { createdBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notes);
}));

router.post('/beds/:id/notes', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { content } = req.body as Record<string, string>;
  if (!content || !content.trim()) throw new ValidationError('content is required');
  const note = await prisma.nursingNote.create({
    data: {
      bedId: req.params.id!,
      content: content.trim(),
      createdById: req.user!.id,
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(note);
}));

router.get('/rounds', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req: Request, res: Response) => {
  const { wardId, date } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (wardId) where.wardId = wardId;
  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.date = { gte: dayStart, lt: dayEnd };
  }
  const rounds = await prisma.wardRound.findMany({
    where,
    include: {
      doctor: { select: { id: true, fullName: true } },
      ward: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });
  res.json(rounds);
}));

router.post('/rounds', authenticate, requirePermission(PERMISSIONS.WARD_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { wardId, date, notes, plan } = req.body as Record<string, string>;
  if (!wardId || !date) throw new ValidationError('wardId and date are required');
  const round = await prisma.wardRound.create({
    data: {
      wardId,
      date: new Date(date),
      doctorId: req.user!.id,
      notes: notes || null,
      plan: plan || null,
    },
    include: {
      doctor: { select: { id: true, fullName: true } },
      ward: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(round);
}));

export default router;
