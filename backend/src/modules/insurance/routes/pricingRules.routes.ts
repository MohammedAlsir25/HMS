import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';
import { applyInsurancePricing } from '../utils/pricingHelper.js';

const router = Router();

router.get('/checkout-preview', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { patientId, items } = req.query as Record<string, string>;
  if (!patientId || !items) {
    throw new ValidationError('patientId and items (JSON array) are required');
  }

  let parsedItems: Array<{ id: string; name: string; quantity: number; price: number }>;
  try {
    parsedItems = JSON.parse(items) as Array<{ id: string; name: string; quantity: number; price: number }>;
  } catch {
    throw new ValidationError('items must be a valid JSON array');
  }

  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    throw new ValidationError('items must be a non-empty array');
  }

  const pricing = await applyInsurancePricing(hospitalId, patientId, parsedItems);
  if (!pricing) {
    return res.json({ available: false, message: 'No active insurance policy found for this patient' });
  }

  res.json({ available: true, ...pricing });
}));

router.get('/lookup', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { insuranceCompanyId, itemName, itemType } = req.query as Record<string, string>;
  if (!insuranceCompanyId || !itemName || !itemType) {
    throw new ValidationError('insuranceCompanyId, itemName, itemType are required');
  }
  const rule = await prisma.insurancePricingRule.findFirst({
    where: {
      hospitalId,
      insuranceCompanyId,
      itemName: { equals: itemName, mode: 'insensitive' },
      itemType,
      isActive: true,
    },
  });
  res.json(rule || null);
}));

router.get('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const insuranceCompanyId = req.query.insuranceCompanyId as string | undefined;
  const itemType = req.query.itemType as string | undefined;

  const where: Record<string, unknown> = { hospitalId };
  if (insuranceCompanyId) where.insuranceCompanyId = insuranceCompanyId;
  if (itemType) where.itemType = itemType;

  const [rules, totalCount] = await Promise.all([
    prisma.insurancePricingRule.findMany({
      where,
      orderBy: [{ itemType: 'asc' }, { itemName: 'asc' }],
      take: limit,
      skip: offset,
      include: {
        insuranceCompany: { select: { id: true, name: true } },
      },
    }),
    prisma.insurancePricingRule.count({ where }),
  ]);

  res.json({ rules, totalCount });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('CREATE', 'InsurancePricingRule'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { rules } = req.body as { rules: Array<Record<string, unknown>> };

  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    throw new ValidationError('rules array is required');
  }

  for (const rule of rules) {
    const { insuranceCompanyId, itemType, itemName, standardPrice, insurancePrice } = rule;
    if (!insuranceCompanyId || !itemType || !itemName || standardPrice === undefined || insurancePrice === undefined) {
      throw new ValidationError('Each rule requires insuranceCompanyId, itemType, itemName, standardPrice, insurancePrice');
    }
  }

  await prisma.$transaction(
    rules.map((rule) => {
      const { insuranceCompanyId, serviceItemId, itemType, itemName, standardPrice, insurancePrice } = rule;
      return prisma.insurancePricingRule.upsert({
        where: {
          hospitalId_insuranceCompanyId_itemType_itemName: {
            hospitalId,
            insuranceCompanyId: insuranceCompanyId as string,
            itemType: itemType as string,
            itemName: itemName as string,
          },
        },
        update: {
          standardPrice: parseFloat(standardPrice as string),
          insurancePrice: parseFloat(insurancePrice as string),
          serviceItemId: (serviceItemId as string) || null,
          isActive: true,
        },
        create: {
          insuranceCompanyId: insuranceCompanyId as string,
          serviceItemId: (serviceItemId as string) || null,
          itemType: itemType as string,
          itemName: itemName as string,
          standardPrice: parseFloat(standardPrice as string),
          insurancePrice: parseFloat(insurancePrice as string),
          hospitalId,
        },
      });
    })
  );

  const refreshed = await prisma.insurancePricingRule.findMany({
    where: {
      hospitalId,
      OR: rules.map((rule) => ({
        insuranceCompanyId: rule.insuranceCompanyId as string,
        itemType: rule.itemType as string,
        itemName: rule.itemName as string,
      })),
    },
  });

  res.status(201).json(refreshed);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('UPDATE', 'InsurancePricingRule'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insurancePricingRule.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Pricing rule not found');

  const { itemType, itemName, standardPrice, insurancePrice, serviceItemId, isActive } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (itemType !== undefined) data.itemType = itemType;
  if (itemName !== undefined) data.itemName = itemName;
  if (standardPrice !== undefined) data.standardPrice = parseFloat(standardPrice as string);
  if (insurancePrice !== undefined) data.insurancePrice = parseFloat(insurancePrice as string);
  if (serviceItemId !== undefined) data.serviceItemId = serviceItemId || null;
  if (isActive !== undefined) data.isActive = isActive;

  const rule = await prisma.insurancePricingRule.update({
    where: { id: req.params.id! },
    data,
  });
  res.json(rule);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('DELETE', 'InsurancePricingRule'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insurancePricingRule.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Pricing rule not found');

  await prisma.insurancePricingRule.update({
    where: { id: req.params.id! },
    data: { isActive: false },
  });
  res.json({ message: 'Pricing rule deactivated' });
}));

export default router;
