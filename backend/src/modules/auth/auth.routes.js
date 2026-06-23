import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { config } from '../../config/index.js';
import { authenticate } from '../../middleware/auth.js';
import { logAudit } from '../../utils/audit.js';

const router = Router();
const prisma = new PrismaClient();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.nodeEnv === 'development' ? 50 : 5,
  message: { message: 'Too many login attempts. Try again in 1 minute.' },
});

function generateTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role.name,
    clinicId: user.clinicId,
    clinicSlug: user.clinic?.slug || null,
    permissions: user.role.permissions,
  };
  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry });
  const refreshToken = jwt.sign({ id: user.id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
  });
  return { token, refreshToken };
}

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, clinic: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
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
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }
    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true, clinic: true },
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }
    const tokens = generateTokens(user);
    res.json(tokens);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true, clinic: true },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role.name,
      clinic: user.clinic ? { id: user.clinic.id, name: user.clinic.name, slug: user.clinic.slug, type: user.clinic.type } : null,
      permissions: user.role.permissions,
      avatarUrl: user.avatarUrl,
    });
  } catch (err) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
