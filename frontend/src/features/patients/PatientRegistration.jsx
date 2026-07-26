import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useCreatePatient, useCheckDuplicates, patientKeys } from '../../hooks/queries/usePatients';
import { notifySuccess, notifyError } from '../../utils/notify';

export default function PatientRegistration({ isOpen, onClose }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createMutation = useCreatePatient();
  const checkDuplicatesMutation = useCheckDuplicates();

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    chronicConditions: '',
    diabetesType: 'NONE',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [matches, setMatches] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => {
    const payload = { fullName: form.fullName.trim() };
    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (form.nationalId.trim()) payload.nationalId = form.nationalId.trim();
    if (form.email.trim()) payload.email = form.email.trim();
    if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
    if (form.gender) payload.gender = form.gender;
    if (form.address.trim()) payload.address = form.address.trim();
    if (form.diabetesType) payload.diabetesType = form.diabetesType;
    if (form.notes.trim()) payload.notes = form.notes.trim();
    if (form.chronicConditions.trim()) {
      payload.chronicConditions = form.chronicConditions
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
    }
    return payload;
  };

  const doCreate = async () => {
    try {
      const payload = buildPayload();
      const patient = await createMutation.mutateAsync(payload);
      notifySuccess('Patient registered');
      resetForm();
      onClose();
      if (patient?.id) navigate(`/patients/${patient.id}`);
    } catch (err) {
      notifyError(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setChecking(true);
    setMatches(null);

    try {
      const result = await checkDuplicatesMutation.mutateAsync({
        fullName: form.fullName.trim(),
        dateOfBirth: form.dateOfBirth || undefined,
        phone: form.phone.trim() || undefined,
        nationalId: form.nationalId.trim() || undefined,
      });

      if (result?.matches?.length > 0) {
        setMatches(result.matches);
      } else {
        await doCreate();
      }
    } catch (err) {
      notifyError(err);
    } finally {
      setChecking(false);
    }
  };

  const resetForm = () => {
    setForm({
      fullName: '',
      phone: '',
      nationalId: '',
      email: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      chronicConditions: '',
      diabetesType: 'NONE',
      notes: '',
    });
    setErrors({});
    setMatches(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose} title="Register Patient" className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Name"
          value={form.fullName}
          onChange={handleChange('fullName')}
          error={errors.fullName}
          placeholder="Enter full name"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={handleChange('phone')}
            placeholder="Phone number"
          />
          <Input
            label="National ID"
            value={form.nationalId}
            onChange={handleChange('nationalId')}
            placeholder="National ID"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="Email address"
          />
          <Input
            label="Date of Birth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange('dateOfBirth')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-graphite">Gender</label>
            <select
              value={form.gender}
              onChange={handleChange('gender')}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent transition-colors duration-150"
            >
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-graphite">Diabetes Type</label>
            <select
              value={form.diabetesType}
              onChange={handleChange('diabetesType')}
              className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent transition-colors duration-150"
            >
              <option value="NONE">None</option>
              <option value="TYPE1">Type 1</option>
              <option value="TYPE2">Type 2</option>
              <option value="GESTATIONAL">Gestational</option>
            </select>
          </div>
        </div>

        <Input
          label="Address"
          value={form.address}
          onChange={handleChange('address')}
          placeholder="Address"
        />

        <Input
          label="Chronic Conditions"
          value={form.chronicConditions}
          onChange={handleChange('chronicConditions')}
          placeholder="Comma-separated (e.g. Hypertension, Asthma)"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-graphite">Notes</label>
          <textarea
            value={form.notes}
            onChange={handleChange('notes')}
            rows={3}
            placeholder="Additional notes"
            className="w-full px-4 py-3 bg-paper border border-silver rounded-lg text-body text-obsidian placeholder:text-slate focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:border-transparent transition-colors duration-150 resize-none"
          />
        </div>

        {matches && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 space-y-3">
            <p className="text-body font-medium text-amber-800 dark:text-amber-200">
              Potential duplicates found:
            </p>
            {matches.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-paper rounded-lg border border-silver/50">
                <div>
                  <p className="text-body text-obsidian">{m.fullName}</p>
                  <p className="text-caption text-slate">{m.mrn}{m.phone ? ` · ${m.phone}` : ''}{m.dateOfBirth ? ` · ${new Date(m.dateOfBirth).toLocaleDateString('en-GB')}` : ''}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => navigate(`/patients/${m.id}`)}>
                  View
                </Button>
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button variant="danger" size="sm" type="button" onClick={doCreate} loading={createMutation.isPending}>
                Register Anyway
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setMatches(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-silver/50">
          <Button variant="ghost" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" loading={checking || createMutation.isPending} disabled={!form.fullName.trim()}>
            Register
          </Button>
        </div>
      </form>
    </Modal>
  );
}
