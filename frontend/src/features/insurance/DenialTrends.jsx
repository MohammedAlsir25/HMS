import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useInsuranceClaims } from '../../hooks/queries/useInsurance';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { formatCurrency } from '../../utils/currency';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DenialTrends() {
  const { t } = useTranslation();
  const { data: rejectedData, isLoading, isError, error } = useInsuranceClaims('status=REJECTED&limit=500');
  const rejected = rejectedData?.claims || rejectedData || [];

  const monthlyData = useMemo(() => {
    const map = {};
    rejected.forEach((claim) => {
      const date = new Date(claim.submittedAt || claim.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { month: key, count: 0, totalAmount: 0 };
      map[key].count += 1;
      map[key].totalAmount += Number(claim.claimAmount) || 0;
    });
    return Object.values(map).sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
  }, [rejected]);

  const maxCount = useMemo(() => Math.max(...monthlyData.map((m) => m.count), 1), [monthlyData]);

  const topReasons = useMemo(() => {
    const map = {};
    rejected.forEach((claim) => {
      const reason = claim.denialReason || claim.rejectionReason || 'Unknown';
      if (!map[reason]) map[reason] = { reason, count: 0, totalAmount: 0 };
      map[reason].count += 1;
      map[reason].totalAmount += Number(claim.claimAmount) || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [rejected]);

  const byCompany = useMemo(() => {
    const map = {};
    rejected.forEach((claim) => {
      const name = claim.insuranceCompany?.name || 'Unknown';
      if (!map[name]) map[name] = { company: name, count: 0, totalAmount: 0 };
      map[name].count += 1;
      map[name].totalAmount += Number(claim.claimAmount) || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [rejected]);

  const maxCompanyCount = useMemo(() => Math.max(...byCompany.map((c) => c.count), 1), [byCompany]);

  const recentDeniedColumns = [
    {
      key: 'claimNumber', header: 'Claim #',
      render: (row) => <span className="font-medium">{row.claimNumber}</span>,
    },
    {
      key: 'patient', header: 'Patient',
      render: (row) => `${row.patient?.firstName || ''} ${row.patient?.lastName || ''}`,
    },
    {
      key: 'insuranceCompany', header: 'Company',
      render: (row) => row.insuranceCompany?.name || '-',
    },
    {
      key: 'claimAmount', header: 'Amount',
      render: (row) => formatCurrency(row.claimAmount),
    },
    {
      key: 'denialReason', header: 'Reason',
      render: (row) => <span className="text-sm">{row.denialReason || row.rejectionReason || '-'}</span>,
    },
    {
      key: 'date', header: 'Date',
      render: (row) => new Date(row.submittedAt || row.createdAt).toLocaleDateString(),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">Denial Trends</h1>
        <p className="text-body text-slate">Loading...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <h1 className="text-heading-sm font-semibold text-obsidian">Denial Trends</h1>
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          {error?.message || 'Failed to load denial data'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-sm font-semibold text-obsidian">Denial Trends</h1>
        <p className="text-body text-slate mt-1">{rejected.length} denied claims analyzed</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Denial Rate by Month</CardTitle></CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No denial data available</p>
          ) : (
            <div className="space-y-2">
              {monthlyData.map((m) => {
                const parts = m.month.split('-');
                const label = `${MONTH_NAMES[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
                const width = (m.count / maxCount) * 100;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-caption text-graphite w-20 text-right">{label}</span>
                    <div className="flex-1 bg-bone rounded-full h-6 overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full flex items-center px-2 transition-all" style={{ width: `${width}%` }}>
                        {m.count > 0 && <span className="text-caption font-medium text-white">{m.count}</span>}
                      </div>
                    </div>
                    <span className="text-caption text-slate w-24 text-right">{formatCurrency(m.totalAmount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top 5 Denial Reasons</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {topReasons.length === 0 ? (
              <p className="text-body text-slate text-center py-8">No data</p>
            ) : (
              topReasons.map((r, i) => (
                <div key={r.reason} className="flex items-center gap-3">
                  <span className="text-caption text-graphite w-6 text-center font-semibold">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-obsidian">{r.reason}</p>
                    <p className="text-xs text-slate">{r.count} claims — {formatCurrency(r.totalAmount)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Denials by Insurance Company</CardTitle></CardHeader>
          <CardContent>
            {byCompany.length === 0 ? (
              <p className="text-body text-slate text-center py-8">No data</p>
            ) : (
              <div className="space-y-3">
                {byCompany.map((c) => {
                  const width = (c.count / maxCompanyCount) * 100;
                  return (
                    <div key={c.company}>
                      <div className="flex justify-between mb-1">
                        <span className="text-caption font-medium text-obsidian">{c.company}</span>
                        <span className="text-caption text-slate">{c.count} denials</span>
                      </div>
                      <div className="bg-bone rounded-full h-5 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Denied Claims</CardTitle></CardHeader>
        <CardContent>
          {rejected.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No denied claims</p>
          ) : (
            <Table columns={recentDeniedColumns} data={rejected.slice(0, 20)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
