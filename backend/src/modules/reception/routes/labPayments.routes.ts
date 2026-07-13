import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.post('/lab/pay', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), asyncHandler(async (req, res) => {
  const { orderIds, paymentMethod } = req.body;
  if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
    throw new ValidationError('orderIds array is required');
  }
  if (!paymentMethod || !['CASH', 'CARD', 'INSURANCE', 'BANK_TRANSFER'].includes(paymentMethod)) {
    throw new ValidationError('Invalid payment method');
  }

  const orders = await prisma.diagnosticOrder.findMany({
    where: { id: { in: orderIds }, orderType: 'LAB' },
    include: { tests: { include: { test: true } } },
  });
  if (orders.length === 0) throw new ValidationError('No orders found');
  const unpaid = orders.filter((o) => o.paid);
  if (unpaid.length > 0) throw new ValidationError('Some orders are already paid');

  let totalAmount = 0;
  const descriptions = [];
  for (const order of orders) {
    for (const ot of order.tests) {
      totalAmount += Number(ot.test.price || 0);
    }
    descriptions.push(`${order.id.slice(0, 8)}`);
  }

  let shift = await prisma.shift.findFirst({ where: { closedAt: null } });
  if (!shift) {
    shift = await prisma.shift.create({ data: { userId: req.user!.id } });
  }

  const labDept = await prisma.department.findUnique({ where: { slug: 'lab-dept' } });

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        type: 'LAB',
        amount: totalAmount,
        paymentMethod,
        description: `Lab billing: ${descriptions.join(', ')}`,
        shiftId: shift.id,
        cashierId: req.user!.id,
        departmentId: labDept?.id || null,
      },
    }),
    ...orders.map((order) =>
      prisma.diagnosticOrder.update({
        where: { id: order.id },
        data: { paid: true, paidAt: new Date(), paidById: req.user!.id },
      })
    ),
  ]);

  res.status(201).json({
    transaction: {
      id: transaction.id,
      amount: Number(transaction.amount),
      paymentMethod: transaction.paymentMethod,
    },
    totalAmount: Number(totalAmount),
    orderCount: orders.length,
  });
}));

export default router;
