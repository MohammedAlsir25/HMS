import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { PERMISSIONS, DEFAULT_ROLES } from '../../middleware/rbac.js';

const router = Router();
import prisma from '../../lib/prisma.js';

router.get('/users', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), asyncHandler(async (_req, res) => {
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

router.post('/users', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), auditMiddleware('CREATE_USER', 'User'), asyncHandler(async (req, res) => {
  const { email, password, fullName, phone, roleId, clinicId } = req.body;
  if (!email || !password || !fullName || !roleId) {
    throw new ValidationError('Email, password, full name, and role are required');
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ConflictError('Email already in use');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, fullName, phone, roleId, ...(clinicId ? { clinicId } : {}) },
    select: { id: true, email: true, fullName: true, phone: true, roleId: true, clinicId: true },
  });
  res.status(201).json(user);
}));

router.patch('/users/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_USERS), auditMiddleware('UPDATE_USER', 'User'), asyncHandler(async (req, res) => {
  const { fullName, phone, roleId, clinicId, isActive } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { fullName, phone, roleId, clinicId, isActive },
    select: { id: true, email: true, fullName: true, phone: true, isActive: true, roleId: true, clinicId: true },
  });
  res.json(user);
}));

router.get('/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), asyncHandler(async (_req, res) => {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  });
  const rolesWithCount = roles.map((r) => ({ id: r.id, name: r.name, description: r.description, permissions: Array.isArray(r.permissions) ? r.permissions : [], userCount: (r as unknown as { _count: Record<string, number> })._count.users }));
  res.json(rolesWithCount);
}));

router.post('/roles', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), auditMiddleware('CREATE_ROLE', 'Role'), asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;
  if (!name) throw new ValidationError('Role name is required');
  const role = await prisma.role.create({ data: { name, description, permissions: permissions || [] } });
  res.status(201).json(role);
}));

router.patch('/roles/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), auditMiddleware('UPDATE_ROLE', 'Role'), asyncHandler(async (req, res) => {
  const { name, description, permissions } = req.body;
  const role = await prisma.role.update({
    where: { id: req.params.id },
    data: { name, description, permissions },
  });
  res.json(role);
}));

router.delete('/roles/:id', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), auditMiddleware('DELETE_ROLE', 'Role'), asyncHandler(async (req, res) => {
  const userCount = await prisma.user.count({ where: { roleId: req.params.id } });
  if (userCount > 0) throw new ValidationError('Cannot delete role assigned to users');
  await prisma.role.delete({ where: { id: req.params.id } });
  res.json({ message: 'Role deleted' });
}));

