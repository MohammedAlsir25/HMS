import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), async (req, res) => {
  try {
    const { date, orRoom } = req.query;
    const where = {};
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      where.startTime = { gte: dayStart, lt: dayEnd };
    }
    if (orRoom) where.orRoom = parseInt(orRoom, 10);

    const surgeries = await prisma.surgery.findMany({
      where,
      include: { patient: { select: { fullName: true, mrn: true } } },
      orderBy: [{ orRoom: 'asc' }, { startTime: 'asc' }],
    });
    res.json(surgeries);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), async (req, res) => {
  try {
    const { patientId, orRoom, startTime, endTime, notes } = req.body;
    if (!patientId || !orRoom || !startTime || !endTime) {
      return res.status(400).json({ message: 'patientId, orRoom, startTime, endTime are required' });
    }
    const surgery = await prisma.surgery.create({
      data: {
        patientId,
        orRoom: parseInt(orRoom, 10),
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        notes: notes || null,
      },
      include: { patient: { select: { fullName: true, mrn: true } } },
    });
    res.status(201).json(surgery);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id/status', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['SCHEDULED', 'PREP', 'IN_SURGERY', 'RECOVERY', 'COMPLETED', 'CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const surgery = await prisma.surgery.update({
      where: { id: req.params.id },
      data: { status },
      include: { patient: { select: { fullName: true, mrn: true } } },
    });
    res.json(surgery);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Surgery not found' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.SURGERY_WRITE), async (req, res) => {
  try {
    const { startTime, endTime, orRoom, notes } = req.body;
    const data = {};
    if (startTime) data.startTime = new Date(startTime);
    if (endTime) data.endTime = new Date(endTime);
    if (orRoom) data.orRoom = parseInt(orRoom, 10);
    if (notes !== undefined) data.notes = notes;
    const surgery = await prisma.surgery.update({
      where: { id: req.params.id },
      data,
      include: { patient: { select: { fullName: true, mrn: true } } },
    });
    res.json(surgery);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Surgery not found' });
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
