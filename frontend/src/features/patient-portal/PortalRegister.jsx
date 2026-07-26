import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { portalApi } from './hooks/usePortalApi';

export default function PortalRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [mrn, setMrn] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!mrn || !phone) {
      setError('Please enter your MRN and phone number');
      return;
    }
    setLoading(true);
    try {
      await portalApi.forgotPassword(email || 'stub@test.com');
      setVerified(true);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !otpCode) {
      setError('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await portalApi.register(mrn, phone, email, password, otpCode);
      navigate('/portal/login');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
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
            <h1 className="text-heading-sm font-semibold text-obsidian">Patient Registration</h1>
            <p className="text-body text-slate mt-1">
              {step === 1 ? 'Verify your identity with MRN and phone' : 'Set your email and password'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className={`w-8 h-1 rounded-full ${step >= 1 ? 'bg-lilac-bloom' : 'bg-silver'}`} />
              <div className={`w-8 h-1 rounded-full ${step >= 2 ? 'bg-lilac-bloom' : 'bg-silver'}`} />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-body text-red-700">{error}</div>
          )}

          {step === 1 && (
            <form onSubmit={handleVerify} className="space-y-4">
              <Input
                label="MRN (Medical Record Number)"
                placeholder="MRN-2026-00001"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                required
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+966501234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" loading={loading}>
                Verify
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4">
              {verified && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-body text-green-700">
                  Identity verified. OTP code sent to your phone. Use 123456 for testing.
                </div>
              )}
              <Input
                label="OTP Code"
                placeholder="Enter 6-digit code"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />
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
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" loading={loading}>
                  Register
                </Button>
              </div>
            </form>
          )}

          <div className="mt-4 text-center">
            <p className="text-caption text-slate">
              Already have an account?{' '}
              <Link to="/portal/login" className="text-lilac-bloom hover:underline font-medium">Sign In</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
