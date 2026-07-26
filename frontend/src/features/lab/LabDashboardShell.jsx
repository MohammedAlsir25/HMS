import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLabStats, labKeys } from '../../hooks/queries/useLab';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import LabQueueTab from './LabQueueTab';
import LabCatalogTab from './LabCatalogTab';
import LabPanelsTab from './LabPanelsTab';
import LabReportsTab from './LabReportsTab';
import NewRequestModal from './NewRequestModal';

export default function LabDashboardShell() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('queue');
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [mutationError, setMutationError] = useState('');

  const { data: stats, isLoading: statsLoading } = useLabStats();

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: labKeys.orders });
    queryClient.invalidateQueries({ queryKey: labKeys.stats });
  }, [queryClient]);

  const tabs = [
    { key: 'queue', label: t('lab.tab.queue') },
    { key: 'catalog', label: t('lab.tab.catalog') },
    { key: 'panels', label: t('lab.tab.panels') },
    { key: 'reports', label: t('lab.tab.reports') },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {mutationError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{mutationError}</span>
          <button onClick={() => setMutationError('')} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 text-xl leading-none touch-target">&times;</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading font-medium text-obsidian">{t('lab.title')}</h1>
          <p className="text-body text-slate">{t('lab.description')}</p>
        </div>
        {activeTab === 'queue' && (
          <Button onClick={() => setShowNewRequest(true)}>{t('lab.requestTest')}</Button>
        )}
      </div>

      <div className="flex gap-1 bg-bone p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-target
              ${activeTab === tab.key ? 'bg-paper text-obsidian shadow-sm' : 'text-graphite hover:text-obsidian'}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <p className="text-caption text-slate">{t('lab.statsPending')}</p>
              <p className="text-heading font-medium text-obsidian">{stats.pending || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-slate">{t('lab.statsInProgress')}</p>
              <p className="text-heading font-medium text-obsidian">{stats.inProgress || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-slate">{t('lab.statsToday')}</p>
              <p className="text-heading font-medium text-obsidian">{stats.completedToday || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <p className="text-caption text-slate">{t('lab.statsCatalog')}</p>
              <p className="text-heading font-medium text-obsidian">{stats.catalogCount || 0}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'queue' && <LabQueueTab />}
      {activeTab === 'catalog' && <LabCatalogTab onRefresh={handleRefresh} />}
      {activeTab === 'panels' && <LabPanelsTab />}
      {activeTab === 'reports' && <LabReportsTab />}

      <NewRequestModal
        open={showNewRequest}
        onClose={() => setShowNewRequest(false)}
        onCreated={handleRefresh}
      />
    </div>
  );
}
