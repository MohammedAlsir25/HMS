import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';
import { generateClaimNumber } from '../utils/claimNumberGenerator.js';

const router = Router();

const VALID_APPEAL_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_REVIEW'],
  IN_REVIEW: ['RESUBMITTED', 'DENIED'],
  RESUBMITTED: ['APPROVED', 'DENIED', 'IN_REVIEW'],
  APPROVED: [],
  DENIED: [],
};

function validateAppealTransition(current: string, next: string): void {
  const allowed = VALID_APPEAL_TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new ValidationError(`Invalid appeal status transition: ${current} → ${next}`);
  }
}

async function generateAppealNumber(hospitalId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `APL-${year}-`;
  const lastAppeal = await prisma.denialAppeal.findFirst({
    where: {
      hospitalId,
      appealNumber: { startsWith: prefix },
    },
    orderBy: { appealNumber: 'desc' },
  });
  let seq = 1;
  if (lastAppeal) {
    const lastSeq = parseInt(lastAppeal.appealNumber.slice(-5), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }
  return `${prefix}${String(seq).padStart(5, '0')}`;
}

router.get('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = { hospitalId };
  if (status) where.status = status;

  const [appeals, totalCount] = await Promise.all([
    prisma.denialAppeal.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        claim: {
          select: {
            id: true,
            claimNumber: true,
            claimAmount: true,
            status: true,
            patient: { select: { id: true, fullName: true, mrn: true } },
            insuranceCompany: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.denialAppeal.count({ where }),
  ]);

  res.json({ appeals, totalCount });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const appeal = await prisma.denialAppeal.findFirst({
    where: { id: req.params.id!, hospitalId },
    include: {
      claim: {
        include: {
          patient: { select: { id: true, fullName: true, mrn: true, phone: true } },
          insurancePolicy: { select: { id: true, policyNumber: true, coveragePercent: true } },
          insuranceCompany: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNumber: true, total: true } },
          settlements: true,
        },
      },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
  if (!appeal) throw new NotFoundError('Denial appeal not found');
  res.json(appeal);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('CREATE', 'DenialAppeal'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const userId = req.user!.id;
  const {
    claimId, denialReasonCode, denialReasonText, appealNotes,
  } = req.body as Record<string, unknown>;

  if (!claimId || !denialReasonCode) {
    throw new ValidationError('claimId and denialReasonCode are required');
  }

  const claim = await prisma.insuranceClaim.findFirst({
    where: { id: claimId as string, hospitalId },
  });
  if (!claim) throw new NotFoundError('Insurance claim not found');
  if (claim.status !== 'REJECTED') {
    throw new ValidationError('Can only appeal rejected claims');
  }

  const existingAppeal = await prisma.denialAppeal.findFirst({
    where: { claimId: claimId as string, status: { notIn: ['DENIED'] } },
  });
  if (existingAppeal) {
    throw new ValidationError('An active appeal already exists for this claim');
  }

  const appealNumber = await generateAppealNumber(hospitalId);

  const appeal = await prisma.denialAppeal.create({
    data: {
      claimId: claimId as string,
      appealNumber,
      denialReasonCode: denialReasonCode as string,
      denialReasonText: (denialReasonText as string) || null,
      appealNotes: (appealNotes as string) || null,
      createdById: userId,
      hospitalId,
    },
    include: {
      claim: {
        select: {
          id: true,
          claimNumber: true,
          patient: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  res.status(201).json(appeal);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('UPDATE', 'DenialAppeal'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.denialAppeal.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Denial appeal not found');

  const { status, appealNotes, correctedClaimData } = req.body as Record<string, unknown>;

  if (status && status !== existing.status) {
    validateAppealTransition(existing.status, status as string);
  }

  const updateData: Record<string, unknown> = {};
  if (status) {
    updateData.status = status;
    if (status === 'RESUBMITTED') updateData.submittedAt = new Date();
    if (status === 'APPROVED' || status === 'DENIED') updateData.resolvedAt = new Date();
  }
  if (appealNotes !== undefined) updateData.appealNotes = appealNotes;
  if (correctedClaimData !== undefined) updateData.correctedClaimData = correctedClaimData;

  const appeal = await prisma.denialAppeal.update({
    where: { id: req.params.id! },
    data: updateData,
    include: {
      claim: {
        select: {
          id: true,
          claimNumber: true,
          patient: { select: { id: true, fullName: true } },
        },
      },
    },
  });

  res.json(appeal);
}));

router.post('/:id/resubmit', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('RESUBMIT', 'DenialAppeal'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const userId = req.user!.id;

  const appeal = await prisma.denialAppeal.findFirst({
    where: { id: req.params.id!, hospitalId },
    include: { claim: true },
  });
  if (!appeal) throw new NotFoundError('Denial appeal not found');
  if (appeal.status !== 'IN_REVIEW' && appeal.status !== 'RESUBMITTED') {
    throw new ValidationError('Appeal must be IN_REVIEW or RESUBMITTED to resubmit');
  }

  const correctedData = (req.body as Record<string, unknown>['correctedData']) as Record<string, unknown> | undefined;
  const resubmitNotes = (req.body as Record<string, unknown>).resubmitNotes as string | undefined;

  const result = await prisma.$transaction(async (tx) => {
    const newClaimNumber = await generateClaimNumber(hospitalId);

    const newClaim = await tx.insuranceClaim.create({
      data: {
        claimNumber: newClaimNumber,
        patientId: appeal.claim.patientId,
        insurancePolicyId: appeal.claim.insurancePolicyId,
        insuranceCompanyId: appeal.claim.insuranceCompanyId,
        invoiceId: appeal.claim.invoiceId,
        preAuthorizationId: appeal.claim.preAuthorizationId,
        claimAmount: correctedData?.claimAmount
          ? parseFloat(String(correctedData.claimAmount))
          : Number(appeal.claim.claimAmount),
        clinicalRecords: (correctedData?.clinicalRecords as object) || appeal.claim.clinicalRecords,
        labResults: (correctedData?.labResults as object) || appeal.claim.labResults,
        imagingResults: (correctedData?.imagingResults as object) || appeal.claim.imagingResults,
        notes: resubmitNotes || `Resubmitted from appeal ${appeal.appealNumber}`,
        createdById: userId,
        hospitalId,
      },
    });

    const updatedAppeal = await tx.denialAppeal.update({
      where: { id: req.params.id! },
      data: {
        status: 'RESUBMITTED',
        submittedAt: new Date(),
        correctedClaimData: correctedData || undefined,
        appealNotes: resubmitNotes || appeal.appealNotes,
      },
    });

    return { appeal: updatedAppeal, newClaim };
  });

  res.json({
    appeal: result.appeal,
    newClaim: {
      id: result.newClaim.id,
      claimNumber: result.newClaim.claimNumber,
      claimAmount: Number(result.newClaim.claimAmount),
    },
  });
}));

export default router;
