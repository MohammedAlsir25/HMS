import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { generateSurgeryPrintHtml } from './surgery.helpers.js';

const router = Router();
import prisma from '../../lib/prisma.js';

router.get('/', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const { date, orRoom, departmentId } = req.query as { date?: string; orRoom?: string; departmentId?: string };
  const where: Record<string, unknown> = {};
  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.startTime = { gte: dayStart, lt: dayEnd };
  }
  if (orRoom) where.orRoom = parseInt(orRoom, 10);
  if (departmentId) where.departmentId = departmentId;

  const surgeries = await prisma.surgery.findMany({
    where,
    include: { patient: { select: { fullName: true, mrn: true } } },
    orderBy: [{ orRoom: 'asc' }, { startTime: 'asc' }],
  });
  res.json(surgeries);
}));

router.get('/availability', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const { date } = req.query as { date?: string };
  if (!date) throw new ValidationError('date is required');

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const surgeries = await prisma.surgery.findMany({
    where: { startTime: { gte: dayStart, lt: dayEnd }, status: { not: 'CANCELLED' } },
    select: { orRoom: true, startTime: true, endTime: true, id: true },
    orderBy: [{ orRoom: 'asc' }, { startTime: 'asc' }],
  });

  const OR_ROOMS = Array.from({ length: 5 }, (_, i) => i + 1);
  const availability = OR_ROOMS.map((room) => {
    const booked = surgeries.filter((s) => s.orRoom === room);
    return { room, booked };
  });

  res.json(availability);
}));

router.get('/stats', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
  const where: Record<string, unknown> = {};
  if (startDate && endDate) {
    where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const [byStatus, total, todaySurgeries] = await Promise.all([
    prisma.surgery.groupBy({ by: ['status'], _count: true, where }),
    prisma.surgery.count({ where }),
    prisma.surgery.count({
      where: {
        startTime: {
          gte: new Date(new Date().toISOString().slice(0, 10)),
          lt: new Date(new Date(Date.now() + 86400000).toISOString().slice(0, 10)),
        },
      },
    }),
  ]);

  const stats: Record<string, number> = { total, today: todaySurgeries };
  byStatus.forEach((s) => { stats[s.status] = s._count; });
  res.json(stats);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { patientId, departmentId, orRoom, startTime, endTime, notes, operationTypeId, disposition, admittedWardId, anesthesiaType } = req.body as Record<string, unknown>;
  if (!patientId || !orRoom || !startTime || !endTime) {
    throw new ValidationError('patientId, orRoom, startTime, endTime are required');
  }

  let resolvedDepartmentId = departmentId as string | undefined;
  if (!resolvedDepartmentId) {
    const surgeryDept = await prisma.department.findFirst({ where: { slug: 'surgery-dept' } });
    resolvedDepartmentId = surgeryDept?.id;
    if (!resolvedDepartmentId) throw new ValidationError('departmentId is required (no default surgery department found)');
  }

  const validDispositions = ['PENDING', 'DISCHARGE_HOME', 'ADMIT_WARD'];
  const disp = disposition as string || 'PENDING';
  if (!validDispositions.includes(disp)) throw new ValidationError('Invalid disposition');

  const surgery = await prisma.surgery.create({
    data: {
      patientId: patientId as string,
      departmentId: resolvedDepartmentId,
      orRoom: parseInt(orRoom as string, 10),
      startTime: new Date(startTime as string),
      endTime: new Date(endTime as string),
      notes: (notes as string) || null,
      operationTypeId: (operationTypeId as string) || undefined,
      anesthesiaType: (anesthesiaType as string) || null,
      disposition: disp as 'PENDING' | 'DISCHARGE_HOME' | 'ADMIT_WARD',
      admittedWardId: (admittedWardId as string) || null,
    },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.status(201).json(surgery);
}));

router.get('/or-roles', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (_req, res) => {
  const roles = await prisma.oRRole.findMany({
    where: { isActive: true, is_deleted: false },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  res.json(roles);
}));

router.get('/event-types', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (_req, res) => {
  const types = await prisma.intraoperativeEventType.findMany({
    where: { isActive: true, is_deleted: false },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  res.json(types);
}));

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  type SurgeryStatus = 'SCHEDULED' | 'PREP' | 'IN_SURGERY' | 'RECOVERY' | 'COMPLETED' | 'CANCELLED';
  const { status } = req.body as { status?: SurgeryStatus };
  const valid: SurgeryStatus[] = ['SCHEDULED', 'PREP', 'IN_SURGERY', 'RECOVERY', 'COMPLETED', 'CANCELLED'];
  if (!status || !valid.includes(status)) throw new ValidationError('Invalid status');
  const surgery = await prisma.surgery.update({
    where: { id: req.params.id },
    data: { status },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(surgery);
}));

router.patch('/:id/disposition', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { disposition, admittedWardId } = req.body as Record<string, string>;
  const valid: string[] = ['PENDING', 'DISCHARGE_HOME', 'ADMIT_WARD'];
  if (!disposition || !valid.includes(disposition)) throw new ValidationError('Invalid disposition');

  const surgery = await prisma.surgery.update({
    where: { id: req.params.id },
    data: {
      disposition: disposition as 'PENDING' | 'DISCHARGE_HOME' | 'ADMIT_WARD',
      admittedWardId: disposition === 'ADMIT_WARD' ? (admittedWardId || null) : null,
    },
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(surgery);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { startTime, endTime, orRoom, notes } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (startTime) data.startTime = new Date(startTime as string);
  if (endTime) data.endTime = new Date(endTime as string);
  if (orRoom) data.orRoom = parseInt(orRoom as string, 10);
  if (notes !== undefined) data.notes = notes;
  const surgery = await prisma.surgery.update({
    where: { id: req.params.id },
    data,
    include: { patient: { select: { fullName: true, mrn: true } } },
  });
  res.json(surgery);
}));

router.patch('/:id/complete', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), auditMiddleware('COMPLETE_SURGERY', 'Surgery'), asyncHandler(async (req, res) => {
  const surgery = await prisma.surgery.findUnique({
    where: { id: req.params.id },
    include: { preoperativeRequest: true, operationType: true, patient: { select: { id: true } } },
  });
  if (!surgery) throw new ValidationError('Surgery not found');
  if (surgery.status !== 'RECOVERY') throw new ValidationError('Surgery must be in RECOVERY to complete');

  await prisma.surgery.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED' },
  });

  // Record surgery revenue if operation type has a price
  const opPrice = surgery.operationType?.price;
  if (opPrice && Number(opPrice) > 0) {
    let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
    if (!shift) shift = await prisma.shift.create({ data: { userId: req.user!.id } });
    await prisma.transaction.create({
      data: {
        type: 'SURGERY',
        amount: Number(opPrice),
        paymentMethod: 'CASH',
        description: `Surgery: ${surgery.operationType?.name || 'Procedure'} (OR ${surgery.orRoom})`,
        shiftId: shift.id,
        cashierId: req.user!.id,
        patientId: surgery.patientId,
        surgeryId: surgery.id,
        departmentId: surgery.departmentId,
      },
    });
  }

  res.json({ success: true });
}));

