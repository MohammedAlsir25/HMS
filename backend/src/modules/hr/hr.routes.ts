import { Router } from 'express';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';
import { auditMiddleware } from '../../middleware/auditLog.js';
import bcrypt from 'bcryptjs';

const router = Router();
import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma.js';

router.get('/employees', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { search, department, departmentId, isActive } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { hospitalId };
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' as const } },
      { employeeCode: { contains: search, mode: 'insensitive' as const } },
    ];
  }
  if (department) where.department = department;
  if (departmentId) where.departmentId = departmentId;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  const employees = await prisma.employee.findMany({
    where,
    orderBy: { fullName: 'asc' },
    include: { user: { select: { id: true, email: true } }, dept: { select: { id: true, name: true, slug: true, type: true } } },
  });
  res.json(employees);
}));

router.post('/employees', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { employeeCode, fullName, phone, email, gender, position, department, departmentId, baseSalary, hireDate, createUser, userEmail, userPassword, userRoleId } = req.body;
  if (!employeeCode || !fullName || !position || !hireDate) {
    throw new ValidationError('Employee code, name, position, and hire date are required');
  }
  const existing = await prisma.employee.findFirst({ where: { employeeCode, hospitalId } });
  if (existing) throw new ConflictError('Employee code already exists');

  if (createUser) {
    if (!userEmail || !userPassword || !userRoleId) {
      throw new ValidationError('Email, password, and role are required when creating a login account');
    }
    const existingUser = await prisma.user.findFirst({ where: { email: userEmail, hospitalId } });
    if (existingUser) throw new ConflictError('Email already in use');
  }

  let employee;
  if (createUser) {
    const passwordHash = await bcrypt.hash(userPassword, 12);
    employee = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: userEmail, passwordHash, fullName, phone, roleId: userRoleId, hospitalId },
      });
      return tx.employee.create({
        data: { employeeCode, fullName, phone, email, gender, position, department, departmentId: departmentId || null, baseSalary: baseSalary || 0, hireDate: new Date(hireDate), userId: user.id, hospitalId },
        include: { dept: { select: { id: true, name: true, slug: true, type: true } }, user: { select: { id: true, email: true } } },
      });
    });
  } else {
    employee = await prisma.employee.create({
      data: { employeeCode, fullName, phone, email, gender, position, department, departmentId: departmentId || null, baseSalary: baseSalary || 0, hireDate: new Date(hireDate), hospitalId },
      include: { dept: { select: { id: true, name: true, slug: true, type: true } } },
    });
  }

  res.status(201).json(employee);
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const employee = await prisma.employee.findFirst({
    where: { userId: req.user!.id, hospitalId },
    include: { dept: { select: { id: true, name: true, slug: true } }, user: { select: { id: true, email: true } } },
  });
  if (!employee) throw new NotFoundError('No employee profile linked to your account');
  res.json(employee);
}));

router.get('/me/attendance', authenticate, asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { month } = req.query as Record<string, string>;
  const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id, hospitalId } });
  if (!employee) throw new NotFoundError('No employee profile linked to your account');
  const where: Record<string, unknown> = { employeeId: employee.id, hospitalId };
  if (month) {
    const parts = month.split('-');
    const year = parseInt(parts[0] ?? '0');
    const mon = parseInt(parts[1] ?? '0');
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 0, 23, 59, 59);
    where.date = { gte: start, lte: end };
  }
  const records = await prisma.attendance.findMany({ where, orderBy: { date: 'desc' } });
  res.json(records);
}));

router.get('/me/leaves', authenticate, asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id, hospitalId } });
  if (!employee) throw new NotFoundError('No employee profile linked to your account');
  const leaves = await prisma.leaveRequest.findMany({
    where: { employeeId: employee.id, hospitalId },
    orderBy: { createdAt: 'desc' },
    include: { approvedBy: { select: { id: true, fullName: true } } },
  });
  res.json(leaves);
}));

