import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const search = req.query.search as string | undefined;
  const isTpa = req.query.isTpa as string | undefined;
  const isActive = req.query.isActive as string | undefined;

  const where: Record<string, unknown> = { hospitalId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { nameAr: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  if (isTpa !== undefined) where.isTpa = isTpa === 'true';
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [companies, totalCount] = await Promise.all([
    prisma.insuranceCompany.findMany({
      where,
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.insuranceCompany.count({ where }),
  ]);

  res.json({ companies, totalCount });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const company = await prisma.insuranceCompany.findFirst({
    where: { id: req.params.id!, hospitalId },
    include: { policies: { where: { isActive: true }, take: 10 } },
  });
  if (!company) throw new NotFoundError('Insurance company not found');
  res.json(company);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('CREATE', 'InsuranceCompany'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { name, nameAr, contactPerson, phone, email, address, isTpa, notes } = req.body as Record<string, unknown>;
  if (!name) throw new ValidationError('name is required');

  const existing = await prisma.insuranceCompany.findFirst({
    where: { hospitalId, name: name as string },
  });
  if (existing) throw new ValidationError('A company with this name already exists');

  const company = await prisma.insuranceCompany.create({
    data: {
      name: name as string,
      nameAr: (nameAr as string) || null,
      contactPerson: (contactPerson as string) || null,
      phone: (phone as string) || null,
      email: (email as string) || null,
      address: (address as string) || null,
      isTpa: (isTpa as boolean) ?? false,
      notes: (notes as string) || null,
      hospitalId,
    },
  });

  res.status(201).json(company);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('UPDATE', 'InsuranceCompany'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insuranceCompany.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Insurance company not found');

  const { name, nameAr, contactPerson, phone, email, address, isTpa, isActive, notes } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (nameAr !== undefined) data.nameAr = nameAr || null;
  if (contactPerson !== undefined) data.contactPerson = contactPerson || null;
  if (phone !== undefined) data.phone = phone || null;
  if (email !== undefined) data.email = email || null;
  if (address !== undefined) data.address = address || null;
  if (isTpa !== undefined) data.isTpa = isTpa;
  if (isActive !== undefined) data.isActive = isActive;
  if (notes !== undefined) data.notes = notes || null;

  const company = await prisma.insuranceCompany.update({
    where: { id: req.params.id! },
    data,
  });
  res.json(company);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.INSURANCE_WRITE), auditMiddleware('DELETE', 'InsuranceCompany'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const existing = await prisma.insuranceCompany.findFirst({
    where: { id: req.params.id!, hospitalId },
  });
  if (!existing) throw new NotFoundError('Insurance company not found');

  await prisma.insuranceCompany.update({
    where: { id: req.params.id! },
    data: { isActive: false },
  });
  res.json({ message: 'Insurance company deactivated' });
}));

export default router;
