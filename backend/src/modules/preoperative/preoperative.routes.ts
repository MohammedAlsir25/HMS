import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { auditMiddleware } from '../../middleware/auditLog.js';

const router = Router();
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma.js';

const REQUEST_INCLUDE = {
  patient: { select: { id: true, fullName: true, mrn: true, phone: true, dateOfBirth: true } },
  department: { select: { id: true, name: true, slug: true } },
  operationType: { select: { id: true, name: true, nameAr: true, price: true } },
  waiver: true,
  surgery: { select: { id: true, orRoom: true, startTime: true, status: true } },
} as const;

router.get('/', authenticate, requirePermission(PERMISSIONS.PREOP_READ), asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, status, patientId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (departmentId) where.departmentId = departmentId;
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;

  const requests = await prisma.preoperativeRequest.findMany({
    where,
    include: REQUEST_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.PREOP_READ), asyncHandler(async (req: Request, res: Response) => {
  const request = await prisma.preoperativeRequest.findUnique({
    where: { id: req.params.id },
    include: REQUEST_INCLUDE,
  });
  if (!request) throw new ValidationError('Preoperative request not found');
  res.json(request);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { departmentId, patientId, operationTypeId, notes } = req.body as Record<string, string>;
  if (!departmentId || !patientId || !operationTypeId) {
    throw new ValidationError('departmentId, patientId, operationTypeId are required');
  }
  const request = await prisma.preoperativeRequest.create({
    data: {
      departmentId,
      patientId,
      requestedById: req.user!.id,
      operationTypeId,
      notes: notes || null,
    },
    include: REQUEST_INCLUDE,
  });
  res.status(201).json(request);
}));

router.patch('/:id/confirm', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.preoperativeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ValidationError('Request not found');
  if (existing.status !== 'REQUESTED') throw new ValidationError('Can only confirm REQUESTED requests');

  const request = await prisma.preoperativeRequest.update({
    where: { id: req.params.id },
    data: { status: 'CONFIRMED', confirmedById: req.user!.id, confirmedAt: new Date() },
    include: REQUEST_INCLUDE,
  });
  res.json(request);
}));

router.patch('/:id/waiver', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { signedBy, relationship, witnessedById } = req.body as Record<string, string>;
  if (!signedBy || !relationship) {
    throw new ValidationError('signedBy and relationship are required');
  }
  const validRelationships = ['SELF', 'PARENT', 'GUARDIAN'] as const;
  if (!validRelationships.includes(relationship as typeof validRelationships[number])) {
    throw new ValidationError('relationship must be SELF, PARENT, or GUARDIAN');
  }

  const existing = await prisma.preoperativeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ValidationError('Request not found');

  const waiver = await prisma.consentWaiver.create({
    data: {
      preoperativeRequestId: req.params.id!,
      signedBy,
      relationship: relationship as 'SELF' | 'PARENT' | 'GUARDIAN',
      signedAt: new Date(),
      witnessedById: witnessedById || null,
    },
  });

  const request = await prisma.preoperativeRequest.update({
    where: { id: req.params.id },
    data: { status: existing.status === 'REQUESTED' ? 'CONFIRMED' : existing.status },
    include: REQUEST_INCLUDE,
  });
  res.status(201).json({ waiver, request });
}));

router.patch('/:id/pay', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), auditMiddleware('PREOP_PAYMENT', 'PreoperativeRequest'), asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.preoperativeRequest.findUnique({
    where: { id: req.params.id },
    include: { operationType: { select: { id: true, name: true, price: true } } },
  });
  if (!existing) throw new ValidationError('Request not found');
  if (existing.status === 'PAYMENT_DONE') throw new ValidationError('Payment already recorded');

  const request = await prisma.preoperativeRequest.update({
    where: { id: req.params.id },
    data: { status: 'PAYMENT_DONE', paidAt: new Date(), paidById: req.user!.id },
    include: REQUEST_INCLUDE,
  });

  // Record payment as PREOP transaction
  const opPrice = existing.operationType?.price;
  if (opPrice && Number(opPrice) > 0) {
    let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
    if (!shift) shift = await prisma.shift.create({ data: { userId: req.user!.id } });
    await prisma.transaction.create({
      data: {
        type: 'PREOP',
        amount: Number(opPrice),
        paymentMethod: 'CASH',
        description: `Preoperative payment for ${existing.operationType?.name || 'procedure'}`,
        shiftId: shift.id,
        cashierId: req.user!.id,
        patientId: existing.patientId,
        departmentId: existing.departmentId || undefined,
      },
    });
  }

  res.json(request);
}));

router.patch('/:id/lab-done', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { diagnosticOrderId } = req.body as Record<string, string>;
  const existing = await prisma.preoperativeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ValidationError('Request not found');

  const request = await prisma.preoperativeRequest.update({
    where: { id: req.params.id },
    data: {
      labOrderId: diagnosticOrderId || null,
      status: existing.status === 'PAYMENT_DONE' ? 'INVESTIGATIONS_DONE' : existing.status,
    },
    include: REQUEST_INCLUDE,
  });
  res.json(request);
}));

router.patch('/:id/imaging-done', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { aScanOrderId, bScanOrderId } = req.body as Record<string, string>;
  const existing = await prisma.preoperativeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ValidationError('Request not found');

  const request = await prisma.preoperativeRequest.update({
    where: { id: req.params.id },
    data: {
      aScanOrderId: aScanOrderId || null,
      bScanOrderId: bScanOrderId || null,
      status: existing.status === 'PAYMENT_DONE' ? 'INVESTIGATIONS_DONE' : existing.status,
    },
    include: REQUEST_INCLUDE,
  });
  res.json(request);
}));

