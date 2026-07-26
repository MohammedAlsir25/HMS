import { Router, Request, Response } from 'express';
import { Prisma, $Enums } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import prisma from '../../lib/prisma.js';

const router = Router();

router.get('/calendar',
  authenticate,
  requirePermission(PERMISSIONS.APPOINTMENT_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, clinicId, doctorId } = req.query as Record<string, string | undefined>;

    if (!startDate || !endDate) {
      throw new ValidationError('startDate and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid date strings');
    }

    const hospitalId = req.user!.hospitalId!;
    const where: Prisma.AppointmentWhereInput = {
      hospitalId,
      createdAt: { gte: start, lte: end },
    };

    if (clinicId) where.clinicId = clinicId;
    if (doctorId) where.doctorId = doctorId;

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        doctor: { select: { id: true, fullName: true } },
        clinic: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { token: 'asc' }],
    });

    res.json(appointments);
  })
);

router.get('/stats',
  authenticate,
  requirePermission(PERMISSIONS.APPOINTMENT_READ),
  asyncHandler(async (req: Request, res: Response) => {
    const hospitalId = req.user!.hospitalId!;
    const clinicId = req.query.clinicId as string | undefined;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const baseWhere: Prisma.AppointmentWhereInput = {
      hospitalId,
      createdAt: { gte: today, lt: tomorrow },
    };
    if (clinicId) baseWhere.clinicId = clinicId;

    const [statusGroup, typeGroup, total] = await Promise.all([
      prisma.appointment.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true,
      }),
      prisma.appointment.groupBy({
        by: ['type'],
        where: baseWhere,
        _count: true,
      }),
      prisma.appointment.count({ where: baseWhere }),
    ]);

    const statusCounts: Record<string, number> = {};
    for (const s of statusGroup) {
      statusCounts[s.status] = s._count;
    }

    const typeCounts: Record<string, number> = {};
    for (const t of typeGroup) {
      typeCounts[t.type] = t._count;
    }

    const inProgressToday = await prisma.appointment.findMany({
      where: { ...baseWhere, status: 'IN_PROGRESS' },
      select: { createdAt: true },
    });

    let avgWaitTimeMinutes = 0;
    if (inProgressToday.length > 0) {
      const now = Date.now();
      const totalMs = inProgressToday.reduce((sum, a) => sum + (now - a.createdAt.getTime()), 0);
      avgWaitTimeMinutes = Math.round(totalMs / inProgressToday.length / 60000);
    }

    const noShowRate = total > 0
      ? Math.round(((statusCounts['NO_SHOW'] ?? 0) / total) * 100)
      : 0;

    res.json({
      total,
      byStatus: statusCounts,
      byType: typeCounts,
      avgWaitTimeMinutes,
      noShowRate,
    });
  })
);

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body as Record<string, string>;
  const valid = ['WAITING', 'CALLED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];
  if (!valid.includes(status!)) throw new ValidationError('Invalid status');
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: status as $Enums.AppointmentStatus },
    include: { patient: { select: { fullName: true, mrn: true } as const } },
  });
  res.json(appointment);
}));

router.patch('/:id/priority', authenticate, requirePermission(PERMISSIONS.APPOINTMENT_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { priority } = req.body as Record<string, unknown>;
  if (typeof priority !== 'number' || priority < 0 || priority > 10) {
    throw new ValidationError('Priority must be a number 0–10');
  }
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { priority },
    include: { patient: { select: { fullName: true, mrn: true } as const } },
  });
  res.json(appointment);
}));

export default router;
