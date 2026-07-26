import { useState } from 'react';
import { useCreateInsuranceCompany, useUpdateInsuranceCompany } from '../../hooks/queries/useInsurance';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

export default function CompanyForm({ company, onClose }) {
  const createMutation = useCreateInsuranceCompany();
  const updateMutation = useUpdateInsuranceCompany();
  const isEditing = !!company;
  const [form, setForm] = useState({
    name: company?.name || '',
    nameAr: company?.nameAr || '',
    contactPerson: company?.contactPerson || '',
    phone: company?.phone || '',
    email: company?.email || '',
    address: company?.address || '',
    isTpa: company?.isTpa || false,
    isActive: company?.isActive !== undefined ? company.isActive : true,
  });

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Company name is required');
      return;
    }
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ id: company.id, ...form });
        toast.success('Company updated');
      } else {
        await createMutation.mutateAsync(form);
        toast.success('Company created');
      }
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save company');
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium text-graphite block mb-1">Company Name *</label>
          <Input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-graphite block mb-1">Arabic Name</label>
          <Input type="text" value={form.nameAr} onChange={(e) => handleChange('nameAr', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Contact Person</label>
          <Input type="text" value={form.contactPerson} onChange={(e) => handleChange('contactPerson', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Phone</label>
          <Input type="text" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-graphite block mb-1">Email</label>
          <Input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium text-graphite block mb-1">Address</label>
          <Input type="text" value={form.address} onChange={(e) => handleChange('address', e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-graphite">TPA</label>
          <button type="button" onClick={() => handleChange('isTpa', !form.isTpa)}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.isTpa ? 'bg-lilac-bloom' : 'bg-silver'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isTpa ? 'translate-x-5' : ''}`} />
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
          {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
