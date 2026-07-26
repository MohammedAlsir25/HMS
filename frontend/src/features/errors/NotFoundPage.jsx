import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileQuestion } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6 text-center">
      <div className="w-24 h-24 rounded-3xl bg-bone flex items-center justify-center mb-6">
        <FileQuestion className="w-12 h-12 text-slate" strokeWidth={1.5} />
      </div>
      <h1 className="text-display font-bold text-obsidian mb-2">404</h1>
      <h2 className="text-subheading font-medium text-obsidian mb-2">
        {t('errors.notFound.title', 'Page not found')}
      </h2>
      <p className="text-body text-slate max-w-md mb-8">
        {t('errors.notFound.description', 'The page you are looking for does not exist or has been moved.')}
      </p>
      <div className="flex gap-3">
        <Button variant="primary" size="md" onClick={() => navigate('/dashboard')}>
          {t('errors.notFound.backToDashboard', 'Back to Dashboard')}
        </Button>
        <Button variant="ghost" size="md" onClick={() => navigate(-1)}>
          {t('errors.notFound.goBack', 'Go Back')}
        </Button>
      </div>
    </div>
  );
}