router.post('/me/leaves', authenticate, asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id, hospitalId } });
  if (!employee) throw new NotFoundError('No employee profile linked to your account');
  const { type, startDate, endDate, reason } = req.body;
  if (!type || !startDate || !endDate) {
    throw new ValidationError('Type, start date, and end date are required');
  }
  const leave = await prisma.leaveRequest.create({
    data: { employeeId: employee.id, type, startDate: new Date(startDate), endDate: new Date(endDate), reason, hospitalId },
  });
  res.status(201).json(leave);
}));

router.get('/me/payroll', authenticate, asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { year } = req.query as Record<string, string>;
  const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id, hospitalId } });
  if (!employee) throw new NotFoundError('No employee profile linked to your account');
  const where: Record<string, unknown> = { employeeId: employee.id, hospitalId };
  if (year) where.period = { contains: year };
  const records = await prisma.payrollRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(records);
}));

router.get('/me/payslips/:id', authenticate, asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const employee = await prisma.employee.findFirst({ where: { userId: req.user!.id, hospitalId } });
  if (!employee) throw new NotFoundError('No employee profile linked to your account');
  const payroll = await prisma.payrollRecord.findFirst({
    where: { id: req.params.id, employeeId: employee.id, hospitalId },
    include: { employee: { select: { id: true, fullName: true, employeeCode: true, department: true, position: true, baseSalary: true } } },
  });
  if (!payroll) throw new NotFoundError('Payroll record not found');
  const html = buildPayslipHtml(payroll, payroll.employee);
  res.type('html').send(html);
}));

router.get('/employees/:id', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const employee = await prisma.employee.findFirst({
    where: { id: req.params.id, hospitalId },
    include: {
      user: { select: { id: true, email: true } },
      dept: { select: { id: true, name: true, slug: true, type: true } },
    },
  });
  if (!employee) throw new NotFoundError('Employee not found');
  res.json(employee);
}));

router.patch('/employees/:id', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const { fullName, phone, email, gender, position, department, departmentId, baseSalary, isActive, userId } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (fullName !== undefined) data.fullName = fullName;
  if (phone !== undefined) data.phone = phone;
  if (email !== undefined) data.email = email;
  if (gender !== undefined) data.gender = gender;
  if (position !== undefined) data.position = position;
  if (department !== undefined) data.department = department;
  if (departmentId !== undefined) data.departmentId = departmentId || null;
  if (baseSalary !== undefined) data.baseSalary = baseSalary;
  if (isActive !== undefined) data.isActive = isActive;
  if (userId !== undefined) data.userId = userId;
  const employee = await prisma.employee.update({
    where: { id: req.params.id },
    data,
    include: { dept: { select: { id: true, name: true, slug: true, type: true } } },
  });
  res.json(employee);
}));

router.get('/dashboard', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [totalEmployees, todayAttendance, pendingLeaves, recentHires, departmentGroups, upcomingBirthdays, openPositions] = await Promise.all([
    prisma.employee.count({ where: { isActive: true, hospitalId } }),
    prisma.attendance.findMany({ where: { date: { gte: today, lt: tomorrow }, hospitalId, status: 'PRESENT' }, select: { employeeId: true } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING', hospitalId } }),
    prisma.employee.count({ where: { hireDate: { gte: thirtyDaysAgo }, hospitalId } }),
    prisma.employee.groupBy({ by: ['department'], where: { isActive: true, hospitalId }, _count: { id: true } }),
    prisma.employee.findMany({
      where: { isActive: true, hospitalId, hireDate: { gte: today, lte: sevenDaysFromNow } },
      select: { id: true, fullName: true, employeeCode: true, hireDate: true, department: true },
      orderBy: { hireDate: 'asc' },
    }),
    prisma.employee.count({ where: { isActive: true, hospitalId, OR: [{ position: '' }, { position: 'OPEN' }] } }),
  ]);

  const attendanceRate = totalEmployees > 0 ? Math.round((todayAttendance.length / totalEmployees) * 100) : 0;

  res.json({
    totalEmployees,
    attendanceRate,
    pendingLeaves,
    recentHires,
    departmentBreakdown: departmentGroups.map((d) => ({ department: d.department, count: d._count.id })),
    upcomingBirthdays,
    openPositions,
  });
}));

