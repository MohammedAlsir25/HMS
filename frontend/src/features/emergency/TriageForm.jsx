import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Printer } from 'lucide-react';
import { useCreateTriage, useUpdateTriage } from '../../hooks/queries/useEmergency';

const ACUITY_OPTIONS = [
  { value: 'RESUSCITATION', level: 1, descKey: 'emergency.form.resuscitationDesc', color: 'bg-red-500', textColor: 'text-white', borderColor: 'border-red-500' },
  { value: 'EMERGENT', level: 2, descKey: 'emergency.form.emergentDesc', color: 'bg-orange-500', textColor: 'text-white', borderColor: 'border-orange-500' },
  { value: 'URGENT', level: 3, descKey: 'emergency.form.urgentDesc', color: 'bg-yellow-400', textColor: 'text-yellow-900', borderColor: 'border-yellow-400' },
  { value: 'LESS_URGENT', level: 4, descKey: 'emergency.form.lessUrgentDesc', color: 'bg-green-500', textColor: 'text-white', borderColor: 'border-green-500' },
  { value: 'NON_URGENT', level: 5, descKey: 'emergency.form.nonUrgentDesc', color: 'bg-blue-500', textColor: 'text-white', borderColor: 'border-blue-500' },
];

export default function TriageForm({ patientId, patientName, triageAssessmentId, onComplete, existingAcuity }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createTriage = useCreateTriage();
  const updateTriage = useUpdateTriage();

  const [acuity, setAcuity] = useState(existingAcuity || '');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [triageNotes, setTriageNotes] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [respiratoryRate, setRespiratoryRate] = useState('');
  const [temperature, setTemperature] = useState('');
  const [oxygenSaturation, setOxygenSaturation] = useState('');

  const isEditing = !!triageAssessmentId;
  const isSubmitting = createTriage.isPending || updateTriage.isPending;

  function handleSubmit(e) {
    e.preventDefault();
    if (!acuity) {
      toast.error(t('emergency.form.acuityError'));
      return;
    }
    if (!isEditing && !patientId) {
      toast.error(t('emergency.form.patientError'));
      return;
    }

    const vitalSigns = {
      systolic: systolic ? Number(systolic) : undefined,
      diastolic: diastolic ? Number(diastolic) : undefined,
      heartRate: heartRate ? Number(heartRate) : undefined,
      respiratoryRate: respiratoryRate ? Number(respiratoryRate) : undefined,
      temperature: temperature ? Number(temperature) : undefined,
      oxygenSaturation: oxygenSaturation ? Number(oxygenSaturation) : undefined,
    };

    const hasAnyVital = Object.values(vitalSigns).some((v) => v !== undefined);
    const payload = {
      acuity,
      vitalSigns: hasAnyVital ? vitalSigns : undefined,
      triageNotes: triageNotes || undefined,
    };

    if (isEditing) {
      updateTriage.mutate(
        { id: triageAssessmentId, ...payload },
        {
          onSuccess: () => {
            toast.success(t('emergency.form.updateSuccess'));
            if (onComplete) onComplete();
            else navigate('/emergency/triage');
          },
          onError: (err) => {
            toast.error(err.message || t('emergency.form.updateError'));
          },
        },
      );
    } else {
      createTriage.mutate(
        { patientId, ...payload },
        {
          onSuccess: () => {
            toast.success(t('emergency.form.createSuccess'));
            if (onComplete) onComplete();
            else navigate('/emergency/triage');
          },
          onError: (err) => {
            toast.error(err.message || t('emergency.form.createError'));
          },
        },
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" aria-label={t('emergency.triage.assessment')}>
      {patientName && (
        <div className="bg-bone/50 rounded-lg px-4 py-3">
          <p className="text-caption text-slate">{t('emergency.form.patient')}</p>
          <p className="text-body font-medium text-obsidian">{patientName}</p>
        </div>
      )}

      <Card>
        <CardContent>
          <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.form.acuityLevel')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3" role="radiogroup" aria-label={t('emergency.form.acuityLevel')}>
            {ACUITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={acuity === opt.value}
                aria-label={t('emergency.form.esiLevel', { level: opt.level })}
                onClick={() => setAcuity(opt.value)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  acuity === opt.value
                    ? `${opt.color} ${opt.textColor} ${opt.borderColor}`
                    : `border-silver/30 hover:border-silver/60 bg-paper`
                }`}
              >
                <span className="text-heading font-bold">{t('emergency.form.esiLevel', { level: opt.level })}</span>
                <p className={`text-caption mt-1 ${acuity === opt.value ? 'opacity-90' : 'text-slate'}`}>{t(`emergency.acuity.${opt.value}`)}</p>
                <p className={`text-xs mt-1 ${acuity === opt.value ? 'opacity-80' : 'text-slate'}`}>{t(opt.descKey)}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!isEditing && (
        <Card>
          <CardContent>
            <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.form.chiefComplaint')}</h3>
            <input
              type="text"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder={t('emergency.form.chiefComplaintPlaceholder')}
              className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              aria-label={t('emergency.form.chiefComplaint')}
              required
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.form.vitalSigns')}</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-caption text-slate block mb-1" htmlFor="triage-systolic">{t('emergency.form.bpSystolic')}</label>
              <input
                id="triage-systolic"
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                placeholder="120"
                className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
            <div>
              <label className="text-caption text-slate block mb-1" htmlFor="triage-diastolic">{t('emergency.form.bpDiastolic')}</label>
              <input
                id="triage-diastolic"
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                placeholder="80"
                className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
            <div>
              <label className="text-caption text-slate block mb-1" htmlFor="triage-heartrate">{t('emergency.form.heartRate')}</label>
              <input
                id="triage-heartrate"
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="72"
                className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
            <div>
              <label className="text-caption text-slate block mb-1" htmlFor="triage-resp-rate">{t('emergency.form.respiratoryRate')}</label>
              <input
                id="triage-resp-rate"
                type="number"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value)}
                placeholder="16"
                className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
            <div>
              <label className="text-caption text-slate block mb-1" htmlFor="triage-temp">{t('emergency.form.temperature')}</label>
              <input
                id="triage-temp"
                type="number"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="36.8"
                className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
            <div>
              <label className="text-caption text-slate block mb-1" htmlFor="triage-o2">{t('emergency.form.oxygenSaturation')}</label>
              <input
                id="triage-o2"
                type="number"
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value)}
                placeholder="98"
                className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.form.triageNotes')}</h3>
          <textarea
            value={triageNotes}
            onChange={(e) => setTriageNotes(e.target.value)}
            placeholder={t('emergency.form.triageNotesPlaceholder')}
            rows={3}
            aria-label={t('emergency.form.triageNotes')}
            className="w-full px-4 py-3 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom resize-none"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => navigate(-1)} aria-label={t('emergency.form.cancel')}>
          {t('emergency.form.cancel')}
        </Button>
        <Button type="button" variant="secondary" onClick={() => {
          const printWindow = window.open('', '_blank');
          if (!printWindow) return;
          const acuityOpt = ACUITY_OPTIONS.find((o) => o.value === acuity);
          printWindow.document.write(`
            <html><head><title>Triage Sheet</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 2cm; font-size: 12pt; }
              h1 { font-size: 18pt; margin-bottom: 0.5cm; }
              .header { text-align: center; margin-bottom: 1cm; border-bottom: 2px solid #333; padding-bottom: 0.5cm; }
              .field { margin: 0.3cm 0; }
              .field label { font-weight: bold; display: inline-block; min-width: 5cm; }
              table { width: 100%; border-collapse: collapse; margin: 0.5cm 0; }
              th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
              th { background: #f0f0f0; }
              .footer { margin-top: 2cm; font-size: 10pt; color: #666; border-top: 1px solid #999; padding-top: 0.5cm; }
            </style></head><body>
              <div class="header">
                <h1>Emergency Triage Assessment Sheet</h1>
              </div>
              <div class="field"><label>Patient:</label> ${patientName || '_________________________'}</div>
              <div class="field"><label>Date:</label> ${new Date().toLocaleString()}</div>
              <div class="field"><label>ESI Level:</label> ${acuityOpt ? `Level ${acuityOpt.level} — ${acuity.replace(/_/g, ' ')}` : 'Not assessed'}</div>
              ${chiefComplaint ? `<div class="field"><label>Chief Complaint:</label> ${chiefComplaint}</div>` : ''}
              <h2 style="font-size:14pt; margin-top:1cm;">Vital Signs</h2>
              <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>Blood Pressure (Systolic)</td><td>${systolic || '-'} mmHg</td></tr>
                <tr><td>Blood Pressure (Diastolic)</td><td>${diastolic || '-'} mmHg</td></tr>
                <tr><td>Heart Rate</td><td>${heartRate || '-'} bpm</td></tr>
                <tr><td>Respiratory Rate</td><td>${respiratoryRate || '-'} /min</td></tr>
                <tr><td>Temperature</td><td>${temperature || '-'} °C</td></tr>
                <tr><td>Oxygen Saturation</td><td>${oxygenSaturation || '-'} %</td></tr>
              </table>
              ${triageNotes ? `<div class="field"><label>Triage Notes:</label> ${triageNotes}</div>` : ''}
              <div class="footer">Printed at ${new Date().toLocaleString()}</div>
            </body></html>
          `);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
        }}>
          <Printer size={14} className="mr-1" /> Print Triage Sheet
        </Button>
        <Button type="submit" loading={isSubmitting} aria-label={isEditing ? t('emergency.form.updateTriage') : t('emergency.form.completeTriage')}>
          {isEditing ? t('emergency.form.updateTriage') : t('emergency.form.completeTriage')}
        </Button>
      </div>
    </form>
  );
}
