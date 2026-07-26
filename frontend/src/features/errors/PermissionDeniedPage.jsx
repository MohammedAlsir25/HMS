import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldOff } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function PermissionDeniedPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      <div className="w-24 h-24 rounded-3xl bg-bone flex items-center justify-center mb-6">
        <ShieldOff className="w-12 h-12 text-slate" strokeWidth={1.5} />
      </div>
      <h1 className="text-display font-bold text-obsidian mb-2">403</h1>
      <h2 className="text-subheading font-medium text-obsidian mb-2">
        {t('errors.permissionDenied.title', 'Access Denied')}
      </h2>
      <p className="text-body text-slate max-w-md mb-4">
        {t('errors.permissionDenied.description', 'You do not have permission to access this page.')}
      </p>
      <p className="text-caption text-slate max-w-md mb-8">
        {t('errors.permissionDenied.contactAdmin', 'Contact your administrator to request the required role or permissions.')}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" size="md" onClick={() => navigate('/dashboard')}>
          {t('errors.permissionDenied.backToDashboard', 'Back to Dashboard')}
        </Button>
        <Button variant="ghost" size="md" onClick={() => navigate(-1)}>
          {t('errors.permissionDenied.goBack', 'Go Back')}
        </Button>
      </div>
    </div>
  );
}