router.get('/:id/team', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const members = await prisma.surgeryTeamMember.findMany({
    where: { surgeryId: req.params.id },
    include: { role: { select: { id: true, name: true } }, user: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(members);
}));

router.post('/:id/team', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { userId, name, roleId } = req.body as Record<string, string>;
  if (!name || !roleId) throw new ValidationError('name and roleId are required');

  const member = await prisma.surgeryTeamMember.create({
    data: {
      surgeryId: req.params.id!,
      userId: userId || null,
      name,
      roleId,
    },
    include: { role: { select: { id: true, name: true } } },
  });
  res.status(201).json(member);
}));

router.delete('/:id/team/:memberId', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  await prisma.surgeryTeamMember.delete({ where: { id: req.params.memberId } });
  res.json({ success: true });
}));

router.get('/:id/events', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const events = await prisma.intraoperativeEvent.findMany({
    where: { surgeryId: req.params.id },
    include: { eventType: { select: { id: true, name: true } } },
    orderBy: { timestamp: 'asc' },
  });
  res.json(events);
}));

router.post('/:id/events', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { eventTypeId, description } = req.body as Record<string, string>;
  if (!eventTypeId) throw new ValidationError('eventTypeId is required');

  const event = await prisma.intraoperativeEvent.create({
    data: {
      surgeryId: req.params.id!,
      eventTypeId,
      description: description || null,
      performedById: req.user!.id,
    },
    include: { eventType: { select: { id: true, name: true } } },
  });
  res.status(201).json(event);
}));

router.get('/:id/notes', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const notes = await prisma.postoperativeNote.findMany({
    where: { surgeryId: req.params.id },
    include: { createdBy: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(notes);
}));

router.post('/:id/notes', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { content } = req.body as Record<string, string>;
  if (!content || !content.trim()) throw new ValidationError('content is required');

  const note = await prisma.postoperativeNote.create({
    data: {
      surgeryId: req.params.id!,
      content: content.trim(),
      createdById: req.user!.id,
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(note);
}));

router.get('/:id/discharge', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const summary = await prisma.dischargeSummary.findUnique({
    where: { surgeryId: req.params.id },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });
  res.json(summary);
}));

