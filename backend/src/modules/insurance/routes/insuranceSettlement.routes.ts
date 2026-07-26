import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/aging', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const now = new Date();

  const unsettledClaims = await prisma.insuranceClaim.findMany({
    where: {
      hospitalId,
      status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PARTIALLY_APPROVED'] },
    },
    select: { id: true, claimNumber: true, claimAmount: true, approvedAmount: true, paidAmount: true, submittedAt: true, status: true },
  });

  const buckets: Record<string, Array<Record<string, unknown>>> = { '0-30': [], '31-60': [], '61-90': [], '90+': [] };

  for (const claim of unsettledClaims) {
    const refDate = claim.submittedAt ? new Date(claim.submittedAt) : now;
    const daysSince = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
    const bucket =
      daysSince <= 30 ? '0-30' :
      daysSince <= 60 ? '31-60' :
      daysSince <= 90 ? '61-90' :
      '90+';
    const bucketArr = buckets[bucket];
    if (bucketArr) {
      bucketArr.push({
        id: claim.id,
        claimNumber: claim.claimNumber,
        claimAmount: Number(claim.claimAmount),
        approvedAmount: claim.approvedAmount ? Number(claim.approvedAmount) : null,
        paidAmount: Number(claim.paidAmount),
        submittedAt: claim.submittedAt,
        status: claim.status,
        daysSinceSubmission: daysSince,
      });
    }
  }

  const summary: Record<string, { count: number; totalAmount: number }> = {
    '0-30': { count: 0, totalAmount: 0 },
    '31-60': { count: 0, totalAmount: 0 },
    '61-90': { count: 0, totalAmount: 0 },
    '90+': { count: 0, totalAmount: 0 },
  };

  for (const [key, items] of Object.entries(buckets)) {
    summary[key] = {
      count: items.length,
      totalAmount: items.reduce((s, c) => s + (c['claimAmount'] as number), 0),
    };
  }

  res.json({ summary, buckets });
}));

router.get('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const claimId = req.query.claimId as string | undefined;
  const insuranceCompanyId = req.query.insuranceCompanyId as string | undefined;
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const where: Record<string, unknown> = { hospitalId };
  if (claimId) where.claimId = claimId;
  if (insuranceCompanyId) where.insuranceCompanyId = insuranceCompanyId;
  if (startDate || endDate) {
    where.settlementDate = {} as Record<string, unknown>;
    if (startDate) (where.settlementDate as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.settlementDate as Record<string, unknown>).lte = end;
    }
  }

  const [settlements, totalCount] = await Promise.all([
    prisma.insuranceSettlement.findMany({
      where,
      orderBy: { settlementDate: 'desc' },
      take: limit,
      skip: offset,
      include: {
        claim: { select: { id: true, claimNumber: true } },
        insuranceCompany: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
    prisma.insuranceSettlement.count({ where }),
  ]);

  res.json({ settlements, totalCount });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const settlement = await prisma.insuranceSettlement.findFirst({
    where: { id: req.params.id!, hospitalId },
    include: {
      claim: {
        include: {
          patient: { select: { id: true, fullName: true, mrn: true } },
          insuranceCompany: { select: { id: true, name: true } },
        },
      },
      insuranceCompany: { select: { id: true, name: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
  if (!settlement) throw new NotFoundError('Settlement not found');
  res.json(settlement);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('CREATE', 'InsuranceSettlement'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const userId = req.user!.id;
  const {
    claimId, insuranceCompanyId, amount, settlementDate, referenceNumber,
    paymentMethod, notes, adjustmentReason,
  } = req.body as Record<string, unknown>;

  if (!claimId || !insuranceCompanyId || amount === undefined || !settlementDate) {
    throw new ValidationError('claimId, insuranceCompanyId, amount, settlementDate are required');
  }

  const claim = await prisma.insuranceClaim.findFirst({
    where: { id: claimId as string, hospitalId },
  });
  if (!claim) throw new NotFoundError('Insurance claim not found');

  const settlementAmount = parseFloat(amount as string);

  const result = await prisma.$transaction(async (tx) => {
    const settlement = await tx.insuranceSettlement.create({
      data: {
        claimId: claimId as string,
        insuranceCompanyId: insuranceCompanyId as string,
        amount: settlementAmount,
        settlementDate: new Date(settlementDate as string),
        referenceNumber: (referenceNumber as string) || null,
        paymentMethod: (paymentMethod as string) || null,
        notes: (notes as string) || null,
        adjustmentReason: (adjustmentReason as string) || null,
        createdById: userId,
        hospitalId,
      },
    });

    const updatedClaim = await tx.insuranceClaim.update({
      where: { id: claimId as string },
      data: {
        paidAmount: { increment: settlementAmount },
      },
    });

    const approvedAmt = updatedClaim.approvedAmount ? Number(updatedClaim.approvedAmount) : null;
    const newPaidAmt = Number(updatedClaim.paidAmount);

    let newStatus: string | null = null;
    if (approvedAmt !== null && newPaidAmt >= approvedAmt) {
      newStatus = 'SETTLED';
    } else if (newPaidAmt > 0) {
      newStatus = 'PARTIALLY_APPROVED';
    }

    if (newStatus && updatedClaim.status !== 'SETTLED') {
      await tx.insuranceClaim.update({
        where: { id: claimId as string },
        data: {
          status: newStatus as never,
          ...(newStatus === 'SETTLED' ? { settledAt: new Date() } : {}),
        },
      });
    }

    return settlement;
  });

  res.status(201).json(result);
}));

export default router;
