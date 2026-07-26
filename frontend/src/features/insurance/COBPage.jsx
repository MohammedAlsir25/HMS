import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/currency';

const ORDER_LABELS = { 1: 'Primary', 2: 'Secondary', 3: 'Tertiary' };
const ORDER_COLORS = {
  1: 'bg-lilac-100 dark:bg-lilac-900 text-lilac-800 dark:text-lilac-200',
  2: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  3: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200',
};

function useCOBPatientPolicies(patientId) {
  return useQuery({
    queryKey: ['insurance', 'cob', patientId],
    queryFn: () => api.get(`/insurance/cob/patient/${patientId}`),
    enabled: !!patientId,
  });
}

function useProcessCOB() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId }) => api.post(`/insurance/cob/process/${claimId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance', 'cob'] }),
  });
}

function useReorderPolicies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.put('/insurance/cob/policies/order', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance', 'cob'] }),
  });
}

function PolicyRow({ policy, index, total, onMoveUp, onMoveDown }) {
  return (
    <tr className="border-b border-silver/50 last:border-0">
      <td className="py-3 px-4">
        <Badge className={ORDER_COLORS[policy.coordinationOrder] || ''}>
          {ORDER_LABELS[policy.coordinationOrder] || `Order ${policy.coordinationOrder}`}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <span className="font-medium text-obsidian">{policy.insuranceCompany?.name || '-'}</span>
      </td>
      <td className="py-3 px-4 text-obsidian">{policy.policyNumber}</td>
      <td className="py-3 px-4 text-obsidian">{policy.coveragePercent ? `${policy.coveragePercent}%` : '-'}</td>
      <td className="py-3 px-4">
        {policy.isActive
          ? <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Active</Badge>
          : <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Inactive</Badge>}
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => onMoveUp(index)}>
            ↑
          </Button>
          <Button variant="ghost" size="sm" disabled={index === total - 1} onClick={() => onMoveDown(index)}>
            ↓
          </Button>
        </div>
      </td>
    </tr>
  );
}

function COBResultsModal({ results, onClose }) {
  if (!results) return null;
  return (
    <Modal open onClose={onClose} title="COB Results" className="max-w-2xl">
      <div className="space-y-4">
        <div className="bg-bone rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-obsidian text-sm">Primary Claim</h3>
          <div className="flex justify-between text-sm">
            <span className="text-slate">Claim Amount</span>
            <span className="text-obsidian">{formatCurrency(results.primaryClaim?.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate">Settled Amount</span>
            <span className="text-green-600 font-semibold">{formatCurrency(results.primaryClaim?.settledAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate">Patient Responsibility</span>
            <span className="text-amber-600">{formatCurrency(results.primaryClaim?.patientResponsibility)}</span>
          </div>
        </div>
        {results.secondaryClaim && (
          <div className="bg-bone rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-obsidian text-sm">Secondary Claim Created</h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate">Claim Amount</span>
              <span className="text-obsidian">{formatCurrency(results.secondaryClaim?.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate">Status</span>
              <Badge>{results.secondaryClaim?.status}</Badge>
            </div>
          </div>
        )}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function COBPage() {
  const [patientSearch, setPatientSearch] = useState('');
  const [patientId, setPatientId] = useState('');
  const [resultsModal, setResultsModal] = useState(null);

  const { data: cobData, isLoading } = useCOBPatientPolicies(patientId);
  const processCOB = useProcessCOB();
  const reorderPolicies = useReorderPolicies();

  const policies = cobData?.policies || cobData || [];
  const sorted = [...policies].sort((a, b) => (a.coordinationOrder || 99) - (b.coordinationOrder || 99));

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    if (patientSearch.trim()) setPatientId(patientSearch.trim());
  }, [patientSearch]);

  const handleMoveUp = useCallback((index) => {
    if (index <= 0) return;
    const order = sorted.map((p) => p.id);
    [order[index - 1], order[index]] = [order[index], order[index - 1]];
    reorderPolicies.mutate({ policyIds: order });
  }, [sorted, reorderPolicies]);

  const handleMoveDown = useCallback((index) => {
    if (index >= sorted.length - 1) return;
    const order = sorted.map((p) => p.id);
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
    reorderPolicies.mutate({ policyIds: order });
  }, [sorted, reorderPolicies]);

  const handleProcessCOB = useCallback(async (claimId) => {
    const result = await processCOB.mutateAsync({ claimId });
    setResultsModal(result);
  }, [processCOB]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-sm font-semibold text-obsidian">Coordination of Benefits</h1>
        <p className="text-body text-slate mt-1">Manage patient insurance policy order and process COB claims</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-graphite block mb-1">Patient ID</label>
              <Input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Enter patient ID to look up policies"
              />
            </div>
            <Button variant="primary" size="sm" type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {patientId && (
        <Card>
          <CardHeader>
            <CardTitle>Patient Policies — Order & COB</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-body text-slate text-center py-8">Loading policies...</p>
            ) : sorted.length === 0 ? (
              <p className="text-body text-slate text-center py-8">No insurance policies found for this patient</p>
            ) : (
              <>
                <Table
                  columns={[
                    { key: 'coordinationOrder', header: 'Order' },
                    { key: 'company', header: 'Insurance Company' },
                    { key: 'policyNumber', header: 'Policy #' },
                    { key: 'coverage', header: 'Coverage' },
                    { key: 'isActive', header: 'Status' },
                    { key: 'actions', header: 'Reorder' },
                  ]}
                  data={sorted.map((p, i) => (
                    <PolicyRow
                      key={p.id}
                      policy={p}
                      index={i}
                      total={sorted.length}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                    />
                  ))}
                />
                {sorted.length > 0 && sorted[0].settledClaimId && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleProcessCOB(sorted[0].settledClaimId)}
                      disabled={processCOB.isPending}
                    >
                      {processCOB.isPending ? 'Processing...' : 'Process COB'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {resultsModal && <COBResultsModal results={resultsModal} onClose={() => setResultsModal(null)} />}
    </div>
  );
}
