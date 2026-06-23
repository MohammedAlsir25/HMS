import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res) => {
  try {
    const { type } = req.query;
    const where = { isActive: true };
    if (type) where.type = type;
    const departments = await prisma.department.findMany({
      where,
      include: { clinic: { select: { id: true, slug: true, name: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(departments);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: req.params.id },
      include: { clinic: { select: { id: true, slug: true, name: true } } },
    });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), async (req, res) => {
  try {
    const { name, nameAr, slug, type, clinicId } = req.body;
    if (!name || !slug || !type) {
      return res.status(400).json({ message: 'name, slug, and type are required' });
    }
    const department = await prisma.department.create({
      data: { name, nameAr, slug, type, clinicId: clinicId || null },
      include: { clinic: { select: { id: true, slug: true, name: true } } },
    });
    res.status(201).json(department);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Department with this slug already exists' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), async (req, res) => {
  try {
    const { name, nameAr, slug, type, isActive, clinicId } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (nameAr !== undefined) data.nameAr = nameAr;
    if (slug !== undefined) data.slug = slug;
    if (type !== undefined) data.type = type;
    if (isActive !== undefined) data.isActive = isActive;
    if (clinicId !== undefined) data.clinicId = clinicId || null;

    const department = await prisma.department.update({
      where: { id: req.params.id },
      data,
      include: { clinic: { select: { id: true, slug: true, name: true } } },
    });
    res.json(department);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'Department with this slug already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
