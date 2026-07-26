import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { buildDateWhere, formatPercent } from '../utils/reportHelpers.js';

const router = Router();

router.get('/surgery', authenticate, requirePermission(PERMISSIONS.SURGERY_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const where = buildDateWhere(req, 'createdAt');

  const surgeries = await prisma.surgery.findMany({
    where,
    select: {
      id: true, orRoom: true, startTime: true, endTime: true, status: true, createdAt: true,
      operationTypeId: true, departmentId: true,
    },
    orderBy: { startTime: 'asc' },
  });

  const opTypeIds = [...new Set(surgeries.map((s) => s.operationTypeId).filter(Boolean))] as string[];
  const opTypes = opTypeIds.length > 0
    ? await prisma.operationType.findMany({ where: { id: { in: opTypeIds }, hospitalId }, select: { id: true, name: true } })
    : [];
  const opTypeMap = new Map(opTypes.map((t) => [t.id, t.name]));

  const deptIds = [...new Set(surgeries.map((s) => s.departmentId))] as string[];
  const depts = deptIds.length > 0
    ? await prisma.department.findMany({ where: { id: { in: deptIds }, hospitalId }, select: { id: true, name: true } })
    : [];
  const deptMap = new Map(depts.map((d) => [d.id, d.name]));

  const dateMap: Record<string, number> = {};
  const typeMap: Record<string, number> = {};
  const deptMapAgg: Record<string, number> = {};
  let totalDuration = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const s of surgeries) {
    const dateKey = s.createdAt.toISOString().slice(0, 10);
    dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;

    const typeName = opTypeMap.get(s.operationTypeId || '') || 'Unknown';
    typeMap[typeName] = (typeMap[typeName] || 0) + 1;

    const deptName = deptMap.get(s.departmentId || '') || 'Unknown';
    deptMapAgg[deptName] = (deptMapAgg[deptName] || 0) + 1;

    const durationMs = new Date(s.endTime).getTime() - new Date(s.startTime).getTime();
    const durationHours = durationMs / (1000 * 60 * 60);
    totalDuration += durationHours;
    completedCount++;

    if (s.status === 'CANCELLED') cancelledCount++;
  }

  const roomMap: Record<string, { total: number; completed: number; cancelled: number }> = {};
  for (const s of surgeries) {
    const room = `OR-${s.orRoom}`;
    const existing = roomMap[room];
    if (!existing) roomMap[room] = { total: 1, completed: s.status === 'COMPLETED' ? 1 : 0, cancelled: s.status === 'CANCELLED' ? 1 : 0 };
    else {
      existing.total++;
      if (s.status === 'COMPLETED') existing.completed++;
      if (s.status === 'CANCELLED') existing.cancelled++;
    }
  }

  const orUtilization = Object.entries(roomMap).map(([orName, data]) => ({
    orName,
    totalSlots: data.total,
    used: data.completed,
    rate: formatPercent(data.completed, data.total),
  }));

  res.json({
    surgeriesPerDay: Object.entries(dateMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byType: Object.entries(typeMap)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    byDepartment: Object.entries(deptMapAgg)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count),
    orUtilization,
    cancellationRate: formatPercent(cancelledCount, surgeries.length),
    avgDuration: completedCount > 0 ? Math.round((totalDuration / completedCount) * 10) / 10 : 0,
    summary: {
      totalSurgeries: surgeries.length,
      completed: surgeries.filter((s) => s.status === 'COMPLETED').length,
      inProgress: surgeries.filter((s) => s.status === 'IN_SURGERY' || s.status === 'PREP').length,
      scheduled: surgeries.filter((s) => s.status === 'SCHEDULED').length,
      cancelled: cancelledCount,
    },
  });
}));

export default router;
