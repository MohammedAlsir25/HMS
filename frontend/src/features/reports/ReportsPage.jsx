import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import {
  useAccountingSummary,
  useRevenueByDay,
  useRevenueByType,
  useRevenueByDepartment,
  usePnL,
} from '../../hooks/queries/useAccounting';
import { useSurgeryStats } from '../../hooks/queries/useSurgery';
import { formatCurrency } from '../../utils/currency';
const formatDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

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

export default function ReportsPage() {
  const endDefault = new Date().toISOString().slice(0, 10);
  const startDefault = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(startDefault);
  const [endDate, setEndDate] = useState(endDefault);
  const dateParams = `startDate=${startDate}&endDate=${endDate}`;

  const { data: summary } = useAccountingSummary();
  const { data: revByDay } = useRevenueByDay(`days=30`);
  const { data: revByType } = useRevenueByType(``);
  const { data: revByDept } = useRevenueByDepartment(dateParams);
  const { data: pnl } = usePnL(dateParams);
  const { data: surgeryStats } = useSurgeryStats();

  const revMax = Math.max(...(revByDay?.map((d) => d.total) || [0]), 1);
  const typeMax = Math.max(...(revByType?.map((d) => d.total) || [0]), 1);
  const deptMax = Math.max(...(revByDept?.map((d) => d.total) || [0]));

  const COLORS = ['bg-lilac-bloom', 'bg-green-400', 'bg-amber-400', 'bg-purple-400', 'bg-sky-400', 'bg-pink-400', 'bg-orange-400'];

  const pnlColumns = [
    { key: 'dept', label: 'Department', render: (r) => r.department?.name || 'Uncategorized' },
    { key: 'revenue', label: 'Revenue', render: (r) => formatCurrency(r.revenue) },
    { key: 'cogs', label: 'COGS', render: (r) => formatCurrency(r.cogs) },
    { key: 'expense', label: 'Expenses', render: (r) => formatCurrency(r.expense) },
    { key: 'grossProfit', label: 'Gross Profit', render: (r) => <span className={r.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(r.grossProfit)}</span> },
    { key: 'net', label: 'Net', render: (r) => <span className={r.net >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(r.net)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Reports & Analytics</h1>
          <p className="text-body text-slate mt-1">Revenue, profit & loss, and operational statistics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
            <span className="text-slate">–</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card><CardContent className="text-center py-5"><p className="text-2xl font-bold text-obsidian">{formatCurrency(summary?.today?.total)}</p><p className="text-caption text-slate">Today</p></CardContent></Card>
        <Card><CardContent className="text-center py-5"><p className="text-2xl font-bold text-obsidian">{formatCurrency(summary?.week?.total)}</p><p className="text-caption text-slate">This Week</p></CardContent></Card>
        <Card><CardContent className="text-center py-5"><p className="text-2xl font-bold text-obsidian">{formatCurrency(summary?.month?.total)}</p><p className="text-caption text-slate">This Month</p></CardContent></Card>
        <Card><CardContent className="text-center py-5"><p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.today?.grossProfit)}</p><p className="text-caption text-slate">Gross Profit Today</p></CardContent></Card>
        <Card><CardContent className="text-center py-5"><p className="text-2xl font-bold text-obsidian">{surgeryStats?.today || 0}</p><p className="text-caption text-slate">Surgeries Today</p></CardContent></Card>
        <Card><CardContent className="text-center py-5"><p className="text-2xl font-bold text-obsidian">{summary?.today?.count || 0}</p><p className="text-caption text-slate">Transactions Today</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Revenue — Last 30 Days</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
            {(revByDay || []).slice().reverse().map((d) => (
              <div key={d.date} className="flex items-center gap-2">
                <span className="text-caption text-slate w-16 shrink-0">{formatDate(d.date)}</span>
                <div className="flex-1 h-4 rounded-full bg-bone overflow-hidden">
                  <div className="h-full rounded-full bg-lilac-bloom transition-all duration-500" style={{ width: `${(d.total / revMax) * 100}%` }} />
                </div>
                <span className="text-caption font-medium text-obsidian w-20 text-right">{formatCurrency(d.total)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by Type</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(revByType || []).map((d, i) => (
              <Bar key={d.type} label={d.type} value={d.total} max={typeMax} color={COLORS[i % COLORS.length]} />
            ))}
            {(!revByType || revByType.length === 0) && <p className="text-caption text-slate text-center py-8">No data</p>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Revenue by Department</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(revByDept || []).map((d, i) => (
              <Bar key={d.departmentId || 'none'} label={d.department?.name || 'Uncategorized'} value={d.total} max={deptMax} color={COLORS[i % COLORS.length]} />
            ))}
            {(!revByDept || revByDept.length === 0) && <p className="text-caption text-slate text-center py-8">No data for selected period</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Revenue by Payment Method</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary?.today?.byMethod && Object.entries(summary.today.byMethod)
              .sort(([, a], [, b]) => b - a)
              .map(([method, amount]) => (
                <Bar key={method} label={method} value={amount} max={Math.max(...Object.values(summary.today.byMethod), 1)} />
              ))}
            {(!summary?.today?.byMethod || Object.keys(summary.today.byMethod).length === 0) && <p className="text-caption text-slate text-center py-8">No data today</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss by Department</CardTitle>
          <span className="text-caption text-slate">{startDate} – {endDate}</span>
        </CardHeader>
        <CardContent>
          <Table columns={pnlColumns} data={pnl?.departments || []} />
          {pnl?.totals && (
            <div className="mt-4 pt-4 border-t border-silver/50 grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div><p className="text-caption text-slate">Total Revenue</p><p className="text-body font-semibold text-obsidian">{formatCurrency(pnl.totals.revenue)}</p></div>
              <div><p className="text-caption text-slate">Total COGS</p><p className="text-body font-semibold text-obsidian">{formatCurrency(pnl.totals.cogs)}</p></div>
              <div><p className="text-caption text-slate">Total Expenses</p><p className="text-body font-semibold text-obsidian">{formatCurrency(pnl.totals.expense)}</p></div>
              <div><p className="text-caption text-slate">Gross Profit</p><p className="text-body font-semibold text-green-600">{formatCurrency(pnl.totals.grossProfit)}</p></div>
              <div><p className="text-caption text-slate">Net</p><p className={`text-body font-semibold ${pnl.totals.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(pnl.totals.net)}</p></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}