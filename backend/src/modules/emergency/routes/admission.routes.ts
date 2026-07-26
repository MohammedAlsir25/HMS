import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.post('/admit', authenticate, requirePermission(PERMISSIONS.EMERGENCY_WRITE), asyncHandler(async (req: Request, res: Response) => {
  const { patientId, triageId, wardId, notes } = req.body as Record<string, string>;
  if (!patientId) throw new ValidationError('patientId is required');
  if (!triageId) throw new ValidationError('triageId is required');

  const hospitalId = req.user!.hospitalId!;

  const triage = await prisma.triageAssessment.findFirst({ where: { id: triageId, hospitalId } });
  if (!triage) throw new ValidationError('Triage assessment not found');

  let targetWardId = wardId;

  if (!targetWardId) {
    const isCritical = triage.acuity === 'RESUSCITATION' || triage.acuity === 'EMERGENT';
    let wardType = isCritical ? 'ICU' : 'General';
    const ward = await prisma.ward.findFirst({
      where: { hospitalId, type: { contains: wardType }, isActive: true, is_deleted: false },
    });
    if (ward) targetWardId = ward.id;
  }

  if (!targetWardId) {
    const ward = await prisma.ward.findFirst({
      where: { hospitalId, isActive: true, is_deleted: false },
      orderBy: { createdAt: 'asc' },
    });
    if (ward) targetWardId = ward.id;
  }

  let bed = null;
  if (targetWardId) {
    bed = await prisma.bed.findFirst({
      where: { wardId: targetWardId, status: 'VACANT', hospitalId },
    });
  }

  if (bed) {
    await prisma.bed.update({
      where: { id: bed.id },
      data: {
        status: 'OCCUPIED',
        patientId,
        assignedAt: new Date(),
      },
    });
  }

  await prisma.triageAssessment.update({
    where: { id: triageId },
    data: { disposition: 'ADMITTED' },
  });

  res.json({
    triageId,
    patientId,
    wardId: targetWardId || null,
    bedId: bed?.id || null,
    bedNumber: bed?.bedNumber || null,
    disposition: 'ADMITTED',
    notes: notes || null,
  });
}));

export default router;
