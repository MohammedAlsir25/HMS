import { Router } from 'express';
import { authenticate } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import prisma from '../../../lib/prisma.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  asyncHandler(async (_req, res) => {
    const costCenters = await prisma.costCenter.findMany({
      include: { department: true },
      orderBy: { name: 'asc' },
    });
    res.json(costCenters);
  }),
);

export default router;
