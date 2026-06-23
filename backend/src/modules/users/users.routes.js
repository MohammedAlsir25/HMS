import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { config } from '../../config/index.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: { select: { id: true, name: true } }, clinic: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      role: u.role,
      clinic: u.clinic,
      isActive: u.isActive,
      lastLogin: u.lastLogin,
      createdAt: u.createdAt,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), async (req, res) => {
  try {
    const { roleId, clinicId } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { roleId, clinicId },
      include: { role: true, clinic: true },
    });
    res.json({ id: updated.id, role: updated.role, clinic: updated.clinic });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
