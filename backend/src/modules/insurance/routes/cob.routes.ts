import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';
import { adjudicateSecondaryClaim, getPatientPolicies } from '../utils/cobEngine.js';

const router = Router();

router.post('/process/:claimId', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('COB_ADJUDICATE', 'InsuranceClaim'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;

  const claim = await prisma.insuranceClaim.findFirst({
    where: { id: req.params.claimId!, hospitalId },
  });
  if (!claim) throw new NotFoundError('Insurance claim not found');

  const result = await adjudicateSecondaryClaim(req.params.claimId!);

  if (!result) {
    res.json({ message: 'No secondary policy or residual amount — COB not applicable', secondaryClaim: null });
    return;
  }

  res.json({
    message: 'Secondary claim created via COB adjudication',
    ...result,
  });
}));

router.get('/patient/:patientId', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const policies = await getPatientPolicies(req.params.patientId!, hospitalId);
  res.json(policies);
}));

router.put('/policies/order', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('UPDATE_ORDER', 'InsurancePolicy'), asyncHandler(async (req, res) => {
  const { orders } = req.body as Record<string, unknown>;

  if (!Array.isArray(orders) || orders.length === 0) {
    throw new ValidationError('orders array is required with at least one entry');
  }

  const updates = await prisma.$transaction(
    orders.map((entry: Record<string, unknown>) => {
      if (!entry.id || entry.coordinationOrder === undefined) {
        throw new ValidationError('Each order entry must have id and coordinationOrder');
      }
      return prisma.insurancePolicy.update({
        where: { id: entry.id as string },
        data: { coordinationOrder: entry.coordinationOrder as number },
        select: { id: true, policyNumber: true, coordinationOrder: true },
      });
    }),
  );

  res.json({ message: 'Coordination orders updated', policies: updates });
}));

export default router;
