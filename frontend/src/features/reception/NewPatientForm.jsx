import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';

export default function NewPatientForm({ clinics, onPatientCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    nationalId: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    diabetesType: 'NONE',
    address: '',
    notes: '',
    clinicId: clinics?.[0]?.id || '',
    visitType: 'NEW_VISIT',
    checkInNow: true,
    collectPayment: false,
    paymentMethod: 'CASH',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setBool = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.checked }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return setError(t('reception.nameRequired'));
    setSaving(true);
    setError('');
    try {
      const patient = await api.post('/reception/patients', {
        fullName: form.fullName,
        phone: form.phone || undefined,
        nationalId: form.nationalId || undefined,
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        diabetesType: form.diabetesType,
        address: form.address || undefined,
        notes: form.notes || undefined,
      });
      if (form.checkInNow && form.clinicId) {
        await api.post('/reception/check-in', {
          patientId: patient.id,
          clinicId: form.clinicId,
          type: 'WALKIN',
          visitType: form.visitType,
          collectPayment: form.collectPayment || undefined,
          paymentMethod: form.collectPayment ? form.paymentMethod : undefined,
        });
      }
      setForm({
        fullName: '', phone: '', nationalId: '', email: '', dateOfBirth: '',
        gender: '', diabetesType: 'NONE', address: '', notes: '',
        clinicId: clinics?.[0]?.id || '', visitType: 'NEW_VISIT', checkInNow: true,
        collectPayment: false, paymentMethod: 'CASH',
      });
      if (onPatientCreated) onPatientCreated(patient);
    } catch (err) {
      setError(err.message || t('reception.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('reception.registerPatient')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t('reception.fullName')} value={form.fullName} onChange={set('fullName')} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('reception.phone')} value={form.phone} onChange={set('phone')} />
            <Input label={t('reception.nationalId')} value={form.nationalId} onChange={set('nationalId')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('reception.email')} type="email" value={form.email} onChange={set('email')} />
            <Input label={t('reception.dateOfBirth')} type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-graphite mb-1">{t('reception.gender')}</label>
              <select value={form.gender} onChange={set('gender')} className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="">--</option>
                <option value="MALE">{t('reception.male')}</option>
                <option value="FEMALE">{t('reception.female')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-graphite mb-1">{t('reception.diabetesType')}</label>
              <select value={form.diabetesType} onChange={set('diabetesType')} className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                <option value="NONE">{t('reception.diabetesNone')}</option>
                <option value="TYPE1">{t('reception.diabetesType1')}</option>
                <option value="TYPE2">{t('reception.diabetesType2')}</option>
                <option value="GESTATIONAL">{t('reception.diabetesGestational')}</option>
              </select>
            </div>
          </div>
          <Input label={t('reception.address')} value={form.address} onChange={set('address')} />
          <Input label={t('reception.notes')} value={form.notes} onChange={set('notes')} />
          <hr className="border-silver" />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="checkInNow" checked={form.checkInNow} onChange={setBool('checkInNow')} className="rounded border-silver" />
            <label htmlFor="checkInNow" className="text-sm text-graphite">{t('reception.checkInAfterReg')}</label>
          </div>
          {form.checkInNow && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-graphite mb-1">{t('reception.clinic')}</label>
                  <select value={form.clinicId} onChange={set('clinicId')} className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-graphite mb-1">{t('reception.visitType')}</label>
                  <select value={form.visitType} onChange={set('visitType')} className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                    <option value="NEW_VISIT">{t('reception.newVisit')}</option>
                    <option value="FOLLOW_UP">{t('reception.followUp')}</option>
                  </select>
                </div>
              </div>
              {(() => {
                const c = clinics.find((x) => x.id === form.clinicId);
                const fee = form.visitType === 'FOLLOW_UP' ? c?.followUpFee : c?.consultationFee;
                if (!fee || Number(fee) <= 0) return null;
                return (
                  <div className="space-y-3 border border-silver rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="collectPayment" checked={form.collectPayment} onChange={setBool('collectPayment')} className="rounded border-silver" />
                      <label htmlFor="collectPayment" className="text-sm text-graphite">{t('reception.collectPayment')}</label>
                    </div>
                    <p className="text-sm text-graphite">
                      {t(form.visitType === 'FOLLOW_UP' ? 'reception.followUpFee' : 'reception.consultationFee')}: <span className="font-semibold text-obsidian">{Number(fee).toFixed(2)} AED</span>
                    </p>
                    {form.collectPayment && (
                      <div>
                        <label className="block text-sm font-medium text-graphite mb-1">{t('reception.paymentMethod')}</label>
                        <select value={form.paymentMethod} onChange={set('paymentMethod')} className="w-full rounded-lg border border-silver bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lilac-bloom">
                          <option value="CASH">{t('reception.cash')}</option>
                          <option value="CARD">{t('reception.card')}</option>
                          <option value="INSURANCE">{t('reception.insurance')}</option>
                          <option value="BANK_TRANSFER">{t('reception.bankTransfer')}</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? t('reception.saving') : t('reception.registerAndCheckIn')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
