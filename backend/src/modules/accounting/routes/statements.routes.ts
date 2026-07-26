import { Router } from 'express';
import { authenticate, requirePermission } from '../../../middleware/auth.js';
import { asyncHandler } from '../../../middleware/errorHandler.js';
import { NotFoundError } from '../../../utils/errors.js';
import { PERMISSIONS } from '../../../middleware/rbac.js';
import prisma from '../../../lib/prisma.js';

const router = Router();

router.get('/patient/:patientId', authenticate, requirePermission(PERMISSIONS.ACCOUNTING_READ), asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { from, to } = req.query;

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Patient not found');

  const where: Record<string, unknown> = { patientId };
  if (from || to) {
    where.created_at = {} as Record<string, unknown>;
    if (from) (where.created_at as Record<string, unknown>).gte = new Date(from as string);
    if (to) (where.created_at as Record<string, unknown>).lte = new Date(to as string);
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: { items: true },
    orderBy: { created_at: 'asc' },
  });

  const transactions = await prisma.transaction.findMany({
    where: { patientId, is_deleted: false },
    orderBy: { createdAt: 'asc' },
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const totalPaid = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const balance = totalBilled - totalPaid;

  const html = generateStatementHTML(patient, invoices, transactions, { totalBilled, totalPaid, balance }, from as string, to as string);

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}));

function generateStatementHTML(
  patient: { fullName: string; mrn: string; phone: string | null },
  invoices: Array<{ id: string; created_at: Date | null; invoiceNumber: string; total: unknown; items: Array<{ description: string }> }>,
  transactions: Array<{ id: string; createdAt: Date; amount: unknown; paymentMethod: string }>,
  totals: { totalBilled: number; totalPaid: number; balance: number },
  from: string | undefined,
  to: string | undefined,
) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Patient Statement - ${patient.fullName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; padding: 2rem; color: #1a1a2e; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #5227FF; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    .header h1 { font-size: 1.5rem; color: #5227FF; }
    .header .meta { text-align: right; font-size: 0.875rem; color: #666; }
    .patient-info { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .patient-info h3 { margin-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; }
    th { background: #5227FF; color: white; padding: 0.75rem; text-align: left; font-size: 0.8rem; }
    td { padding: 0.75rem; border-bottom: 1px solid #e5e7eb; font-size: 0.875rem; }
    .summary { display: flex; gap: 2rem; justify-content: flex-end; margin-top: 1rem; }
    .summary-card { background: #f8f9fa; padding: 1rem 1.5rem; border-radius: 8px; text-align: center; }
    .summary-card .amount { font-size: 1.25rem; font-weight: 700; color: #5227FF; }
    .footer { margin-top: 2rem; text-align: center; font-size: 0.75rem; color: #999; }
    @media print { body { padding: 1rem; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Patient Statement</h1>
      <p style="font-size: 0.875rem; color: #666;">Period: ${from || 'All'} to ${to || 'Present'}</p>
    </div>
    <div class="meta">
      <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
  </div>

  <div class="patient-info">
    <h3>Patient Information</h3>
    <p><strong>Name:</strong> ${patient.fullName}</p>
    <p><strong>MRN:</strong> ${patient.mrn || 'N/A'}</p>
    <p><strong>Phone:</strong> ${patient.phone || 'N/A'}</p>
  </div>

  <h3>Invoices</h3>
  <table>
    <thead>
      <tr><th>Date</th><th>Invoice #</th><th>Description</th><th>Amount</th><th>Paid</th><th>Balance</th></tr>
    </thead>
    <tbody>
      ${invoices.map(inv => {
        const invPaid = transactions.reduce((s, t) => s + Number(t.amount || 0), 0);
        const invTotal = Number(inv.total || 0);
        const invBalance = invTotal - invPaid;
        return `<tr>
          <td>${inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'N/A'}</td>
          <td>${inv.invoiceNumber}</td>
          <td>${inv.items?.map((i: { description: string }) => i.description).join(', ') || 'Invoice'}</td>
          <td>${invTotal.toFixed(2)}</td>
          <td>${invPaid.toFixed(2)}</td>
          <td>${invBalance.toFixed(2)}</td>
        </tr>`;
      }).join('')}
      ${invoices.length === 0 ? '<tr><td colspan="6" style="text-align: center; color: #999;">No invoices found for this period</td></tr>' : ''}
    </tbody>
  </table>

  <h3>Payments</h3>
  <table>
    <thead>
      <tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr>
    </thead>
    <tbody>
      ${transactions.map(tx => `<tr>
        <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
        <td>${tx.paymentMethod || 'N/A'}</td>
        <td>${tx.id.slice(0, 8)}</td>
        <td>${Number(tx.amount || 0).toFixed(2)}</td>
      </tr>`).join('')}
      ${transactions.length === 0 ? '<tr><td colspan="4" style="text-align: center; color: #999;">No payments found</td></tr>' : ''}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-card"><p>Total Billed</p><p class="amount">${totals.totalBilled.toFixed(2)}</p></div>
    <div class="summary-card"><p>Total Paid</p><p class="amount">${totals.totalPaid.toFixed(2)}</p></div>
    <div class="summary-card"><p>Balance Due</p><p class="amount" style="color: ${totals.balance > 0 ? '#ef4444' : '#22c55e'}">${totals.balance.toFixed(2)}</p></div>
  </div>

  <div class="footer">
    <p>This is a computer-generated statement. For questions, contact billing.</p>
  </div>
  <div class="no-print" style="text-align: center; margin-top: 1rem;">
    <button onclick="window.print()" style="padding: 0.5rem 1rem; background: #5227FF; color: white; border: none; border-radius: 6px; cursor: pointer;">Print Statement</button>
  </div>
</body>
</html>`;
}

export default router;
