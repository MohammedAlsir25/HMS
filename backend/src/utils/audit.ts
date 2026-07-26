
import prisma from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

export async function logAudit({ userId, hospitalId, action, entity, entityId, details, ipAddress }: {
  userId?: string; hospitalId?: string; action: string; entity: string; entityId?: string; details?: Record<string, unknown>; ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId!,
        hospitalId: hospitalId || undefined,
        action,
        entity,
        entityId,
        details: (details || {}) as Prisma.JsonObject,
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Audit log error:', (err as Error).message);
  }
}
