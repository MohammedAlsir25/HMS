import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { limit, offset } = req.query as Record<string, string>;
  const assetType = req.query.assetType as string | undefined;
  const isActive = req.query.isActive as string | undefined;
  const where: Record<string, unknown> = {};
  if (assetType) where.assetType = assetType;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  const [assets, totalCount] = await Promise.all([
    prisma.fixedAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
    }),
    prisma.fixedAsset.count({ where }),
  ]);
  res.json({ assets, totalCount });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_FIXED_ASSET', 'FixedAsset'), asyncHandler(async (req, res) => {
  const { name, assetType, acquisitionCost, installationCost, usefulLifeYears, salvageValue, purchaseDate, location, serialNumber, notes } = req.body;
  if (!name || !assetType || !acquisitionCost || !usefulLifeYears || !purchaseDate) {
    throw new ValidationError('name, assetType, acquisitionCost, usefulLifeYears, and purchaseDate are required');
  }
  const acqCost = parseFloat(acquisitionCost);
  const instCost = installationCost ? parseFloat(installationCost) : 0;
  const salvage = salvageValue ? parseFloat(salvageValue) : 0;
  const lifeYears = parseInt(usefulLifeYears);
  const totalCost = acqCost + instCost;
  const monthlyDepreciation = (acqCost + instCost - salvage) / (lifeYears * 12);

  const asset = await prisma.fixedAsset.create({
    data: {
      name, assetType,
      acquisitionCost: acqCost,
      installationCost: instCost,
      totalCost,
      usefulLifeYears: lifeYears,
      salvageValue: salvage,
      monthlyDepreciation,
      bookValue: totalCost,
      purchaseDate: new Date(purchaseDate),
      location: location || null,
      serialNumber: serialNumber || null,
      notes: notes || null,
    },
  });
  res.status(201).json(asset);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('UPDATE_FIXED_ASSET', 'FixedAsset'), asyncHandler(async (req, res) => {
  const existing = await prisma.fixedAsset.findUnique({ where: { id: req.params.id! } });
  if (!existing) throw new NotFoundError('Fixed asset not found');

  const data: Record<string, unknown> = {};
  const { name, assetType, acquisitionCost, installationCost, usefulLifeYears, salvageValue, purchaseDate, location, serialNumber, notes, isActive } = req.body;
  if (name !== undefined) data.name = name;
  if (assetType !== undefined) data.assetType = assetType;
  if (location !== undefined) data.location = location || null;
  if (serialNumber !== undefined) data.serialNumber = serialNumber || null;
  if (notes !== undefined) data.notes = notes || null;
  if (isActive !== undefined) data.isActive = isActive;

  const acqCost = acquisitionCost !== undefined ? parseFloat(acquisitionCost) : Number(existing.acquisitionCost);
  const instCost = installationCost !== undefined ? parseFloat(installationCost) : Number(existing.installationCost);
  const salvage = salvageValue !== undefined ? parseFloat(salvageValue) : Number(existing.salvageValue);
  const lifeYears = usefulLifeYears !== undefined ? parseInt(usefulLifeYears) : existing.usefulLifeYears;

  if (acquisitionCost !== undefined || installationCost !== undefined || usefulLifeYears !== undefined || salvageValue !== undefined) {
    data.acquisitionCost = acqCost;
    data.installationCost = instCost;
    data.totalCost = acqCost + instCost;
    data.usefulLifeYears = lifeYears;
    data.salvageValue = salvage;
    data.monthlyDepreciation = (acqCost + instCost - salvage) / (lifeYears * 12);
  }

  if (purchaseDate !== undefined) data.purchaseDate = new Date(purchaseDate);

  const asset = await prisma.fixedAsset.update({ where: { id: req.params.id! }, data });
  res.json(asset);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('DELETE_FIXED_ASSET', 'FixedAsset'), asyncHandler(async (req, res) => {
  const asset = await prisma.fixedAsset.findUnique({ where: { id: req.params.id! } });
  if (!asset) throw new NotFoundError('Fixed asset not found');
  await prisma.fixedAsset.update({ where: { id: req.params.id! }, data: { isActive: false } });
  res.json({ message: 'Fixed asset deactivated' });
}));

router.post('/depreciation/run', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('RUN_DEPRECIATION', 'FixedAsset'), asyncHandler(async (req, res) => {
  const activeAssets = await prisma.fixedAsset.findMany({
    where: { isActive: true },
  });

  const eligible = activeAssets.filter((a) => Number(a.bookValue) > 0 && Number(a.monthlyDepreciation) > 0);
  const processed: string[] = [];

  if (eligible.length > 0) {
    await prisma.$transaction(
      eligible.map((asset) => {
        const depAmount = Number(asset.monthlyDepreciation);
        const newBookValue = Math.max(0, Number(asset.bookValue) - depAmount);
        const newAccumulated = Number(asset.accumulatedDepreciation) + depAmount;
        processed.push(asset.id);
        return prisma.fixedAsset.update({
          where: { id: asset.id },
          data: {
            accumulatedDepreciation: newAccumulated,
            bookValue: newBookValue,
          },
        });
      })
    );
  }

  if (processed.length > 0) {
    const depExpAccount = await prisma.account.findFirst({ where: { code: '5800' } });
    const accumDepAccount = await prisma.account.findFirst({ where: { code: '1600' } });

    if (depExpAccount && accumDepAccount) {
      const year = new Date().getFullYear();
      const countResult = await prisma.$queryRawUnsafe<{ max_seq: number | null }[]>(
        `SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 4) AS INTEGER)), 0) + 1 as max_seq FROM journal_entries WHERE entry_number LIKE $1`,
        `JE-${year}-%`,
      );
      const seq = Number(countResult[0]?.max_seq ?? 1);
      const entryNumber = `JE-${year}-${String(seq).padStart(5, '0')}`;

      const totalDepreciation = processed.reduce((sum, assetId) => {
        const asset = activeAssets.find(a => a.id === assetId);
        return sum + (asset ? Number(asset.monthlyDepreciation) : 0);
      }, 0);

      if (totalDepreciation > 0) {
        await prisma.journalEntry.create({
          data: {
            entryNumber,
            date: new Date(),
            description: `Monthly depreciation - ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`,
            referenceType: 'DEPRECIATION',
            created_by: req.user!.id,
            lines: {
              createMany: {
                data: [
                  { accountId: depExpAccount.id, debit: totalDepreciation, credit: 0 },
                  { accountId: accumDepAccount.id, debit: 0, credit: totalDepreciation },
                ],
              },
            },
          },
        });
      }
    }
  }

  res.json({ processed: processed.length, assetIds: processed });
}));

export default router;
