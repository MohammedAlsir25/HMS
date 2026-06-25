import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { PERMISSIONS, DEFAULT_ROLES } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/users', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, phone: true, isActive: true, lastLogin: true, createdAt: true, role: true, clinic: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    console.error('User list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/users/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, email: true, fullName: true, phone: true, isActive: true, lastLogin: true, createdAt: true, roleId: true, clinicId: true, role: true, clinic: true },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('User detail error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/users', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), async (req, res) => {
  try {
    const { email, password, fullName, phone, roleId, clinicId } = req.body;
    if (!email || !password || !fullName || !roleId) {
      return res.status(400).json({ message: 'Email, password, full name, and role are required' });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, fullName, phone, roleId, clinicId },
      select: { id: true, email: true, fullName: true, phone: true, roleId: true, clinicId: true },
    });
    res.status(201).json(user);
  } catch (err) {
    console.error('User create error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/users/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), async (req, res) => {
  try {
    const { fullName, phone, roleId, clinicId, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { fullName, phone, roleId, clinicId, isActive },
      select: { id: true, email: true, fullName: true, phone: true, isActive: true, roleId: true, clinicId: true },
    });
    res.json(user);
  } catch (err) {
    console.error('User update error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: { _count: { select: { users: true } } },
      orderBy: { name: 'asc' },
    });
    const rolesWithCount = roles.map((r) => ({ ...r, userCount: r._count.users, _count: undefined }));
    res.json(rolesWithCount);
  } catch (err) {
    console.error('Role list error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ message: 'Role name is required' });
    const role = await prisma.role.create({ data: { name, description, permissions: permissions || [] } });
    res.status(201).json(role);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Role name already exists' });
    console.error('Role create error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/roles/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: { name, description, permissions },
    });
    res.json(role);
  } catch (err) {
    console.error('Role update error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/roles/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), async (req, res) => {
  try {
    const userCount = await prisma.user.count({ where: { roleId: req.params.id } });
    if (userCount > 0) return res.status(400).json({ message: 'Cannot delete role assigned to users' });
    await prisma.role.delete({ where: { id: req.params.id } });
    res.json({ message: 'Role deleted' });
  } catch (err) {
    console.error('Role delete error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/roles/seed', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Role seed error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
