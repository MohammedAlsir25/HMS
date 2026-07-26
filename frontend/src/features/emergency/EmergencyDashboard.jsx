import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useEmergencyDashboard } from '../../hooks/queries/useEmergency';

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

function AcuityBadge({ acuity, size = 'md' }) {
  const style = ACUITY_STYLES[acuity];
  if (!style) return null;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-caption';
  return (
    <span className={`${style.bg} ${style.text} ${sizeClass} rounded-full font-medium`}>
      {style.label}
    </span>
  );
}

export default function EmergencyDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error } = useEmergencyDashboard();

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
          <span>{t('emergency.dashboard.loadError')}</span>
        </div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const byAcuity = data?.byAcuity || [];
  const bedAvailability = data?.bedAvailability || {};
  const hasPatients = byAcuity.some((a) => a.count > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium text-obsidian">{t('emergency.dashboard.title')}</h1>
          <p className="text-body text-slate">{t('emergency.dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate('/emergency/register')} aria-label={t('emergency.dashboard.newRegistration')}>{t('emergency.dashboard.newRegistration')}</Button>
          <Button variant="ghost" onClick={() => navigate('/emergency/triage')} aria-label={t('emergency.dashboard.triage')}>{t('emergency.dashboard.triage')}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" role="list" aria-label={t('emergency.dashboard.title')}>
        {byAcuity.map((item) => {
          const style = ACUITY_STYLES[item.acuity];
          return (
            <Card key={item.acuity} role="listitem">
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-caption text-slate">{t(`emergency.acuity.${item.acuity}`)}</p>
                  <AcuityBadge acuity={item.acuity} size="sm" />
                </div>
                <p className="text-heading font-medium text-obsidian">{item.count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <p className="text-caption text-slate">{t('emergency.dashboard.totalInDepartment')}</p>
            <p className="text-heading font-medium text-obsidian">{summary.totalToday ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-slate">{t('emergency.dashboard.awaitingTriage')}</p>
            <p className="text-heading font-medium text-obsidian">{summary.awaitingTriage ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-slate">{t('emergency.dashboard.avgWaitTime')}</p>
            <p className="text-heading font-medium text-obsidian">{formatWait(summary.averageWaitMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-slate">{t('emergency.dashboard.admittedToday')}</p>
            <p className="text-heading font-medium text-obsidian">{summary.admittedToday ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-subheading font-medium text-obsidian">{t('emergency.dashboard.bedAvailability')}</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="group" aria-label={t('emergency.dashboard.bedAvailability')}>
            <div>
              <p className="text-caption text-slate">{t('emergency.dashboard.totalBeds')}</p>
              <p className="text-body font-medium text-obsidian">{bedAvailability.totalBeds ?? 0}</p>
            </div>
            <div>
              <p className="text-caption text-slate">{t('emergency.dashboard.occupied')}</p>
              <p className="text-body font-medium text-obsidian">{bedAvailability.occupiedBeds ?? 0}</p>
            </div>
            <div>
              <p className="text-caption text-slate">{t('emergency.dashboard.vacant')}</p>
              <p className="text-body font-medium text-obsidian">{bedAvailability.vacantBeds ?? 0}</p>
            </div>
            <div>
              <p className="text-caption text-slate">{t('emergency.dashboard.occupancyRate')}</p>
              <p className="text-body font-medium text-obsidian">{bedAvailability.occupancyRate ?? 0}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.dashboard.currentlyInDepartment')}</h2>
          {!hasPatients ? (
            <div className="text-center py-8 text-slate">
              <p className="text-body">{t('emergency.dashboard.noPatients')}</p>
            </div>
          ) : (
            <div className="space-y-3" role="list" aria-label={t('emergency.dashboard.currentlyInDepartment')}>
              {byAcuity.filter((a) => a.count > 0).map((group) => (
                <div key={group.acuity} role="listitem">
                  <div className="flex items-center gap-2 mb-2">
                    <AcuityBadge acuity={group.acuity} />
                    <span className="text-caption text-slate">{t('emergency.dashboard.patientsCount', { count: group.count })}</span>
                  </div>
                  <div className="grid gap-2">
                    {group.patients.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between bg-bone/50 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-body font-medium text-obsidian">{patient.patientName}</span>
                          <span className="text-caption text-slate">{patient.mrn}</span>
                          <span className="text-caption text-slate">{patient.chiefComplaint}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-caption text-slate">{t('emergency.dashboard.wait', { time: formatWait(patient.waitMinutes) })}</span>
                          {patient.disposition && (
                            <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded text-slate">
                              {patient.disposition}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