router.patch('/:id/schedule', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { scheduledDate, scheduledTime, orRoom, endTime } = req.body as Record<string, string>;
  if (!scheduledDate || !orRoom || !endTime) {
    throw new ValidationError('scheduledDate, orRoom, endTime are required');
  }

  const existing = await prisma.preoperativeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ValidationError('Request not found');
  if (existing.status === 'CANCELLED') throw new ValidationError('Cannot schedule a cancelled request');

  const startDate = new Date(scheduledDate);
  const endDate = new Date(endTime);

  const [surgery, request] = await prisma.$transaction([
    prisma.surgery.create({
      data: {
        patientId: existing.patientId,
        departmentId: existing.departmentId,
        operationTypeId: existing.operationTypeId,
        preoperativeRequestId: existing.id,
        orRoom: parseInt(orRoom, 10),
        startTime: startDate,
        endTime: endDate,
      },
      include: { patient: { select: { fullName: true, mrn: true } } },
    }),
    prisma.preoperativeRequest.update({
      where: { id: req.params.id },
      data: {
        status: 'SCHEDULED',
        scheduledDate: startDate,
        scheduledTime: scheduledTime || null,
        scheduledById: req.user!.id,
      },
      include: REQUEST_INCLUDE,
    }),
  ]);

  res.json({ surgery, request });
}));

router.patch('/:id/cancel', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { cancelledReason } = req.body as Record<string, string>;
  if (!cancelledReason || !cancelledReason.trim()) {
    throw new ValidationError('cancelledReason is required');
  }

  const existing = await prisma.preoperativeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ValidationError('Request not found');
  if (existing.status === 'CANCELLED') throw new ValidationError('Already cancelled');

  const request = await prisma.preoperativeRequest.update({
    where: { id: req.params.id },
    data: {
      status: 'CANCELLED',
      cancelledReason: cancelledReason.trim(),
      cancelledById: req.user!.id,
      cancelledAt: new Date(),
    },
    include: REQUEST_INCLUDE,
  });
  res.json(request);
}));

router.get('/patients', authenticate, requirePermission(PERMISSIONS.PREOP_READ), asyncHandler(async (_req: Request, res: Response) => {
  const requests = await prisma.preoperativeRequest.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true, phone: true, dateOfBirth: true } },
      department: { select: { id: true, name: true } },
      operationType: { select: { id: true, name: true } },
      surgery: { select: { id: true, orRoom: true, startTime: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
}));

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.PREOP_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const validStatuses = ['REQUESTED', 'CONFIRMED', 'PAYMENT_DONE', 'INVESTIGATIONS_DONE', 'SCHEDULED', 'CANCELLED', 'WAITING', 'IN_PROGRESS', 'CLEARED', 'FLAGGED'];
  const { status, flaggedReason, referredTo } = req.body as Record<string, string>;
  if (!status || !validStatuses.includes(status)) throw new ValidationError('Valid status required');

  const existing = await prisma.preoperativeRequest.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new ValidationError('Request not found');

  const data: Record<string, unknown> = { status };
  if (status === 'CONFIRMED') { data.confirmedById = req.user!.id; data.confirmedAt = new Date(); }
  if (status === 'CANCELLED') { data.cancelledById = req.user!.id; data.cancelledAt = new Date(); }
  if (flaggedReason !== undefined) data.flaggedReason = flaggedReason;
  if (referredTo !== undefined) data.referredTo = referredTo;

  const request = await prisma.preoperativeRequest.update({
    where: { id: req.params.id },
    data,
    include: REQUEST_INCLUDE,
  });
  res.json(request);
}));

router.get('/stats', authenticate, requirePermission(PERMISSIONS.PREOP_READ), asyncHandler(async (_req: Request, res: Response) => {
  const [byStatus, total] = await Promise.all([
    prisma.preoperativeRequest.groupBy({ by: ['status'], _count: true }),
    prisma.preoperativeRequest.count(),
  ]);
  const stats: Record<string, number> = { total };
  byStatus.forEach((s) => { stats[s.status] = s._count; });
  res.json(stats);
}));

router.get('/operation-types', authenticate, requirePermission(PERMISSIONS.PREOP_READ), asyncHandler(async (req: Request, res: Response) => {
  const { departmentId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { isActive: true, is_deleted: false };
  if (departmentId) where.departmentId = departmentId;
  const types = await prisma.operationType.findMany({ where, orderBy: { name: 'asc' } });
  res.json(types);
}));

router.post('/operation-types', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (req: Request, res: Response) => {
  const { name, nameAr, departmentId } = req.body as Record<string, string>;
  if (!name || !departmentId) throw new ValidationError('name and departmentId are required');
  const type = await prisma.operationType.create({ data: { name, nameAr: nameAr || null, departmentId } });
  res.status(201).json(type);
}));

router.patch('/operation-types/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (req: Request, res: Response) => {
  const { name, nameAr, isActive } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (nameAr !== undefined) data.nameAr = nameAr;
  if (isActive !== undefined) data.isActive = isActive;
  const type = await prisma.operationType.update({ where: { id: req.params.id }, data: data as Prisma.OperationTypeUpdateInput });
  res.json(type);
}));

router.delete('/operation-types/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (req: Request, res: Response) => {
  await prisma.operationType.update({ where: { id: req.params.id }, data: { is_deleted: true } });
  res.json({ success: true });
}));

export default router;
