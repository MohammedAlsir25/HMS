import type { Request, Response, NextFunction } from 'express';
import { logAudit } from '../utils/audit.js';

export function auditMiddleware(action: string, entity: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      const entityId = req.params?.id || req.body?.patientId || (body as Record<string, unknown>)?.id;
      logAudit({
        userId: req.user?.id,
        action,
        entity,
        entityId: entityId as string | undefined,
        details: { method: req.method, path: req.path, statusCode: res.statusCode },
        ipAddress: req.ip,
      }).catch(console.error);
      return originalJson(body);
    };
    next();
  };
}
