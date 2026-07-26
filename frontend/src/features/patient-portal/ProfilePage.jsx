import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { portalApi } from './hooks/usePortalApi';
import { usePortalAuth } from './hooks/usePortalAuth';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfilePage() {
  const { patient: authPatient } = usePortalAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [prefs, setPrefs] = useState(null);
  const [prefsLoading, setPrefsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [profileData, prefsData] = await Promise.all([
          portalApi.getProfile(),
          portalApi.getNotificationPrefs().catch(() => null),
        ]);
        if (cancelled) return;
        setProfile(profileData);
        setEditForm({ email: profileData?.email || '', phone: profileData?.phone || '', address: profileData?.address || '' });
        setPrefs(prefsData?.preferences || null);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPrefsLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg('');
    setError('');
    try {
      const updated = await portalApi.updateProfile(editForm);
      setProfile(updated);
      setEditing(false);
      setSaveMsg('Profile updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) return;
    setChangingPw(true);
    setPwMsg('');
    setError('');
    try {
      await portalApi.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setPwMsg('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setChangingPw(false);
    }
  };

  const handlePrefToggle = async (key) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await portalApi.updateNotificationPrefs({ [key]: updated[key] });
    } catch {
      setPrefs(prefs);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-lilac-bloom border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-body text-slate mt-3">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-heading-sm font-semibold text-obsidian">Profile & Settings</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
      )}

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-subheading font-medium text-obsidian">Personal Information</h2>
            {!editing && (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-3">
              <Input label="Email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <Input label="Phone" type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              <Input label="Address" value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
              <div className="flex gap-3">
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSaveProfile} loading={saving}>Save</Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-body">
              <div><span className="text-slate">Name:</span> <span className="font-medium text-obsidian">{profile?.fullName || authPatient?.fullName || '—'}</span></div>
              <div><span className="text-slate">MRN:</span> <span className="font-medium text-obsidian">{profile?.mrn || authPatient?.mrn || '—'}</span></div>
              <div><span className="text-slate">Email:</span> <span className="font-medium text-obsidian">{profile?.email || '—'}</span></div>
              <div><span className="text-slate">Phone:</span> <span className="font-medium text-obsidian">{profile?.phone || '—'}</span></div>
              <div><span className="text-slate">Date of Birth:</span> <span className="font-medium text-obsidian">{formatDate(profile?.dateOfBirth)}</span></div>
              <div><span className="text-slate">Gender:</span> <span className="font-medium text-obsidian">{profile?.gender || '—'}</span></div>
              <div><span className="text-slate">National ID:</span> <span className="font-medium text-obsidian">{profile?.nationalId || '—'}</span></div>
              <div><span className="text-slate">Address:</span> <span className="font-medium text-obsidian">{profile?.address || '—'}</span></div>
            </div>
          )}

          {saveMsg && <p className="text-caption text-green-600 mt-2">{saveMsg}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-subheading font-medium text-obsidian mb-4">Change Password</h2>
          {pwMsg && <p className="text-caption text-green-600 mb-3">{pwMsg}</p>}
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input label="Current Password" type="password" value={pwForm.currentPassword} onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })} required />
            <Input label="New Password" type="password" value={pwForm.newPassword} onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })} required />
            <Button type="submit" size="sm" loading={changingPw}>Change Password</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <h2 className="text-subheading font-medium text-obsidian mb-4">Notification Preferences</h2>
          {prefsLoading ? (
            <p className="text-body text-slate">Loading preferences...</p>
          ) : prefs ? (
            <div className="space-y-3">
              {[
                { key: 'appointmentReminders', label: 'Appointment Reminders' },
                { key: 'labResultsReady', label: 'Lab Results Ready' },
                { key: 'paymentDueReminders', label: 'Payment Due Reminders' },
                { key: 'generalUpdates', label: 'General Updates' },
                { key: 'emailEnabled', label: 'Email Notifications' },
                { key: 'smsEnabled', label: 'SMS Notifications' },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between">
                  <span className="text-body text-obsidian">{pref.label}</span>
                  <button
                    type="button"
                    onClick={() => handlePrefToggle(pref.key)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      prefs[pref.key] ? 'bg-lilac-bloom' : 'bg-silver'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      prefs[pref.key] ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-body text-slate">No preferences found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
