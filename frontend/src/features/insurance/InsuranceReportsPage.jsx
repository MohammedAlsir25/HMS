import { useState } from 'react';
import { useInsuranceReports } from '../../hooks/queries/useInsurance';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { formatCurrency } from '../../utils/currency';

function buildDateParams(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  return params.toString();
}

export default function InsuranceReportsPage() {
  const [tab, setTab] = useState('claims-by-company');
  const endDefault = new Date().toISOString().slice(0, 10);
  const startDefault = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(startDefault);
  const [endDate, setEndDate] = useState(endDefault);

  const dateParams = buildDateParams(startDate, endDate);
  const { data: claimsByCompany, isLoading: loadingClaims, isError: claimsError } = useInsuranceReports('claims-by-company', dateParams);
  const { data: settlementRate, isLoading: loadingSettlement, isError: settlementError } = useInsuranceReports('settlement-rate', dateParams);
  const { data: revenueByInsurance, isLoading: loadingRevenue, isError: revenueError } = useInsuranceReports('revenue-by-insurance', dateParams);
  const { data: denialAnalysis, isLoading: loadingDenial, isError: denialError } = useInsuranceReports('denial-analysis', dateParams);
  const { data: denialTrends, isLoading: loadingDenialTrends, isError: denialTrendsError } = useInsuranceReports('denial-trends', dateParams);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Insurance Reports</h1>
          <p className="text-body text-slate mt-1">Claims analysis, settlement rates, and denial tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
            <span className="text-slate">-</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
          </div>
          <Button variant="secondary" size="sm" onClick={handlePrint}>Print</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-silver pb-2 overflow-x-auto">
        <Button variant={tab === 'claims-by-company' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('claims-by-company')}>Claims by Company</Button>
        <Button variant={tab === 'settlement-rate' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('settlement-rate')}>Settlement Rate</Button>
        <Button variant={tab === 'revenue-by-insurance' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('revenue-by-insurance')}>Revenue by Insurance</Button>
        <Button variant={tab === 'denial-analysis' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('denial-analysis')}>Denial Analysis</Button>
        <Button variant={tab === 'denial-trends' ? 'primary' : 'secondary'} size="sm" onClick={() => setTab('denial-trends')}>Denial Trends</Button>
      </div>

      {claimsError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          Failed to load claims data.
        </div>
      )}
      {settlementError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          Failed to load settlement data.
        </div>
      )}
      {(revenueError || denialError) && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          Failed to load revenue or denial data.
        </div>
      )}
      {denialTrendsError && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          Failed to load denial trends data.
        </div>
      )}

      {tab === 'claims-by-company' && (
        <Card>
          <CardHeader><CardTitle>Claims by Company</CardTitle></CardHeader>
          <CardContent>
            {loadingClaims ? (
              <p className="text-body text-slate text-center py-8">Loading...</p>
            ) : (
              <>
                {(claimsByCompany?.companies || claimsByCompany || []).length === 0 ? (
                  <p className="text-body text-slate text-center py-8">No data available</p>
                ) : (
                  <Table
                    columns={[
                      { key: 'company', header: 'Company', render: (r) => <span className="font-medium">{r.companyName || r.name || '-'}</span> },
                      { key: 'totalClaims', header: 'Total Claims', render: (r) => r.totalClaims || r.count || 0 },
                      { key: 'totalAmount', header: 'Total Amount', render: (r) => formatCurrency(r.totalAmount || r.total || 0) },
                      { key: 'approvedAmount', header: 'Approved', render: (r) => formatCurrency(r.approvedAmount || 0) },
                      { key: 'paidAmount', header: 'Paid', render: (r) => <span className="text-green-600 font-semibold">{formatCurrency(r.paidAmount || 0)}</span> },
                    ]}
                    data={claimsByCompany?.companies || claimsByCompany || []}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'settlement-rate' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="text-center py-5">
              <p className="text-2xl font-bold text-obsidian">{settlementRate?.settlementRate || 0}%</p>
              <p className="text-caption text-slate">Settlement Rate</p>
            </CardContent></Card>
            <Card><CardContent className="text-center py-5">
              <p className="text-2xl font-bold text-obsidian">{settlementRate?.avgProcessingDays || 0}</p>
              <p className="text-caption text-slate">Avg Processing Days</p>
            </CardContent></Card>
            <Card><CardContent className="text-center py-5">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(settlementRate?.totalSettledAmount || 0)}</p>
              <p className="text-caption text-slate">Total Settled</p>
            </CardContent></Card>
            <Card><CardContent className="text-center py-5">
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(settlementRate?.pendingAmount || 0)}</p>
              <p className="text-caption text-slate">Pending Amount</p>
            </CardContent></Card>
          </div>
        </div>
      )}

      {tab === 'revenue-by-insurance' && (
        <Card>
          <CardHeader><CardTitle>Revenue by Payment Method</CardTitle></CardHeader>
          <CardContent>
            {loadingRevenue ? (
              <p className="text-body text-slate text-center py-8">Loading...</p>
            ) : (
              <>
                {(revenueByInsurance?.methods || revenueByInsurance || []).length === 0 ? (
                  <p className="text-body text-slate text-center py-8">No data available</p>
                ) : (
                  <Table
                    columns={[
                      { key: 'method', header: 'Payment Method', render: (r) => <span className="font-medium">{r.paymentMethod || r.method || '-'}</span> },
                      { key: 'totalRevenue', header: 'Revenue', render: (r) => formatCurrency(r.totalRevenue || r.total || 0) },
                      { key: 'transactionCount', header: 'Transactions', render: (r) => r.transactionCount || r.count || 0 },
                      { key: 'percentage', header: 'Share', render: (r) => `${(r.percentage || 0).toFixed(1)}%` },
                    ]}
                    data={revenueByInsurance?.methods || revenueByInsurance || []}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'denial-analysis' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Top Rejection Reasons</CardTitle></CardHeader>
            <CardContent>
              {loadingDenial ? (
                <p className="text-body text-slate text-center py-8">Loading...</p>
              ) : (
                <>
                  {(denialAnalysis?.rejectionReasons || denialAnalysis || []).length === 0 ? (
                    <p className="text-body text-slate text-center py-8">No denial data available</p>
                  ) : (
                    <Table
                      columns={[
                        { key: 'reason', header: 'Rejection Reason', render: (r) => <span className="font-medium">{r.reason || '-'}</span> },
                        { key: 'count', header: 'Count', render: (r) => r.count || 0 },
                        { key: 'percentage', header: '%', render: (r) => `${(r.percentage || 0).toFixed(1)}%` },
                      ]}
                      data={denialAnalysis?.rejectionReasons || denialAnalysis || []}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Denial Rate by Company</CardTitle></CardHeader>
            <CardContent>
              {loadingDenial ? (
                <p className="text-body text-slate text-center py-8">Loading...</p>
              ) : (
                <>
                  {(denialAnalysis?.byCompany || []).length === 0 ? (
                    <p className="text-body text-slate text-center py-8">No data available</p>
                  ) : (
                    <Table
                      columns={[
                        { key: 'company', header: 'Company', render: (r) => <span className="font-medium">{r.companyName || '-'}</span> },
                        { key: 'totalClaims', header: 'Total Claims', render: (r) => r.totalClaims || 0 },
                        { key: 'deniedClaims', header: 'Denied', render: (r) => <span className="text-red-600">{r.deniedClaims || 0}</span> },
                        { key: 'denialRate', header: 'Denial Rate', render: (r) => `${(r.denialRate || 0).toFixed(1)}%` },
                      ]}
                      data={denialAnalysis?.byCompany || []}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'denial-trends' && (
        <div className="space-y-4">
          {loadingDenialTrends ? (
            <Card><CardContent><p className="text-body text-slate text-center py-8">Loading denial trends...</p></CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="text-center py-5">
                  <p className="text-2xl font-bold text-obsidian">{denialTrends?.totalDenied || 0}</p>
                  <p className="text-caption text-slate">Total Denied</p>
                </CardContent></Card>
                <Card><CardContent className="text-center py-5">
                  <p className="text-2xl font-bold text-red-600">{denialTrends?.denialRate || 0}%</p>
                  <p className="text-caption text-slate">Overall Denial Rate</p>
                </CardContent></Card>
                <Card><CardContent className="text-center py-5">
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(denialTrends?.totalDeniedAmount || 0)}</p>
                  <p className="text-caption text-slate">Denied Amount</p>
                </CardContent></Card>
                <Card><CardContent className="text-center py-5">
                  <p className="text-2xl font-bold text-green-600">{denialTrends?.appealSuccessRate || 0}%</p>
                  <p className="text-caption text-slate">Appeal Success Rate</p>
                </CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Monthly Denial Trend</CardTitle></CardHeader>
                <CardContent>
                  {(denialTrends?.monthlyTrends || []).length === 0 ? (
                    <p className="text-body text-slate text-center py-8">No trend data available</p>
                  ) : (
                    <Table
                      columns={[
                        { key: 'month', header: 'Month', render: (r) => <span className="font-medium">{r.month || '-'}</span> },
                        { key: 'totalClaims', header: 'Total Claims', render: (r) => r.totalClaims || 0 },
                        { key: 'deniedClaims', header: 'Denied', render: (r) => <span className="text-red-600">{r.deniedClaims || 0}</span> },
                        { key: 'denialRate', header: 'Denial Rate', render: (r) => `${(r.denialRate || 0).toFixed(1)}%` },
                        { key: 'deniedAmount', header: 'Denied Amount', render: (r) => formatCurrency(r.deniedAmount || 0) },
                      ]}
                      data={denialTrends?.monthlyTrends || []}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Denial Reasons Over Time</CardTitle></CardHeader>
                <CardContent>
                  {(denialTrends?.reasonTrends || []).length === 0 ? (
                    <p className="text-body text-slate text-center py-8">No data available</p>
                  ) : (
                    <Table
                      columns={[
                        { key: 'reason', header: 'Reason', render: (r) => <span className="font-medium">{r.reason || '-'}</span> },
                        { key: 'count', header: 'Count', render: (r) => r.count || 0 },
                        { key: 'trend', header: 'Trend', render: (r) => {
                          if (r.trend === 'increasing') return <span className="text-red-600">↑ Increasing</span>;
                          if (r.trend === 'decreasing') return <span className="text-green-600">↓ Decreasing</span>;
                          return <span className="text-slate">→ Stable</span>;
                        }},
                        { key: 'avgDaysToResolve', header: 'Avg Days', render: (r) => r.avgDaysToResolve || '-' },
                      ]}
                      data={denialTrends?.reasonTrends || []}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
