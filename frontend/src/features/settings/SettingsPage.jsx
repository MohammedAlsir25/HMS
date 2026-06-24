import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../../components/ui/Button';
import SettingsContent from './SettingsContent';

export default function SettingsPage() {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-heading-sm font-semibold text-obsidian">{t('settings.title')}</h1>
        <Button variant="ghost" onClick={logout}>{t('settings.signOut')}</Button>
      </div>
      <SettingsContent />
    </div>
  );
}
