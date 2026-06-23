import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function logAudit({ userId, action, entity, entityId, details, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: details || {},
        ipAddress,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}