router.get('/payroll', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { period, employeeId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { hospitalId };
  if (period) where.period = period;
  if (employeeId) where.employeeId = employeeId;
  const records = await prisma.payrollRecord.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { employee: { select: { id: true, fullName: true, employeeCode: true, department: true } } },
  });
  res.json(records);
}));

router.post('/payroll', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { employeeId, period, grossPay, deductions, notes } = req.body;
  if (!employeeId || !period || grossPay === undefined) {
    throw new ValidationError('Employee ID, period, and gross pay are required');
  }
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, hospitalId } });
  if (!employee) throw new NotFoundError('Employee not found');
  const netPay = grossPay - (deductions || 0);
  const record = await prisma.payrollRecord.create({
    data: { employeeId, period, grossPay, deductions: deductions || 0, netPay, notes, hospitalId },
  });
  res.status(201).json(record);
}));

router.post('/payroll/generate', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { period, departmentId } = req.body;
  if (!period) throw new ValidationError('Period is required (e.g., 2026-07)');

  const employeeWhere: Record<string, unknown> = { isActive: true, hospitalId };
  if (departmentId) employeeWhere.departmentId = departmentId;
  const employees = await prisma.employee.findMany({ where: employeeWhere });

  if (employees.length === 0) throw new NotFoundError('No active employees found for the given criteria');

  const [yearStr, monStr] = period.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monStr);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const workingDaysInMonth = monthEnd.getDate();

  const employeeIds = employees.map((e) => e.id);
  const absentCounts = await prisma.attendance.groupBy({
    by: ['employeeId'],
    where: { employeeId: { in: employeeIds }, hospitalId, date: { gte: monthStart, lte: monthEnd }, status: 'ABSENT' },
    _count: { id: true },
  });
  const absentMap = new Map(absentCounts.map((a) => [a.employeeId, a._count.id]));

  const records = await prisma.$transaction(async (tx) => {
    const created = [];
    for (const emp of employees) {
      const baseSalary = Number(emp.baseSalary) || 0;
      const absentDays = absentMap.get(emp.id) || 0;
      const absentDeduction = absentDays > 0 ? (baseSalary / workingDaysInMonth) * absentDays : 0;
      const grossPay = baseSalary;
      const deductions = Math.round(absentDeduction * 100) / 100;
      const netPay = grossPay - deductions;

      const record = await tx.payrollRecord.create({
        data: { employeeId: emp.id, period, grossPay, deductions, netPay, hospitalId },
      });
      created.push(record);
    }
    return created;
  });

  res.status(201).json(records);
}));

router.get('/payroll/:id/payslip', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const payroll = await prisma.payrollRecord.findFirst({
    where: { id: req.params.id, hospitalId },
    include: { employee: { select: { id: true, fullName: true, employeeCode: true, department: true, position: true, baseSalary: true } } },
  });
  if (!payroll) throw new NotFoundError('Payroll record not found');
  const html = buildPayslipHtml(payroll, payroll.employee);
  res.type('html').send(html);
}));

router.patch('/payroll/:id/status', authenticate, requirePermission(PERMISSIONS.HR_WRITE), auditMiddleware('PAYROLL_PAY', 'PayrollRecord'), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { status } = req.body as { status?: string };
  const data: Record<string, unknown> = { status };
  if (status === 'PAID') {
    data.paidAt = new Date();
    const payroll = await prisma.payrollRecord.findFirst({
      where: { id: req.params.id, hospitalId },
      include: { employee: { select: { id: true, fullName: true, departmentId: true } } },
    });
    if (payroll) {
      await prisma.expense.create({
        data: {
          amount: payroll.netPay,
          category: 'SALARY',
          description: `Salary: ${payroll.employee?.fullName || 'Employee'} - ${payroll.period}`,
          date: new Date(),
          paidTo: payroll.employee?.fullName || null,
          departmentId: payroll.employee?.departmentId || null,
          notes: `Payroll record ${payroll.id}`,
          hospitalId,
        },
      });
    }
  }
  const record = await prisma.payrollRecord.update({ where: { id: req.params.id }, data: data as Prisma.PayrollRecordUpdateInput });
  res.json(record);
}));

