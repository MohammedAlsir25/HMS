import { useState } from 'react';
import { useApprovePreAuthorization, useRejectPreAuthorization, useCancelPreAuthorization } from '../../hooks/queries/useInsurance';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  SUBMITTED: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  UNDER_REVIEW: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  APPROVED: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  PARTIALLY_APPROVED: 'bg-lime-100 dark:bg-lime-900 text-lime-800 dark:text-lime-200',
  REJECTED: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  CANCELLED: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
  EXPIRED: 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200',
};

export default function PreAuthDetail({ preAuth, onClose }) {
  const approveMutation = useApprovePreAuthorization();
  const rejectMutation = useRejectPreAuthorization();
  const cancelMutation = useCancelPreAuthorization();
  const [approvedAmount, setApprovedAmount] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionType, setActionType] = useState(null);

  if (!preAuth) return null;

  const procedures = preAuth.plannedProcedures || [];
  const canApprove = preAuth.status === 'SUBMITTED' || preAuth.status === 'UNDER_REVIEW';
  const canReject = preAuth.status === 'SUBMITTED' || preAuth.status === 'UNDER_REVIEW';
  const canCancel = preAuth.status === 'SUBMITTED' || preAuth.status === 'UNDER_REVIEW';

  const handleApprove = async () => {
    if (!approvedAmount || parseFloat(approvedAmount) <= 0) {
      toast.error('Enter a valid approved amount');
      return;
    }
    try {
      await approveMutation.mutateAsync({ id: preAuth.id, approvedAmount: parseFloat(approvedAmount) });
      toast.success('Pre-authorization approved');
      setActionType(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: preAuth.id, rejectionReason });
      toast.success('Pre-authorization rejected');
      setActionType(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to reject');
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync(preAuth.id);
      toast.success('Pre-authorization cancelled');
      setActionType(null);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-obsidian">Pre-Authorization Detail</h3>
        <button onClick={onClose} className="text-slate hover:text-obsidian touch-target">&times;</button>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Reference #</span>
          <span className="text-body font-medium text-obsidian">{preAuth.referenceNumber}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Patient</span>
          <span className="text-body text-obsidian">{preAuth.patient?.firstName} {preAuth.patient?.lastName}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Company</span>
          <span className="text-body text-obsidian">{preAuth.insuranceCompany?.name || preAuth.insurancePolicy?.insuranceCompany?.name || '-'}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Policy #</span>
          <span className="text-body text-obsidian">{preAuth.insurancePolicy?.policyNumber || '-'}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Status</span>
          <Badge className={STATUS_STYLES[preAuth.status] || ''}>{preAuth.status}</Badge>
        </div>
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Diagnosis</span>
          <span className="text-body text-obsidian">{preAuth.diagnosis}</span>
        </div>
        {preAuth.diagnosisCode && (
          <div className="flex justify-between py-2 border-b border-silver/50">
            <span className="text-caption text-slate">ICD-10</span>
            <span className="text-body text-obsidian">{preAuth.diagnosisCode}</span>
          </div>
        )}
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Estimated Total</span>
          <span className="text-body font-semibold text-obsidian">{formatCurrency(preAuth.estimatedTotalCost)}</span>
        </div>
        {preAuth.approvedAmount && (
          <div className="flex justify-between py-2 border-b border-silver/50">
            <span className="text-caption text-slate">Approved Amount</span>
            <span className="text-body font-semibold text-green-600">{formatCurrency(preAuth.approvedAmount)}</span>
          </div>
        )}
        {preAuth.rejectionReason && (
          <div className="py-2 border-b border-silver/50">
            <span className="text-caption text-slate block mb-1">Rejection Reason</span>
            <p className="text-body text-red-600 dark:text-red-400">{preAuth.rejectionReason}</p>
          </div>
        )}
        <div className="flex justify-between py-2 border-b border-silver/50">
          <span className="text-caption text-slate">Submitted</span>
          <span className="text-body text-obsidian">{preAuth.submittedAt ? new Date(preAuth.submittedAt).toLocaleString() : '-'}</span>
        </div>
        {preAuth.reviewedAt && (
          <div className="flex justify-between py-2 border-b border-silver/50">
            <span className="text-caption text-slate">Reviewed</span>
            <span className="text-body text-obsidian">{new Date(preAuth.reviewedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {procedures.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-graphite mb-2">Planned Procedures</h4>
          <div className="space-y-1">
            {procedures.map((proc, i) => (
              <div key={i} className="flex justify-between py-1.5 text-sm border-b border-silver/50">
                <span className="text-obsidian">{proc.name}</span>
                <span className="font-medium">{formatCurrency(proc.estimatedCost || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {preAuth.clinicalNotes && (
        <div>
          <h4 className="text-sm font-semibold text-graphite mb-1">Clinical Notes</h4>
          <p className="text-body text-obsidian">{preAuth.clinicalNotes}</p>
        </div>
      )}

      <div className="border-t border-silver pt-4 space-y-3">
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

        {!actionType && (
          <div className="flex gap-2 flex-wrap">
            {canApprove && (
              <Button variant="primary" size="sm" onClick={() => { setApprovedAmount(preAuth.estimatedTotalCost || ''); setActionType('approve'); }}>
                Approve
              </Button>
            )}
            {canReject && (
              <Button variant="ghost" size="sm" onClick={() => setActionType('reject')} className="text-red-600 hover:text-red-700">
                Reject
              </Button>
            )}
            {canCancel && (
              <Button variant="ghost" size="sm" onClick={handleCancel} disabled={cancelMutation.isPending} className="text-slate">
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Pre-Auth'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
