import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { buildDateWhere, formatPercent } from '../utils/reportHelpers.js';

const router = Router();

router.get('/lab', authenticate, requirePermission(PERMISSIONS.DIAGNOSTICS_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const where = buildDateWhere(req, 'createdAt');

  const orders = await prisma.diagnosticOrder.findMany({
    where,
    select: {
      id: true, status: true, createdAt: true, completedAt: true, fromClinicId: true,
      tests: { select: { id: true, testId: true, isAbnormal: true, flag: true, resultEnteredAt: true } },
    },
  });

  const testIds = [...new Set(orders.flatMap((o) => o.tests.map((t) => t.testId)))];
  const testDefinitions = testIds.length > 0
    ? await prisma.diagnosticTest.findMany({ where: { id: { in: testIds } }, select: { id: true, name: true, category: true } })
    : [];
  const testDefMap = new Map(testDefinitions.map((t) => [t.id, t]));

  const dateMap: Record<string, number> = {};
  let totalTests = 0;
  let abnormalTests = 0;
  const byTestTypeMap: Record<string, { total: number; abnormal: number; tatSum: number; count: number }> = {};
  const clinicMap: Record<string, number> = {};

  for (const order of orders) {
    const dateKey = order.createdAt.toISOString().slice(0, 10);
    dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;

    if (order.fromClinicId) {
      clinicMap[order.fromClinicId] = (clinicMap[order.fromClinicId] || 0) + 1;
    }

    for (const test of order.tests) {
      totalTests++;
      if (test.isAbnormal) abnormalTests++;

      const testDef = testDefMap.get(test.testId);
      const testName = testDef?.name || 'Unknown';
      if (!byTestTypeMap[testName]) byTestTypeMap[testName] = { total: 0, abnormal: 0, tatSum: 0, count: 0 };
      const entry = byTestTypeMap[testName]!;
      entry.total++;
      if (test.isAbnormal) entry.abnormal++;

      if (order.completedAt && test.resultEnteredAt) {
        const tatHours = (new Date(test.resultEnteredAt).getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
        entry.tatSum += tatHours;
        entry.count++;
      }
    }
  }

  const clinicIds = Object.keys(clinicMap);
  const clinics = clinicIds.length > 0
    ? await prisma.clinic.findMany({ where: { id: { in: clinicIds }, hospitalId }, select: { id: true, name: true } })
    : [];
  const clinicNames = new Map(clinics.map((c) => [c.id, c.name]));

  const totalTatSum = Object.values(byTestTypeMap).reduce((s, t) => s + t.tatSum, 0);
  const totalTatCount = Object.values(byTestTypeMap).reduce((s, t) => s + t.count, 0);

  res.json({
    testsPerDay: Object.entries(dateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    turnaroundTime: {
      avg: totalTatCount > 0 ? Math.round((totalTatSum / totalTatCount) * 10) / 10 : 0,
      byTestType: Object.entries(byTestTypeMap)
        .map(([name, data]) => ({
          testType: name,
          avgHours: data.count > 0 ? Math.round((data.tatSum / data.count) * 10) / 10 : 0,
          totalTests: data.total,
        }))
        .sort((a, b) => b.totalTests - a.totalTests),
    },
    abnormalRate: {
      overall: formatPercent(abnormalTests, totalTests),
      totalTests,
      abnormalTests,
      byTest: Object.entries(byTestTypeMap)
        .map(([name, data]) => ({
          testType: name,
          abnormalRate: formatPercent(data.abnormal, data.total),
          total: data.total,
        }))
        .sort((a, b) => b.total - a.total),
    },
    byDepartment: Object.entries(clinicMap)
      .map(([clinicId, count]) => ({ department: clinicNames.get(clinicId) || clinicId, count }))
      .sort((a, b) => b.count - a.count),
    summary: {
      totalOrders: orders.length,
      totalTests,
      completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
      pendingOrders: orders.filter((o) => o.status === 'SUBMITTED' || o.status === 'IN_PROGRESS').length,
    },
  });
}));

export default router;
