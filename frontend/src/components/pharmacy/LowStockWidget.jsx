import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';

export default function LowStockWidget() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState({ lowStock: [], expired: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pos/alerts?category=pharmacy')
      .then(setAlerts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const criticalCount = alerts.lowStock.filter(i => Number(i.quantity) === 0).length;
  const lowCount = alerts.lowStock.filter(i => Number(i.quantity) > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Alert</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-caption text-slate">Loading...</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Critical (out of stock)</span>
              <Badge variant="danger" size="sm">{criticalCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Low stock</span>
              <Badge variant="warning" size="sm">{lowCount}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body text-graphite">Expired</span>
              <Badge variant="danger" size="sm">{alerts.expired?.length || 0}</Badge>
            </div>
            <button
              onClick={() => navigate('/pharmacy/products')}
              className="w-full mt-2 px-3 py-2 text-sm font-medium text-lilac-bloom hover:bg-bone rounded-lg transition-colors"
            >
              View All Alerts →
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
