import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/dashboard', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const role = req.user!.role;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const baseRole = role.replace(/_/g, '').toLowerCase();

  if (baseRole.includes('admin') || baseRole.includes('superadmin') || baseRole === 'ceo' || baseRole === 'hospitaldirector') {
    const [todayTx, monthTx, patientCount, beds, todaySurgeries, pendingLeaves] = await Promise.all([
      prisma.transaction.aggregate({ where: { hospitalId, createdAt: { gte: startToday } }, _sum: { amount: true }, _count: true }),
      prisma.transaction.aggregate({ where: { hospitalId, createdAt: { gte: startMonth } }, _sum: { amount: true }, _count: true }),
      prisma.patient.count({ where: { hospitalId, createdAt: { gte: startToday } } }),
      prisma.bed.findMany({ where: { hospitalId }, select: { status: true } }),
      prisma.surgery.count({ where: { hospitalId, createdAt: { gte: startToday } } }),
      prisma.leaveRequest.count({ where: { hospitalId, status: 'PENDING' } }),
    ]);
    const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
    res.json({
      role: 'ADMIN',
      kpis: [
        { label: 'Revenue Today', value: Number(todayTx._sum.amount) || 0, format: 'currency' },
        { label: 'Revenue This Month', value: Number(monthTx._sum.amount) || 0, format: 'currency' },
        { label: 'Transactions Today', value: todayTx._count, format: 'number' },
        { label: 'New Patients Today', value: patientCount, format: 'number' },
        { label: 'Bed Occupancy', value: beds.length > 0 ? Math.round((occupied / beds.length) * 100) : 0, format: 'percent' },
        { label: 'Surgeries Today', value: todaySurgeries, format: 'number' },
        { label: 'Pending Leave Requests', value: pendingLeaves, format: 'number' },
      ],
    });
    return;
  }

  if (baseRole.includes('doctor')) {
    const userId = req.user!.id;
    const [todayAppts, pendingConsults, todaySurgeries] = await Promise.all([
      prisma.appointment.count({ where: { hospitalId, doctorId: userId, createdAt: { gte: startToday } } }),
      prisma.appointment.count({ where: { hospitalId, doctorId: userId, status: 'WAITING' } }),
      prisma.surgery.count({ where: { hospitalId, createdAt: { gte: startToday }, teamMembers: { some: { userId } } } }),
    ]);
    res.json({
      role: 'DOCTOR',
      kpis: [
        { label: 'Today\'s Appointments', value: todayAppts, format: 'number' },
        { label: 'Pending Consultations', value: pendingConsults, format: 'number' },
        { label: 'Surgeries Today', value: todaySurgeries, format: 'number' },
      ],
    });
    return;
  }

  if (baseRole.includes('reception')) {
    const [todayAppts, checkedIn, pendingCheckIn] = await Promise.all([
      prisma.appointment.count({ where: { hospitalId, createdAt: { gte: startToday } } }),
      prisma.appointment.count({ where: { hospitalId, createdAt: { gte: startToday }, status: { in: ['IN_PROGRESS', 'COMPLETED'] } } }),
      prisma.appointment.count({ where: { hospitalId, createdAt: { gte: startToday }, status: 'WAITING' } }),
    ]);
    res.json({
      role: 'RECEPTIONIST',
      kpis: [
        { label: 'Today\'s Appointments', value: todayAppts, format: 'number' },
        { label: 'Checked In', value: checkedIn, format: 'number' },
        { label: 'Pending Check-in', value: pendingCheckIn, format: 'number' },
      ],
    });
    return;
  }

  if (baseRole.includes('pharmacist')) {
    const [todaySales, lowStock, expiringSoon] = await Promise.all([
      prisma.inventoryTransaction.aggregate({
        where: { hospitalId, type: 'SALE', createdAt: { gte: startToday } },
        _sum: { unitCost: true },
        _count: true,
      }),
      prisma.inventoryItem.count({ where: { hospitalId, isActive: true } }),
      prisma.inventoryItem.count({
        where: {
          hospitalId,
          expiryDate: { not: null, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    res.json({
      role: 'PHARMACIST',
      kpis: [
        { label: 'Today\'s Sales', value: Number(todaySales._sum.unitCost) || 0, format: 'currency' },
        { label: 'Sales Count Today', value: todaySales._count, format: 'number' },
        { label: 'Low Stock Items', value: lowStock, format: 'number' },
        { label: 'Expiring Soon (30d)', value: expiringSoon, format: 'number' },
      ],
    });
    return;
  }

  if (baseRole.includes('lab')) {
    const [pendingOrders, completedToday, allTests] = await Promise.all([
      prisma.diagnosticOrder.count({ where: { hospitalId, status: { in: ['SUBMITTED', 'IN_PROGRESS'] } } }),
      prisma.diagnosticOrder.count({ where: { hospitalId, status: 'COMPLETED', completedAt: { gte: startToday } } }),
      prisma.diagnosticOrderTest.findMany({
        where: { hospitalId, order: { createdAt: { gte: startToday } } },
        select: { isAbnormal: true, resultEnteredAt: true },
      }),
    ]);
    res.json({
      role: 'LAB_TECHNICIAN',
      kpis: [
        { label: 'Pending Orders', value: pendingOrders, format: 'number' },
        { label: 'Completed Today', value: completedToday, format: 'number' },
        { label: 'Tests Today', value: allTests.length, format: 'number' },
        { label: 'Abnormal Rate', value: allTests.length > 0 ? Math.round((allTests.filter((t) => t.isAbnormal).length / allTests.length) * 100) : 0, format: 'percent' },
      ],
    });
    return;
  }

  if (baseRole.includes('nurse')) {
    const beds = await prisma.bed.findMany({ where: { hospitalId }, select: { status: true, wardId: true } });
    const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
    res.json({
      role: 'NURSE',
      kpis: [
        { label: 'Bed Occupancy', value: beds.length > 0 ? Math.round((occupied / beds.length) * 100) : 0, format: 'percent' },
        { label: 'Total Beds', value: beds.length, format: 'number' },
        { label: 'Occupied Beds', value: occupied, format: 'number' },
        { label: 'Available Beds', value: beds.length - occupied, format: 'number' },
      ],
    });
    return;
  }

  if (baseRole.includes('accountant') || baseRole.includes('billing')) {
    const [todayRevenue, openShift, monthRevenue, outstanding] = await Promise.all([
      prisma.transaction.aggregate({ where: { hospitalId, createdAt: { gte: startToday } }, _sum: { amount: true } }),
      prisma.shift.findFirst({ where: { hospitalId, closedAt: null } }),
      prisma.transaction.aggregate({ where: { hospitalId, createdAt: { gte: startMonth } }, _sum: { amount: true } }),
      prisma.invoice.aggregate({ where: { hospitalId, paymentStatus: { in: ['Pending', 'PartialPayment'] } }, _sum: { total: true, amountPaid: true } }),
    ]);
    res.json({
      role: 'ACCOUNTANT',
      kpis: [
        { label: 'Revenue Today', value: Number(todayRevenue._sum.amount) || 0, format: 'currency' },
        { label: 'Revenue This Month', value: Number(monthRevenue._sum.amount) || 0, format: 'currency' },
        { label: 'Open Shift', value: openShift ? 'Yes' : 'No', format: 'text' },
        { label: 'Outstanding Balance', value: (Number(outstanding._sum.total) || 0) - (Number(outstanding._sum.amountPaid) || 0), format: 'currency' },
      ],
    });
    return;
  }

  if (baseRole.includes('hr')) {
    const [headcount, pendingLeaves, attendanceToday] = await Promise.all([
      prisma.employee.count({ where: { hospitalId, isActive: true } }),
      prisma.leaveRequest.count({ where: { hospitalId, status: 'PENDING' } }),
      prisma.attendance.count({ where: { hospitalId, date: { gte: startToday } } }),
    ]);
    res.json({
      role: 'HR_OFFICER',
      kpis: [
        { label: 'Total Headcount', value: headcount, format: 'number' },
        { label: 'Pending Leave Requests', value: pendingLeaves, format: 'number' },
        { label: 'Present Today', value: attendanceToday, format: 'number' },
      ],
    });
    return;
  }

  res.json({
    role: role,
    kpis: [
      { label: 'Welcome', value: 'Role-specific KPIs not configured', format: 'text' },
    ],
  });
}));

export default router;
