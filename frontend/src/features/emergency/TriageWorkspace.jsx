import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useActiveTriages, useUpdateTriage } from '../../hooks/queries/useEmergency';
import TriageForm from './TriageForm';

const ACUITY_STYLES = {
  RESUSCITATION: { bg: 'bg-red-500', text: 'text-white', label: 'ESI 1' },
  EMERGENT: { bg: 'bg-orange-500', text: 'text-white', label: 'ESI 2' },
  URGENT: { bg: 'bg-yellow-400', text: 'text-yellow-900', label: 'ESI 3' },
  LESS_URGENT: { bg: 'bg-green-500', text: 'text-white', label: 'ESI 4' },
  NON_URGENT: { bg: 'bg-blue-500', text: 'text-white', label: 'ESI 5' },
};

function formatWait(minutes) {
  if (minutes == null) return '\u2014';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function AcuityBadge({ acuity }) {
  const style = ACUITY_STYLES[acuity];
  if (!style) return null;
  return (
    <span className={`${style.bg} ${style.text} px-2 py-0.5 text-xs rounded-full font-medium`}>
      {style.label}
    </span>
  );
}

function TriageCard({ patient, onStartTriage, onUpdateDisposition }) {
  const { t } = useTranslation();
  return (
    <div className="bg-bone/50 rounded-lg px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-body font-medium text-obsidian">{patient.patient?.fullName || patient.patientName}</span>
          <AcuityBadge acuity={patient.acuity} />
        </div>
        <span className="text-caption text-slate">{t('emergency.dashboard.wait', { time: formatWait(patient.waitMinutes) })}</span>
      </div>
      <p className="text-caption text-slate">{patient.chiefComplaint}</p>
      <div className="flex items-center justify-between">
        <span className="text-caption text-slate">
          {patient.triageTime ? new Date(patient.triageTime).toLocaleTimeString() : '\u2014'}
        </span>
        {patient.patient?.mrn && (
          <span className="text-caption text-slate">{patient.patient.mrn}</span>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        {onStartTriage && (
          <Button size="sm" onClick={() => onStartTriage(patient)} aria-label={t('emergency.triage.startTriage')}>
            {t('emergency.triage.startTriage')}
          </Button>
        )}
        {patient.disposition && (
          <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded text-slate">
            {patient.disposition}
          </span>
        )}
        {onUpdateDisposition && (
          <Button size="sm" variant="ghost" onClick={() => onUpdateDisposition(patient)} aria-label={t('emergency.triage.disposition')}>
            {t('emergency.triage.disposition')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function TriageWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error } = useActiveTriages();
  const updateTriage = useUpdateTriage();

  const [activeTab, setActiveTab] = useState('awaiting');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showTriageForm, setShowTriageForm] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20" role="status" aria-label={t('common.loading')}>
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
          <span>{t('emergency.triage.loadError')}</span>
        </div>
      </div>
    );
  }

  const awaiting = data?.awaitingTriage || [];
  const active = data?.activeTriage || [];
  const completed = data?.completedTriage || [];

  const currentList = activeTab === 'awaiting' ? awaiting : activeTab === 'active' ? active : completed;

  function handleStartTriage(patient) {
    setSelectedPatient(patient);
    setShowTriageForm(true);
  }

  function handleDisposition(patient) {
    setSelectedPatient(patient);
    setShowDisposition(true);
  }

  function handleDispositionSubmit(disposition) {
    if (!selectedPatient) return;
    updateTriage.mutate(
      { id: selectedPatient.id, disposition },
      {
        onSuccess: () => {
          setShowDisposition(false);
          setSelectedPatient(null);
        },
      },
    );
  }

  if (showTriageForm && selectedPatient) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-heading font-medium text-obsidian">{t('emergency.triage.assessment')}</h1>
          <Button variant="ghost" onClick={() => { setShowTriageForm(false); setSelectedPatient(null); }} aria-label={t('emergency.triage.backToWorkspace')}>
            {t('emergency.triage.backToWorkspace')}
          </Button>
        </div>
        <TriageForm
          patientId={selectedPatient.patientId || selectedPatient.patient?.id}
          patientName={selectedPatient.patient?.fullName || selectedPatient.patientName}
          triageAssessmentId={selectedPatient.id}
          onComplete={() => { setShowTriageForm(false); setSelectedPatient(null); }}
          existingAcuity={selectedPatient.acuity}
        />
      </div>
    );
  }

  const tabs = [
    { key: 'awaiting', label: t('emergency.triage.awaitingTriage'), count: awaiting.length },
    { key: 'active', label: t('emergency.triage.activeTriage'), count: active.length },
    { key: 'completed', label: t('emergency.triage.completed'), count: completed.length },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium text-obsidian">{t('emergency.triage.title')}</h1>
          <p className="text-body text-slate">{t('emergency.triage.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/emergency/register')} aria-label={t('emergency.triage.newRegistration')}>{t('emergency.triage.newRegistration')}</Button>
      </div>

      <div className="flex gap-1 bg-bone p-1 rounded-xl w-fit" role="tablist" aria-label={t('emergency.triage.title')}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`triage-panel-${tab.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
              ${activeTab === tab.key ? 'bg-paper text-obsidian shadow-sm' : 'text-graphite hover:text-obsidian'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="space-y-3" role="tabpanel" id={`triage-panel-${activeTab}`} aria-label={tabs.find((t) => t.key === activeTab)?.label}>
        {currentList.length === 0 ? (
          <div className="text-center py-12 text-slate">
            <p className="text-body">
              {activeTab === 'awaiting' && t('emergency.triage.noAwaiting')}
              {activeTab === 'active' && t('emergency.triage.noActive')}
              {activeTab === 'completed' && t('emergency.triage.noCompleted')}
            </p>
          </div>
        ) : (
          currentList.map((patient) => (
            <TriageCard
              key={patient.id}
              patient={patient}
              onStartTriage={activeTab === 'awaiting' ? handleStartTriage : undefined}
              onUpdateDisposition={activeTab === 'active' ? handleDisposition : undefined}
            />
          ))
        )}
      </div>

      {showDisposition && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-label={t('emergency.triage.setDisposition')}>
          <Card className="w-full max-w-md mx-4">
            <CardContent>
              <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.triage.setDisposition')}</h3>
              <p className="text-body text-slate mb-4">
                {selectedPatient.patient?.fullName || selectedPatient.patientName}
              </p>
              <div className="space-y-2" role="group" aria-label={t('emergency.triage.disposition')}>
                {[
                  { key: 'ADMITTED', label: t('emergency.triage.admitted') },
                  { key: 'DISCHARGED', label: t('emergency.triage.discharged') },
                  { key: 'TRANSFERRED', label: t('emergency.triage.transferred') },
                  { key: 'OBSERVATION', label: t('emergency.triage.observation') },
                ].map((disp) => (
                  <button
                    key={disp.key}
                    type="button"
                    onClick={() => handleDispositionSubmit(disp.key)}
                    aria-label={disp.label}
                    className="w-full text-left px-4 py-3 rounded-lg border border-silver/30 hover:bg-bone/50 text-body text-obsidian"
                  >
                    {disp.label}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" onClick={() => { setShowDisposition(false); setSelectedPatient(null); }} aria-label={t('emergency.form.cancel')}>
                  {t('emergency.form.cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
