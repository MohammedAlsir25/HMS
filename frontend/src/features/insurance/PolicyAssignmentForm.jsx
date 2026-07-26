import { useState } from 'react';
import { useCreateInsurancePolicy, useUpdateInsurancePolicy, useInsuranceCompanies } from '../../hooks/queries/useInsurance';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

const NETWORK_TYPES = ['Gold', 'Silver', 'Basic', 'Platinum'];

export default function PolicyAssignmentForm({ policy, patients, onClose }) {
  const createMutation = useCreateInsurancePolicy();
  const updateMutation = useUpdateInsurancePolicy();
  const isEditing = !!policy;
  const [form, setForm] = useState({
    patientId: policy?.patientId || '',
    insuranceCompanyId: policy?.insuranceCompanyId || '',
    policyNumber: policy?.policyNumber || '',
    coveragePercent: policy?.coveragePercent || '',
    maxCoverageAmount: policy?.maxCoverageAmount || '',
    effectiveFrom: policy?.effectiveFrom ? new Date(policy.effectiveFrom).toISOString().slice(0, 10) : '',
    effectiveTo: policy?.effectiveTo ? new Date(policy.effectiveTo).toISOString().slice(0, 10) : '',
    networkType: policy?.networkType || '',
    cardNumber: policy?.cardNumber || '',
    groupNumber: policy?.groupNumber || '',
    isPrimary: policy?.isPrimary !== undefined ? policy.isPrimary : true,
    isActive: policy?.isActive !== undefined ? policy.isActive : true,
  });

  const companyParams = 'limit=500';
  const { data: companiesData } = useInsuranceCompanies(companyParams);
  const companies = companiesData?.companies || companiesData || [];

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.insuranceCompanyId || !form.policyNumber.trim()) {
      toast.error('Patient, company, and policy number are required');
      return;
    }
    try {
      const payload = {
        ...form,
        coveragePercent: form.coveragePercent ? parseFloat(form.coveragePercent) : null,
        maxCoverageAmount: form.maxCoverageAmount ? parseFloat(form.maxCoverageAmount) : null,
      };
      if (isEditing) {
        await updateMutation.mutateAsync({ id: policy.id, ...payload });
        toast.success('Policy updated');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Policy assigned');
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save policy');
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium text-graphite block mb-1">Patient *</label>
          <select value={form.patientId} onChange={(e) => handleChange('patientId', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            <option value="">Select patient</option>
            {(patients || []).map((p) => (
              <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.medicalRecordNumber || p.mrn})</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-graphite block mb-1">Insurance Company *</label>
          <select value={form.insuranceCompanyId} onChange={(e) => handleChange('insuranceCompanyId', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            <option value="">Select company</option>
            {(companies || []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.isTpa ? ' (TPA)' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Policy Number *</label>
          <Input type="text" value={form.policyNumber} onChange={(e) => handleChange('policyNumber', e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Coverage %</label>
          <Input type="number" min="0" max="100" step="0.01" value={form.coveragePercent} onChange={(e) => handleChange('coveragePercent', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Max Coverage Amount</label>
          <Input type="number" min="0" step="0.01" value={form.maxCoverageAmount} onChange={(e) => handleChange('maxCoverageAmount', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Network Type</label>
          <select value={form.networkType} onChange={(e) => handleChange('networkType', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            <option value="">--</option>
            {NETWORK_TYPES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Effective From</label>
          <Input type="date" value={form.effectiveFrom} onChange={(e) => handleChange('effectiveFrom', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Effective To</label>
          <Input type="date" value={form.effectiveTo} onChange={(e) => handleChange('effectiveTo', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Card Number</label>
          <Input type="text" value={form.cardNumber} onChange={(e) => handleChange('cardNumber', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Group Number</label>
          <Input type="text" value={form.groupNumber} onChange={(e) => handleChange('groupNumber', e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-graphite">Primary Policy</label>
          <button type="button" onClick={() => handleChange('isPrimary', !form.isPrimary)}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.isPrimary ? 'bg-lilac-bloom' : 'bg-silver'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPrimary ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-graphite">Active</label>
          <button type="button" onClick={() => handleChange('isActive', !form.isActive)}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-green-500' : 'bg-silver'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Update' : 'Assign'}
        </Button>
      </div>
    </form>
  );
}
