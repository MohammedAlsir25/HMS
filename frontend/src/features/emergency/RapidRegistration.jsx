import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useRapidRegister } from '../../hooks/queries/useEmergency';

export default function RapidRegistration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const rapidRegister = useRapidRegister();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [foundPatient, setFoundPatient] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [confirmedExisting, setConfirmedExisting] = useState(false);

  async function handleCheckExisting() {
    if (!phone && !fullName) {
      toast.error(t('emergency.register.searchError'));
      return;
    }
    setSearchLoading(true);
    try {
      const token = (await import('../../stores/authStore')).useAuthStore.getState().token;
      const baseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
      const params = new URLSearchParams();
      if (phone) params.set('phone', phone);
      if (fullName) params.set('name', fullName);
      const res = await fetch(`${baseUrl}/emergency/check-patient?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.patient) {
          setFoundPatient(data.patient);
          setFullName(data.patient.fullName || '');
          setPhone(data.patient.phone || '');
          toast.success(t('emergency.register.foundExisting', { name: data.patient.fullName, mrn: data.patient.mrn || 'N/A' }));
        } else {
          setFoundPatient(null);
          toast(t('emergency.register.registerNew'));
        }
      } else {
        setFoundPatient(null);
      }
    } catch {
      setFoundPatient(null);
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error(t('emergency.register.nameRequired'));
      return;
    }
    if (!chiefComplaint.trim()) {
      toast.error(t('emergency.register.complaintRequired'));
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      phone: phone || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      chiefComplaint: chiefComplaint.trim(),
    };

    rapidRegister.mutate(payload, {
      onSuccess: (data) => {
        const existing = data?.existingPatient ? t('emergency.register.existingLinked') : t('emergency.register.newCreated');
        toast.success(`${existing}.`);
        navigate('/emergency/triage');
      },
      onError: (err) => {
        toast.error(err.message || t('emergency.register.registrationFailed'));
      },
    });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium text-obsidian">{t('emergency.register.title')}</h1>
          <p className="text-body text-slate">{t('emergency.register.subtitle')}</p>
        </div>
      </div>

      {foundPatient && confirmedExisting && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg" role="status">
          <p className="text-body font-medium">{t('emergency.register.usingExisting', { name: foundPatient.fullName, mrn: foundPatient.mrn || 'N/A' })}</p>
          <button
            type="button"
            onClick={() => { setFoundPatient(null); setConfirmedExisting(false); }}
            className="text-caption underline mt-1"
            aria-label={t('emergency.register.registerDifferent')}
          >
            {t('emergency.register.registerDifferent')}
          </button>
        </div>
      )}

      {foundPatient && !confirmedExisting && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-4 py-3 rounded-lg" role="status">
          <p className="text-body">{t('emergency.register.foundExisting', { name: foundPatient.fullName, mrn: foundPatient.mrn || 'N/A' })}</p>
          <div className="flex gap-3 mt-2">
            <Button size="sm" onClick={() => setConfirmedExisting(true)} aria-label={t('emergency.register.useExisting')}>
              {t('emergency.register.useExisting')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setFoundPatient(null); }} aria-label={t('emergency.register.registerNew')}>
              {t('emergency.register.registerNew')}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" aria-label={t('emergency.register.title')}>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-subheading font-medium text-obsidian">{t('emergency.register.patientInfo')}</h3>
              <Button type="button" variant="ghost" size="sm" onClick={handleCheckExisting} loading={searchLoading} aria-label={t('emergency.register.checkExisting')}>
                {t('emergency.register.checkExisting')}
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-caption text-slate block mb-1" htmlFor="reg-fullname">{t('emergency.register.fullName')}</label>
                <input
                  id="reg-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('emergency.register.fullNamePlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  required
                />
              </div>
              <div>
                <label className="text-caption text-slate block mb-1" htmlFor="reg-phone">{t('emergency.register.phone')}</label>
                <input
                  id="reg-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('emergency.register.phonePlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-caption text-slate block mb-1" htmlFor="reg-dob">{t('emergency.register.dob')}</label>
                  <input
                    id="reg-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  />
                </div>
                <div>
                  <label className="text-caption text-slate block mb-1" htmlFor="reg-gender">{t('emergency.register.gender')}</label>
                  <select
                    id="reg-gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
                  >
                    <option value="">{t('emergency.register.select')}</option>
                    <option value="MALE">{t('emergency.register.male')}</option>
                    <option value="FEMALE">{t('emergency.register.female')}</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.register.chiefComplaint')}</h3>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder={t('emergency.register.chiefComplaintPlaceholder')}
              className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              aria-label={t('emergency.register.chiefComplaint')}
              required
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)} aria-label={t('emergency.register.cancel')}>
            {t('emergency.register.cancel')}
          </Button>
          <Button type="submit" loading={rapidRegister.isPending} aria-label={t('emergency.register.submit')}>
            {t('emergency.register.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
}
