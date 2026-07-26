import { Router } from 'express';
import { $Enums, Prisma } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { createOrderSchema, createTestSchema, createSampleSchema, updateSampleStatusSchema } from '../../schemas/lab.schema.js';
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
  labSamples: {
    select: {
      id: true, label: true, status: true, collectedAt: true, rejectionReason: true, notes: true,
      collectedBy: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'asc' as const },
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
  const order = await prisma.diagnosticOrder.findFirst({
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
    const panel = await prisma.diagnosticPanel.findFirst({
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
      hospitalId: req.user!.hospitalId || null,
      tests: { create: (allTestIds as string[]).map(testId => ({ testId })) },
    },
    include: ORDER_INCLUDE,
  });
  res.status(201).json(order);
}));

router.patch('/orders/:id/claim', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const existing = await prisma.diagnosticOrder.findFirst({ where: { id: req.params.id } });
  if (!existing) throw new NotFoundError('Order not found');
  if (!existing.paid) throw new ValidationError('Order must be paid before it can be claimed');
  const order = await prisma.diagnosticOrder.update({
    where: { id: req.params.id },
    data: { status: 'IN_PROGRESS', assignedToId: req.user!.id },
    include: ORDER_INCLUDE,
  });
  const label = await generateSampleLabel(req.user!.hospitalId || null);
  await prisma.labSample.create({
    data: {
      label,
      orderId: order.id,
      status: 'COLLECTED',
      collectedAt: new Date(),
      collectedById: req.user!.id,
    },
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

function calculateFlag(value: string, test: { refRangeLow?: unknown; refRangeHigh?: unknown; lowCritical?: unknown; highCritical?: unknown }): { flag: $Enums.ResultFlag; isAbnormal: boolean } {
  const num = parseFloat(value);
  if (isNaN(num)) return { flag: 'NORMAL', isAbnormal: false };
  if (test.highCritical != null && num > Number(test.highCritical)) return { flag: 'CRITICAL_HIGH', isAbnormal: true };
  if (test.lowCritical != null && num < Number(test.lowCritical)) return { flag: 'CRITICAL_LOW', isAbnormal: true };
  if (test.refRangeHigh != null && num > Number(test.refRangeHigh)) return { flag: 'HIGH', isAbnormal: true };
  if (test.refRangeLow != null && num < Number(test.refRangeLow)) return { flag: 'LOW', isAbnormal: true };
  return { flag: 'NORMAL', isAbnormal: false };
}

router.put('/orders/:id/results', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_RESULTS), asyncHandler(async (req, res) => {
  const { results } = req.body;
  if (!results?.length) throw new ValidationError('results array is required');
  const order = await prisma.diagnosticOrder.findFirst({
    where: { id: req.params.id },
    include: { tests: { include: { test: true } } },
  });
  if (!order) throw new NotFoundError('Order not found');
  await prisma.$transaction(
    (results as Array<Record<string, unknown>>).map(r => {
      const r2 = r as { orderTestId: string; value?: string; unit?: string; refRangeLow?: string; refRangeHigh?: string; refRangeText?: string; notes?: string };
      const orderTest = order.tests.find(t => t.id === r2.orderTestId);
      const test = orderTest?.test;
      let flag: $Enums.ResultFlag = 'NORMAL';
      let isAbnormal = false;
      if (test && r2.value) {
        const computed = calculateFlag(r2.value, test);
        flag = computed.flag;
        isAbnormal = computed.isAbnormal;
      }
      return prisma.diagnosticOrderTest.update({
        where: { id: r2.orderTestId },
        data: {
          value: r2.value ?? null, unit: r2.unit ?? null,
          refRangeLow: r2.refRangeLow !== undefined ? parseFloat(r2.refRangeLow) : null,
          refRangeHigh: r2.refRangeHigh !== undefined ? parseFloat(r2.refRangeHigh) : null,
          refRangeText: r2.refRangeText ?? null,
          flag, notes: r2.notes ?? null,
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
  const order = await prisma.diagnosticOrder.findFirst({
    where: { id: req.params.id },
    include: ORDER_INCLUDE,
  });
  if (!order) throw new NotFoundError('Order not found');
  const flagColor = (flag: string) => {
    switch (flag) {
      case 'CRITICAL_HIGH': return '#dc2626';
      case 'CRITICAL_LOW': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'LOW': return '#2563eb';
      case 'ABNORMAL': return '#d97706';
      default: return '#16a34a';
    }
  };
  const flagBg = (flag: string) => {
    switch (flag) {
      case 'CRITICAL_HIGH': return '#fef2f2';
      case 'CRITICAL_LOW': return '#fef2f2';
      case 'HIGH': return '#fff7ed';
      case 'LOW': return '#eff6ff';
      case 'ABNORMAL': return '#fffbeb';
      default: return '#f0fdf4';
    }
  };
  const resultsRows = (order.tests || []).map(ot => {
    const refRange = ot.refRangeText || (ot.refRangeLow != null && ot.refRangeHigh != null ? `${ot.refRangeLow} - ${ot.refRangeHigh}` : '-');
    const color = flagColor(ot.flag);
    const bg = flagBg(ot.flag);
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${ot.test?.name || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${ot.value || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${ot.unit || ot.test?.unit || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${refRange}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;"><span style="color:${color};background:${bg};padding:2px 8px;border-radius:4px;font-weight:600;">${ot.flag}</span></td>
    </tr>`;
  }).join('');
  const sampleRows = (order.labSamples || []).map(s => {
    const statusColor = s.status === 'COMPLETED' ? '#16a34a' : s.status === 'REJECTED' ? '#dc2626' : s.status === 'IN_PROGRESS' ? '#2563eb' : '#d97706';
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-family:monospace;">${s.label}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;"><span style="color:${statusColor};font-weight:600;">${s.status}</span></td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${s.collectedBy?.fullName || '-'}</td>
      <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${s.collectedAt ? new Date(s.collectedAt).toLocaleString() : '-'}</td>
    </tr>`;
  }).join('');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lab Report - ${order.id.slice(0, 8)}</title>
<style>
  @media print { body { margin: 0; } @page { margin: 1cm; } }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #1e293b; margin: 20px; }
  .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { color: #1e40af; margin: 0; font-size: 24px; }
  .header p { color: #64748b; margin: 4px 0 0; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 14px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; }
  .info-grid dt { color: #64748b; }
  .info-grid dd { font-weight: 600; margin: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; font-size: 12px; text-transform: uppercase; color: #64748b; }
  .footer { margin-top: 32px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>
<div class="header">
  <h1>Laboratory Report</h1>
  <p>AL Jawahir Hospital</p>
</div>
<div class="section">
  <h2>Patient Information</h2>
  <dl class="info-grid">
    <dt>Name</dt><dd>${order.patient?.fullName || '-'}</dd>
    <dt>MRN</dt><dd>${order.patient?.mrn || '-'}</dd>
    <dt>Date of Birth</dt><dd>${order.patient?.dateOfBirth ? new Date(order.patient.dateOfBirth).toLocaleDateString() : '-'}</dd>
    <dt>Gender</dt><dd>${order.patient?.gender || '-'}</dd>
  </dl>
</div>
<div class="section">
  <h2>Order Information</h2>
  <dl class="info-grid">
    <dt>Order ID</dt><dd>${order.id.slice(0, 8)}</dd>
    <dt>Date</dt><dd>${new Date(order.createdAt).toLocaleString()}</dd>
    <dt>Requested By</dt><dd>${order.requestedBy?.fullName || '-'}</dd>
    <dt>Priority</dt><dd>${order.priority === 1 ? 'URGENT' : order.priority === 2 ? 'STAT' : 'ROUTINE'}</dd>
    <dt>Status</dt><dd>${order.status}</dd>
    ${order.clinicalNotes ? `<dt>Clinical Notes</dt><dd>${order.clinicalNotes}</dd>` : ''}
  </dl>
</div>
${(order.labSamples || []).length > 0 ? `
<div class="section">
  <h2>Samples</h2>
  <table>
    <thead><tr><th>Label</th><th style="text-align:center;">Status</th><th>Collected By</th><th>Collected At</th></tr></thead>
    <tbody>${sampleRows}</tbody>
  </table>
</div>` : ''}
<div class="section">
  <h2>Results</h2>
  <table>
    <thead><tr><th>Test</th><th style="text-align:center;">Value</th><th style="text-align:center;">Unit</th><th style="text-align:center;">Ref Range</th><th style="text-align:center;">Flag</th></tr></thead>
    <tbody>${resultsRows}</tbody>
  </table>
</div>
${order.resultNotes ? `<div class="section"><h2>Notes</h2><p style="font-size:13px;">${order.resultNotes}</p></div>` : ''}
<div class="footer">
  Report generated on ${new Date().toLocaleString()} | AL Jawahir Hospital Laboratory
</div>
</body>
</html>`;
  res.json({ html });
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
    where: { id: { in: orderIds }, orderType: 'LAB', hospitalId: req.user!.hospitalId || undefined },
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
  const labDept = await prisma.department.findFirst({ where: { slug: 'lab-dept' } });
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

router.get('/stats', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const [pending, inProgress, completed, total] = await Promise.all([
    prisma.diagnosticOrder.count({ where: { orderType: 'LAB', status: 'SUBMITTED', hospitalId: req.user!.hospitalId || undefined } }),
    prisma.diagnosticOrder.count({ where: { orderType: 'LAB', status: 'IN_PROGRESS', hospitalId: req.user!.hospitalId || undefined } }),
    prisma.diagnosticOrder.count({ where: { orderType: 'LAB', status: 'COMPLETED', completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, hospitalId: req.user!.hospitalId || undefined } }),
    prisma.diagnosticTest.count({ where: { orderType: 'LAB', isActive: true } }),
  ]);
  res.json({ pending, inProgress, completedToday: completed, catalogCount: total });
}));

async function generateSampleLabel(hospitalId: string | null): Promise<string> {
  const now = new Date();
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const datePart = `${y}${m}${d}`;
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const count = await prisma.labSample.count({
    where: {
      createdAt: { gte: startOfDay, lt: endOfDay },
      ...(hospitalId ? { hospitalId } : {}),
    },
  });
  return `LAB-${datePart}-${String(count + 1).padStart(4, '0')}`;
}

router.get('/samples', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const { status, orderId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (orderId) where.orderId = orderId;
  const samples = await prisma.labSample.findMany({
    where,
    include: {
      collectedBy: { select: { id: true, fullName: true } },
      order: {
        select: {
          id: true,
          status: true,
          patient: { select: { id: true, fullName: true, mrn: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(samples);
}));

router.post('/samples', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), validate(createSampleSchema), asyncHandler(async (req, res) => {
  const { orderId, notes } = req.body;
  const order = await prisma.diagnosticOrder.findFirst({ where: { id: orderId } });
  if (!order) throw new NotFoundError('Order not found');
  const label = await generateSampleLabel(req.user!.hospitalId || null);
  const sample = await prisma.labSample.create({
    data: {
      label,
      orderId,
      notes: notes || null,
      status: 'COLLECTED',
    },
    include: {
      collectedBy: { select: { id: true, fullName: true } },
      order: { select: { id: true, patient: { select: { fullName: true, mrn: true } } } },
    },
  });
  res.status(201).json(sample);
}));

router.patch('/samples/:id/collect', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const sample = await prisma.labSample.findFirst({ where: { id: req.params.id } });
  if (!sample) throw new NotFoundError('Sample not found');
  const updated = await prisma.labSample.update({
    where: { id: req.params.id },
    data: {
      collectedAt: sample.collectedAt || new Date(),
      collectedById: sample.collectedById || req.user!.id,
      status: sample.status === 'COLLECTED' ? 'COLLECTED' : sample.status,
    },
    include: {
      collectedBy: { select: { id: true, fullName: true } },
      order: { select: { id: true, patient: { select: { fullName: true, mrn: true } } } },
    },
  });
  res.json(updated);
}));

router.patch('/samples/:id/status', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), validate(updateSampleStatusSchema), asyncHandler(async (req, res) => {
  const { status, rejectionReason } = req.body;
  const sample = await prisma.labSample.findFirst({ where: { id: req.params.id } });
  if (!sample) throw new NotFoundError('Sample not found');
  const updated = await prisma.labSample.update({
    where: { id: req.params.id },
    data: {
      status,
      rejectionReason: status === 'REJECTED' ? (rejectionReason || null) : null,
    },
    include: {
      collectedBy: { select: { id: true, fullName: true } },
      order: { select: { id: true, patient: { select: { fullName: true, mrn: true } } } },
    },
  });
  res.json(updated);
}));

router.delete('/samples/:id', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_WRITE), asyncHandler(async (req, res) => {
  const sample = await prisma.labSample.findFirst({ where: { id: req.params.id } });
  if (!sample) throw new NotFoundError('Sample not found');
  await prisma.labSample.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}));

export default router;

