import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { ValidationError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';
import { NotificationService } from '../services/NotificationService.js';
import { calculateApprovalTier } from '../services/approval.service.js';

const router = Router({ mergeParams: true });

const PO_INCLUDE = {
  items: { include: { item: true } },
  supplier: true,
  createdBy: { select: { id: true, fullName: true } },
  approvedBy: { select: { id: true, fullName: true } },
  costCenter: { include: { department: true } },
  expense: true,
  asset: true,
};

router.get(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_READ),
  asyncHandler(async (req, res) => {
    const { status, departmentType, expenseType } = req.query;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (departmentType) where.departmentType = departmentType;
    if (expenseType) where.expenseType = expenseType;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: PO_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  }),
);

router.get(
  '/pending-approval',
  authenticate,
  requirePermission(PERMISSIONS.APPROVAL_READ),
  asyncHandler(async (_req, res) => {
    const orders = await prisma.purchaseOrder.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: PO_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    res.json(orders);
  }),
);

router.get(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_READ),
  asyncHandler(async (req, res) => {
    const order = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: PO_INCLUDE,
    });
    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    res.json(order);
  }),
);

router.post(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const {
      departmentType, expenseType, supplierId, costCenterId,
      notes, items, requisitionIds,
      cogsAccountId, labFeePaid, installationFreight, usefulLifeYears,
    } = req.body;

    if (!departmentType || !expenseType || !supplierId || !items?.length) {
      throw new ValidationError('departmentType, expenseType, supplierId, and items are required');
    }

    const invoiceTotal = items.reduce(
      (sum: number, it: { quantity: number; unitCost: number }) => sum + (it.quantity * it.unitCost),
      0,
    );

    const order = await prisma.purchaseOrder.create({
      data: {
        status: 'DRAFT',
        departmentType,
        expenseType,
        invoiceTotal,
        supplierId,
        costCenterId: costCenterId || null,
        notes,
        createdById: req.user!.id,
        cogsAccountId: cogsAccountId || null,
        labFeePaid: labFeePaid || null,
        installationFreight: installationFreight || null,
        usefulLifeYears: usefulLifeYears || null,
        requisitionIds: requisitionIds || [],
        items: {
          create: items.map((it: { description?: string; quantity: number; unitCost: number; itemId?: string }) => ({
            description: it.description || null,
            quantity: it.quantity,
            unitCost: it.unitCost,
            totalLineCost: it.quantity * it.unitCost,
            itemId: it.itemId || null,
          })),
        },
      },
      include: PO_INCLUDE,
    });
    res.status(201).json(order);
  }),
);

router.put(
  '/:id',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    if (existing.status !== 'DRAFT') {
      throw new ValidationError('Can only edit DRAFT purchase orders');
    }

    const {
      departmentType, expenseType, supplierId, costCenterId,
      notes, items, requisitionIds,
    } = req.body;

    if (items) {
      await prisma.purchaseOrderItem.deleteMany({ where: { orderId: req.params.id } });
      const invoiceTotal = items.reduce(
        (sum: number, it: { quantity: number; unitCost: number }) => sum + (it.quantity * it.unitCost),
        0,
      );
      await prisma.purchaseOrderItem.createMany({
        data: items.map((it: { description?: string; quantity: number; unitCost: number; itemId?: string }) => ({
          description: it.description || null,
          quantity: it.quantity,
          unitCost: it.unitCost,
          totalLineCost: it.quantity * it.unitCost,
          itemId: it.itemId || null,
          orderId: req.params.id,
        })),
      });
      await prisma.purchaseOrder.update({
        where: { id: req.params.id },
        data: { invoiceTotal },
      });
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        departmentType: departmentType || existing.departmentType,
        expenseType: expenseType || existing.expenseType,
        supplierId: supplierId || existing.supplierId,
        costCenterId: costCenterId !== undefined ? costCenterId : existing.costCenterId,
        notes: notes !== undefined ? notes : existing.notes,
        requisitionIds: requisitionIds || existing.requisitionIds,
      },
      include: PO_INCLUDE,
    });
    res.json(order);
  }),
);

