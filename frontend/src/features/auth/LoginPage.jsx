import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { api } from '../../lib/api';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      if (!data.token) {
        setError(data.message || t('login.loginFailed'));
        return;
      }
      login(data.token, data.refreshToken, data.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(t('login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 relative">
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/30">
          <div className="loader" />
        </div>
      )}
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
            <img src="/logo.png" alt="Al Jawarih" className="h-14 w-auto mb-2" />
          <h1 className="text-heading-sm font-switzer font-semibold text-obsidian text-center">
            Al Jawarih
          </h1>
          <p className="text-body text-slate mt-1">{t('login.subtitle')}</p>
        </div>

        <Card className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('login.email')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="doctor@aljawarih.sd"
              autoComplete="email"
              required
            />
            <Input
              label={t('login.password')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              autoComplete="current-password"
              required
            />
            {error && (
              <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>
        </Card>

      </div>
    </div>
  );
}
