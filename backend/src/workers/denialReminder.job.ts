import prisma from '../lib/prisma.js';

const STALE_THRESHOLD_DAYS = 30;

export interface StaleAppeal {
  id: string;
  appealNumber: string;
  claimId: string;
  status: string;
  denialReasonCode: string;
  daysSinceUpdate: number;
  createdById: string;
  hospitalId: string | null;
}

export async function checkStaleAppeals(): Promise<StaleAppeal[]> {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - STALE_THRESHOLD_DAYS);

  const staleAppeals = await prisma.denialAppeal.findMany({
    where: {
      status: 'IN_REVIEW',
      updated_at: { lt: thresholdDate },
    },
    select: {
      id: true,
      appealNumber: true,
      claimId: true,
      status: true,
      denialReasonCode: true,
      updated_at: true,
      createdById: true,
      hospitalId: true,
    },
  });

  const results: StaleAppeal[] = [];

  for (const appeal of staleAppeals) {
    const daysSinceUpdate = Math.floor(
      (Date.now() - appeal.updated_at.getTime()) / (1000 * 60 * 60 * 24),
    );

    await prisma.notification.create({
      data: {
        userId: appeal.createdById,
        title: 'Stale Insurance Appeal',
        message: `Appeal ${appeal.appealNumber} has been in review for ${daysSinceUpdate} days without update`,
        hospitalId: appeal.hospitalId,
      },
    });

    results.push({
      id: appeal.id,
      appealNumber: appeal.appealNumber,
      claimId: appeal.claimId,
      status: appeal.status,
      denialReasonCode: appeal.denialReasonCode,
      daysSinceUpdate,
      createdById: appeal.createdById,
      hospitalId: appeal.hospitalId,
    });
  }

  return results;
}
