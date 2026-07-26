import { useState, useEffect } from 'react';
import { useCreatePreAuthorization, usePatientPolicies } from '../../hooks/queries/useInsurance';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

export default function PreAuthForm({ patients, onClose }) {
  const createMutation = useCreatePreAuthorization();
  const [form, setForm] = useState({
    patientId: '',
    insurancePolicyId: '',
    diagnosis: '',
    diagnosisCode: '',
    clinicalNotes: '',
    plannedProcedures: [{ name: '', estimatedCost: '' }],
  });
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: policiesData } = usePatientPolicies(form.patientId || null);
  const policies = policiesData?.policies || policiesData || [];

  useEffect(() => {
    if (form.patientId && policies.length > 0) {
      const primary = policies.find((p) => p.isPrimary);
      if (primary) setForm((prev) => ({ ...prev, insurancePolicyId: primary.id }));
    }
  }, [form.patientId, policies]);

  const filteredPatients = (patients || []).filter((p) => {
    const name = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
    const search = patientSearch.toLowerCase();
    return name.includes(search) || (p.medicalRecordNumber || '').toLowerCase().includes(search);
  });

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleProcedureChange = (index, field, value) => {
    const updated = [...form.plannedProcedures];
    updated[index] = { ...updated[index], [field]: value };
    setForm((p) => ({ ...p, plannedProcedures: updated }));
  };

  const addProcedure = () => {
    setForm((p) => ({ ...p, plannedProcedures: [...p.plannedProcedures, { name: '', estimatedCost: '' }] }));
  };

  const removeProcedure = (index) => {
    if (form.plannedProcedures.length <= 1) return;
    const updated = form.plannedProcedures.filter((_, i) => i !== index);
    setForm((p) => ({ ...p, plannedProcedures: updated }));
  };

  const estimatedTotal = form.plannedProcedures.reduce((sum, proc) => {
    return sum + (parseFloat(proc.estimatedCost) || 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientId || !form.insurancePolicyId || !form.diagnosis.trim()) {
      toast.error('Patient, policy, and diagnosis are required');
      return;
    }
    const validProcedures = form.plannedProcedures.filter((p) => p.name.trim());
    if (validProcedures.length === 0) {
      toast.error('At least one procedure is required');
      return;
    }
    try {
      await createMutation.mutateAsync({
        patientId: form.patientId,
        insurancePolicyId: form.insurancePolicyId,
        diagnosis: form.diagnosis,
        diagnosisCode: form.diagnosisCode || undefined,
        clinicalNotes: form.clinicalNotes || undefined,
        plannedProcedures: validProcedures.map((p) => ({
          name: p.name,
          estimatedCost: parseFloat(p.estimatedCost) || 0,
        })),
        estimatedTotalCost: estimatedTotal,
      });
      toast.success('Pre-authorization submitted');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit pre-authorization');
    }
  };

  const saving = createMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="col-span-2">
        <label className="text-sm font-medium text-graphite block mb-1">Patient *</label>
        <input type="text" placeholder="Search patient..." value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : patientSearch}
          onChange={(e) => { setPatientSearch(e.target.value); setSelectedPatient(null); setForm((p) => ({ ...p, patientId: '', insurancePolicyId: '' })); }}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
        {patientSearch && !selectedPatient && filteredPatients.length > 0 && (
          <div className="border border-silver rounded-lg mt-1 max-h-40 overflow-y-auto bg-paper shadow-lg">
            {filteredPatients.slice(0, 10).map((p) => (
              <button key={p.id} type="button"
                onClick={() => { setSelectedPatient(p); setForm((prev) => ({ ...prev, patientId: p.id })); setPatientSearch(''); }}
                className="w-full text-left px-4 py-2 hover:bg-bone text-sm text-obsidian">
                {p.firstName} {p.lastName} ({p.medicalRecordNumber || p.mrn})
              </button>
            ))}
          </div>
        )}
      </div>

      {form.patientId && (
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Insurance Policy *</label>
          <select value={form.insurancePolicyId} onChange={(e) => handleChange('insurancePolicyId', e.target.value)}
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
            <option value="">Select policy</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>{p.policyNumber} — {p.insuranceCompany?.name} ({p.coveragePercent}%)</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Diagnosis *</label>
        <Input type="text" value={form.diagnosis} onChange={(e) => handleChange('diagnosis', e.target.value)} placeholder="Clinical diagnosis" required />
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">ICD-10 Code</label>
        <Input type="text" value={form.diagnosisCode} onChange={(e) => handleChange('diagnosisCode', e.target.value)} placeholder="e.g. H40.1" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-graphite">Planned Procedures *</label>
          <Button type="button" variant="ghost" size="sm" onClick={addProcedure}>+ Add</Button>
        </div>
        <div className="space-y-2">
          {form.plannedProcedures.map((proc, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="text" placeholder="Procedure name" value={proc.name} onChange={(e) => handleProcedureChange(i, 'name', e.target.value)}
                className="flex-1 px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
              <input type="number" min="0" step="0.01" placeholder="Cost" value={proc.estimatedCost} onChange={(e) => handleProcedureChange(i, 'estimatedCost', e.target.value)}
                className="w-28 px-3 py-2 bg-paper border border-silver rounded-lg text-sm text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
              {form.plannedProcedures.length > 1 && (
                <button type="button" onClick={() => removeProcedure(i)} className="text-red-500 hover:text-red-700 text-lg">&times;</button>
              )}
            </div>
          ))}
        </div>
        <p className="text-caption text-slate mt-1">Estimated Total: {estimatedTotal.toFixed(2)}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-graphite block mb-1">Clinical Notes</label>
        <textarea value={form.clinicalNotes} onChange={(e) => handleChange('clinicalNotes', e.target.value)} rows={3}
          className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={saving}>
          {saving ? 'Submitting...' : 'Submit'}
        </Button>
      </div>
    </form>
  );
}
