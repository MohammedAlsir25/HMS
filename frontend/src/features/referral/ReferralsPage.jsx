import { useTranslation } from 'react-i18next';
import { useReferrals, useUpdateReferralStatus } from '../../hooks/queries/useReferrals';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

const statusColors = {
  PENDING: 'warning',
  DISPATCHED: 'info',
  FULFILLED: 'success',
  CANCELLED: 'danger',
};

const typeLabels = {
  INTERNAL_CLINIC: 'Internal Clinic',
  PHARMACY_DISPATCH: 'Pharmacy',
  OPTICS_DISPATCH: 'Optics',
};

export default function ReferralsPage() {
  const { t } = useTranslation();
  const { data: referrals = [], isLoading, isError, refetch } = useReferrals();
  const updateStatus = useUpdateReferralStatus();

  const handleStatusChange = (id, status) => {
    updateStatus.mutate({ id, status });
  };

  return (
    <div className="space-y-6" data-tour="referrals">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('referrals.title')}</h1>
          <p className="text-body text-slate mt-1">{t('referrals.description')}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          {isLoading && <p className="text-body text-slate">{t('common.loading')}</p>}
          {isError && (
            <div className="flex flex-col items-center justify-center gap-4 py-12">
              <p className="text-body text-red-500">Failed to load referrals</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-sm rounded-lg bg-lilac-bloom text-white hover:opacity-90"
              >
                Retry
              </button>
            </div>
          )}
          {!isLoading && !isError && referrals.length === 0 && (
            <p className="text-body text-slate text-center py-8">{t('referrals.noReferrals')}</p>
          )}
          {!isLoading && !isError && referrals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-caption text-slate font-medium border-b border-silver">
                    <th className="pb-2 pr-4">{t('referrals.colPatient')}</th>
                    <th className="pb-2 pr-4">{t('referrals.colType')}</th>
                    <th className="pb-2 pr-4">{t('referrals.colFrom')}</th>
                    <th className="pb-2 pr-4">{t('referrals.colTo')}</th>
                    <th className="pb-2 pr-4">{t('referrals.colStatus')}</th>
                    <th className="pb-2 pr-4">{t('referrals.colDate')}</th>
                    <th className="pb-2">{t('referrals.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b border-bone last:border-0">
                      <td className="py-3 pr-4">
                        <span className="text-body text-obsidian">{r.patient.fullName}</span>
                        <span className="text-caption text-slate ml-1">{r.patient.mrn}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="primary" size="sm">{typeLabels[r.type] || r.type}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-body text-obsidian">{r.fromClinic.name}</td>
                      <td className="py-3 pr-4 text-body text-obsidian">
                        {r.toClinic ? r.toClinic.name : '\u2014'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusColors[r.status] || 'default'} size="sm">{r.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-caption text-slate">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {r.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => handleStatusChange(r.id, 'DISPATCHED')}>
                                {t('referrals.dispatch')}
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleStatusChange(r.id, 'CANCELLED')}>
                                {t('referrals.cancel')}
                              </Button>
                            </>
                          )}
                          {r.status === 'DISPATCHED' && (
                            <Button size="sm" onClick={() => handleStatusChange(r.id, 'FULFILLED')}>
                              {t('referrals.fulfill')}
                            </Button>
                          )}
                        </div>
                      </td>
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