router.get('/attendance', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { date, employeeId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { hospitalId };
  if (date) where.date = new Date(date);
  if (employeeId) where.employeeId = employeeId;
  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { employee: { select: { id: true, fullName: true, employeeCode: true } } },
  });
  res.json(records);
}));

router.post('/attendance', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { employeeId, date, checkIn, checkOut, status, notes } = req.body;
  if (!employeeId || !date) throw new ValidationError('Employee ID and date are required');
  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: { checkIn: checkIn ? new Date(checkIn) : undefined, checkOut: checkOut ? new Date(checkOut) : undefined, status, notes },
    create: { employeeId, date: new Date(date), checkIn: checkIn ? new Date(checkIn) : null, checkOut: checkOut ? new Date(checkOut) : null, status, notes, hospitalId },
  });
  res.status(201).json(record);
}));

router.get('/leaves', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { status, employeeId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { hospitalId };
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;
  const leaves = await prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      employee: { select: { id: true, fullName: true, employeeCode: true } },
      approvedBy: { select: { id: true, fullName: true } },
    },
  });
  res.json(leaves);
}));

router.post('/leaves', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { employeeId, type, startDate, endDate, reason } = req.body;
  if (!employeeId || !type || !startDate || !endDate) {
    throw new ValidationError('Employee ID, type, start date, and end date are required');
  }
  const leave = await prisma.leaveRequest.create({
    data: { employeeId, type, startDate: new Date(startDate), endDate: new Date(endDate), reason, hospitalId },
  });
  res.status(201).json(leave);
}));

router.patch('/leaves/:id/status', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { status } = req.body;
  const leave = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, hospitalId } });
  if (!leave) throw new NotFoundError('Leave request not found');

  const previousStatus = leave.status;
  const newStatus = status;

  await prisma.$transaction(async (tx) => {
    await tx.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: newStatus, approvedById: req.user!.id },
    });

    if (newStatus === 'APPROVED' && previousStatus !== 'APPROVED') {
      const leaveYear = leave.startDate.getFullYear();
      const balance = await tx.leaveBalance.findFirst({
        where: { employeeId: leave.employeeId, leaveType: leave.type as string, year: leaveYear, hospitalId },
      });
      if (balance) {
        const days = Math.ceil((leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { usedDays: { increment: days }, pendingDays: { decrement: Math.min(days, Number(balance.pendingDays)) } },
        });
      }
    }

    if (previousStatus === 'APPROVED' && (newStatus === 'REJECTED' || newStatus === 'CANCELLED')) {
      const leaveYear = leave.startDate.getFullYear();
      const balance = await tx.leaveBalance.findFirst({
        where: { employeeId: leave.employeeId, leaveType: leave.type as string, year: leaveYear, hospitalId },
      });
      if (balance) {
        const days = Math.ceil((leave.endDate.getTime() - leave.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        await tx.leaveBalance.update({
          where: { id: balance.id },
          data: { usedDays: { decrement: days } },
        });
      }
    }
  });

  const updated = await prisma.leaveRequest.findFirst({
    where: { id: req.params.id, hospitalId },
    include: { employee: { select: { id: true, fullName: true, employeeCode: true } }, approvedBy: { select: { id: true, fullName: true } } },
  });
  res.json(updated);
}));

router.get('/shift-templates', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const templates = await prisma.shiftTemplate.findMany({
    where: { hospitalId },
    orderBy: { name: 'asc' },
  });
  res.json(templates);
}));

