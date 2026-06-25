// @ts-nocheck
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { PERMISSIONS, DEFAULT_ROLES } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/users', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, phone: true, isActive: true, lastLogin: true, createdAt: true, role: true, clinic: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
}));

router.get('/users/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, email: true, fullName: true, phone: true, isActive: true, lastLogin: true, createdAt: true, roleId: true, clinicId: true, role: true, clinic: true },
  });
  if (!user) throw new NotFoundError('User not found');
  res.json(user);
}));

router.post('/users', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), auditMiddleware('CREATE_USER'), asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, roleId, clinicId } = req.body;
  if (!email || !password || !fullName || !roleId) {
    throw new ValidationError('Email, password, full name, and role are required');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already in use');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, phone, roleId, clinicId },
    select: { id: true, email: true, fullName: true, phone: true, roleId: true, clinicId: true },
  });
  res.status(201).json(user);
}));

router.patch('/users/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), auditMiddleware('UPDATE_USER'), asyncHandler(async (req, res) => {
  const { fullName, phone, roleId, clinicId, isActive } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { fullName, phone, roleId, clinicId, isActive },
    select: { id: true, email: true, fullName: true, phone: true, isActive: true, roleId: true, clinicId: true },
  });
  res.json(user);
}));

router.get('/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), asyncHandler(async (req, res) => {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  });
  const rolesWithCount = roles.map((r) => ({ ...r, userCount: r._count.users, _count: undefined }));
  res.json(rolesWithCount);
}));

router.post('/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), auditMiddleware('CREATE_ROLE'), asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) throw new ValidationError('Role name is required');
  const role = await prisma.role.create({ data: { name, description, permissions: permissions || [] } });
  res.status(201).json(role);
}));

router.patch('/roles/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), auditMiddleware('UPDATE_ROLE'), asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;
  const role = await prisma.role.update({
    where: { id: req.params.id },
    data: { name, description, permissions },
  });
  res.json(role);
}));

router.delete('/roles/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), auditMiddleware('DELETE_ROLE'), asyncHandler(async (req, res) => {
  const userCount = await prisma.user.count({ where: { roleId: req.params.id } });
  if (userCount > 0) throw new ValidationError('Cannot delete role assigned to users');
  await prisma.role.delete({ where: { id: req.params.id } });
  res.json({ message: 'Role deleted' });
}));

router.post('/roles/seed', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), asyncHandler(async (req, res) => {
  const results = [];
  for (const [key, def] of Object.entries(DEFAULT_ROLES)) {
    const existing = await prisma.role.findUnique({ where: { name: def.name } });
    if (!existing) {
      const role = await prisma.role.create({ data: { name: def.name, permissions: def.permissions } });
      results.push({ action: 'created', role: role.name });
    } else {
      results.push({ action: 'skipped', role: existing.name });
    }
  }
  res.json({ message: 'Roles seeded', results });
}));

export default router;
