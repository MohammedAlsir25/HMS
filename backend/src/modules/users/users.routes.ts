import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { config } from '../../config/index.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (req, res) => {
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
}));

router.get('/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
  res.json(roles);
}));

router.put('/:id/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), asyncHandler(async (req, res) => {
  const { roleId, clinicId } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { roleId, clinicId },
    include: { role: true, clinic: true },
  });
  res.json({ id: updated.id, role: updated.role, clinic: updated.clinic });
}));

export default router;
