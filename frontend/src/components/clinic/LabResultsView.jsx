import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { api } from '../../lib/api';

const flagBadge = {
  NORMAL: 'success',
  HIGH: 'danger',
  LOW: 'warning',
  CRITICAL: 'danger',
  ABNORMAL: 'warning',
};

export default function LabResultsView({ patientId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!patientId) { setOrders([]); return; }
    setLoading(true);
    api.get(`/lab/results?patientId=${encodeURIComponent(patientId)}`)
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (!patientId) return null;

  return (
    <Card className="mb-6">
      <CardHeader><CardTitle>Lab Results</CardTitle></CardHeader>
      <CardContent>
        {loading && <p className="text-caption text-slate">Loading...</p>}
        {!loading && orders.length === 0 && (
          <p className="text-caption text-slate">No lab results found</p>
        )}
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="border border-silver rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-bone hover:bg-silver/30 transition-colors text-left"
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
              >
                <div>
                  <span className="text-body font-medium text-obsidian">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-caption text-slate ml-2">{order.tests?.length || 0} tests</span>
                </div>
                <Badge variant={order.status === 'COMPLETED' ? 'success' : 'warning'}>
                  {order.status}
                </Badge>
              </button>
              {expanded === order.id && (
                <div className="px-4 py-3 space-y-2">
                  {order.clinicalNotes && (
                    <p className="text-caption text-slate italic">{order.clinicalNotes}</p>
                  )}
                  {order.tests?.map((ot) => (
                    <div key={ot.id} className="flex items-center justify-between py-1.5 border-b border-silver/30 last:border-0">
                      <div className="flex-1">
                        <span className="text-body text-obsidian">{ot.test?.name || ot.testId}</span>
                        {ot.test?.unit && <span className="text-caption text-slate ml-1">{ot.test.unit}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {ot.resultValue ? (
                          <>
                            <span className="font-mono text-body text-obsidian">{ot.resultValue}</span>
                            {ot.flag && <Badge variant={flagBadge[ot.flag] || 'default'} size="sm">{ot.flag}</Badge>}
                          </>
                        ) : (
                          <span className="text-caption text-slate">Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {order.resultNotes && (
                    <p className="text-caption text-slate mt-1">Note: {order.resultNotes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