router.post('/shift-templates', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { name, startTime, endTime, color, description } = req.body;
  if (!name || !startTime || !endTime) {
    throw new ValidationError('Name, start time, and end time are required');
  }
  const template = await prisma.shiftTemplate.create({
    data: { name, startTime, endTime, color, description, hospitalId },
  });
  res.status(201).json(template);
}));

router.patch('/shift-templates/:id', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const { name, startTime, endTime, color, description, isActive } = req.body as Record<string, unknown>;
  const data: Prisma.ShiftTemplateUpdateInput = {};
  if (name !== undefined) data.name = name as string;
  if (startTime !== undefined) data.startTime = startTime as string;
  if (endTime !== undefined) data.endTime = endTime as string;
  if (color !== undefined) data.color = color as string;
  if (description !== undefined) data.description = description as string;
  if (isActive !== undefined) data.isActive = isActive as boolean;
  const template = await prisma.shiftTemplate.update({
    where: { id: req.params.id },
    data,
  });
  res.json(template);
}));

router.delete('/shift-templates/:id', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  await prisma.shiftTemplate.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true });
}));

router.get('/shifts/roster', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { date } = req.query as Record<string, string>;
  const baseDate = date ? new Date(date) : new Date();
  const start = new Date(baseDate);
  start.setDate(start.getDate() - 7);
  const end = new Date(baseDate);
  end.setDate(end.getDate() + 7);

  const shifts = await prisma.employeeShift.findMany({
    where: { hospitalId, date: { gte: start, lte: end }, isActive: true },
    include: {
      employee: { select: { id: true, fullName: true, employeeCode: true, department: true } },
      shiftTemplate: { select: { id: true, name: true, startTime: true, endTime: true, color: true } },
    },
    orderBy: { date: 'asc' },
  });
  res.json(shifts);
}));

router.post('/shifts/assign', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { employeeId, shiftTemplateId, date } = req.body;
  if (!employeeId || !shiftTemplateId || !date) {
    throw new ValidationError('Employee ID, shift template ID, and date are required');
  }
  const shift = await prisma.employeeShift.upsert({
    where: { employeeId_shiftTemplateId_date: { employeeId, shiftTemplateId, date: new Date(date) } },
    update: { isActive: true },
    create: { employeeId, shiftTemplateId, date: new Date(date), hospitalId },
  });
  res.status(201).json(shift);
}));

router.post('/shifts/bulk-assign', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { employeeIds, shiftTemplateId, startDate, endDate } = req.body;
  if (!employeeIds?.length || !shiftTemplateId || !startDate || !endDate) {
    throw new ValidationError('Employee IDs, shift template ID, start date, and end date are required');
  }

  const template = await prisma.shiftTemplate.findFirst({ where: { id: shiftTemplateId, hospitalId } });
  if (!template) throw new NotFoundError('Shift template not found');

  const start = new Date(startDate);
  const end = new Date(endDate);
  const created: { id: string }[] = [];

  await prisma.$transaction(async (tx) => {
    const current = new Date(start);
    while (current <= end) {
      for (const employeeId of employeeIds) {
        const shift = await tx.employeeShift.upsert({
          where: { employeeId_shiftTemplateId_date: { employeeId, shiftTemplateId, date: current } },
          update: { isActive: true },
          create: { employeeId, shiftTemplateId, date: new Date(current), hospitalId },
        });
        created.push(shift);
      }
      current.setDate(current.getDate() + 1);
    }
  });

  res.status(201).json({ count: created.length, shifts: created });
}));

router.delete('/shifts/:id', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  await prisma.employeeShift.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true });
}));

router.get('/leave-balances', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { employeeId, year } = req.query as Record<string, string>;
  const where: Record<string, unknown> = { hospitalId };
  if (employeeId) where.employeeId = employeeId;
  if (year) where.year = parseInt(year);
  const balances = await prisma.leaveBalance.findMany({
    where,
    orderBy: { year: 'desc' },
    include: { employee: { select: { id: true, fullName: true, employeeCode: true } } },
  });
  res.json(balances);
}));

