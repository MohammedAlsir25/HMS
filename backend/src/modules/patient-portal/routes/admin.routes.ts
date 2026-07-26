import { Router } from 'express';
import prisma from '../../../lib/prisma.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { authenticate } from '../../../middleware/auth.js';
import { requirePermission } from '../../../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(requirePermission('admin:users'));

router.get('/settings', asyncHandler(async (_req, res) => {
  res.json({
    settings: {
      portalEnabled: true,
      selfBookingEnabled: true,
      onlinePaymentEnabled: true,
      medicalRecordsVisible: true,
      maxAdvanceBookingDays: 30,
      cancellationPolicyHours: 24,
    },
  });
}));

router.patch('/settings', asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const defaults: Record<string, unknown> = {
    portalEnabled: true,
    selfBookingEnabled: true,
    onlinePaymentEnabled: true,
    medicalRecordsVisible: true,
    maxAdvanceBookingDays: 30,
    cancellationPolicyHours: 24,
  };
  const settings = { ...defaults, ...body };
  res.json({ settings });
}));

router.get('/stats', asyncHandler(async (_req, res) => {
  const totalRegisteredPatients = await prisma.patientUser.count();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activePatientsLast30Days = await prisma.patientUser.count({
    where: { lastLoginAt: { gte: thirtyDaysAgo } },
  });
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const appointmentsBookedViaPortal = await prisma.appointment.count({
    where: {
      type: 'RESERVATION',
      createdAt: { gte: startOfMonth },
    },
  });
  const onlinePayments = await prisma.invoice.findMany({
    where: {
      paymentStatus: { in: ['PaidInFull', 'PartialPayment'] },
    },
    select: { amountPaid: true },
  });
  const totalOnlineRevenue = onlinePayments.reduce(
    (sum, inv) => sum + inv.amountPaid.toNumber(),
    0,
  );
  res.json({
    totalRegisteredPatients,
    activePatientsLast30Days,
    appointmentsBookedViaPortal,
    onlinePaymentsProcessed: onlinePayments.length,
    totalOnlineRevenue,
  });
}));

export default router;
