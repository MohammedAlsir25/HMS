import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { portalApi } from './hooks/usePortalApi';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const statusVariant = {
  RESERVED: 'info',
  CONFIRMED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  PENDING: 'warning',
  NO_SHOW: 'danger',
};

export default function AppointmentsPage() {
  const [tab, setTab] = useState('upcoming');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    portalApi.getAppointments(tab === 'upcoming' ? 'upcoming' : 'past')
      .then((data) => { if (!cancelled) setAppointments(data?.appointments || []); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await portalApi.cancelAppointment(id);
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'CANCELLED' } : a));
    } catch (err) {
      setError(err.message || 'Failed to cancel appointment');
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-heading-sm font-semibold text-obsidian">My Appointments</h1>

      <div className="flex gap-2 border-b border-silver">
        {['upcoming', 'past'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-body font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-lilac-bloom text-obsidian' : 'border-transparent text-slate hover:text-obsidian'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-body text-slate mt-3">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-body text-slate">No {tab} appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-body font-medium text-obsidian">{appt.clinic}</h3>
                      <Badge variant={statusVariant[appt.status] || 'default'} size="sm">{appt.status}</Badge>
                    </div>
                    <p className="text-body text-graphite">{appt.doctor}</p>
                    <p className="text-caption text-slate">{formatDate(appt.date)} at {appt.time}</p>
                    {appt.notes && <p className="text-caption text-slate mt-1">Notes: {appt.notes}</p>}
                  </div>
                  {tab === 'upcoming' && appt.status !== 'CANCELLED' && (
                    <Button
                      size="sm"
                      variant="danger"
                      loading={cancelling === appt.id}
                      onClick={() => handleCancel(appt.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
