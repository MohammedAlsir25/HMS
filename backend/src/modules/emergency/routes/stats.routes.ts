import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/overview', authenticate, requirePermission(PERMISSIONS.EMERGENCY_READ), asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;

  const where: Record<string, unknown> = { hospitalId };
  if (startDate || endDate) {
    const triageTime: Record<string, Date> = {};
    if (startDate) triageTime.gte = new Date(startDate);
    if (endDate) triageTime.lte = new Date(endDate);
    where.triageTime = triageTime;
  }

  const triages = await prisma.triageAssessment.findMany({ where }) as Array<{ acuity: string; disposition: string | null; triageTime: Date; seenByDoctorAt: Date | null }>;

  const totalVisits = triages.length;

  const acuityMap: Record<string, number> = {};
  const dispositionMap: Record<string, number> = {};
  for (const t of triages) {
    acuityMap[t.acuity] = (acuityMap[t.acuity] || 0) + 1;
    const disp = t.disposition || 'PENDING';
    dispositionMap[disp] = (dispositionMap[disp] || 0) + 1;
  }

  const byAcuity = Object.entries(acuityMap).map(([acuity, count]) => ({ acuity, count }));
  const byDisposition = Object.entries(dispositionMap).map(([disposition, count]) => ({ disposition, count }));

  const now = Date.now();
  let totalWait = 0;
  for (const t of triages) {
    totalWait += Math.round((Math.min(now, new Date(t.seenByDoctorAt || now).getTime()) - new Date(t.triageTime).getTime()) / 60000);
  }
  const averageWaitMinutes = totalVisits > 0 ? Math.round(totalWait / totalVisits) : 0;

  const admitted = triages.filter(t => t.disposition === 'ADMITTED').length;
  const discharged = triages.filter(t => t.disposition === 'DISCHARGED').length;
  const admissionRate = totalVisits > 0 ? Math.round((admitted / totalVisits) * 100) : 0;
  const dischargeRate = totalVisits > 0 ? Math.round((discharged / totalVisits) * 100) : 0;

  res.json({
    totalPatients: totalVisits,
    byAcuity,
    byDisposition,
    averageWaitMinutes,
    admissionRate,
    dischargeRate,
  });
}));

router.get('/daily-trend', authenticate, requirePermission(PERMISSIONS.EMERGENCY_READ), asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as Record<string, string>;
  const hospitalId = req.user!.hospitalId!;

  const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate) : new Date();
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  const triages = await prisma.triageAssessment.findMany({
    where: { hospitalId, triageTime: { gte: start, lte: end } },
    select: { triageTime: true, acuity: true },
    orderBy: { triageTime: 'asc' },
  }) as Array<{ triageTime: Date; acuity: string }>;

  const dailyMap: Record<string, Record<string, number>> = {};
  const acuityLevels = ['RESUSCITATION', 'EMERGENT', 'URGENT', 'LESS_URGENT', 'NON_URGENT'];

  for (const t of triages) {
    const parts = new Date(t.triageTime).toISOString().split('T');
    const day = parts[0] || '';
    if (!dailyMap[day]) {
      const entry: Record<string, number> = { totalVisits: 0 };
      for (const a of acuityLevels) entry[a] = 0;
      dailyMap[day] = entry;
    }
    dailyMap[day].totalVisits = (dailyMap[day].totalVisits || 0) + 1;
    dailyMap[day][t.acuity] = (dailyMap[day][t.acuity] || 0) + 1;
  }

  const dailyTrend = Object.entries(dailyMap).map(([date, values]) => ({
    date,
    totalVisits: values.totalVisits,
    RESUSCITATION: values.RESUSCITATION || 0,
    EMERGENT: values.EMERGENT || 0,
    URGENT: values.URGENT || 0,
    LESS_URGENT: values.LESS_URGENT || 0,
    NON_URGENT: values.NON_URGENT || 0,
  }));

  res.json({ dailyTrend });
}));

export default router;
