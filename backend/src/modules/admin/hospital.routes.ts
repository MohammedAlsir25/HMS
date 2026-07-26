import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import { createHospitalSchema, updateHospitalSchema } from './hospital.validation.js';
import * as hospitalController from './hospital.controller.js';

const router = Router();

function requireSuperAdmin(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  if (req.user?.role !== 'Super Admin') {
    res.status(403).json({ message: 'Super Admin access required' });
    return;
  }
  next();
}

router.post('/', authenticate, requireSuperAdmin, auditMiddleware('CREATE_HOSPITAL', 'Hospital'), validate(createHospitalSchema), hospitalController.createHospital);

router.get('/', authenticate, requireSuperAdmin, hospitalController.listHospitals);

router.get('/:id', authenticate, requireSuperAdmin, hospitalController.getHospitalById);

router.patch('/:id', authenticate, requireSuperAdmin, auditMiddleware('UPDATE_HOSPITAL', 'Hospital'), validate(updateHospitalSchema), hospitalController.updateHospital);

router.patch('/:id/deactivate', authenticate, requireSuperAdmin, auditMiddleware('DEACTIVATE_HOSPITAL', 'Hospital'), hospitalController.deactivateHospital);

export default router;
