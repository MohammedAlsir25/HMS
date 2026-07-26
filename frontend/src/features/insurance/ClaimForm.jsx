import { useState } from 'react';
import { useCreateInsuranceClaim } from '../../hooks/queries/useInsurance';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

export default function ClaimForm({ patients, policies, onClose }) {
  const createMutation = useCreateInsuranceClaim();
  const [form, setForm] = useState({
    patientId: '',
    insurancePolicyId: '',
    invoiceId: '',
    preAuthorizationId: '',
    notes: '',
  });

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.insurancePolicyId) {
      toast.error('Patient and policy are required');
      return;
    }
    try {
      const payload = {
        patientId: form.patientId,
        insurancePolicyId: form.insurancePolicyId,
        invoiceId: form.invoiceId || undefined,
        preAuthorizationId: form.preAuthorizationId || undefined,
        notes: form.notes || undefined,
      };
      await createMutation.mutateAsync(payload);
      toast.success('Claim created');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create claim');
    }
  };

  const saving = createMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Patient *</label>
        <select value={form.patientId} onChange={(e) => handleChange('patientId', e.target.value)}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          <option value="">Select patient</option>
          {(patients || []).map((p) => (
            <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.medicalRecordNumber || p.mrn})</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Insurance Policy *</label>
        <select value={form.insurancePolicyId} onChange={(e) => handleChange('insurancePolicyId', e.target.value)}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
          <option value="">Select policy</option>
          {(policies || []).map((p) => (
            <option key={p.id} value={p.id}>{p.policyNumber} — {p.insuranceCompany?.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Invoice ID (optional)</label>
        <Input type="text" value={form.invoiceId} onChange={(e) => handleChange('invoiceId', e.target.value)} placeholder="Link to existing invoice" />
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Pre-Authorization ID (optional)</label>
        <Input type="text" value={form.preAuthorizationId} onChange={(e) => handleChange('preAuthorizationId', e.target.value)} placeholder="Link to pre-authorization" />
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Notes</label>
        <textarea value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} rows={3}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Creating...' : 'Create Claim'}
        </Button>
      </div>
    </form>
  );
}
