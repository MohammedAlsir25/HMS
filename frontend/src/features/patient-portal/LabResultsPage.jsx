import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { portalApi } from './hooks/usePortalApi';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function LabResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    portalApi.getLabResults()
      .then((data) => { if (!cancelled) setResults(data?.labResults || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-heading-sm font-semibold text-obsidian">Lab Results</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-body text-slate mt-3">Loading lab results...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body text-slate">No lab results found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => {
            const isExpanded = expandedId === result.orderId;
            const hasAbnormal = (result.tests || []).some((t) => t.isAbnormal);
            return (
              <Card key={result.orderId} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpandedId(isExpanded ? null : result.orderId)}>
                <CardContent>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-body font-medium text-obsidian">{result.clinic}</h3>
                    <div className="flex items-center gap-2">
                      {hasAbnormal && <Badge variant="danger" size="sm">Abnormal</Badge>}
                      <Badge variant={result.status === 'COMPLETED' ? 'success' : 'warning'} size="sm">{result.status}</Badge>
                    </div>
                  </div>
                  <p className="text-caption text-slate">Ordered: {formatDate(result.orderDate)}</p>
                  {result.completedAt && <p className="text-caption text-slate">Completed: {formatDate(result.completedAt)}</p>}

                  {isExpanded && result.tests?.length > 0 && (
                    <div className="mt-4 border-t border-silver pt-3">
                      <table className="w-full text-caption">
                        <thead>
                          <tr className="border-b border-silver">
                            <th className="px-2 py-1.5 text-left font-medium text-slate">Test</th>
                            <th className="px-2 py-1.5 text-left font-medium text-slate">Value</th>
                            <th className="px-2 py-1.5 text-left font-medium text-slate">Ref Range</th>
                            <th className="px-2 py-1.5 text-left font-medium text-slate">Flag</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.tests.map((t, i) => (
                            <tr key={i} className="border-b border-silver/50">
                              <td className="px-2 py-1.5 text-obsidian">{t.testName}</td>
                              <td className="px-2 py-1.5 text-obsidian font-medium">{t.value} {t.unit}</td>
                              <td className="px-2 py-1.5 text-slate">{t.refRange}</td>
                              <td className="px-2 py-1.5">
                                {t.isAbnormal ? <Badge variant="danger" size="sm">{t.flag}</Badge> : <span className="text-slate">Normal</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
