import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_READ), asyncHandler(async (_req, res) => {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: 'asc' } });
  res.json(suppliers);
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { name, contactPerson, phone, email } = req.body;
  if (!name) throw new ValidationError('Supplier name is required');
  const supplier = await prisma.supplier.create({
    data: { name, contactPerson, phone, email },
  });
  res.status(201).json(supplier);
}));

router.put('/:id', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Supplier not found');
  const { name, contactPerson, phone, email } = req.body;
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: name ?? undefined,
      contactPerson: contactPerson ?? undefined,
      phone: phone ?? undefined,
      email: email ?? undefined,
    },
  });
  res.json(supplier);
}));

router.delete('/:id', authenticate, requirePermission(PERMISSIONS.PHARMACY_WRITE), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.supplier.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Supplier not found');
  const hasInvoices = await prisma.supplierInvoice.findFirst({ where: { supplierId: id } });
  if (hasInvoices) {
    await prisma.supplier.update({ where: { id }, data: { name: `${existing.name} (archived)` } });
    return res.json({ message: 'Supplier archived (has existing invoices)' });
  }
  await prisma.supplier.delete({ where: { id } });
  res.json({ message: 'Supplier deleted' });
}));

export default router;
