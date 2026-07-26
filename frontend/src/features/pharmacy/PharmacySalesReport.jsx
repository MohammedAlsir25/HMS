import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/currency';

export default function PharmacySalesReport() {
  const { t } = useTranslation();
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [interval, setInterval] = useState('daily');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to, interval });
      const result = await api.get(`/pharmacy/sales-report?${params}`);
      setData(result.data);
      setSummary(result.summary);
    } catch (err) {
      setError(err.message || t('pharmacy.salesReport.loadError'));
    } finally {
      setLoading(false);
    }
  }, [from, to, interval, t]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportCSV = () => {
    const headers = ['Date', 'Total Amount', 'Transactions', 'Items'];
    const rows = data.map(r => [r.date, r.totalAmount, r.transactionCount, r.itemCount]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-sales-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-tour="pharmacy-sales-report">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('pharmacy.salesReport.title')}</h1>
          <p className="text-body text-slate mt-1">{t('pharmacy.salesReport.subtitle')}</p>
        </div>
        <Button variant="secondary" onClick={exportCSV} disabled={data.length === 0}>{t('pharmacy.salesReport.exportCSV')}</Button>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="flex gap-4 items-end flex-wrap">
            <Input label={t('pharmacy.salesReport.from')} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <Input label={t('pharmacy.salesReport.to')} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            <div>
              <label className="text-sm font-medium text-graphite block mb-1">{t('pharmacy.salesReport.interval')}</label>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly'].map((i) => (
                  <button
                    key={i}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-target ${interval === i ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
                    onClick={() => setInterval(i)}
                  >{i.charAt(0).toUpperCase() + i.slice(1)}</button>
                ))}
              </div>
            </div>
            <Button onClick={fetchReport}>{t('pharmacy.salesReport.refresh')}</Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3" role="alert">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="text-center py-4"><p className="text-2xl font-bold text-obsidian">{formatCurrency(summary.totalAmount)}</p><p className="text-caption text-slate">{t('pharmacy.salesReport.totalRevenue')}</p></CardContent></Card>
          <Card><CardContent className="text-center py-4"><p className="text-2xl font-bold text-obsidian">{summary.totalTransactions}</p><p className="text-caption text-slate">{t('pharmacy.salesReport.transactions')}</p></CardContent></Card>
          <Card><CardContent className="text-center py-4"><p className="text-2xl font-bold text-obsidian">{summary.totalItems}</p><p className="text-caption text-slate">{t('pharmacy.salesReport.itemsSold')}</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>{t('pharmacy.salesReport.salesBy', { interval })}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8" role="status">
              <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data.length === 0 ? (
            <p className="text-body text-slate text-center py-8">{t('pharmacy.salesReport.noData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-silver">
                    <th className="text-left py-2 text-caption font-medium text-graphite">{t('pharmacy.salesReport.colDate')}</th>
                    <th className="text-right py-2 text-caption font-medium text-graphite">{t('pharmacy.salesReport.colAmount')}</th>
                    <th className="text-right py-2 text-caption font-medium text-graphite">{t('pharmacy.salesReport.colTransactions')}</th>
                    <th className="text-right py-2 text-caption font-medium text-graphite">{t('pharmacy.salesReport.colItems')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-b border-bone">
                      <td className="py-2 text-body text-obsidian">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="py-2 text-body text-obsidian text-right">{formatCurrency(row.totalAmount)}</td>
                      <td className="py-2 text-body text-obsidian text-right">{row.transactionCount}</td>
                      <td className="py-2 text-body text-obsidian text-right">{row.itemCount}</td>
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
