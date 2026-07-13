import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_READ),
  asyncHandler(async (req, res) => {
    const { status, departmentId, q } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (q && (q as string).length >= 2) {
      where.OR = [
        { notes: { contains: q as string, mode: 'insensitive' as const } },
        { requestNumber: { contains: q as string, mode: 'insensitive' as const } },
        { requestedBy: { fullName: { contains: q as string, mode: 'insensitive' as const } } },
        { department: { name: { contains: q as string, mode: 'insensitive' as const } } },
      ];
    }

    const requisitions = await prisma.requisition.findMany({
      where,
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        department: true,
        items: { include: { item: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requisitions);
  }),
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_READ),
  asyncHandler(async (req, res) => {
    const requisition = await prisma.requisition.findUnique({
      where: { id: req.params.id },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
        department: true,
        items: { include: { item: true } },
      },
    });
    if (!requisition) {
      return res.status(404).json({ message: 'Requisition not found' });
    }
    res.json(requisition);
  }),
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const { departmentId, notes, items } = req.body;
    if (!departmentId || !items?.length) {
      throw new ValidationError('Department and items are required');
    }

    const requisition = await prisma.requisition.create({
      data: {
        status: 'DRAFT',
        departmentId,
        notes,
        requestedById: req.user!.id,
        items: {
          create: items.map((it: { description: string; quantity: number; itemId?: string; notes?: string }) => ({
            description: it.description,
            quantity: it.quantity,
            itemId: it.itemId || null,
            notes: it.notes,
          })),
        },
      },
      include: {
        items: { include: { item: true } },
        requestedBy: { select: { id: true, fullName: true } },
        department: true,
      },
    });
    res.status(201).json(requisition);
  }),
);

router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const { status, notes, items } = req.body;
    const existing = await prisma.requisition.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Requisition not found' });
    }
    if (existing.status !== 'DRAFT') {
      throw new ValidationError('Can only edit DRAFT requisitions');
    }

    if (items) {
      await prisma.requisitionItem.deleteMany({ where: { requisitionId: req.params.id } });
      await prisma.requisitionItem.createMany({
        data: items.map((it: { description: string; quantity: number; itemId?: string; notes?: string }) => ({
          description: it.description,
          quantity: it.quantity,
          itemId: it.itemId || null,
          notes: it.notes,
          requisitionId: req.params.id,
        })),
      });
    }

    const requisition = await prisma.requisition.update({
      where: { id: req.params.id },
      data: { status: status || existing.status, notes: notes !== undefined ? notes : existing.notes },
      include: {
        items: { include: { item: true } },
        requestedBy: { select: { id: true, fullName: true } },
        department: true,
      },
    });
    res.json(requisition);
  }),
);

router.delete(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.requisition.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Requisition not found' });
    }
    if (existing.status !== 'DRAFT') {
      throw new ValidationError('Can only delete DRAFT requisitions');
    }
    await prisma.requisition.delete({ where: { id: req.params.id } });
    res.json({ message: 'Requisition deleted' });
  }),
);

export default router;
