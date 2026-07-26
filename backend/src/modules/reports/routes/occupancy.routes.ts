import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { formatPercent } from '../utils/reportHelpers.js';

const router = Router();

router.get('/occupancy', authenticate, requirePermission(PERMISSIONS.WARD_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { startDate, endDate } = req.query as Record<string, string>;
  const { start, end } = ((): { start: Date; end: Date } => {
    const now = new Date();
    return {
      start: startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1),
      end: endDate ? (() => { const d = new Date(endDate); d.setHours(23, 59, 59, 999); return d; })() : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  })();

  const wards = await prisma.ward.findMany({
    where: { hospitalId, isActive: true },
    select: { id: true, name: true, capacity: true },
  });

  const beds = await prisma.bed.findMany({
    where: { hospitalId },
    select: { id: true, wardId: true, status: true, assignedAt: true, dischargedAt: true, patientId: true },
  });

  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
  const occupancyRate = formatPercent(occupiedBeds, totalBeds);

  const byWard = wards.map((w) => {
    const wardBeds = beds.filter((b) => b.wardId === w.id);
    const occupied = wardBeds.filter((b) => b.status === 'OCCUPIED').length;
    const stayDays = wardBeds
      .filter((b) => b.assignedAt && b.status === 'OCCUPIED')
      .map((b) => {
        const from = new Date(b.assignedAt!);
        const to = b.dischargedAt ? new Date(b.dischargedAt) : new Date();
        return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      });
    const avgStayDays = stayDays.length > 0 ? Math.round((stayDays.reduce((a, b) => a + b, 0) / stayDays.length) * 10) / 10 : 0;
    return {
      wardName: w.name,
      totalBeds: wardBeds.length,
      occupied,
      rate: formatPercent(occupied, wardBeds.length),
      avgStayDays,
    };
  }).filter((w) => w.totalBeds > 0);

  const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const trends: Array<{ date: string; rate: number }> = [];
  for (let i = 0; i < Math.min(dayCount, 90); i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const occupiedOnDay = beds.filter((b) => {
      const assigned = b.assignedAt ? new Date(b.assignedAt) : null;
      const discharged = b.dischargedAt ? new Date(b.dischargedAt) : null;
      return assigned && assigned <= d && (!discharged || discharged > d);
    }).length;
    trends.push({ date: dateStr, rate: formatPercent(occupiedOnDay, totalBeds) });
  }

  const occupiedBedsWithStay = beds.filter((b) => b.assignedAt && b.status === 'OCCUPIED');
  const stayDistribution: Record<string, number> = { '0-1 days': 0, '2-3 days': 0, '4-7 days': 0, '8-14 days': 0, '15+ days': 0 };
  for (const b of occupiedBedsWithStay) {
    const days = (new Date().getTime() - new Date(b.assignedAt!).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 1) stayDistribution['0-1 days']!++;
    else if (days <= 3) stayDistribution['2-3 days']!++;
    else if (days <= 7) stayDistribution['4-7 days']!++;
    else if (days <= 14) stayDistribution['8-14 days']!++;
    else stayDistribution['15+ days']!++;
  }

  res.json({
    occupancyRate,
    totalBeds,
    occupiedBeds,
    availableBeds: totalBeds - occupiedBeds,
    byWard,
    trends,
    lengthOfStayDistribution: Object.entries(stayDistribution).map(([range, count]) => ({ range, count })),
  });
}));

export default router;
