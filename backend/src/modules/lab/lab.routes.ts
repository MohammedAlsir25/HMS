import { Router } from 'express';
import { $Enums, Prisma } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createOrderSchema, createTestSchema } from '../../schemas/lab.schema.js';
import { ValidationError, NotFoundError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { auditMiddleware } from '../../middleware/auditLog.js';

const router = Router();
import prisma from '../../lib/prisma.js';

const ORDER_INCLUDE = {
  patient: { select: { id: true, fullName: true, mrn: true, dateOfBirth: true, gender: true } },
  requestedBy: { select: { id: true, fullName: true } },
  fromClinic: { select: { id: true, name: true, slug: true } },
  assignedTo: { select: { id: true, fullName: true } },
  panel: { select: { id: true, name: true } },
  referral: { select: { id: true, status: true } },
  tests: {
    include: {
      test: true,
      resultEnteredBy: { select: { id: true, fullName: true } },
    },
    orderBy: { test: { sortOrder: 'asc' as const } },
  },
};

router.get('/tests', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const { search, category, isActive } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { orderType: 'LAB' as const };
  if (search) where.name = { contains: search, mode: 'insensitive' as const };
  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  const tests = await prisma.diagnosticTest.findMany({ where: where as Prisma.DiagnosticTestWhereInput, orderBy: { sortOrder: 'asc' as const } });
  res.json(tests);
}));

router.get('/tests/categories', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (_req, res) => {
  const tests = await prisma.diagnosticTest.findMany({
    where: { orderType: 'LAB', isActive: true },
    select: { category: true },
    distinct: ['category'],
  });
  res.json(tests.map(t => t.category).filter(Boolean));
}));

router.post('/tests', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_CATALOG), validate(createTestSchema), asyncHandler(async (req, res) => {
  const { code, name, nameAr, category, specimen, unit, refRangeText, refRangeLow, refRangeHigh, lowCritical, highCritical, price, sortOrder } = req.body;
  const test = await prisma.diagnosticTest.create({
    data: {
      orderType: 'LAB', code, name, nameAr, category, specimen, unit,
      refRangeText, refRangeLow: refRangeLow ? parseFloat(refRangeLow) : null,
      refRangeHigh: refRangeHigh ? parseFloat(refRangeHigh) : null,
      lowCritical: lowCritical ? parseFloat(lowCritical) : null,
      highCritical: highCritical ? parseFloat(highCritical) : null,
      price: price ? parseFloat(price) : null,
      sortOrder: sortOrder || 0,
    },
  });
  res.status(201).json(test);
}));

router.put('/tests/:id', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_CATALOG), asyncHandler(async (req, res) => {
  const { code, name, nameAr, category, specimen, unit, refRangeText, refRangeLow, refRangeHigh, lowCritical, highCritical, price, sortOrder, isActive } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (code !== undefined) data.code = code;
  if (name !== undefined) data.name = name;
  if (nameAr !== undefined) data.nameAr = nameAr;
  if (category !== undefined) data.category = category;
  if (specimen !== undefined) data.specimen = specimen;
  if (unit !== undefined) data.unit = unit;
  if (refRangeText !== undefined) data.refRangeText = refRangeText;
  if (refRangeLow !== undefined) data.refRangeLow = parseFloat(refRangeLow as string);
  if (refRangeHigh !== undefined) data.refRangeHigh = parseFloat(refRangeHigh as string);
  if (lowCritical !== undefined) data.lowCritical = lowCritical ? parseFloat(lowCritical as string) : null;
  if (highCritical !== undefined) data.highCritical = highCritical ? parseFloat(highCritical as string) : null;
  if (price !== undefined) data.price = price ? parseFloat(price as string) : null;
  if (sortOrder !== undefined) data.sortOrder = sortOrder;
  if (isActive !== undefined) data.isActive = isActive;
  const test = await prisma.diagnosticTest.update({ where: { id: req.params.id }, data });
  res.json(test);
}));

router.delete('/tests/:id', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_CATALOG), asyncHandler(async (req, res) => {
  await prisma.diagnosticTest.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true });
}));

router.get('/panels', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (_req, res) => {
  const panels = await prisma.diagnosticPanel.findMany({
    where: { orderType: 'LAB', isActive: true },
    include: { panelTests: { include: { test: true }, orderBy: { test: { sortOrder: 'asc' as const } } } },
  });
  res.json(panels);
}));

router.post('/panels', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_CATALOG), asyncHandler(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const name = body.name as string;
  const nameAr = body.nameAr as string | undefined;
  const testIds = body.testIds as string[];
  if (!name || !testIds?.length) throw new ValidationError('name and testIds are required');
  const panel = await prisma.diagnosticPanel.create({
    data: {
      orderType: 'LAB', name, nameAr,
      panelTests: { create: testIds.map(testId => ({ testId })) },
    },
    include: { panelTests: { include: { test: true } } },
  });
  res.status(201).json(panel);
}));

