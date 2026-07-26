import { Router } from 'express';
import { $Enums } from '@prisma/client';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError, NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { auditMiddleware } from '../../../middleware/auditLog.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { limit, offset } = req.query as Record<string, string>;
  const patientId = req.query.patientId as string | undefined;
  const status = req.query.status as string | undefined;
  const where: Record<string, unknown> = {};
  if (patientId) where.patientId = patientId;
  if (status) where.status = status as $Enums.PaymentPlanStatus;
  const [plans, totalCount] = await Promise.all([
    prisma.paymentPlan.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit ? parseInt(limit) : 100,
      skip: offset ? parseInt(offset) : 0,
      include: {
        patient: { select: { id: true, fullName: true, mrn: true } },
        installments: { orderBy: { installmentNumber: 'asc' } },
      },
    }),
    prisma.paymentPlan.count({ where }),
  ]);
  res.json({ plans, totalCount });
}));

router.get('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const plan = await prisma.paymentPlan.findUnique({
    where: { id: req.params.id! },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      installments: { orderBy: { installmentNumber: 'asc' } },
    },
  });
  if (!plan) throw new NotFoundError('Payment plan not found');

  let invoice = null;
  if (plan.invoiceId) {
    invoice = await prisma.invoice.findUnique({
      where: { id: plan.invoiceId },
      select: { id: true, invoiceNumber: true, total: true },
    });
  }

  res.json({ ...plan, invoice });
}));

router.post('/', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('CREATE_PAYMENT_PLAN', 'PaymentPlan'), asyncHandler(async (req, res) => {
  const { patientId, invoiceId, totalAmount, numberOfInstallments, frequency, startDate, notes } = req.body;
  if (!patientId || !totalAmount || !numberOfInstallments || !startDate) {
    throw new ValidationError('patientId, totalAmount, numberOfInstallments, and startDate are required');
  }

  const total = parseFloat(totalAmount);
  const numInstallments = parseInt(numberOfInstallments);
  if (total <= 0) throw new ValidationError('totalAmount must be positive');
  if (numInstallments <= 0) throw new ValidationError('numberOfInstallments must be positive');

  const installmentAmount = Math.ceil((total / numInstallments) * 100) / 100;

  const plan = await prisma.paymentPlan.create({
    data: {
      patientId,
      invoiceId: invoiceId || null,
      totalAmount: total,
      numberOfInstallments: numInstallments,
      installmentAmount,
      frequency: (frequency as $Enums.PaymentPlanFrequency) || 'MONTHLY',
      startDate: new Date(startDate),
      notes: notes || null,
      createdById: req.user!.id,
      installments: {
        createMany: {
          data: Array.from({ length: numInstallments }, (_, i) => {
            const due = new Date(startDate);
            const freq = frequency || 'MONTHLY';
            if (freq === 'WEEKLY') due.setDate(due.getDate() + i * 7);
            else if (freq === 'BIWEEKLY') due.setDate(due.getDate() + i * 14);
            else if (freq === 'QUARTERLY') due.setMonth(due.getMonth() + i * 3);
            else due.setMonth(due.getMonth() + i);

            const isLast = i === numInstallments - 1;
            const amt = isLast ? total - installmentAmount * (numInstallments - 1) : installmentAmount;

            return {
              installmentNumber: i + 1,
              amount: amt,
              dueDate: due,
            };
          }),
        },
      },
    },
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      installments: { orderBy: { installmentNumber: 'asc' } },
    },
  });
  res.status(201).json(plan);
}));

router.patch('/:id', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('UPDATE_PAYMENT_PLAN', 'PaymentPlan'), asyncHandler(async (req, res) => {
  const { status, notes } = req.body;
  const data: Record<string, unknown> = {};
  if (status !== undefined) data.status = status as $Enums.PaymentPlanStatus;
  if (notes !== undefined) data.notes = notes;
  const plan = await prisma.paymentPlan.update({
    where: { id: req.params.id! },
    data,
    include: {
      patient: { select: { id: true, fullName: true, mrn: true } },
      installments: { orderBy: { installmentNumber: 'asc' } },
    },
  });
  res.json(plan);
}));

router.post('/:id/installments/:instId/pay', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_WRITE), auditMiddleware('PAY_INSTALLMENT', 'PaymentInstallment'), asyncHandler(async (req, res) => {
  const { amountPaid, paymentMethod } = req.body;
  if (!amountPaid || parseFloat(amountPaid) <= 0) throw new ValidationError('Valid amountPaid is required');

  const plan = await prisma.paymentPlan.findUnique({
    where: { id: req.params.id! },
    include: { patient: true },
  });
  if (!plan) throw new NotFoundError('Payment plan not found');

  const installment = await prisma.paymentInstallment.findUnique({
    where: { id: req.params.instId! },
  });
  if (!installment) throw new NotFoundError('Installment not found');
  if (installment.planId !== plan.id) throw new ValidationError('Installment does not belong to this plan');

  const paid = parseFloat(amountPaid);
  const newAmountPaid = Number(installment.amountPaid || 0) + paid;
  const installmentTotal = Number(installment.amount);

  const instStatus: $Enums.InstallmentStatus = newAmountPaid >= installmentTotal ? 'PAID' : 'PENDING';

  const [updatedInstallment] = await prisma.$transaction([
    prisma.paymentInstallment.update({
      where: { id: req.params.instId! },
      data: {
        amountPaid: newAmountPaid,
        paidDate: instStatus === 'PAID' ? new Date() : null,
        status: instStatus,
      },
    }),
    prisma.transaction.create({
      data: {
        type: 'RECEPTION',
        amount: paid,
        paymentMethod: (paymentMethod as $Enums.PaymentMethod) || 'CASH',
        description: `Payment plan installment #${installment.installmentNumber} for ${plan.patient.fullName}`,
        shiftId: req.user!.id,
        cashierId: req.user!.id,
        patientId: plan.patientId,
      },
    }),
  ]);

  const allPaid = await prisma.paymentInstallment.findMany({
    where: { planId: plan.id },
  });
  const allSettled = allPaid.every(inst => inst.status === 'PAID');
  if (allSettled) {
    await prisma.paymentPlan.update({
      where: { id: plan.id },
      data: { status: 'COMPLETED' },
    });
  }

  res.json({ installment: updatedInstallment, transactionCreated: true });
}));

export default router;
