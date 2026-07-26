import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { buildDateWhere, formatPercent } from '../utils/reportHelpers.js';

const router = Router();

router.get('/hr', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const where = buildDateWhere(req, 'createdAt');

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [employees, attendanceRecords, leaveRecords] = await Promise.all([
    prisma.employee.findMany({
      where: { hospitalId, isActive: true },
      select: { id: true, department: true, hireDate: true, gender: true },
    }),
    prisma.attendance.findMany({
      where: {
        hospitalId,
        date: { gte: thirtyDaysAgo },
      },
      select: { employeeId: true, status: true, date: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        hospitalId,
        ...((where.createdAt as Record<string, unknown>) ? { createdAt: where.createdAt as Date | Record<string, unknown> } : {}),
      },
      select: { type: true, status: true, employeeId: true },
    }),
  ]);

  const deptMap: Record<string, number> = {};
  for (const emp of employees) {
    const dept = emp.department || 'Unknown';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  }

  const totalEmployees = employees.length;

  const totalAttendanceDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((a) => a.status === 'PRESENT' || a.status === 'LATE').length;
  const attendanceRate = formatPercent(presentDays, totalAttendanceDays);

  const uniqueEmployeesWithAttendance = new Set(attendanceRecords.map((a) => a.employeeId)).size;

  const leaveTypeMap: Record<string, { total: number; used: number; pending: number }> = {};
  for (const lr of leaveRecords) {
    const t = lr.type;
    if (!leaveTypeMap[t]) leaveTypeMap[t] = { total: 0, used: 0, pending: 0 };
    leaveTypeMap[t].total++;
    if (lr.status === 'APPROVED') leaveTypeMap[t].used++;
    if (lr.status === 'PENDING') leaveTypeMap[t].pending++;
  }

  const thirtyDaysAgoDate = new Date();
  thirtyDaysAgoDate.setDate(thirtyDaysAgoDate.getDate() - 30);
  const newHires = employees.filter((e) => new Date(e.hireDate) >= thirtyDaysAgoDate).length;

  res.json({
    headcountByDepartment: Object.entries(deptMap)
      .map(([department, count]) => ({ department, count, percent: formatPercent(count, totalEmployees) }))
      .sort((a, b) => b.count - a.count),
    totalEmployees,
    attendanceRate,
    attendanceDetails: {
      presentDays,
      totalDays: totalAttendanceDays,
      employeesTracked: uniqueEmployeesWithAttendance,
    },
    leaveUsage: Object.entries(leaveTypeMap)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.total - a.total),
    newHires,
    turnover: 0,
    pendingLeaveRequests: leaveRecords.filter((lr) => lr.status === 'PENDING').length,
    approvedLeaveRequests: leaveRecords.filter((lr) => lr.status === 'APPROVED').length,
  });
}));

export default router;