router.post(
  '/:id/submit',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    if (existing.status !== 'DRAFT') {
      throw new ValidationError('Only DRAFT orders can be submitted');
    }

    const tier = calculateApprovalTier(Number(existing.invoiceTotal), existing.expenseType);

    if (tier === 1) {
      const order = await prisma.purchaseOrder.update({
        where: { id: req.params.id },
        data: {
          status: 'APPROVED',
          approvalTier: tier,
          approvedById: req.user!.id,
          approvedAt: new Date(),
        },
        include: PO_INCLUDE,
      });

      await NotificationService.notify(
        req.user!.id,
        'Purchase Order Auto-Approved',
        `PO ${order.orderNumber || order.id} was auto-approved (Tier ${tier}).`,
        `/procurement/purchase-orders/${order.id}`,
      );

      return res.json(order);
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'PENDING_APPROVAL', approvalTier: tier },
      include: PO_INCLUDE,
    });

    const expenseLabel = existing.expenseType === 'CAPEX' ? 'CAPEX' : 'Expense';
    await NotificationService.notifyApprovers(
      'approval:write',
      'Purchase Order Pending Approval',
      `PO ${order.orderNumber || order.id} (${expenseLabel}, ${Number(existing.invoiceTotal).toLocaleString()} SDG) needs Tier ${tier} approval.`,
      `/procurement/purchase-orders/${order.id}`,
    );

    res.json(order);
  }),
);

router.post(
  '/:id/approve',
  authenticate,
  requirePermission(PERMISSIONS.APPROVAL_WRITE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new ValidationError('Only PENDING_APPROVAL orders can be approved');
    }

    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: {
        status: 'APPROVED',
        approvedById: req.user!.id,
        approvedAt: new Date(),
      },
      include: PO_INCLUDE,
    });

    await NotificationService.notify(
      existing.createdById,
      'Purchase Order Approved',
      `PO ${order.orderNumber || order.id} has been approved.`,
      `/procurement/purchase-orders/${order.id}`,
    );

    res.json(order);
  }),
);

router.post(
  '/:id/reject',
  authenticate,
  requirePermission(PERMISSIONS.APPROVAL_WRITE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    if (existing.status !== 'PENDING_APPROVAL') {
      throw new ValidationError('Only PENDING_APPROVAL orders can be rejected');
    }

    const { rejectionReason } = req.body;
    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED', rejectionReason: rejectionReason || 'Rejected' },
      include: PO_INCLUDE,
    });

    await NotificationService.notify(
      existing.createdById,
      'Purchase Order Rejected',
      `PO ${order.orderNumber || order.id} was rejected. Reason: ${rejectionReason || 'N/A'}`,
      `/procurement/purchase-orders/${order.id}`,
    );

    res.json(order);
  }),
);

router.post(
  '/:id/receive',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    if (existing.status !== 'APPROVED' && existing.status !== 'PARTIALLY_RECEIVED') {
      throw new ValidationError('Only APPROVED or PARTIALLY_RECEIVED orders can receive goods');
    }

    const { receivedItems: rawReceived } = req.body;
    let receivedItems = rawReceived;

    if (!receivedItems?.length) {
      receivedItems = existing.items.map((i) => ({
        itemId: i.id,
        quantityReceived: i.quantity - i.quantityReceived,
      }));
    }

    for (const ri of receivedItems) {
      const poItem = existing.items.find((i) => i.id === ri.itemId);
      if (!poItem) {
        throw new ValidationError(`Item ${ri.itemId} not found in purchase order`);
      }
      const newReceived = poItem.quantityReceived + ri.quantityReceived;
      if (newReceived > poItem.quantity) {
        throw new ValidationError(`Cannot receive more than ordered quantity for item ${poItem.id}`);
      }

      await prisma.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: { quantityReceived: newReceived },
      });

      if (ri.itemId && ri.quantityReceived > 0) {
        const invItem = await prisma.inventoryItem.findUnique({ where: { id: ri.itemId } });
        if (invItem) {
          await prisma.inventoryItem.update({
            where: { id: ri.itemId },
            data: { quantity: invItem.quantity + ri.quantityReceived },
          });
        }
      }
    }

    const updatedItems = await prisma.purchaseOrderItem.findMany({
      where: { orderId: req.params.id },
    });
    const allReceived = updatedItems.every((i) => i.quantityReceived >= i.quantity);
    const anyReceived = updatedItems.some((i) => i.quantityReceived > 0);

    const newStatus = allReceived ? 'RECEIVED_IN_FULL' : anyReceived ? 'PARTIALLY_RECEIVED' : existing.status;

    const now = new Date();
    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: newStatus, receivedAt: now },
      include: PO_INCLUDE,
    });

    if (existing.expenseType !== 'CAPEX') {
      await autoGenerateExpenseAndDebt(order.id);
    } else if (newStatus === 'RECEIVED_IN_FULL') {
      await autoCreateFixedAsset(order.id);
    }

    await NotificationService.notify(
      existing.createdById,
      'Purchase Order Goods Received',
      `PO ${order.orderNumber || order.id} - goods received (${newStatus}).`,
      `/procurement/purchase-orders/${order.id}`,
    );

    res.json(order);
  }),
);

