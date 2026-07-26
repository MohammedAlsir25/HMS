import { useState, useEffect } from 'react';
import { Pill } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { portalApi } from './hooks/usePortalApi';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    portalApi.getPrescriptions()
      .then((data) => { if (!cancelled) setPrescriptions(data?.prescriptions || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-heading-sm font-semibold text-obsidian">Prescriptions</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-body text-slate mt-3">Loading prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body text-slate">No prescriptions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => (
            <Card key={rx.id}>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-lilac-bloom/10 flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-lilac-bloom" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-body font-medium text-obsidian">{rx.drugName}</h3>
                    <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-caption text-graphite">
                      <span>Dosage: {rx.dosage}</span>
                      <span>Frequency: {rx.frequency}</span>
                      <span>Duration: {rx.duration}</span>
                      <span>Route: {rx.route}</span>
                      <span>Prescriber: {rx.doctor}</span>
                      <span>Date: {formatDate(rx.prescribedDate)}</span>
                    </div>
                    {rx.notes && <p className="text-caption text-slate mt-2">{rx.notes}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
