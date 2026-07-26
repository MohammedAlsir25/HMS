import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import { renderArabicInvoice, renderArabicReceipt, renderPatientStatement } from '../utils/htmlTemplates.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/invoices/:id/arabic-pdf', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      items: { include: { serviceItem: true } },
      patient: true,
      hospital: true,
    },
  });

  if (!invoice || (invoice.hospitalId && invoice.hospitalId !== req.user!.hospitalId)) {
    res.status(404).json({ message: 'Invoice not found' });
    return;
  }

  const hospital = invoice.hospital as { name: string; address: string | null; phone: string | null } | null;
  const patient = invoice.patient as { fullName: string; mrn: string };

  const html = renderArabicInvoice({
    hospitalName: hospital?.name || '\u0627\u0644\u0645\u0633\u062a\u0634\u0641\u0649',
    hospitalAddress: hospital?.address || '',
    hospitalPhone: hospital?.phone || '',
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.created_at ? new Date(invoice.created_at).toLocaleDateString('ar-SA') : '',
    dueDate: invoice.created_at ? new Date(new Date(invoice.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SA') : '',
    patientNameAr: patient.fullName,
    patientNameEn: patient.fullName,
    patientMrn: patient.mrn,
    items: invoice.items.map((item) => ({
      description: item.description || (item as typeof item & { serviceItem?: { name: string } }).serviceItem?.name || '',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    })),
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    tax: Number(invoice.tax),
    total: Number(invoice.total),
    currency: invoice.currency || 'SDG',
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}));

router.get('/invoices/:id/arabic-receipt', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: req.params.id },
    include: {
      items: true,
      patient: true,
      hospital: true,
    },
  });

  if (!invoice || (invoice.hospitalId && invoice.hospitalId !== req.user!.hospitalId)) {
    res.status(404).json({ message: 'Invoice not found' });
    return;
  }

  const hospital = invoice.hospital as { name: string; address: string | null; phone: string | null } | null;
  const patient = invoice.patient as { fullName: string; mrn: string };
  const now = new Date();

  const html = renderArabicReceipt({
    hospitalName: hospital?.name || '\u0627\u0644\u0645\u0633\u062a\u0634\u0641\u0649',
    hospitalAddress: hospital?.address || '',
    receiptNumber: `REC-${invoice.invoiceNumber}`,
    receiptDate: now.toLocaleDateString('ar-SA'),
    receiptTime: now.toLocaleTimeString('ar-SA'),
    patientName: patient.fullName,
    patientMrn: patient.mrn,
    invoiceNumber: invoice.invoiceNumber,
    paymentMethod: 'CASH',
    amountPaid: Number(invoice.amountPaid),
    remainingBalance: Number(invoice.total) - Number(invoice.amountPaid),
    currency: invoice.currency || 'SDG',
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}));

router.get('/patients/:patientId/statement', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const patientId = req.params.patientId;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });

  if (!patient) {
    res.status(404).json({ message: 'Patient not found' });
    return;
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      patientId,
      ...(req.user!.hospitalId ? { hospitalId: req.user!.hospitalId } : {}),
    },
    include: { items: true, hospital: true },
    orderBy: { created_at: 'desc' },
  });

  const hospital = (invoices[0]?.hospital as { name: string; address: string | null; phone: string | null } | null) || null;

  const transactions = invoices.map((inv) => {
    const total = Number(inv.total);
    const paid = Number(inv.amountPaid);
    const balance = total - paid;
    const statusMap: Record<string, { class: string; label: string }> = {
      Pending: { class: 'pending', label: 'Pending' },
      PartialPayment: { class: 'partial', label: 'Partial' },
      PaidInFull: { class: 'paid', label: 'Paid' },
      Voided: { class: 'voided', label: 'Voided' },
    };
    const st = statusMap[inv.paymentStatus] || { class: 'pending', label: inv.paymentStatus };

    return {
      date: inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '',
      description: inv.notes || inv.sourceType,
      invoiceNumber: inv.invoiceNumber,
      status: inv.paymentStatus,
      statusClass: st.class,
      statusLabel: st.label,
      amount: total,
      paid,
      balance,
    };
  });

  const totalInvoiced = transactions.reduce((s, t) => s + t.amount, 0);
  const totalPaid = transactions.reduce((s, t) => s + t.paid, 0);
  const outstandingBalance = totalInvoiced - totalPaid;
  const now = new Date();

  const html = renderPatientStatement({
    hospitalName: hospital?.name || 'Hospital',
    hospitalAddress: hospital?.address || '',
    hospitalPhone: hospital?.phone || '',
    patientName: patient.fullName,
    patientMrn: patient.mrn,
    periodFrom: invoices.length > 0 && invoices[invoices.length - 1]!.created_at ? new Date(invoices[invoices.length - 1]!.created_at!).toLocaleDateString() : '',
    periodTo: invoices.length > 0 && invoices[0]!.created_at ? new Date(invoices[0]!.created_at!).toLocaleDateString() : '',
    generatedDate: now.toLocaleDateString(),
    transactions,
    totalInvoiced,
    totalPaid,
    insuranceCovered: 0,
    creditMemos: 0,
    outstandingBalance,
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}));

export default router;
