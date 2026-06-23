import { logAudit } from '../utils/audit.js';

export function auditMiddleware(action, entity) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      const entityId = req.params?.id || req.body?.patientId || body?.id;
      logAudit({
        userId: req.user?.id,
        action,
        entity,
        entityId,
        details: { method: req.method, path: req.path, statusCode: res.statusCode },
        ipAddress: req.ip,
      }).catch(console.error);
      return originalJson(body);
    };
    next();
  };
}
