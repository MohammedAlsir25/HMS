import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../../config/index.js';
import { authenticate } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, refreshSchema } from '../../schemas/auth.schema.js';
import { ValidationError, UnauthorizedError } from '../../utils/errors.js';
import { logAudit } from '../../utils/audit.js';

const router = Router();
const prisma = new PrismaClient();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'development' ? 50 : 5,
  message: { message: 'Too many login attempts. Try again in 1 minute.' },
});

function generateTokens(user: any) {
  const payload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    role: user.role.name,
    clinicId: user.clinicId,
    clinicSlug: user.clinic?.slug || null,
    permissions: user.role.permissions,
  };
  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry as any });
  const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry as any,
  });
  return { token, refreshToken };
}

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true, clinic: true },
  });
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Invalid credentials');
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });
  const { token, refreshToken } = generateTokens(user);
  logAudit({
    userId: user.id,
    action: 'LOGIN',
    entity: 'user',
    entityId: user.id,
    details: { method: req.method, path: req.path, statusCode: 200 },
    ipAddress: req.ip,
  });
  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      clinic: user.clinic ? { id: user.clinic.id, name: user.clinic.name, slug: user.clinic.slug, type: user.clinic.type } : null,
      permissions: user.role.permissions,
      avatarUrl: user.avatarUrl,
    },
  });
}));

router.post('/refresh', validate(refreshSchema), asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string };
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    include: { role: true, clinic: true },
  });
  if (!user || !user.isActive) throw new UnauthorizedError('User not found or inactive');
  const tokens = generateTokens(user);
  res.json(tokens);
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { role: true, clinic: true },
  });
  if (!user) throw new UnauthorizedError('User not found');
  res.json({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role.name,
    clinic: user.clinic ? { id: user.clinic.id, name: user.clinic.name, slug: user.clinic.slug, type: user.clinic.type } : null,
    permissions: user.role.permissions,
    avatarUrl: user.avatarUrl,
  });
}));

export default router;
