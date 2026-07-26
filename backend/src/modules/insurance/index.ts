import { Router } from 'express';
import insuranceCompanyRoutes from './routes/insuranceCompany.routes.js';
import insurancePolicyRoutes from './routes/insurancePolicy.routes.js';
import pricingRulesRoutes from './routes/pricingRules.routes.js';
import preAuthorizationRoutes from './routes/preAuthorization.routes.js';
import insuranceClaimRoutes from './routes/insuranceClaim.routes.js';
import insuranceSettlementRoutes from './routes/insuranceSettlement.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import denialAppealsRoutes from './routes/denialAppeals.routes.js';
import cobRoutes from './routes/cob.routes.js';
import denialReasonsSeed from './seeds/denialReasons.seed.js';

const router = Router();
router.use('/companies', insuranceCompanyRoutes);
router.use('/policies', insurancePolicyRoutes);
router.use('/pricing-rules', pricingRulesRoutes);
router.use('/pre-authorizations', preAuthorizationRoutes);
router.use('/claims', insuranceClaimRoutes);
router.use('/settlements', insuranceSettlementRoutes);
router.use('/reports', reportsRoutes);
router.use('/denial-appeals', denialAppealsRoutes);
router.use('/cob', cobRoutes);
router.use('/', denialReasonsSeed);

export default router;
