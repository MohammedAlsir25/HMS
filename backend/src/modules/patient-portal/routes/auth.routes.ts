import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../../lib/prisma.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { signPatientToken } from '../utils/jwt.js';
import { UnauthorizedError, NotFoundError, ConflictError, ValidationError } from '../../../utils/errors.js';

const router = Router();

router.post('/register', asyncHandler(async (req, res) => {
  const { mrn, phone, email, password } = req.body as { mrn?: string; phone?: string; email?: string; password?: string };
  if (!mrn || !phone || !email || !password) {
    throw new ValidationError('mrn, phone, email, and password are required');
  }
  const patient = await prisma.patient.findFirst({
    where: { mrn, phone },
  });
  if (!patient) {
    throw new NotFoundError('Patient not found with this MRN and phone');
  }
  const existing = await prisma.patientUser.findFirst({
    where: { patientId: patient.id },
  });
  if (existing) {
    throw new ConflictError('Portal account already exists for this patient');
  }
  const emailTaken = await prisma.patientUser.findFirst({
    where: { email },
  });
  if (emailTaken) {
    throw new ConflictError('Email is already registered');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const patientUser = await prisma.patientUser.create({
    data: {
      patientId: patient.id,
      email,
      passwordHash,
      phone,
      phoneVerified: true,
      emailVerified: false,
      hospitalId: patient.hospitalId,
    },
  });
  const token = signPatientToken({
    id: patientUser.id,
    patientId: patient.id,
    email,
    hospitalId: patient.hospitalId ?? undefined,
  });
  res.status(201).json({
    token,
    patient: {
      id: patient.id,
      fullName: patient.fullName,
      mrn: patient.mrn,
      email,
      phone,
    },
  });
}));

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    throw new ValidationError('email and password are required');
  }
  const patientUser = await prisma.patientUser.findFirst({
    where: { email },
    include: { patient: true },
  });
  if (!patientUser) {
    throw new UnauthorizedError('Invalid credentials');
  }
  if (!patientUser.isActive) {
    throw new UnauthorizedError('Account is deactivated');
  }
  const valid = await bcrypt.compare(password, patientUser.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid credentials');
  }
  await prisma.patientUser.update({
    where: { id: patientUser.id },
    data: { lastLoginAt: new Date() },
  });
  const token = signPatientToken({
    id: patientUser.id,
    patientId: patientUser.patientId,
    email: patientUser.email,
    hospitalId: patientUser.hospitalId ?? undefined,
  });
  res.json({
    token,
    patient: {
      id: patientUser.patient.id,
      fullName: patientUser.patient.fullName,
      mrn: patientUser.patient.mrn,
      email: patientUser.email,
      phone: patientUser.phone,
    },
  });
}));

router.post('/verify-phone', asyncHandler(async (req, res) => {
  const { mrn, phone } = req.body as { mrn?: string; phone?: string };
  if (!mrn || !phone) {
    throw new ValidationError('mrn and phone are required');
  }
  const patient = await prisma.patient.findFirst({
    where: { mrn, phone },
  });
  if (!patient) {
    throw new NotFoundError('Patient not found with this MRN and phone');
  }
  res.json({ verified: true });
}));

router.post('/reset-password', asyncHandler(async (_req, res) => {
  res.json({ message: 'If an account exists, a reset link has been sent' });
}));

export default router;
