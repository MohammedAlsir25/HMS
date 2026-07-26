import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '../../components/ui/Card';
import { useEmergencyStats, useDailyTrend } from '../../hooks/queries/useEmergency';

const ACUITY_COLORS = {
  RESUSCITATION: 'text-red-500',
  EMERGENT: 'text-orange-500',
  URGENT: 'text-yellow-500',
  LESS_URGENT: 'text-green-500',
  NON_URGENT: 'text-blue-500',
};

function formatDate(d) {
  return new Date(d).toLocaleDateString();
}

export default function EmergencyStats() {
  const { t } = useTranslation();
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const params = startDate && endDate ? `startDate=${startDate}&endDate=${endDate}` : '';
  const { data: stats, isLoading: statsLoading, error: statsError } = useEmergencyStats(params);
  const { data: trend, isLoading: trendLoading, error: trendError } = useDailyTrend(params);

  if (statsLoading || trendLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-20" role="status" aria-label={t('common.loading')}>
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (statsError || trendError) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg" role="alert">
          <span>{t('emergency.stats.loadError')}</span>
        </div>
      </div>
    );
  }

  const byAcuity = stats?.byAcuity || [];
  const byDisposition = stats?.byDisposition || [];
  const dailyData = trend?.dailyTrend || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium text-obsidian">{t('emergency.stats.title')}</h1>
          <p className="text-body text-slate">{t('emergency.stats.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <label className="text-caption text-slate block mb-1" htmlFor="stats-start-date">{t('emergency.stats.startDate')}</label>
              <input
                id="stats-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
            <div>
              <label className="text-caption text-slate block mb-1" htmlFor="stats-end-date">{t('emergency.stats.endDate')}</label>
              <input
                id="stats-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 rounded-lg border border-silver/30 bg-paper text-obsidian text-body focus:outline-none focus:ring-2 focus:ring-lilac-bloom"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <p className="text-caption text-slate">{t('emergency.stats.totalVisits')}</p>
            <p className="text-heading font-medium text-obsidian">{stats?.totalPatients ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-slate">{t('emergency.stats.avgWaitTime')}</p>
            <p className="text-heading font-medium text-obsidian">{stats?.averageWaitMinutes ?? 0} {t('emergency.stats.min')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-slate">{t('emergency.stats.admissionRate')}</p>
            <p className="text-heading font-medium text-obsidian">{stats?.admissionRate ?? 0}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-caption text-slate">{t('emergency.stats.dischargeRate')}</p>
            <p className="text-heading font-medium text-obsidian">{stats?.dischargeRate ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.stats.byAcuity')}</h3>
            {byAcuity.length === 0 ? (
              <p className="text-body text-slate text-center py-4">{t('emergency.stats.noData')}</p>
            ) : (
              <div className="space-y-3" role="list" aria-label={t('emergency.stats.byAcuity')}>
                {byAcuity.map((item) => (
                  <div key={item.acuity} className="flex items-center justify-between" role="listitem">
                    <span className={`text-body font-medium ${ACUITY_COLORS[item.acuity] || 'text-obsidian'}`}>
                      {t(`emergency.acuity.${item.acuity}`)}
                    </span>
                    <span className="text-body text-obsidian">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.stats.byDisposition')}</h3>
            {byDisposition.length === 0 ? (
              <p className="text-body text-slate text-center py-4">{t('emergency.stats.noData')}</p>
            ) : (
              <div className="space-y-3" role="list" aria-label={t('emergency.stats.byDisposition')}>
                {byDisposition.map((item) => (
                  <div key={item.disposition} className="flex items-center justify-between" role="listitem">
                    <span className="text-body text-obsidian">{item.disposition || t('emergency.stats.pending')}</span>
                    <span className="text-body text-obsidian">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent>
          <h3 className="text-subheading font-medium text-obsidian mb-4">{t('emergency.stats.dailyTrend')}</h3>
          {dailyData.length === 0 ? (
            <p className="text-body text-slate text-center py-8">{t('emergency.stats.noTrend')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-body text-obsidian" role="table" aria-label={t('emergency.stats.dailyTrend')}>
                <thead>
                  <tr className="border-b border-silver/20">
                    <th className="text-left py-3 px-4 text-caption font-medium text-slate" scope="col">{t('emergency.stats.date')}</th>
                    <th className="text-right py-3 px-4 text-caption font-medium text-slate" scope="col">{t('emergency.stats.visits')}</th>
                    <th className="text-right py-3 px-4 text-caption font-medium text-slate text-red-500" scope="col">ESI 1</th>
                    <th className="text-right py-3 px-4 text-caption font-medium text-slate text-orange-500" scope="col">ESI 2</th>
                    <th className="text-right py-3 px-4 text-caption font-medium text-slate text-yellow-500" scope="col">ESI 3</th>
                    <th className="text-right py-3 px-4 text-caption font-medium text-slate text-green-500" scope="col">ESI 4</th>
                    <th className="text-right py-3 px-4 text-caption font-medium text-slate text-blue-500" scope="col">ESI 5</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyData.map((row, idx) => (
                    <tr key={idx} className="border-b border-silver/10 hover:bg-bone/30">
                      <td className="py-3 px-4">{formatDate(row.date)}</td>
                      <td className="py-3 px-4 text-right font-medium">{row.totalVisits}</td>
                      <td className="py-3 px-4 text-right">{row.RESUSCITATION || 0}</td>
                      <td className="py-3 px-4 text-right">{row.EMERGENT || 0}</td>
                      <td className="py-3 px-4 text-right">{row.URGENT || 0}</td>
                      <td className="py-3 px-4 text-right">{row.LESS_URGENT || 0}</td>
                      <td className="py-3 px-4 text-right">{row.NON_URGENT || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