router.delete('/panels/:id', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_CATALOG), asyncHandler(async (req, res) => {
  await prisma.diagnosticPanel.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ success: true });
}));

router.get('/orders', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const { status, patientId, fromClinicId, search, pendingPayment } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { orderType: 'LAB' as const };
  if (status) where.status = status;
  if (patientId) where.patientId = patientId;
  if (fromClinicId) where.fromClinicId = fromClinicId;
  if (search) where.patient = { fullName: { contains: search, mode: 'insensitive' as const } };
  if (pendingPayment === 'true') {
    where.paid = false;
  } else {
    where.paid = true;
  }
  const orders = await prisma.diagnosticOrder.findMany({
    where: where as Prisma.DiagnosticOrderWhereInput,
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(orders);
}));

router.get('/orders/:id', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const order = await prisma.diagnosticOrder.findUnique({
    where: { id: req.params.id },
    include: ORDER_INCLUDE,
  });
  if (!order) throw new NotFoundError('Order not found');
  res.json(order);
}));

router.post('/orders', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_ORDER), validate(createOrderSchema), asyncHandler(async (req, res) => {
  const { patientId, fromClinicId, testIds, panelId, clinicalNotes, priority } = req.body;
  let allTestIds = testIds || [];
  if (panelId) {
    const panel = await prisma.diagnosticPanel.findUnique({
      where: { id: panelId },
      include: { panelTests: true },
    });
    if (!panel) throw new ValidationError('Panel not found');
    const panelTestIds = panel.panelTests.map(pt => pt.testId);
    allTestIds = [...new Set([...allTestIds, ...panelTestIds])];
  }
  const referral = await prisma.referral.create({
    data: { type: 'LAB_DISPATCH', status: 'PENDING', patientId, fromClinicId, notes: clinicalNotes || null },
  });
  const order = await prisma.diagnosticOrder.create({
    data: {
      orderType: 'LAB', patientId, fromClinicId, panelId: panelId || null,
      clinicalNotes: clinicalNotes || null,
      priority: typeof priority === 'number' ? priority : priority === 'URGENT' ? 1 : priority === 'STAT' ? 2 : 0,
      requestedById: req.user!.id, referralId: referral.id,
      tests: { create: (allTestIds as string[]).map(testId => ({ testId })) },
    },
    include: ORDER_INCLUDE,
  });
  res.status(201).json(order);
}));

router.patch('/orders/:id/claim', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const existing = await prisma.diagnosticOrder.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Order not found');
  if (!existing.paid) throw new ValidationError('Order must be paid before it can be claimed');
  const order = await prisma.diagnosticOrder.update({
    where: { id: req.params.id },
    data: { status: 'IN_PROGRESS', assignedToId: req.user!.id },
    include: ORDER_INCLUDE,
  });
  res.json(order);
}));

router.patch('/orders/:id/unclaim', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const order = await prisma.diagnosticOrder.update({
    where: { id: req.params.id },
    data: { status: 'SUBMITTED', assignedToId: null },
    include: ORDER_INCLUDE,
  });
  res.json(order);
}));

router.patch('/orders/:id/status', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const { status } = req.body as { status?: string };
  const valid = ['SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!status || !valid.includes(status)) throw new ValidationError('Invalid status');
  const data: Record<string, unknown> = { status };
  if (status === 'IN_PROGRESS') data.assignedToId = req.user!.id;
  if (status === 'COMPLETED') data.completedAt = new Date();
  const order = await prisma.diagnosticOrder.update({
    where: { id: req.params.id },
    data,
    include: ORDER_INCLUDE,
  });
  if (status === 'COMPLETED') {
    await prisma.referral.update({
      where: { id: order.referralId! },
      data: { status: 'FULFILLED' },
    });
    const clinicUsers = await prisma.user.findMany({
      where: { clinicId: order.fromClinicId, isActive: true },
    });
    const patientName = order.patient?.fullName || 'Patient';
    await prisma.notification.createMany({
      data: clinicUsers.map((user) => ({
        userId: user.id,
        title: 'Lab Results Ready',
        message: `Lab results are ready for ${patientName}`,
        actionUrl: `/clinics/${order.fromClinic?.slug || order.fromClinicId}`,
      })),
    });
  }
  res.json(order);
}));

