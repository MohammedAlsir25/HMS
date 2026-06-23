import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
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
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-lilac-bloom flex items-center justify-center">
              <span className="text-2xl font-bold text-obsidian">JH</span>
            </div>
          </div>
          <h1 className="text-heading-sm font-switzer font-semibold text-obsidian text-center">
            AL Jawahir Hospital
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
              placeholder="doctor@aljawahir.ae"
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
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
              {loading ? t('login.signingIn') : t('login.signIn')}
            </Button>
          </form>
        </Card>

        <p className="text-center text-caption text-slate mt-6">
          Demo accounts: admin@aljawahir.ae / reception@aljawahir.ae / doctor.medicine@aljawahir.ae — password: password123
        </p>
      </div>
    </div>
  );
}