router.post(
  '/:id/payment',
  authenticate,
  requirePermission(PERMISSIONS.PURCHASE_WRITE),
  asyncHandler(async (req, res) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    if (existing.status !== 'RECEIVED_IN_FULL' && existing.status !== 'PARTIALLY_RECEIVED') {
      throw new ValidationError('Order must be at least partially received before payment');
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      throw new ValidationError('Valid payment amount is required');
    }

    const newAmountPaid = Number(existing.amountPaid) + amount;
    if (newAmountPaid > Number(existing.invoiceTotal)) {
      throw new ValidationError('Payment exceeds invoice total');
    }

    const paymentStatus = newAmountPaid >= Number(existing.invoiceTotal) ? 'Paid' : 'Partial';

    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { amountPaid: newAmountPaid, paymentStatus: paymentStatus as any },
      include: PO_INCLUDE,
    });

    if (existing.expenseId) {
      await prisma.expense.update({
        where: { id: existing.expenseId },
        data: { amount: newAmountPaid },
      });
    }

    res.json(order);
  }),
);

async function autoGenerateExpenseAndDebt(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { costCenter: true },
  });
  if (!po || po.expenseId) return;

  const expense = await prisma.expense.create({
    data: {
      amount: Number(po.invoiceTotal),
      category: po.expenseType === 'COGS' ? 'SUPPLIES' : 'OTHER',
      description: `Purchase Order ${po.orderNumber || po.id}`,
      date: po.receivedAt || new Date(),
      departmentId: po.costCenter?.departmentId || null,
    },
  });

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { expenseId: expense.id },
  });

  await prisma.accountsPayable.create({
    data: {
      amount: Number(po.invoiceTotal),
      description: `PO ${po.orderNumber || po.id}`,
      creditor: 'PO System',
      dueDate: null,
    },
  });
}

async function autoCreateFixedAsset(poId: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: true },
  });
  if (!po || po.assetId) return;

  const totalCost = Number(po.invoiceTotal) + Number(po.installationFreight || 0) + Number(po.labFeePaid || 0);
  const lifeYears = po.usefulLifeYears || 5;
  const monthlyDep = lifeYears > 0 ? (totalCost / (lifeYears * 12)) : 0;

  const asset = await prisma.fixedAsset.create({
    data: {
      name: `Asset from PO ${po.orderNumber || po.id}`,
      assetType: po.expenseType,
      acquisitionCost: Number(po.invoiceTotal),
      installationCost: Number(po.installationFreight || 0),
      totalCost,
      usefulLifeYears: lifeYears,
      monthlyDepreciation: Math.round(monthlyDep * 100) / 100,
      bookValue: totalCost,
      purchaseDate: po.receivedAt || new Date(),
      notes: po.notes,
    },
  });

  await prisma.purchaseOrder.update({
    where: { id: poId },
    data: { assetId: asset.id },
  });
}

export default router;
