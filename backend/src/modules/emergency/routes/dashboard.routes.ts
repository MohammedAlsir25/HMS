import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.EMERGENCY_READ), asyncHandler(async (req: Request, res: Response) => {
  const hospitalId = req.user!.hospitalId!;

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const triages = await prisma.triageAssessment.findMany({
    where: {
      hospitalId,
      triageTime: { gte: startOfDay },
    },
    take: 100,
    include: { patient: { select: { id: true, fullName: true, mrn: true } } },
  }) as Array<{
    id: string; acuity: string; chiefComplaint: string; disposition: string | null;
    triageTime: Date; patient: { id: string; fullName: string; mrn: string };
    triageNotes: string | null; vitalSigns: unknown;
  }>;

  const nowTs = Date.now();
  const awaiting: typeof triages = [];
  const active: typeof triages = [];
  const completed: typeof triages = [];

  for (const t of triages) {
    if (t.disposition === 'ADMITTED' || t.disposition === 'DISCHARGED' || t.disposition === 'TRANSFERRED') {
      completed.push(t);
    } else if (t.triageNotes || t.vitalSigns) {
      active.push(t);
    } else {
      awaiting.push(t);
    }
  }

  const acuityOrder = ['RESUSCITATION', 'EMERGENT', 'URGENT', 'LESS_URGENT', 'NON_URGENT'];
  const acuityColorMap: Record<string, string> = {
    RESUSCITATION: '#ef4444',
    EMERGENT: '#f97316',
    URGENT: '#eab308',
    LESS_URGENT: '#22c55e',
    NON_URGENT: '#3b82f6',
  };

  const byAcuity = acuityOrder.map((acuity) => {
    const patients = triages
      .filter(t => t.acuity === acuity)
      .map(t => ({
        id: t.id,
        patientName: t.patient.fullName,
        mrn: t.patient.mrn,
        chiefComplaint: t.chiefComplaint,
        waitMinutes: Math.round((nowTs - new Date(t.triageTime).getTime()) / 60000),
        disposition: t.disposition,
      }));
    return { acuity, count: patients.length, color: acuityColorMap[acuity] || '#6b7280', patients };
  });

  const totalToday = triages.length;
  const awaitingTriage = awaiting.length;
  const averageWaitMinutes = triages.length > 0 ? Math.round(
    triages.reduce((sum, t) => sum + Math.round((nowTs - new Date(t.triageTime).getTime()) / 60000), 0) / triages.length
  ) : 0;
  const admittedToday = triages.filter(t => t.disposition === 'ADMITTED').length;

  const allBeds = await prisma.bed.findMany({ where: { hospitalId }, select: { status: true } });
  const totalBeds = allBeds.length;
  const occupiedBeds = allBeds.filter(b => b.status === 'OCCUPIED').length;
  const vacantBeds = allBeds.filter(b => b.status === 'VACANT').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  res.json({
    summary: { totalToday, awaitingTriage, averageWaitMinutes, admittedToday },
    byAcuity,
    bedAvailability: { totalBeds, occupiedBeds, vacantBeds, occupancyRate },
  });
}));

export default router;
