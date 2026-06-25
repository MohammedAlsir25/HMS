import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requirePermission } from '../../middleware/auth.js';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors.js';
import { PERMISSIONS } from '../../middleware/rbac.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/employees', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const { search, department, departmentId, isActive } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
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
  const { employeeCode, fullName, phone, email, gender, position, department, departmentId, baseSalary, hireDate, userId } = req.body;
  if (!employeeCode || !fullName || !position || !hireDate) {
    throw new ValidationError('Employee code, name, position, and hire date are required');
  }
  const existing = await prisma.employee.findUnique({ where: { employeeCode } });
  if (existing) throw new ConflictError('Employee code already exists');
  const employee = await prisma.employee.create({
    data: { employeeCode, fullName, phone, email, gender, position, department, departmentId: departmentId || null, baseSalary: baseSalary || 0, hireDate: new Date(hireDate), userId },
    include: { dept: { select: { id: true, name: true, slug: true, type: true } } },
  });
  res.status(201).json(employee);
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

router.get('/payroll', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const { period, employeeId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
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
  const { employeeId, period, grossPay, deductions, notes } = req.body;
  if (!employeeId || !period || grossPay === undefined) {
    throw new ValidationError('Employee ID, period, and gross pay are required');
  }
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new NotFoundError('Employee not found');
  const netPay = grossPay - (deductions || 0);
  const record = await prisma.payrollRecord.create({
    data: { employeeId, period, grossPay, deductions: deductions || 0, netPay, notes },
  });
  res.status(201).json(record);
}));

router.patch('/payroll/:id/status', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const { status } = req.body as { status?: string };
  const data: Record<string, unknown> = { status };
  if (status === 'PAID') data.paidAt = new Date();
  const record = await prisma.payrollRecord.update({ where: { id: req.params.id }, data });
  res.json(record);
}));

router.get('/attendance', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const { date, employeeId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
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
  const { employeeId, date, checkIn, checkOut, status, notes } = req.body;
  if (!employeeId || !date) throw new ValidationError('Employee ID and date are required');
  const record = await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: { checkIn: checkIn ? new Date(checkIn) : undefined, checkOut: checkOut ? new Date(checkOut) : undefined, status, notes },
    create: { employeeId, date: new Date(date), checkIn: checkIn ? new Date(checkIn) : null, checkOut: checkOut ? new Date(checkOut) : null, status, notes },
  });
  res.status(201).json(record);
}));

router.get('/leaves', authenticate, requirePermission(PERMISSIONS.HR_READ), asyncHandler(async (req, res) => {
  const { status, employeeId } = req.query as Record<string, string>;
  const where: Record<string, unknown> = {};
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
  const { employeeId, type, startDate, endDate, reason } = req.body;
  if (!employeeId || !type || !startDate || !endDate) {
    throw new ValidationError('Employee ID, type, start date, and end date are required');
  }
  const leave = await prisma.leaveRequest.create({
    data: { employeeId, type, startDate: new Date(startDate), endDate: new Date(endDate), reason },
  });
  res.status(201).json(leave);
}));

router.patch('/leaves/:id/status', authenticate, requirePermission(PERMISSIONS.HR_WRITE), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const leave = await prisma.leaveRequest.update({
    where: { id: req.params.id },
    data: { status, approvedById: req.user.id },
  });
  res.json(leave);
}));

export default router;
