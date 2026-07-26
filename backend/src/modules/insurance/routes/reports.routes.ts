import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/claims-by-company', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { hospitalId };
  if (startDate || endDate) {
    where.created_at = {} as Record<string, unknown>;
    if (startDate) (where.created_at as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.created_at as Record<string, unknown>).lte = end;
    }
  }

  const claims = await prisma.insuranceClaim.findMany({
    where,
    select: {
      insuranceCompanyId: true,
      claimAmount: true,
      approvedAmount: true,
      paidAmount: true,
      status: true,
    },
  });

  const companyMap = new Map<string, {
    totalClaims: number;
    totalClaimAmount: number;
    totalApprovedAmount: number;
    totalPaidAmount: number;
    settled: number;
    rejected: number;
  }>();

  for (const claim of claims) {
    const cid = claim.insuranceCompanyId;
    if (!companyMap.has(cid)) {
      companyMap.set(cid, { totalClaims: 0, totalClaimAmount: 0, totalApprovedAmount: 0, totalPaidAmount: 0, settled: 0, rejected: 0 });
    }
    const entry = companyMap.get(cid)!;
    entry.totalClaims++;
    entry.totalClaimAmount += Number(claim.claimAmount);
    entry.totalApprovedAmount += claim.approvedAmount ? Number(claim.approvedAmount) : 0;
    entry.totalPaidAmount += Number(claim.paidAmount);
    if (claim.status === 'SETTLED') entry.settled++;
    if (claim.status === 'REJECTED') entry.rejected++;
  }

  const companyIds = [...companyMap.keys()];
  const companies = companyIds.length > 0
    ? await prisma.insuranceCompany.findMany({ where: { id: { in: companyIds }, hospitalId }, select: { id: true, name: true } })
    : [];
  const companyNames = new Map(companies.map((c: { id: string; name: string }) => [c.id, c.name]));

  const result = [...companyMap.entries()].map(([companyId, stats]) => ({
    companyId,
    companyName: companyNames.get(companyId) || 'Unknown',
    ...stats,
    rejectionRate: stats.totalClaims > 0 ? Math.round((stats.rejected / stats.totalClaims) * 10000) / 100 : 0,
  }));

  result.sort((a, b) => b.totalClaimAmount - a.totalClaimAmount);

  res.json(result);
}));

router.get('/settlement-rate', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { hospitalId, status: { not: 'DRAFT' } };
  if (startDate || endDate) {
    where.created_at = {} as Record<string, unknown>;
    if (startDate) (where.created_at as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.created_at as Record<string, unknown>).lte = end;
    }
  }

  const [totalSubmitted, settledClaims, aggregated] = await Promise.all([
    prisma.insuranceClaim.count({ where }),
    prisma.insuranceClaim.findMany({
      where: { ...where, status: 'SETTLED', submittedAt: { not: null }, settledAt: { not: null } },
      select: { submittedAt: true, settledAt: true },
    }),
    prisma.insuranceClaim.aggregate({
      where,
      _sum: { claimAmount: true, approvedAmount: true, paidAmount: true },
    }),
  ]);

  let totalDaysToSettle = 0;
  for (const sc of settledClaims) {
    const days = Math.floor((new Date(sc.settledAt!).getTime() - new Date(sc.submittedAt!).getTime()) / (1000 * 60 * 60 * 24));
    totalDaysToSettle += days;
  }

  const settlementRate = totalSubmitted > 0 ? Math.round((settledClaims.length / totalSubmitted) * 10000) / 100 : 0;
  const avgProcessingDays = settledClaims.length > 0 ? Math.round(totalDaysToSettle / settledClaims.length) : 0;

  res.json({
    totalSubmitted,
    totalSettled: settledClaims.length,
    settlementRate,
    avgProcessingDays,
    totalClaimed: Number(aggregated._sum.claimAmount) || 0,
    totalApproved: Number(aggregated._sum.approvedAmount) || 0,
    totalPaid: Number(aggregated._sum.paidAmount) || 0,
  });
}));

router.get('/revenue-by-insurance', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { hospitalId };
  if (startDate || endDate) {
    where.createdAt = {} as Record<string, unknown>;
    if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = end;
    }
  }

  const grouped = await prisma.transaction.groupBy({
    by: ['paymentMethod'],
    where,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalInsuranceSettled = await prisma.insuranceClaim.aggregate({
    where: { hospitalId, status: 'SETTLED' },
    _sum: { paidAmount: true },
  });

  res.json({
    byPaymentMethod: grouped.map((g) => ({
      paymentMethod: g.paymentMethod,
      totalAmount: Number(g._sum.amount) || 0,
      count: g._count.id,
    })),
    insuranceSettledTotal: Number(totalInsuranceSettled._sum.paidAmount) || 0,
  });
}));

router.get('/denial-analysis', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { startDate, endDate } = req.query as Record<string, string>;

  const where: Record<string, unknown> = { hospitalId, status: 'REJECTED' };
  if (startDate || endDate) {
    where.created_at = {} as Record<string, unknown>;
    if (startDate) (where.created_at as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.created_at as Record<string, unknown>).lte = end;
    }
  }

  const rejectedClaims = await prisma.insuranceClaim.findMany({
    where,
    select: { insuranceCompanyId: true, rejectionReason: true, claimAmount: true },
  });

  const reasonCounts: Record<string, number> = {};
  const companyDenials: Record<string, { rejected: number; total: number }> = {};

  for (const claim of rejectedClaims) {
    const reason = claim.rejectionReason || 'No reason provided';
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;

    const cid = claim.insuranceCompanyId;
    if (!companyDenials[cid]) companyDenials[cid] = { rejected: 0, total: 0 };
    companyDenials[cid].rejected++;
  }

  const allCompanyClaims = await prisma.insuranceClaim.groupBy({
    by: ['insuranceCompanyId'],
    where: { hospitalId, ...(startDate || endDate ? { created_at: where.created_at as Date | undefined } : {}) },
    _count: { id: true },
  });

  for (const cc of allCompanyClaims) {
    const cid = cc.insuranceCompanyId as string;
    if (!companyDenials[cid]) companyDenials[cid] = { rejected: 0, total: 0 };
    const entry = companyDenials[cid];
    if (entry) entry.total = cc._count.id;
  }

  const companyIds = Object.keys(companyDenials);
  const companies = companyIds.length > 0
    ? await prisma.insuranceCompany.findMany({ where: { id: { in: companyIds }, hospitalId }, select: { id: true, name: true } })
    : [];
  const companyNames = new Map(companies.map((c: { id: string; name: string }) => [c.id, c.name]));

  const topReasons = Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));

  const byCompany = Object.entries(companyDenials).map(([companyId, stats]) => ({
    companyId,
    companyName: companyNames.get(companyId) || 'Unknown',
    rejected: stats.rejected,
    total: stats.total,
    denialRate: stats.total > 0 ? Math.round((stats.rejected / stats.total) * 10000) / 100 : 0,
  }));

  res.json({ topReasons, byCompany });
}));

export default router;
