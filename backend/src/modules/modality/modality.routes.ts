import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();

router.get('/worklist', authenticate, requirePermission(PERMISSIONS.CLINICAL_READ), asyncHandler(async (_req, res) => {
  res.status(501).json({
    message: 'DICOM worklist not yet integrated',
    note: 'Modality worklist integration is planned for a future phase',
  });
}));

router.post('/worklist/items', authenticate, requirePermission(PERMISSIONS.CLINICAL_WRITE), asyncHandler(async (_req, res) => {
  res.status(501).json({
    message: 'Adding worklist items is not yet implemented',
    note: 'Modality worklist integration is planned for a future phase',
  });
}));

router.get('/status', asyncHandler(async (_req, res) => {
  res.json({ status: 'not_implemented' });
}));

export default router;
