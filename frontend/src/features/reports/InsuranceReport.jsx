import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { useInsuranceReports } from '../../hooks/queries/useInsurance';
import { formatCurrency } from '../../utils/currency';

const claimColumns = [
  { key: 'companyName', label: 'Company', render: (r) => <span className="font-medium">{r.companyName || '-'}</span> },
  { key: 'totalClaims', label: 'Claims', render: (r) => r.totalClaims || r.count || 0 },
  { key: 'totalAmount', label: 'Total Amount', render: (r) => formatCurrency(r.totalAmount || r.total || 0) },
  { key: 'approvedAmount', label: 'Approved', render: (r) => formatCurrency(r.approvedAmount || 0) },
  { key: 'paidAmount', label: 'Paid', render: (r) => <span className="text-green-600 font-semibold">{formatCurrency(r.paidAmount || 0)}</span> },
];

const denialColumns = [
  { key: 'reason', label: 'Rejection Reason', render: (r) => <span className="font-medium">{r.reason || '-'}</span> },
  { key: 'count', label: 'Count', render: (r) => r.count || 0 },
  { key: 'percentage', label: '%', render: (r) => `${(r.percentage || 0).toFixed(1)}%` },
];

function parsePercent(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return parseFloat(val.replace('%', '')) || 0;
  return 0;
}

export default function InsuranceReport({ dateParams }) {
  const { data: claimsData, isLoading: loadingClaims, isError: claimsError } = useInsuranceReports('claims-by-company', dateParams);
  const { data: settlementData, isLoading: loadingSettlement, isError: settlementError } = useInsuranceReports('settlement-rate', dateParams);
  const { data: denialData, isLoading: loadingDenial, isError: denialError } = useInsuranceReports('denial-analysis', dateParams);

  if (loadingClaims || loadingSettlement || loadingDenial) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="text-center py-5"><div className="h-8 bg-bone rounded animate-pulse" /><div className="h-4 bg-bone rounded animate-pulse mt-2" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (claimsError || settlementError || denialError) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
        Failed to load insurance report data. Please try again.
      </div>
    );
  }

  const settlement = settlementData || {};
  const claims = claimsData?.companies || claimsData || [];
  const denialReasons = denialData?.rejectionReasons || denialData || [];
  const denialByCompany = denialData?.byCompany || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{parsePercent(settlement.settlementRate)}%</p>
            <p className="text-caption text-slate">Settlement Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{settlement.avgProcessingDays || 0}</p>
            <p className="text-caption text-slate">Avg Processing Days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-green-600">{formatCurrency(settlement.totalSettledAmount || 0)}</p>
            <p className="text-caption text-slate">Total Settled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(settlement.pendingAmount || 0)}</p>
            <p className="text-caption text-slate">Pending Amount</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Claims by Company</CardTitle></CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No insurance claims data available</p>
          ) : (
            <Table columns={claimColumns} data={claims} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top Rejection Reasons</CardTitle></CardHeader>
        <CardContent>
          {denialReasons.length === 0 ? (
            <p className="text-body text-slate text-center py-8">No denial data available</p>
          ) : (
            <Table columns={denialColumns} data={denialReasons} />
          )}
        </CardContent>
      </Card>

      {denialByCompany.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Denial Rate by Company</CardTitle></CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: 'companyName', label: 'Company', render: (r) => <span className="font-medium">{r.companyName || '-'}</span> },
                { key: 'totalClaims', label: 'Total Claims', render: (r) => r.totalClaims || 0 },
                { key: 'deniedClaims', label: 'Denied', render: (r) => <span className="text-red-600">{r.deniedClaims || 0}</span> },
                { key: 'denialRate', label: 'Denial Rate', render: (r) => `${(r.denialRate || 0).toFixed(1)}%` },
              ]}
              data={denialByCompany}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
