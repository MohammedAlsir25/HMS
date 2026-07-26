import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/currency';
import LowStockWidget from '../../components/pharmacy/LowStockWidget';

export default function PharmacyDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/pharmacy/dashboard')
      .then(setDashboard)
      .catch((err) => setError(err.message || t('pharmacy.dashboard.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]" role="status">
      <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg px-4 py-8 text-center" role="alert">
      <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
    </div>
  );

  if (!dashboard) return (
    <div className="text-center py-12">
      <p className="text-body text-slate">{t('common.noData')}</p>
    </div>
  );

  return (
    <div className="space-y-6" data-tour="pharmacy-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">{t('pharmacy.dashboard.title')}</h1>
          <p className="text-body text-slate mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/pharmacy/reports')}>{t('pharmacy.dashboard.salesReport')}</Button>
          <Button onClick={() => navigate('/pharmacy')}>{t('pharmacy.dashboard.newSale')}</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{formatCurrency(dashboard.todaySales)}</p>
            <p className="text-caption text-slate mt-1">{t('pharmacy.dashboard.todaysSales')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-obsidian">{formatCurrency(dashboard.stockValue)}</p>
            <p className="text-caption text-slate mt-1">{t('pharmacy.dashboard.stockValue')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <p className="text-3xl font-bold text-red-600">{dashboard.lowStockCount || 0}</p>
            <p className="text-caption text-slate mt-1">{t('pharmacy.dashboard.lowStockItems')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-6">
            <div className="flex justify-center gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{dashboard.expiringCounts?.within30 || 0}</p>
                <p className="text-xs text-slate">30 {t('pharmacy.dashboard.days')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-500">{dashboard.expiringCounts?.within60 || 0}</p>
                <p className="text-xs text-slate">60 {t('pharmacy.dashboard.days')}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-400">{dashboard.expiringCounts?.within90 || 0}</p>
                <p className="text-xs text-slate">90 {t('pharmacy.dashboard.days')}</p>
              </div>
            </div>
            <p className="text-caption text-slate mt-1">{t('pharmacy.dashboard.expiringItems')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>{t('pharmacy.dashboard.topSelling')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {dashboard.topSelling?.length === 0 && (
              <p className="text-caption text-slate text-center py-8">{t('pharmacy.dashboard.noSalesToday')}</p>
            )}
            {dashboard.topSelling?.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded border border-silver/50">
                <div className="min-w-0">
                  <p className="text-caption font-medium text-obsidian truncate">{item.name}</p>
                  <p className="text-xs text-slate">{item.sku}</p>
                </div>
                <Badge variant="primary" size="sm">{item.totalSold} {t('pharmacy.dashboard.sold')}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('pharmacy.dashboard.recentSales')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {dashboard.recentSales?.length === 0 && (
              <p className="text-caption text-slate text-center py-8">{t('pharmacy.dashboard.noRecentSales')}</p>
            )}
            {dashboard.recentSales?.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-2 rounded border border-silver/50">
                <div className="min-w-0">
                  <p className="text-caption font-medium text-obsidian">{formatCurrency(sale.amount)}</p>
                  <p className="text-xs text-slate">{sale.cashier?.fullName} — {new Date(sale.createdAt).toLocaleTimeString()}</p>
                </div>
                <Badge variant="default" size="sm">{sale.paymentMethod}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <LowStockWidget />
      </div>
    </div>
  );
}
