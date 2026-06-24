import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
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
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme, language, setLanguage } = useUIStore();
  const fileInputRef = useRef(null);

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
      <Section title={t('settings.profile')}>
        <div className="flex items-center gap-4">
          <Avatar src={user?.avatarUrl} name={user?.fullName} size="xl" />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              {t('settings.uploadPhoto')}
            </Button>
            <p className="text-caption text-slate mt-1">{t('settings.photoHint')}</p>
          </div>
        </div>
        <Input label={t('settings.fullName')} value={user?.fullName || ''} readOnly />
        <Input label={t('settings.email')} value={user?.email || ''} readOnly />
        <Input label={t('settings.role')} value={user?.role || ''} readOnly />
      </Section>

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

    </div>
  );
}