router.post('/roles/seed', authenticate, requirePermission(PERMISSIONS.ADMIN_RBAC), asyncHandler(async (_req, res) => {
  const existing = await prisma.role.findMany({
    where: { name: { in: Object.values(DEFAULT_ROLES).map((d) => d.name) } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((r) => r.name));
  const toCreate = Object.entries(DEFAULT_ROLES)
    .filter(([, def]) => !existingNames.has(def.name))
    .map(([, def]) => ({ name: def.name, permissions: def.permissions }));
  if (toCreate.length > 0) {
    await prisma.role.createMany({ data: toCreate, skipDuplicates: true });
  }
  const results = [
    ...toCreate.map((r) => ({ action: 'created', role: r.name })),
    ...existing.map((r) => ({ action: 'skipped', role: r.name })),
  ];
  res.json({ message: 'Roles seeded', results });
}));

router.get('/pricing/operation-types', authenticate, requirePermission(PERMISSIONS.PRICING_READ), asyncHandler(async (_req, res) => {
  const types = await prisma.operationType.findMany({
    where: { is_deleted: false },
    include: { department: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(types);
}));

router.patch('/pricing/operation-types/:id', authenticate, requirePermission(PERMISSIONS.PRICING_WRITE), asyncHandler(async (req, res) => {
  const { price } = req.body as Record<string, unknown>;
  const type = await prisma.operationType.update({
    where: { id: req.params.id },
    data: { price: price !== undefined && price !== null ? Number(price) : null },
  });
  res.json(type);
}));

router.get('/pricing/clinics', authenticate, requirePermission(PERMISSIONS.PRICING_READ), asyncHandler(async (_req, res) => {
  const clinics = await prisma.clinic.findMany({
    where: { is_deleted: false },
    select: { id: true, name: true, nameAr: true, consultationFee: true, followUpFee: true, isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(clinics);
}));

router.patch('/pricing/clinics/:id', authenticate, requirePermission(PERMISSIONS.PRICING_WRITE), asyncHandler(async (req, res) => {
  const { consultationFee, followUpFee } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (consultationFee !== undefined) data.consultationFee = consultationFee === null ? null : Number(consultationFee);
  if (followUpFee !== undefined) data.followUpFee = followUpFee === null ? null : Number(followUpFee);
  const clinic = await prisma.clinic.update({ where: { id: req.params.id }, data });
  res.json(clinic);
}));

router.get('/pricing/wards', authenticate, requirePermission(PERMISSIONS.PRICING_READ), asyncHandler(async (_req, res) => {
  const wards = await prisma.ward.findMany({
    where: { is_deleted: false },
    select: { id: true, name: true, nameAr: true, type: true, dailyRate: true, isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(wards);
}));

router.patch('/pricing/wards/:id', authenticate, requirePermission(PERMISSIONS.PRICING_WRITE), asyncHandler(async (req, res) => {
  const { dailyRate } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (dailyRate !== undefined) data.dailyRate = dailyRate === null ? null : Number(dailyRate);
  const ward = await prisma.ward.update({ where: { id: req.params.id }, data });
  res.json(ward);
}));

router.get('/pricing/imaging-procedure-types', authenticate, requirePermission(PERMISSIONS.PRICING_READ), asyncHandler(async (_req, res) => {
  const types = await prisma.imagingProcedureType.findMany({
    where: { is_deleted: false },
    orderBy: { name: 'asc' },
  });
  res.json(types);
}));

router.patch('/pricing/imaging-procedure-types/:id', authenticate, requirePermission(PERMISSIONS.PRICING_WRITE), asyncHandler(async (req, res) => {
  const { price } = req.body as Record<string, unknown>;
  const type = await prisma.imagingProcedureType.update({
    where: { id: req.params.id },
    data: { price: price !== undefined && price !== null ? Number(price) : null },
  });
  res.json(type);
}));

router.post('/pricing/imaging-procedure-types/seed', authenticate, requirePermission(PERMISSIONS.PRICING_WRITE), asyncHandler(async (_req, res) => {
  const scanTypes = ['A_SCAN', 'B_SCAN', 'OTT', 'BIOMETRY'] as const;
  type ScanType = typeof scanTypes[number];
  const names: Record<ScanType, { name: string; nameAr: string }> = {
    A_SCAN: { name: 'A-Scan', nameAr: 'أ-سكان' },
    B_SCAN: { name: 'B-Scan', nameAr: 'ب-سكان' },
    OTT: { name: 'Ocular Trauma Tomography', nameAr: 'تصوير صدمات العين' },
    BIOMETRY: { name: 'Biometry', nameAr: 'القياسات الحيوية' },
  };
  const results: string[] = [];
  const existingTypes = await prisma.imagingProcedureType.findMany({
    where: { scanType: { in: Array.from(scanTypes) } },
    select: { scanType: true },
  });
  const existingSet = new Set(existingTypes.map((t) => t.scanType));
  const toCreate = scanTypes
    .filter((st) => !existingSet.has(st))
    .map((st) => ({ scanType: st, name: names[st].name, nameAr: names[st].nameAr }));
  if (toCreate.length > 0) {
    await prisma.imagingProcedureType.createMany({ data: toCreate, skipDuplicates: true });
  }
  toCreate.forEach((t) => results.push(`Created: ${t.scanType}`));
  res.json({ message: 'Imaging procedure types seeded', results, count: results.length });
}));

export default router;

router.post('/log-error', asyncHandler(async (req, res) => {
  const { message, stack, userId, url, userAgent } = req.body;
  if (!message) return res.status(400).json({ message: 'message is required' });
  await prisma.crashLog.create({
    data: { message, stack, userId, url, userAgent },
  });
  res.json({ message: 'Logged' });
}));

