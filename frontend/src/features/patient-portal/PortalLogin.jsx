import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { usePortalAuth } from './hooks/usePortalAuth';

export default function PortalLogin() {
  const { login, isAuthenticated } = usePortalAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/portal/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/portal/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent>
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-lilac-bloom flex items-center justify-center text-obsidian font-bold text-lg mx-auto mb-3">JH</div>
            <h1 className="text-heading-sm font-semibold text-obsidian">Patient Portal Login</h1>
            <p className="text-body text-slate mt-1">Sign in to access your health records</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Link to="/portal/reset-password" className="text-caption text-lilac-bloom hover:underline">
              Forgot Password?
            </Link>
            <p className="text-caption text-slate">
              Don&apos;t have an account?{' '}
              <Link to="/portal/register" className="text-lilac-bloom hover:underline font-medium">Register</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
