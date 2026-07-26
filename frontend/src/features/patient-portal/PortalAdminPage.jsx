import { useState, useEffect } from 'react';
import { Settings, Users, Calendar, CreditCard } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { portalApi } from './hooks/usePortalApi';

export default function PortalAdminPage() {
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [statsData, settingsData] = await Promise.all([
          portalApi.getAdminStats(),
          portalApi.getAdminSettings(),
        ]);
        if (cancelled) return;
        setStats(statsData);
        setSettings(settingsData?.settings || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleToggle = async (key) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    setSaving(true);
    try {
      await portalApi.updateAdminSettings({ [key]: updated[key] });
    } catch {
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-body text-slate mt-3">Loading portal admin...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-heading-sm font-semibold text-obsidian">Portal Administration</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Registered Patients', value: stats?.totalRegisteredPatients ?? 0 },
          { icon: Calendar, label: 'Active (30 days)', value: stats?.activePatientsLast30Days ?? 0 },
          { icon: Calendar, label: 'Portal Bookings', value: stats?.appointmentsBookedViaPortal ?? 0 },
          { icon: CreditCard, label: 'Online Revenue', value: stats?.totalOnlineRevenue ? `${stats.totalOnlineRevenue.toFixed(0)} SAR` : '0 SAR' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent>
              <stat.icon className="w-6 h-6 text-lilac-bloom mb-2" />
              <p className="text-caption text-slate">{stat.label}</p>
              <p className="text-heading-sm font-semibold text-obsidian">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-obsidian" />
            <h2 className="text-subheading font-medium text-obsidian">Portal Settings</h2>
          </div>

          {settings ? (
            <div className="space-y-3">
              {[
                { key: 'portalEnabled', label: 'Portal Enabled' },
                { key: 'selfBookingEnabled', label: 'Self-Booking Enabled' },
                { key: 'onlinePaymentEnabled', label: 'Online Payment Enabled' },
                { key: 'medicalRecordsVisible', label: 'Medical Records Visible' },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-body text-obsidian">{s.label}</span>
                  <button
                    type="button"
                    onClick={() => handleToggle(s.key)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                      settings[s.key] ? 'bg-lilac-bloom' : 'bg-silver'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings[s.key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-silver">
                <div>
                  <p className="text-caption text-slate">Max Advance Booking Days</p>
                  <p className="text-body font-medium text-obsidian">{settings.maxAdvanceBookingDays}</p>
                </div>
                <div>
                  <p className="text-caption text-slate">Cancellation Policy (hours)</p>
                  <p className="text-body font-medium text-obsidian">{settings.cancellationPolicyHours}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-body text-slate">No settings available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
