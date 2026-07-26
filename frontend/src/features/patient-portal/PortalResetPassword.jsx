import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { portalApi } from './hooks/usePortalApi';

export default function PortalResetPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      await portalApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset link.');
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
            <h1 className="text-heading-sm font-semibold text-obsidian">Reset Password</h1>
            <p className="text-body text-slate mt-1">Enter your email to receive a reset link</p>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-body text-green-700">
                If an account exists with that email, a reset link has been sent.
              </div>
              <Link to="/portal/login" className="inline-block text-body text-lilac-bloom hover:underline font-medium">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
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
                <Button type="submit" className="w-full" loading={loading}>
                  Send Reset Link
                </Button>
              </form>
            </>
          )}

          <div className="mt-4 text-center">
            <Link to="/portal/login" className="text-caption text-lilac-bloom hover:underline">
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
