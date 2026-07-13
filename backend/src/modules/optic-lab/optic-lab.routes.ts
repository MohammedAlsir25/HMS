import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import prisma from '../../lib/prisma.js';
import { createLabJobSchema, updateLabJobStatusSchema } from './optic-lab.schema.js';

const router = Router();

function requireAnyPermission(...permissions: string[]) {
  return (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (!req.user?.permissions) {
      res.status(403).json({ message: 'No permissions found' });
      return;
    }
    const hasAny = permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasAny) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

async function generateJobNumber() {
  const today = new Date();
  const prefix = `LJ-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const count = await prisma.opticLabJob.count({
    where: { jobNumber: { startsWith: prefix } },
  });
  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
}

router.get('/jobs', authenticate, requireAnyPermission(PERMISSIONS.OPTIC_LAB_READ, PERMISSIONS.OPTICS_READ), asyncHandler(async (req, res) => {
  const { status } = req.query;
  const where = status ? { status: String(status) } : {};
  const jobs = await prisma.opticLabJob.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      transaction: { select: { id: true, amount: true, paymentMethod: true, createdAt: true } },
      completedBy: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
  res.json(jobs);
}));

router.get('/jobs/:id', authenticate, requireAnyPermission(PERMISSIONS.OPTIC_LAB_READ, PERMISSIONS.OPTICS_READ), asyncHandler(async (req, res) => {
  const job = await prisma.opticLabJob.findUnique({
    where: { id: req.params.id },
    include: {
      transaction: { select: { id: true, amount: true, paymentMethod: true, createdAt: true } },
      completedBy: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
  if (!job) throw new NotFoundError('Lab job not found');
  res.json(job);
}));

router.post('/jobs', authenticate, requireAnyPermission(PERMISSIONS.OPTIC_LAB_WRITE, PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const body = createLabJobSchema.parse(req.body);
  const transaction = await prisma.transaction.findUnique({ where: { id: body.transactionId } });
  if (!transaction) throw new NotFoundError('Transaction not found');
  const existing = await prisma.opticLabJob.findUnique({ where: { transactionId: body.transactionId } });
  if (existing) throw new ConflictError('Lab job already exists for this transaction');
  const jobNumber = await generateJobNumber();
  const job = await prisma.opticLabJob.create({
    data: {
      jobNumber,
      transactionId: body.transactionId,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      sphOD: body.sphOD,
      cylOD: body.cylOD,
      axisOD: body.axisOD,
      sphOS: body.sphOS,
      cylOS: body.cylOS,
      axisOS: body.axisOS,
      frameName: body.frameName,
      frameSku: body.frameSku,
      frameItemId: body.frameItemId,
      createdById: req.user!.id,
    },
  });
  res.status(201).json(job);
}));

router.put('/jobs/:id/status', authenticate, requireAnyPermission(PERMISSIONS.OPTIC_LAB_WRITE, PERMISSIONS.OPTICS_WRITE), asyncHandler(async (req, res) => {
  const { status } = updateLabJobStatusSchema.parse(req.body);
  const job = await prisma.opticLabJob.findUnique({ where: { id: req.params.id } });
  if (!job) throw new NotFoundError('Lab job not found');
  const validTransitions: Record<string, string> = { NEW: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED' };
  if (validTransitions[job.status] !== status) {
    throw new ValidationError(`Invalid transition: ${job.status} → ${status}`);
  }
  const data = { status } as Record<string, unknown>;
  if (status === 'IN_PROGRESS') data.startedAt = new Date();
  if (status === 'COMPLETED') {
    data.completedAt = new Date();
    data.completedById = req.user!.id;
  }
  const updated = await prisma.opticLabJob.update({ where: { id: req.params.id }, data });
  if (status === 'COMPLETED') {
    const opticsUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { permissions: { array_contains: PERMISSIONS.OPTICS_READ } },
      },
    });
    await prisma.notification.createMany({
      data: opticsUsers.map((user) => ({
        userId: user.id,
        title: 'Glasses Ready',
        message: `Job ${job.jobNumber} — ${job.customerName || '—'} — glasses are ready`,
        actionUrl: '/optics?tab=lab',
      })),
    });
  }
  res.json(updated);
}));

router.get('/customers', authenticate, requireAnyPermission(PERMISSIONS.OPTIC_LAB_READ, PERMISSIONS.OPTICS_READ), asyncHandler(async (_req, res) => {
  const jobs = await prisma.opticLabJob.findMany({
    where: { customerName: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: {
      customerName: true,
      customerPhone: true,
      frameName: true,
      sphOD: true, cylOD: true, axisOD: true,
      sphOS: true, cylOS: true, axisOS: true,
      jobNumber: true,
      createdAt: true,
    },
  });
  const grouped = new Map<string, { customerPhone: string | null; jobCount: number; lastJobNumber: string; lastFrame: string | null; lastPrescription: string | null; lastPurchase: string }>();
  for (const j of jobs) {
    const key = j.customerName || 'Unknown';
    if (!grouped.has(key)) {
      const presc = [j.sphOD, j.cylOD, j.axisOD, j.sphOS, j.cylOS, j.axisOS].filter(Boolean).join(' / ') || null;
      grouped.set(key, { customerPhone: j.customerPhone, jobCount: 1, lastJobNumber: j.jobNumber, lastFrame: j.frameName, lastPrescription: presc, lastPurchase: j.createdAt.toISOString().slice(0, 10) });
    } else {
      const g = grouped.get(key)!;
      g.jobCount++;
    }
  }
  const result = Array.from(grouped.entries()).map(([customerName, data]) => ({ customerName, ...data }));
  res.json(result);
}));

router.get('/stats', authenticate, requireAnyPermission(PERMISSIONS.OPTIC_LAB_READ, PERMISSIONS.OPTICS_READ), asyncHandler(async (_req, res) => {
  const [newJobs, inProgress, completed] = await Promise.all([
    prisma.opticLabJob.count({ where: { status: 'NEW' } }),
    prisma.opticLabJob.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.opticLabJob.count({ where: { status: 'COMPLETED' } }),
  ]);
  res.json({ NEW: newJobs, IN_PROGRESS: inProgress, COMPLETED: completed });
}));

export default router;