router.post('/leave-balances', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const hospitalId = req.user!.hospitalId!;
  const { employeeId, leaveType, totalDays, year } = req.body;
  if (!employeeId || !leaveType || totalDays === undefined || !year) {
    throw new ValidationError('Employee ID, leave type, total days, and year are required');
  }
  const existing = await prisma.leaveBalance.findFirst({
    where: { employeeId, leaveType, year, hospitalId },
  });
  let balance;
  if (existing) {
    balance = await prisma.leaveBalance.update({
      where: { id: existing.id },
      data: { totalDays },
    });
  } else {
    balance = await prisma.leaveBalance.create({
      data: { employeeId, leaveType, totalDays, year, hospitalId },
    });
  }
  res.status(201).json(balance);
}));

router.patch('/leave-balances/:id', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const { totalDays, usedDays, pendingDays } = req.body as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (totalDays !== undefined) data.totalDays = totalDays;
  if (usedDays !== undefined) data.usedDays = usedDays;
  if (pendingDays !== undefined) data.pendingDays = pendingDays;
  const balance = await prisma.leaveBalance.update({
    where: { id: req.params.id },
    data,
  });
  res.json(balance);
}));

function buildPayslipHtml(payroll: Record<string, unknown>, employee: Record<string, unknown> | null): string {
  const emp = employee as { fullName?: string; employeeCode?: string; department?: string; position?: string; baseSalary?: number } | null;
  const p = payroll as { period?: string; grossPay?: number; deductions?: number; netPay?: number; paidAt?: Date | null };
  const baseSalary = emp?.baseSalary || 0;
  const absentDeduction = p.deductions || 0;
  const netPay = p.netPay || 0;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Payslip</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#333}
  .header{text-align:center;border-bottom:2px solid #2563eb;padding-bottom:10px;margin-bottom:20px}
  .header h1{margin:0;font-size:20px;color:#2563eb}
  .info{display:flex;justify-content:space-between;margin-bottom:20px;font-size:13px}
  .info div{flex:1}
  table{width:100%;border-collapse:collapse;margin-bottom:15px;font-size:13px}
  th,td{padding:8px 12px;border:1px solid #ddd;text-align:left}
  th{background:#f3f4f6;font-weight:600}
  .net-pay{background:#ecfdf5;font-weight:bold;font-size:16px;text-align:center;padding:12px}
  .footer{margin-top:30px;font-size:11px;color:#666;display:flex;justify-content:space-between}
</style></head><body>
<div class="header"><h1>PAYSLIP</h1><p>${p.period || ''}</p></div>
<div class="info"><div><strong>Employee:</strong> ${emp?.fullName || 'N/A'}<br><strong>Code:</strong> ${emp?.employeeCode || 'N/A'}</div><div><strong>Department:</strong> ${emp?.department || 'N/A'}<br><strong>Position:</strong> ${emp?.position || 'N/A'}</div></div>
<table><thead><tr><th>Earnings</th><th>Amount</th></tr></thead><tbody>
<tr><td>Basic Salary</td><td>${baseSalary.toFixed(2)}</td></tr>
<tr><td>Total Gross</td><td><strong>${Number(p.grossPay || 0).toFixed(2)}</strong></td></tr>
</tbody></table>
<table><thead><tr><th>Deductions</th><th>Amount</th></tr></thead><tbody>
<tr><td>Absent Deduction</td><td>${absentDeduction.toFixed(2)}</td></tr>
<tr><td>Total Deductions</td><td><strong>${absentDeduction.toFixed(2)}</strong></td></tr>
</tbody></table>
<div class="net-pay">NET PAY: ${netPay.toFixed(2)}</div>
<div class="footer"><div>Employee Signature</div><div>Authorized Signature</div></div>
</body></html>`;
}

export default router;