router.put('/orders/:id/results', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_RESULTS), asyncHandler(async (req, res) => {
  const { results } = req.body;
  if (!results?.length) throw new ValidationError('results array is required');
  const order = await prisma.diagnosticOrder.findUnique({
    where: { id: req.params.id },
    include: { tests: true },
  });
  if (!order) throw new NotFoundError('Order not found');
  await prisma.$transaction(
    (results as Array<Record<string, unknown>>).map(r => {
      const r2 = r as { orderTestId: string; value?: string; unit?: string; refRangeLow?: string; refRangeHigh?: string; refRangeText?: string; flag?: string; notes?: string };
      const isAbnormal = !!(r2.flag && r2.flag !== 'NORMAL');
      return prisma.diagnosticOrderTest.update({
        where: { id: r2.orderTestId },
        data: {
          value: r2.value ?? null, unit: r2.unit ?? null,
          refRangeLow: r2.refRangeLow !== undefined ? parseFloat(r2.refRangeLow) : null,
          refRangeHigh: r2.refRangeHigh !== undefined ? parseFloat(r2.refRangeHigh) : null,
          refRangeText: r2.refRangeText ?? null,
          flag: (r2.flag || 'NORMAL') as $Enums.ResultFlag, notes: r2.notes ?? null,
          resultEnteredAt: new Date(), resultEnteredById: req.user!.id, isAbnormal,
        },
      });
    })
  );
  const updated = await prisma.diagnosticOrder.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED', completedAt: new Date(), assignedToId: req.user!.id },
    include: ORDER_INCLUDE,
  });
  if (updated.referralId) {
    await prisma.referral.update({
      where: { id: updated.referralId },
      data: { status: 'FULFILLED' },
    });
    const clinicUsers = await prisma.user.findMany({
      where: { clinicId: updated.fromClinicId, isActive: true },
    });
    const patientName = updated.patient?.fullName || 'Patient';
    await prisma.notification.createMany({
      data: clinicUsers.map((user) => ({
        userId: user.id,
        title: 'Lab Results Ready',
        message: `Lab results are ready for ${patientName}`,
        actionUrl: `/clinics/${updated.fromClinic?.slug || updated.fromClinicId}`,
      })),
    });
  }
  res.json(updated);
}));

router.get('/results', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const patientId = req.query.patientId as string;
  if (!patientId) return res.json([]);
  const orders = await prisma.diagnosticOrder.findMany({
    where: { patientId, orderType: 'LAB' },
    include: {
      tests: {
        include: { test: true, resultEnteredBy: { select: { fullName: true } } },
    orderBy: { test: { sortOrder: 'asc' as const } },
      },
      fromClinic: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  res.json(orders);
}));

router.get('/orders/:id/report', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const order = await prisma.diagnosticOrder.findUnique({
    where: { id: req.params.id },
    include: ORDER_INCLUDE,
  });
  if (!order) throw new NotFoundError('Order not found');
  res.json(order);
}));

router.post('/checkout', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_ORDER), auditMiddleware('LAB_CHECKOUT', 'Transaction'), asyncHandler(async (req, res) => {
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
  if (orders.length === 0) throw new NotFoundError('No orders found');

  const alreadyPaid = orders.filter((o) => o.paid);
  if (alreadyPaid.length > 0) {
    throw new ValidationError(`Order(s) already paid: ${alreadyPaid.map((o) => o.id.slice(0, 8)).join(', ')}`);
  }

  let totalAmount = 0;
  const descriptions = [];
  for (const order of orders) {
    for (const ot of order.tests) {
      totalAmount += Number(ot.test.price || 0);
    }
    descriptions.push(`Order ${order.id.slice(0, 8)}`);
  }
  let shift = await prisma.shift.findFirst({ where: { userId: req.user!.id, closedAt: null } });
  if (!shift) {
    shift = await prisma.shift.create({ data: { userId: req.user!.id } });
  }
  const labDept = await prisma.department.findUnique({ where: { slug: 'lab-dept' } });
  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        type: 'LAB', amount: totalAmount, paymentMethod,
        description: `Lab billing: ${descriptions.join(', ')}`,
        shiftId: shift.id, cashierId: req.user!.id, departmentId: labDept?.id || null,
      },
      include: { department: { select: { id: true, name: true, slug: true } } },
    }),
    ...orders.map((order) =>
      prisma.diagnosticOrder.update({
        where: { id: order.id },
        data: { paid: true, paidAt: new Date(), paidById: req.user!.id },
      })
    ),
  ]);
  res.status(201).json({ transaction, totalAmount, orderCount: orders.length });
}));

router.get('/stats', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (_req, res) => {
  const [pending, inProgress, completed, total] = await Promise.all([
    prisma.diagnosticOrder.count({ where: { orderType: 'LAB', status: 'SUBMITTED' } }),
    prisma.diagnosticOrder.count({ where: { orderType: 'LAB', status: 'IN_PROGRESS' } }),
    prisma.diagnosticOrder.count({ where: { orderType: 'LAB', status: 'COMPLETED', completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.diagnosticTest.count({ where: { orderType: 'LAB', isActive: true } }),
  ]);
  res.json({ pending, inProgress, completedToday: completed, catalogCount: total });
}));

export default router;

