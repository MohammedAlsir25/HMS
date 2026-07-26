import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Table } from '../../components/ui/Table';
import { useRevenueReport } from '../../hooks/queries/useReports';
import { formatCurrency } from '../../utils/currency';

function Bar({ value, max, label, color = 'bg-lilac-bloom' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-caption text-slate w-24 shrink-0 truncate text-right">{label}</span>
      <div className="flex-1 h-5 rounded-full bg-bone overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-caption font-medium text-obsidian w-20 shrink-0 text-right">{formatCurrency(value)}</span>
    </div>
  );
}

const COLORS = ['bg-lilac-bloom', 'bg-green-400', 'bg-amber-400', 'bg-purple-400', 'bg-sky-400', 'bg-pink-400', 'bg-orange-400'];

const columns = [
  { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
  { key: 'cash', label: 'Cash', render: (r) => formatCurrency(r.cash) },
  { key: 'card', label: 'Card', render: (r) => formatCurrency(r.card) },
  { key: 'insurance', label: 'Insurance', render: (r) => formatCurrency(r.insurance) },
  { key: 'bankTransfer', label: 'Bank Transfer', render: (r) => formatCurrency(r.bankTransfer) },
  { key: 'total', label: 'Total', render: (r) => <span className="font-semibold">{formatCurrency(r.total)}</span> },
];

export default function RevenueReport({ dateParams }) {
  const { data, isLoading, error } = useRevenueReport(dateParams);

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
        <p className="text-body text-red-500">{error.message || 'Failed to load revenue data'}</p>
      </CardContent></Card>
    );
  }

  if (!data || (!data.dailyData?.length && !data.totals?.byMethod?.length)) {
    return (
      <Card><CardContent className="text-center py-12">
        <p className="text-body text-slate">No revenue data for selected period</p>
      </CardContent></Card>
    );
  }

  const daily = data.dailyData || [];
  const byMethod = data.totals?.byMethod || [];
  const byDept = data.totals?.byDepartment || [];
  const totals = data.totals || {};
  const summary = data.summary || {};
  const periodComparison = data.periodComparison;

  const cash = daily.reduce((s, d) => s + (d.cash || 0), 0);
  const card = daily.reduce((s, d) => s + (d.card || 0), 0);
  const insurance = daily.reduce((s, d) => s + (d.insurance || 0), 0);

  const dailyMax = Math.max(...daily.map((d) => d.total || 0), 1);
  const methodMax = Math.max(...byMethod.map((d) => d.total || 0), 1);
  const deptMax = Math.max(...byDept.map((d) => d.total || 0), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{formatCurrency(totals.gross)}</p>
            <p className="text-caption text-slate">Total Revenue</p>
            {periodComparison !== null && periodComparison !== undefined && (
              <p className={`text-xs mt-1 ${periodComparison >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {periodComparison >= 0 ? '+' : ''}{periodComparison}% vs previous
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{formatCurrency(totals.net)}</p>
            <p className="text-caption text-slate">Net Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{formatCurrency(cash)}</p>
            <p className="text-caption text-slate">Cash</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-5">
            <p className="text-2xl font-bold text-obsidian">{formatCurrency(card)}</p>
            <p className="text-caption text-slate">Card</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Daily Revenue</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
            {daily.slice().reverse().map((d) => (
              <div key={d.date} className="flex items-center gap-2">
                <span className="text-caption text-slate w-16 shrink-0">{new Date(d.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                <div className="flex-1 h-4 rounded-full bg-bone overflow-hidden">
                  <div className="h-full rounded-full bg-lilac-bloom transition-all duration-500" style={{ width: `${((d.total || 0) / dailyMax) * 100}%` }} />
                </div>
                <span className="text-caption font-medium text-obsidian w-20 text-right">{formatCurrency(d.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by Payment Method</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {byMethod.map((d, i) => (
              <Bar key={d.method} label={d.method} value={d.total || 0} max={methodMax} color={COLORS[i % COLORS.length]} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Revenue by Department</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {byDept.map((d, i) => (
            <Bar key={d.departmentId || 'none'} label={d.departmentId || 'Uncategorized'} value={d.total || 0} max={deptMax} color={COLORS[i % COLORS.length]} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Daily Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table columns={columns} data={daily} />
        </CardContent>
      </Card>
    </div>
  );
}
