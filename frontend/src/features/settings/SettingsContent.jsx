import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
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

export default function SettingsContent() {
  const { t } = useTranslation();
  const [repairing, setRepairing] = useState(false);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme, language, setLanguage, hasSeenOnboarding, setHasSeenOnboarding } = useUIStore();
  const fileInputRef = useRef(null);

  const isNative = typeof window !== 'undefined' && (window.__TAURI_INTERNALS__ || window.Capacitor?.isNative);

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
            Edit Profile
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
        <Input label={t('settings.currentPassword')} type="password" placeholder={t('settings.currentPasswordPlaceholder')} />
        <Input label={t('settings.newPassword')} type="password" placeholder={t('settings.newPasswordPlaceholder')} />
        <Input label={t('settings.confirmPassword')} type="password" placeholder={t('settings.confirmPasswordPlaceholder')} />
        <Button variant="secondary" disabled>{t('settings.updatePassword')}</Button>
      </Section>

      {isNative && (
        <Section title="Tour Guide">
          <p className="text-body text-slate">Reset the guided tour to show again on your next dashboard visit.</p>
          <Button variant="secondary" onClick={() => setHasSeenOnboarding(false)}>
            Reset Tour
          </Button>
        </Section>
      )}

      {isNative && (
        <Section title="Sync">
          <p className="text-body text-slate">Re-download all data and reset the local database if you encounter sync issues.</p>
          <Button variant="secondary" onClick={handleRepairSync} disabled={repairing}>
            {repairing ? 'Repairing...' : 'Repair Sync Data'}
          </Button>
        </Section>
      )}

      <UpdateManager />
    </div>
  );
}
