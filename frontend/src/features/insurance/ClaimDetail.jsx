import { useState } from 'react';
import { useSubmitClaim, useApproveClaim, useRejectClaim, useCreateSettlement } from '../../hooks/queries/useInsurance';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';
import { Printer } from 'lucide-react';

const STATUS_STYLES = {
  DRAFT: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
  SUBMITTED: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  UNDER_REVIEW: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  APPROVED: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  PARTIALLY_APPROVED: 'bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200',
  REJECTED: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  SETTLED: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200',
  CLOSED: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
};

export default function ClaimDetail({ claim, onClose }) {
  const submitMutation = useSubmitClaim();
  const approveMutation = useApproveClaim();
  const rejectMutation = useRejectClaim();
  const settlementMutation = useCreateSettlement();
  const [actionType, setActionType] = useState(null);
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [settlementForm, setSettlementForm] = useState({ amount: '', settlementDate: new Date().toISOString().slice(0, 10), referenceNumber: '', notes: '' });

  if (!claim) return null;

  const canSubmit = claim.status === 'DRAFT';
  const canApprove = claim.status === 'SUBMITTED' || claim.status === 'UNDER_REVIEW';
  const canReject = claim.status === 'SUBMITTED' || claim.status === 'UNDER_REVIEW';
  const canSettle = claim.status === 'APPROVED' || claim.status === 'PARTIALLY_APPROVED';

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const rows = [
      ['Claim #', claim.claimNumber],
      ['Patient', `${claim.patient?.firstName || ''} ${claim.patient?.lastName || ''}`],
      ['Insurance Company', claim.insuranceCompany?.name || '-'],
      ['Policy #', claim.insurancePolicy?.policyNumber || '-'],
      ['Status', (claim.status || '').replace(/_/g, ' ')],
      ['Claim Amount', formatCurrency(claim.claimAmount)],
      claim.approvedAmount ? ['Approved Amount', formatCurrency(claim.approvedAmount)] : null,
      ['Paid Amount', formatCurrency(claim.paidAmount || 0)],
      claim.invoiceId ? ['Invoice', claim.invoiceId] : null,
      claim.preAuthorizationId ? ['Pre-Auth', claim.preAuthorizationId] : null,
      claim.submittedAt ? ['Submitted', new Date(claim.submittedAt).toLocaleString()] : null,
      claim.settledAt ? ['Settled', new Date(claim.settledAt).toLocaleString()] : null,
    ].filter(Boolean);
    printWindow.document.write(`
      <html><head><title>Insurance Claim - ${claim.claimNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 2cm; font-size: 12pt; }
        h1 { font-size: 18pt; margin-bottom: 0.5cm; }
        .header { text-align: center; margin-bottom: 1cm; border-bottom: 2px solid #333; padding-bottom: 0.5cm; }
        table { width: 100%; border-collapse: collapse; margin: 0.5cm 0; }
        th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
        th { background: #f0f0f0; }
        .footer { margin-top: 2cm; font-size: 10pt; color: #666; text-align: center; border-top: 1px solid #999; padding-top: 0.5cm; }
      </style></head><body>
        <div class="header"><h1>Insurance Claim Form</h1></div>
        <table>
          ${rows.map(([label, value]) => `<tr><td style="font-weight:bold;width:40%;">${label}</td><td>${value}</td></tr>`).join('')}
        </table>
        ${claim.rejectionReason ? `<p style="margin-top:1cm;"><strong>Rejection Reason:</strong> ${claim.rejectionReason}</p>` : ''}
        ${claim.notes ? `<p><strong>Notes:</strong> ${claim.notes}</p>` : ''}
        <div class="footer">Printed at ${new Date().toLocaleString()}</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const handleSubmit = async () => {
    try {
      await submitMutation.mutateAsync(claim.id);
      toast.success('Claim submitted');
      setActionType(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit claim');
    }
  };

  const handleApprove = async () => {
    if (!approvedAmount || parseFloat(approvedAmount) <= 0) {
      toast.error('Enter a valid approved amount');
      return;
    }
    try {
      await approveMutation.mutateAsync({ id: claim.id, approvedAmount: parseFloat(approvedAmount) });
      toast.success('Claim approved');
      setActionType(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to approve claim');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: claim.id, rejectionReason });
      toast.success('Claim rejected');
      setActionType(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to reject claim');
    }
  };

  const handleSettle = async () => {
    if (!settlementForm.amount || parseFloat(settlementForm.amount) <= 0) {
      toast.error('Enter a valid settlement amount');
      return;
    }
    try {
      await settlementMutation.mutateAsync({
        claimId: claim.id,
        insuranceCompanyId: claim.insuranceCompanyId,
        amount: parseFloat(settlementForm.amount),
        settlementDate: settlementForm.settlementDate,
        referenceNumber: settlementForm.referenceNumber || undefined,
        notes: settlementForm.notes || undefined,
      });
      toast.success('Settlement recorded');
      setActionType(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to record settlement');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-obsidian">Claim Detail</h3>
        <button onClick={onClose} className="text-slate hover:text-obsidian touch-target">&times;</button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Claim #</span>
          <span className="text-body font-medium text-obsidian">{claim.claimNumber}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Patient</span>
          <span className="text-body text-obsidian">{claim.patient?.firstName} {claim.patient?.lastName}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Company</span>
          <span className="text-body text-obsidian">{claim.insuranceCompany?.name || '-'}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Policy #</span>
          <span className="text-body text-obsidian">{claim.insurancePolicy?.policyNumber || '-'}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Status</span>
          <Badge className={STATUS_STYLES[claim.status] || ''}>{claim.status?.replace(/_/g, ' ')}</Badge>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Claim Amount</span>
          <span className="text-body font-semibold text-obsidian">{formatCurrency(claim.claimAmount)}</span>
        </div>
        {claim.approvedAmount && (
          <div className="flex justify-between py-2 border-b border-silver/50">
            <span className="text-caption text-slate">Approved Amount</span>
            <span className="text-body font-semibold text-green-600">{formatCurrency(claim.approvedAmount)}</span>
          </div>
        )}
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Paid Amount</span>
          <span className="text-body font-semibold text-blue-600">{formatCurrency(claim.paidAmount || 0)}</span>
        </div>
        {claim.invoiceId && (
          <div className="flex justify-between py-2 border-b border-silver/50">
            <span className="text-caption text-slate">Invoice</span>
            <span className="text-body text-obsidian">{claim.invoiceId}</span>
          </div>
        )}
        {claim.preAuthorizationId && (
          <div className="flex justify-between py-2 border-b border-silver/50">
            <span className="text-caption text-slate">Pre-Auth</span>
            <span className="text-body text-obsidian">{claim.preAuthorizationId}</span>
          </div>
        )}
        {claim.submittedAt && (
          <div className="flex justify-between py-2 border-b border-silver/50">
            <span className="text-caption text-slate">Submitted</span>
            <span className="text-body text-obsidian">{new Date(claim.submittedAt).toLocaleString()}</span>
          </div>
        )}
        {claim.settledAt && (
          <div className="flex justify-between py-2 border-b border-silver/50">
            <span className="text-caption text-slate">Settled</span>
            <span className="text-body text-obsidian">{new Date(claim.settledAt).toLocaleString()}</span>
          </div>
        )}
        {claim.rejectionReason && (
          <div className="py-2 border-b border-silver/50">
            <span className="text-caption text-slate block mb-1">Rejection Reason</span>
            <p className="text-body text-red-600 dark:text-red-400">{claim.rejectionReason}</p>
          </div>
        )}
      </div>

      {claim.notes && (
        <div>
          <h4 className="text-sm font-semibold text-graphite mb-1">Notes</h4>
          <p className="text-body text-obsidian">{claim.notes}</p>
        </div>
      )}

      <div className="border-t border-silver pt-4 space-y-3">
        {actionType === 'submit' && (
          <div className="space-y-2">
            <p className="text-sm text-slate">Submit this claim to the insurance company?</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting...' : 'Confirm Submit'}
              </Button>
            </div>
          </div>
        )}

        {actionType === 'approve' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-graphite block">Approved Amount</label>
            <Input type="number" min="0" step="0.01" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} placeholder="Enter approved amount" />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleApprove} disabled={approveMutation.isPending}>
                {approveMutation.isPending ? 'Approving...' : 'Confirm Approve'}
              </Button>
            </div>
          </div>
        )}

        {actionType === 'reject' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-graphite block">Rejection Reason *</label>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleReject} disabled={rejectMutation.isPending} className="bg-red-600 hover:bg-red-700">
                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        )}

        {actionType === 'settle' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-graphite block mb-1">Amount *</label>
                <Input type="number" min="0" step="0.01" value={settlementForm.amount} onChange={(e) => setSettlementForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-graphite block mb-1">Date *</label>
                <Input type="date" value={settlementForm.settlementDate} onChange={(e) => setSettlementForm((p) => ({ ...p, settlementDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-graphite block mb-1">Reference #</label>
                <Input type="text" value={settlementForm.referenceNumber} onChange={(e) => setSettlementForm((p) => ({ ...p, referenceNumber: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-graphite block mb-1">Notes</label>
                <Input type="text" value={settlementForm.notes} onChange={(e) => setSettlementForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setActionType(null)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSettle} disabled={settlementMutation.isPending}>
                {settlementMutation.isPending ? 'Recording...' : 'Record Settlement'}
              </Button>
            </div>
          </div>
        )}

        {!actionType && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={handlePrint}>
              <Printer size={14} className="mr-1" /> Print Claim
            </Button>
            {canSubmit && (
              <Button variant="primary" size="sm" onClick={() => setActionType('submit')}>
                Submit Claim
              </Button>
            )}
            {canApprove && (
              <Button variant="primary" size="sm" onClick={() => { setApprovedAmount(claim.claimAmount || ''); setActionType('approve'); }}>
                Approve
              </Button>
            )}
            {canReject && (
              <Button variant="ghost" size="sm" onClick={() => setActionType('reject')} className="text-red-600 hover:text-red-700">
                Reject
              </Button>
            )}
            {canSettle && (
              <Button variant="primary" size="sm" onClick={() => setActionType('settle')}>
                Record Settlement
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