router.post('/:id/discharge', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { dischargeDate, dischargeNotes, medications, followUpInstructions } = req.body as Record<string, string>;
  if (!dischargeDate) throw new ValidationError('dischargeDate is required');

  const existing = await prisma.dischargeSummary.findUnique({ where: { surgeryId: req.params.id } });
  if (existing) throw new ValidationError('Discharge summary already exists for this surgery');

  const summary = await prisma.dischargeSummary.create({
    data: {
      surgeryId: req.params.id!,
      dischargeDate: new Date(dischargeDate),
      dischargeNotes: dischargeNotes || null,
      medications: medications || null,
      followUpInstructions: followUpInstructions || null,
      createdById: req.user!.id,
    },
    include: { createdBy: { select: { id: true, fullName: true } } },
  });
  res.status(201).json(summary);
}));

router.get('/:id/print', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const surgery = await prisma.surgery.findUnique({
    where: { id: req.params.id },
    include: {
      patient: { select: { fullName: true, mrn: true, phone: true, dateOfBirth: true, gender: true } },
      department: { select: { name: true, nameAr: true } },
      operationType: { select: { name: true } },
      preoperativeRequest: { include: { waiver: true } },
      teamMembers: { include: { role: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
      intraoperativeEvents: { include: { eventType: { select: { name: true } } }, orderBy: { timestamp: 'asc' } },
    },
  });
  if (!surgery) throw new ValidationError('Surgery not found');

  const htmlPrint = generateSurgeryPrintHtml(surgery);
  res.json({ htmlPrint });
}));

router.get('/:id/report', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const surgery = await prisma.surgery.findUnique({
    where: { id: req.params.id },
    include: {
      patient: { select: { fullName: true, mrn: true, phone: true, dateOfBirth: true, gender: true } },
      department: { select: { name: true, nameAr: true } },
      operationType: { select: { name: true } },
      preoperativeRequest: {
        include: {
          waiver: true,
        },
      },
      teamMembers: {
        include: { role: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      intraoperativeEvents: {
        include: { eventType: { select: { name: true } } },
        orderBy: { timestamp: 'asc' },
      },
      appointments: {
        where: { visitType: 'FOLLOW_UP' },
        select: { id: true, scheduledAt: true, status: true },
      },
    },
  });
  if (!surgery) throw new ValidationError('Surgery not found');
  res.json(surgery);
}));

router.post('/:id/follow-ups', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { scheduledAt, notes } = req.body as Record<string, string>;
  if (!scheduledAt) throw new ValidationError('scheduledAt is required');

  const surgery = await prisma.surgery.findUnique({ where: { id: req.params.id } });
  if (!surgery) throw new ValidationError('Surgery not found');

  const followUp = await prisma.postOpFollowUp.create({
    data: {
      surgeryId: req.params.id!,
      patientId: surgery.patientId,
      scheduledAt: new Date(scheduledAt),
      notes: notes || null,
      createdById: req.user!.id,
    },
    include: {
      patient: { select: { fullName: true, mrn: true } },
      surgery: { select: { id: true, orRoom: true } },
    },
  });
  res.status(201).json(followUp);
}));

router.get('/follow-ups', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const { date, status, patientId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.scheduledAt = { gte: dayStart, lt: dayEnd };
  }
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const followUps = await prisma.postOpFollowUp.findMany({
    where,
    include: {
      patient: { select: { fullName: true, mrn: true } },
      surgery: { select: { id: true, orRoom: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });
  res.json(followUps);
}));

router.patch('/follow-ups/:followUpId', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), asyncHandler(async (req, res) => {
  const { status, notes } = req.body as Record<string, string>;
  const valid: string[] = ['SCHEDULED', 'COMPLETED', 'MISSED'];
  if (status && !valid.includes(status)) throw new ValidationError('Invalid status');

  const data: Record<string, unknown> = {};
  if (status) {
    data.status = status;
    if (status === 'COMPLETED') data.completedAt = new Date();
  }
  if (notes !== undefined) data.notes = notes;

  const followUp = await prisma.postOpFollowUp.update({
    where: { id: req.params.followUpId },
    data,
    include: {
      patient: { select: { fullName: true, mrn: true } },
      surgery: { select: { id: true, orRoom: true } },
    },
  });
  res.json(followUp);
}));

export default router;

