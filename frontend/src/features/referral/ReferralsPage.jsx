import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { api } from '../../lib/api';

const statusColors = {
  PENDING: 'warning',
  DISPATCHED: 'info',
  FULFILLED: 'success',
  CANCELLED: 'danger',
};

const typeLabels = {
  INTERNAL_CLINIC: 'Internal Clinic',
  PHARMACY_DISPATCH: 'Pharmacy',
  OPTICS_DISPATCH: 'Optics',
};

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/referrals')
      .then(setReferrals)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleStatusChange = async (id, status) => {
    try {
      const updated = await api.patch(`/referrals/${id}/status`, { status });
      setReferrals((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-sm font-semibold text-obsidian">Referrals</h1>
          <p className="text-body text-slate mt-1">Track cross-clinic referrals and pharmacy/optics dispatches</p>
        </div>
      </div>

      <Card>
        <CardContent>
          {loading && <p className="text-body text-slate">Loading referrals...</p>}
          {!loading && referrals.length === 0 && (
            <p className="text-body text-slate text-center py-8">No referrals yet</p>
          )}
          {referrals.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-caption text-slate font-medium border-b border-silver">
                    <th className="pb-2 pr-4">Patient</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">From</th>
                    <th className="pb-2 pr-4">To</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id} className="border-b border-bone last:border-0">
                      <td className="py-3 pr-4">
                        <span className="text-body text-obsidian">{r.patient.fullName}</span>
                        <span className="text-caption text-slate ml-1">{r.patient.mrn}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="primary" size="sm">{typeLabels[r.type] || r.type}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-body text-obsidian">{r.fromClinic.name}</td>
                      <td className="py-3 pr-4 text-body text-obsidian">
                        {r.toClinic ? r.toClinic.name : '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant={statusColors[r.status] || 'default'} size="sm">{r.status}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-caption text-slate">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          {r.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="secondary" onClick={() => handleStatusChange(r.id, 'DISPATCHED')}>
                                Dispatch
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleStatusChange(r.id, 'CANCELLED')}>
                                Cancel
                              </Button>
                            </>
                          )}
                          {r.status === 'DISPATCHED' && (
                            <Button size="sm" onClick={() => handleStatusChange(r.id, 'FULFILLED')}>
                              Fulfill
                            </Button>
                          )}
                        </div>
                      </td>
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
