import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Bell, Mail, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import UpdateManager from '../../components/ui/UpdateManager';
import i18n from '../../lib/i18n';

function Section({ title, children }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function ToggleGroup({ label, options, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-graphite mb-2">{label}</label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2.5 rounded-lg text-body font-medium transition-all touch-target min-w-[80px]
              ${value === opt.value ? 'bg-lilac-bloom text-obsidian' : 'bg-bone text-graphite hover:bg-silver'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Switch({ checked, onChange, label, icon: Icon }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="w-5 h-5 text-graphite" />}
        <span className="text-body font-medium text-graphite">{label}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-lilac-bloom focus:ring-offset-2
          ${checked ? 'bg-lilac-bloom' : 'bg-silver'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

const NOTIFICATION_PREFS_KEY = 'jh-notification-prefs';

function loadNotificationPrefs() {
  try {
    const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    return stored ? JSON.parse(stored) : { email: true, push: true, sms: false };
  } catch {
    return { email: true, push: true, sms: false };
  }
}

export default function SettingsContent() {
  const { t } = useTranslation();
  const [repairing, setRepairing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme, language, setLanguage, hasSeenOnboarding, setHasSeenOnboarding } = useUIStore();
  const fileInputRef = useRef(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [notificationPrefs, setNotificationPrefs] = useState(loadNotificationPrefs);

  const isNative = typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.Capacitor?.isNative);
  const isTauri = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
  const isAdmin = user?.role === 'Super Admin';
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  const toggleDevtools = async () => {
    try {
      const { getCurrentWebview } = await import('@tauri-apps/api/webview');
      const webview = getCurrentWebview();
      if (devtoolsOpen) {
        await webview.closeDevtools();
      } else {
        await webview.openDevtools();
      }
      setDevtoolsOpen(!devtoolsOpen);
    } catch (e) {
      console.error('Failed to toggle devtools:', e);
    }
  };

  const handleRepairSync = async () => {
    setRepairing(true);
    try {
      const { syncEngine } = await import('../../lib/sync/syncEngine');
      await syncEngine.repair();
      toast.success('Sync data repaired successfully.');
    } catch (e) {
      toast.error('Failed to repair sync data.');
      console.error('Repair sync failed:', e);
    } finally {
      setRepairing(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setUser({ ...user, avatarUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error(t('settings.fillAllFields') || 'Please fill all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordsDoNotMatch') || 'Passwords do not match');
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      toast.success(t('settings.passwordUpdated') || 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || t('settings.passwordUpdateFailed') || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const updateNotificationPrefs = (patch) => {
    const updated = { ...notificationPrefs, ...patch };
    setNotificationPrefs(updated);
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(updated));
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-lg dark:shadow-2xl dark:shadow-black/80 overflow-hidden">
        <div className="relative overflow-hidden">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName} className="w-full aspect-square object-cover max-h-[320px]" />
          ) : (
            <div className="w-full aspect-square max-h-[320px] bg-bone dark:bg-zinc-800 flex items-center justify-center">
              <span className="text-6xl font-medium text-graphite dark:text-zinc-400">
                {user?.fullName?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <div className="absolute bottom-4 left-4">
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">{user?.fullName || 'User'}</h2>
            <p className="text-sm text-white/80 drop-shadow">{user?.email}</p>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user?.avatarUrl ? (
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-zinc-700">
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-zinc-700 bg-bone dark:bg-zinc-800 flex items-center justify-center">
                <span className="text-sm font-medium text-graphite dark:text-zinc-400">{user?.fullName?.charAt(0) || '?'}</span>
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-obsidian dark:text-zinc-200">{user?.role || 'N/A'}</div>
              <div className="text-xs text-slate dark:text-zinc-500">{user?.email}</div>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-900 dark:bg-zinc-800 text-white dark:text-zinc-100 rounded-lg px-5 py-2.5 text-sm font-medium
                       transition-all duration-500 ease-out transform hover:scale-105
                       hover:bg-gray-800 dark:hover:bg-zinc-700
                       active:scale-95 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/50"
          >
            {t('settings.editProfile')}
          </button>
        </div>
      </div>

      <Section title={t('settings.appearance')}>
        <ToggleGroup
          label={t('settings.theme')}
          options={[
            { label: t('settings.light'), value: 'light' },
            { label: t('settings.dark'), value: 'dark' },
            { label: t('settings.system'), value: 'system' },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </Section>

      <Section title={t('settings.language')}>
        <ToggleGroup
          label={t('settings.interfaceLanguage')}
          options={[
            { label: t('settings.english'), value: 'en' },
            { label: t('settings.arabic'), value: 'ar' },
          ]}
          value={language}
          onChange={(lng) => { setLanguage(lng); i18n.changeLanguage(lng); }}
        />
      </Section>

      <Section title={t('settings.security')}>
        <Input
          label={t('settings.currentPassword')}
          type="password"
          placeholder={t('settings.currentPasswordPlaceholder')}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label={t('settings.newPassword')}
          type="password"
          placeholder={t('settings.newPasswordPlaceholder')}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          label={t('settings.confirmPassword')}
          type="password"
          placeholder={t('settings.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button variant="secondary" onClick={handlePasswordChange} disabled={passwordLoading}>
          {passwordLoading ? (t('settings.updating') || 'Updating...') : t('settings.updatePassword')}
        </Button>
      </Section>

      <Section title={t('settings.notifications')}>
        <Switch
          label={t('settings.emailNotifications') || 'Email Notifications'}
          icon={Mail}
          checked={notificationPrefs.email}
          onChange={(v) => updateNotificationPrefs({ email: v })}
        />
        <Switch
          label={t('settings.pushNotifications') || 'Push Notifications'}
          icon={Bell}
          checked={notificationPrefs.push}
          onChange={(v) => updateNotificationPrefs({ push: v })}
        />
        <Switch
          label={t('settings.smsNotifications') || 'SMS Notifications'}
          icon={MessageSquare}
          checked={notificationPrefs.sms}
          onChange={(v) => updateNotificationPrefs({ sms: v })}
        />
      </Section>

      {isNative && (
        <Section title={t('settings.tourGuide')}>
          <p className="text-body text-slate">{t('settings.tourGuideDesc')}</p>
          <Button variant="secondary" onClick={() => setHasSeenOnboarding(false)}>
            {t('settings.resetTour')}
          </Button>
        </Section>
      )}

      {isNative && (
        <Section title={t('settings.sync')}>
          <p className="text-body text-slate">{t('settings.syncDesc')}</p>
          <Button variant="secondary" onClick={handleRepairSync} disabled={repairing}>
            {repairing ? t('settings.repairing') : t('settings.repairSyncData')}
          </Button>
        </Section>
      )}

      {isTauri && isAdmin && (
        <Section title={t('settings.developer')}>
          <p className="text-body text-slate">{t('settings.developerDesc')}</p>
          <Button variant="secondary" onClick={toggleDevtools}>
            {devtoolsOpen ? t('settings.closeDevTools') : t('settings.openDevTools')}
          </Button>
        </Section>
      )}

      <UpdateManager />
    </div>
  );
}
