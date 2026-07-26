import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, FileText, CreditCard, User } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { usePortalAuth } from './hooks/usePortalAuth';
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
};

export default function PortalDashboard() {
  const { patient } = usePortalAuth();
  const [appointments, setAppointments] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [apptData, invoiceData] = await Promise.all([
          portalApi.getAppointments('upcoming'),
          portalApi.getInvoices('pending'),
        ]);
        if (cancelled) return;
        setAppointments((apptData?.appointments || []).slice(0, 3));
        const invoices = invoiceData?.invoices || [];
        setBalance(invoices.reduce((sum, inv) => sum + (inv.amountDue || 0), 0));
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-body text-slate mt-3">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-body text-red-700 inline-block">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card elevated>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-lilac-bloom flex items-center justify-center">
              <User className="w-6 h-6 text-obsidian" />
            </div>
            <div>
              <h1 className="text-heading-sm font-semibold text-obsidian">Welcome, {patient?.fullName || 'Patient'}</h1>
              <p className="text-body text-slate">MRN: {patient?.mrn || '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {balance > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption font-medium text-amber-800">Outstanding Balance</p>
                <p className="text-heading-sm font-semibold text-amber-900">{balance.toFixed(2)} SAR</p>
              </div>
              <Link to="/portal/billing">
                <Button size="sm" variant="ghost">Pay Now</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/portal/book" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent>
              <Calendar className="w-8 h-8 text-lilac-bloom mb-3" />
              <h3 className="text-subheading font-medium text-obsidian">Book Appointment</h3>
              <p className="text-body text-slate mt-1">Schedule a new visit</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/portal/medical-records" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent>
              <FileText className="w-8 h-8 text-lilac-bloom mb-3" />
              <h3 className="text-subheading font-medium text-obsidian">View Records</h3>
              <p className="text-body text-slate mt-1">Access your medical history</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/portal/billing" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent>
              <CreditCard className="w-8 h-8 text-lilac-bloom mb-3" />
              <h3 className="text-subheading font-medium text-obsidian">Pay Bills</h3>
              <p className="text-body text-slate mt-1">View and pay invoices</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-subheading font-medium text-obsidian">Upcoming Appointments</h2>
            <Link to="/portal/appointments" className="text-caption text-lilac-bloom hover:underline">View All</Link>
          </div>
          {appointments.length === 0 ? (
            <p className="text-body text-slate py-4 text-center">No upcoming appointments</p>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <div key={appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-body font-medium text-obsidian">{appt.clinic} — {appt.doctor}</p>
                    <p className="text-caption text-slate">{formatDate(appt.date)} at {appt.time}</p>
                  </div>
                  <Badge variant={statusVariant[appt.status] || 'default'} size="sm">{appt.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
