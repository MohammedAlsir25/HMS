import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../../lib/prisma.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { authenticatePatient } from '../middleware/authenticatePatient.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../../utils/errors.js';

const router = Router();
router.use(authenticatePatient);

router.get('/profile', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const patient = await prisma.patient.findFirst({
    where: { id: patientId },
  });
  if (!patient) {
    throw new NotFoundError('Patient not found');
  }
  res.json({
    id: patient.id,
    fullName: patient.fullName,
    mrn: patient.mrn,
    email: patient.email,
    phone: patient.phone,
    dateOfBirth: patient.dateOfBirth?.toISOString() ?? null,
    gender: patient.gender,
    nationalId: patient.nationalId,
    address: patient.address,
    chronicConditions: patient.chronicConditions,
    createdAt: patient.createdAt.toISOString(),
  });
}));

router.patch('/profile', asyncHandler(async (req, res) => {
  const patientId = req.patient!.patientId;
  const { email, phone, address } = req.body as { email?: string; phone?: string; address?: string };
  const updateData: Record<string, unknown> = {};
  if (email !== undefined) updateData['email'] = email;
  if (phone !== undefined) updateData['phone'] = phone;
  if (address !== undefined) updateData['address'] = address;
  const patient = await prisma.patient.update({
    where: { id: patientId },
    data: updateData,
  });
  res.json({
    id: patient.id,
    fullName: patient.fullName,
    mrn: patient.mrn,
    email: patient.email,
    phone: patient.phone,
    address: patient.address,
    dateOfBirth: patient.dateOfBirth?.toISOString() ?? null,
    gender: patient.gender,
    nationalId: patient.nationalId,
    chronicConditions: patient.chronicConditions,
    createdAt: patient.createdAt.toISOString(),
  });
}));

router.post('/change-password', asyncHandler(async (req, res) => {
  const patientUserId = req.patient!.id;
  const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
  if (!currentPassword || !newPassword) {
    throw new ValidationError('currentPassword and newPassword are required');
  }
  const patientUser = await prisma.patientUser.findFirst({
    where: { id: patientUserId },
  });
  if (!patientUser) {
    throw new NotFoundError('User not found');
  }
  const valid = await bcrypt.compare(currentPassword, patientUser.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Current password is incorrect');
  }
  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.patientUser.update({
    where: { id: patientUserId },
    data: { passwordHash: newHash },
  });
  res.json({ message: 'Password changed successfully' });
}));

router.get('/notification-preferences', asyncHandler(async (req, res) => {
  const patientUserId = req.patient!.id;
  const preferences = await prisma.notificationPreference.findMany({
    where: { patientUserId },
    orderBy: [{ type: 'asc' }, { channel: 'asc' }],
  });
  const prefs: Record<string, boolean> = {
    appointmentReminders: false,
    labResultsReady: false,
    billing: false,
    prescription: false,
  };
  for (const pref of preferences) {
    if (pref.enabled) {
      prefs[pref.type.toLowerCase()] = true;
    }
  }
  const hasEmail = preferences.some((p) => p.channel === 'EMAIL' && p.enabled);
  const hasSms = preferences.some((p) => p.channel === 'SMS' && p.enabled);
  res.json({
    preferences: {
      ...prefs,
      emailEnabled: hasEmail,
      smsEnabled: hasSms,
    },
  });
}));

router.patch('/notification-preferences', asyncHandler(async (req, res) => {
  const patientUserId = req.patient!.id;
  const hospitalId = req.patient!.hospitalId;
  const body = req.body as Record<string, unknown>;
  const channels = ['EMAIL', 'SMS'];
  const booleanKeys = ['appointmentReminders', 'labResultsReady', 'billing', 'prescription'];
  const typeMap: Record<string, string> = {
    appointmentReminders: 'APPOINTMENT_REMINDER',
    labResultsReady: 'LAB_RESULT',
    billing: 'BILLING',
    prescription: 'PRESCRIPTION',
  };
  for (const key of booleanKeys) {
    if (key in body && typeof body[key] === 'boolean') {
      const type = typeMap[key]!;
      for (const channel of channels) {
        await prisma.notificationPreference.upsert({
          where: {
            patientUserId_type_channel: {
              patientUserId,
              type,
              channel,
            },
          },
          create: { patientUserId, type, channel, enabled: body[key] as boolean, hospitalId },
          update: { enabled: body[key] as boolean },
        });
      }
    }
  }
  const updated = await prisma.notificationPreference.findMany({
    where: { patientUserId },
  });
  const prefs: Record<string, boolean> = {
    appointmentReminders: false,
    labResultsReady: false,
    billing: false,
    prescription: false,
  };
  for (const pref of updated) {
    if (pref.enabled) {
      prefs[pref.type.toLowerCase()] = true;
    }
  }
  const hasEmail = updated.some((p) => p.channel === 'EMAIL' && p.enabled);
  const hasSms = updated.some((p) => p.channel === 'SMS' && p.enabled);
  res.json({
    preferences: {
      ...prefs,
      emailEnabled: hasEmail,
      smsEnabled: hasSms,
    },
  });
}));

export default router;
