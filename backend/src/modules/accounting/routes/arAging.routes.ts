import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

const BUCKET_RANGES = [
  { label: '0-30', min: 0, max: 30 },
  { label: '31-60', min: 31, max: 60 },
  { label: '61-90', min: 61, max: 90 },
  { label: '90+', min: 91, max: 99999 },
];

function getBucketLabel(daysOut: number): string {
  return BUCKET_RANGES.find(b => daysOut >= b.min && daysOut <= b.max)?.label ?? '90+';
}

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const patientId = req.query.patientId as string | undefined;
  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      paymentStatus: { not: 'PaidInFull' },
      voided: false,
      ...(patientId ? { patientId } : {}),
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
    },
  });

  const aging: Record<string, { patient: { id: string; fullName: string; mrn: string }; invoices: { id: string; invoiceNumber: string; total: number; amountPaid: number; balance: number; createdAt: Date; daysOutstanding: number }[]; totalBalance: number }[]> = {};
  for (const b of BUCKET_RANGES) {
    aging[b.label] = [];
  }

  const patientMap = new Map<string, { patient: { id: string; fullName: string; mrn: string }; invoices: { id: string; invoiceNumber: string; total: number; amountPaid: number; balance: number; createdAt: Date; daysOutstanding: number }[]; totalBalance: number }>();

  for (const inv of invoices) {
    const balance = Number(inv.total) - Number(inv.amountPaid);
    if (balance <= 0) continue;
    const daysOut = Math.floor((now.getTime() - new Date(inv.created_at ?? inv.id).getTime()) / 86400000);
    const bucketLabel = getBucketLabel(daysOut);
    const key = inv.patientId;

    if (!patientMap.has(key)) {
      patientMap.set(key, {
        patient: inv.patient,
        invoices: [],
        totalBalance: 0,
      });
    }
    const entry = patientMap.get(key)!;
    entry.invoices.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      total: Number(inv.total),
      amountPaid: Number(inv.amountPaid),
      balance,
      createdAt: inv.created_at ?? new Date(),
      daysOutstanding: daysOut,
    });
    entry.totalBalance += balance;

    aging[bucketLabel]!.push(entry);
  }

  for (const b of BUCKET_RANGES) {
    const seen = new Set<string>();
    aging[b.label] = aging[b.label]!.filter(entry => {
      if (seen.has(entry.patient.id)) return false;
      seen.add(entry.patient.id);
      return true;
    });
  }

  res.json(aging);
}));

router.get('/summary', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (_req, res) => {
  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: {
      paymentStatus: { not: 'PaidInFull' },
      voided: false,
    },
    select: {
      total: true,
      amountPaid: true,
      created_at: true,
    },
  });

  const totals: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  let totalAR = 0;
  let weightedDays = 0;

  for (const inv of invoices) {
    const balance = Number(inv.total) - Number(inv.amountPaid);
    if (balance <= 0) continue;
    const daysOut = Math.floor((now.getTime() - new Date(inv.created_at ?? new Date()).getTime()) / 86400000);
    const bucketLabel = getBucketLabel(daysOut);
    totals[bucketLabel]! += balance;
    totalAR += balance;
    weightedDays += daysOut * balance;
  }

  const dso = totalAR > 0 ? Math.round(weightedDays / totalAR) : 0;

  res.json({
    buckets: BUCKET_RANGES.map(b => ({ label: b.label, total: totals[b.label]! })),
    totalAR,
    dso,
    invoiceCount: invoices.filter(inv => Number(inv.total) - Number(inv.amountPaid) > 0).length,
  });
}));

router.get('/patient/:patientId', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const patientId = req.params.patientId!;
  const now = new Date();

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, fullName: true, mrn: true },
  });
  if (!patient) throw new NotFoundError('Patient not found');

  const invoices = await prisma.invoice.findMany({
    where: {
      patientId,
      paymentStatus: { not: 'PaidInFull' },
      voided: false,
    },
    orderBy: { created_at: 'asc' },
  });

  const buckets = BUCKET_RANGES.map(b => ({
    label: b.label,
    invoices: [] as { id: string; invoiceNumber: string; total: number; amountPaid: number; balance: number; daysOutstanding: number }[],
    total: 0,
  }));

  for (const inv of invoices) {
    const balance = Number(inv.total) - Number(inv.amountPaid);
    if (balance <= 0) continue;
    const daysOut = Math.floor((now.getTime() - new Date(inv.created_at ?? new Date()).getTime()) / 86400000);
    const bucketIdx = BUCKET_RANGES.findIndex(b => daysOut >= b.min && daysOut <= b.max);
    const idx = bucketIdx >= 0 ? bucketIdx : 3;
    buckets[idx]!.invoices.push({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      total: Number(inv.total),
      amountPaid: Number(inv.amountPaid),
      balance,
      daysOutstanding: daysOut,
    });
    buckets[idx]!.total += balance;
  }

  const totalBalance = buckets.reduce((sum, b) => sum + b.total, 0);

  res.json({ patient, buckets, totalBalance });
}));

export default router;
