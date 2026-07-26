import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { usePharmacyReport } from '../../hooks/queries/useReports';
import { formatCurrency } from '../../utils/currency';

const topSellingColumns = [
  { key: 'rank', label: '#', render: (_r, _c, i) => i + 1 },
  { key: 'item', label: 'Item' },
  { key: 'quantity', label: 'Qty Sold', render: (r) => <span className="font-semibold">{r.quantity || 0}</span> },
  { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
];

const categoryColumns = [
  { key: 'category', label: 'Category' },
  { key: 'quantity', label: 'Qty Sold', render: (r) => r.quantity || 0 },
];

const expiryColumns = [
  { key: 'item', label: 'Item' },
  { key: 'expiryDate', label: 'Expiry Date', render: (r) => new Date(r.expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
  { key: 'quantity', label: 'Stock', render: (r) => r.quantity || 0 },
  { key: 'status', label: 'Status', render: (r) => {
    const days = r.daysUntilExpiry || 0;
    if (days <= 30) return <Badge variant="danger" size="sm">Expiring Soon</Badge>;
    if (days <= 60) return <Badge variant="warning" size="sm">60 Days</Badge>;
    return <Badge variant="info" size="sm">90 Days</Badge>;
  }},
];

const trendColumns = [
  { key: 'month', label: 'Month' },
  { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
];

export default function PharmacyReport({ dateParams }) {
  const { data, isLoading, error } = usePharmacyReport(dateParams);

  if (isLoading) {
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

  if (error) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-red-500">{error.message || 'Failed to load pharmacy data'}</p>
      </CardContent></Card>
    );
  }

  if (!data) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-slate">No pharmacy data available</p>
      </CardContent></Card>
    );
  }

  const expiringSoon = data.expiringSoon || [];
  const totalExpiring = expiringSoon.reduce((sum, e) => sum + (e.quantity || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{formatCurrency(data.totalRevenue || 0)}</p>
            <p className="text-caption text-slate">Total Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{data.totalSales || 0}</p>
            <p className="text-caption text-slate">Total Transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{formatCurrency(data.stockValue || 0)}</p>
            <p className="text-caption text-slate">Stock Value</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-amber-600">{data.lowStockCount || 0}</p>
            <p className="text-caption text-slate">Low Stock Items</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-red-600">{totalExpiring}</p>
            <p className="text-caption text-slate">Expiring Soon (total stock)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-amber-600">{data.expiring30Days || 0}</p>
            <p className="text-caption text-slate">Expiring in 30 Days</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Top Selling Items</CardTitle></CardHeader>
        <CardContent>
          <Table columns={topSellingColumns} data={data.topSelling || []} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Sales by Category</CardTitle></CardHeader>
          <CardContent>
            <Table columns={categoryColumns} data={data.salesByCategory || []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Expiring Soon</CardTitle></CardHeader>
          <CardContent>
            <Table columns={expiryColumns} data={expiringSoon} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Monthly Sales Trend</CardTitle></CardHeader>
        <CardContent>
          <Table columns={trendColumns} data={data.monthlyTrend || []} />
        </CardContent>
      </Card>
    </div>
  );
}
