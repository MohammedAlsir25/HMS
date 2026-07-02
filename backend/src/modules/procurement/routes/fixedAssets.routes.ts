import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ASSET_READ),
  asyncHandler(async (_req, res) => {
    const assets = await prisma.fixedAsset.findMany({
      include: { purchaseOrder: { select: { id: true, orderNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(assets);
  }),
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.ASSET_READ),
  asyncHandler(async (req, res) => {
    const asset = await prisma.fixedAsset.findUnique({
      where: { id: req.params.id },
      include: { purchaseOrder: { select: { id: true, orderNumber: true } } },
    });
    if (!asset) {
      return res.status(404).json({ message: 'Fixed asset not found' });
    }
    res.json(asset);
  }),
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.ASSET_WRITE),
  asyncHandler(async (req, res) => {
    const {
      name, assetType, acquisitionCost, installationCost,
      usefulLifeYears, salvageValue, purchaseDate, location,
      serialNumber, notes,
    } = req.body;

    if (!name || !assetType || !acquisitionCost || !usefulLifeYears) {
      throw new ValidationError('name, assetType, acquisitionCost, and usefulLifeYears are required');
    }

    const totalCost = Number(acquisitionCost) + Number(installationCost || 0);
    const monthlyDep = usefulLifeYears > 0 ? (totalCost / (usefulLifeYears * 12)) : 0;

    const asset = await prisma.fixedAsset.create({
      data: {
        name,
        assetType,
        acquisitionCost: Number(acquisitionCost),
        installationCost: Number(installationCost || 0),
        totalCost,
        usefulLifeYears: Number(usefulLifeYears),
        salvageValue: Number(salvageValue || 0),
        monthlyDepreciation: Math.round(monthlyDep * 100) / 100,
        bookValue: totalCost,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        location: location || null,
        serialNumber: serialNumber || null,
        notes: notes || null,
      },
    });
    res.status(201).json(asset);
  }),
);

router.put(
  '/:id/depreciate',
  authenticate,
  requirePermission(PERMISSIONS.ASSET_WRITE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.fixedAsset.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Fixed asset not found' });
    }

    const newAccumulated = Number(existing.accumulatedDepreciation) + Number(existing.monthlyDepreciation);
    const newBookValue = Math.max(0, Number(existing.totalCost) - newAccumulated);

    const asset = await prisma.fixedAsset.update({
      where: { id: req.params.id },
      data: {
        accumulatedDepreciation: newAccumulated,
        bookValue: newBookValue,
        isActive: newBookValue > 0,
      },
    });
    res.json(asset);
  }),
);

export default router;
