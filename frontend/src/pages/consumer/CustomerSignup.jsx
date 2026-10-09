import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Mail } from 'lucide-react';

export default function CustomerSignup() {
  const { register, verifyEmailOtp, resendEmailOtp } = useCustomerAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('form'); // 'form' | 'otp'
  const [otp, setOtp] = useState('');
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created — check your email for a 6-digit code');
      setPhase('otp');
    } catch (err) {
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (e) => {
    e.preventDefault();
    if (otp.trim().length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      await verifyEmailOtp(form.email, otp.trim());
      toast.success('Email verified — welcome to BookAm!');
      navigate('/customer/onboarding');
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try { await resendEmailOtp(form.email); toast.success('New code sent'); }
    catch { toast.error('Could not resend — try again shortly'); }
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(150deg, #f0edff 0%, #faf9ff 50%, #fff 100%)',
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1fr_400px] items-center">

        {/* Left hero — desktop only */}
        <div className="hidden lg:flex flex-col">
          <Link to="/" className="inline-block mb-10">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-9 w-auto object-contain" />
          </Link>

          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#5B3FEA' }}>
            Free customer account
          </p>
          <h1 className="text-5xl font-black leading-[1.1] text-wrap-balance" style={{ color: 'var(--bam-text)' }}>
            Your personal<br />booking hub.
          </h1>
          <p className="mt-4 text-lg max-w-md" style={{ color: 'var(--bam-text-muted)' }}>
            Discover services, track every appointment, and rebook your favourites — all from one place.
          </p>

          <div className="mt-10 space-y-3 max-w-sm">
            {[
              { emoji: '🔍', title: 'Discover local services', sub: 'Find the best-rated providers near you' },
              { emoji: '❤️', title: 'Save your favourites', sub: 'Rebook with one tap, anytime' },
              { emoji: '🔔', title: 'Smart reminders', sub: 'Never miss an appointment again' },
            ].map(f => (
              <div
                key={f.title}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid var(--bam-border)' }}
              >
                <span className="text-2xl leading-none flex-shrink-0">{f.emoji}</span>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{f.title}</p>
                  <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm mx-auto lg:max-w-none">

          {/* Mobile header */}
          <div className="text-center mb-7 lg:hidden">
            <Link to="/" className="inline-block mb-5">
              <img src={LOGO_BLUE_H} alt="BookAm" className="h-9 w-auto object-contain mx-auto" />
            </Link>
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--bam-text)' }}>
              {phase === 'otp' ? 'Verify your email' : 'Create account'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>
              {phase === 'otp' ? `We sent a code to ${form.email}` : 'Free to join · takes 30 seconds'}
            </p>
          </div>

          <div
            className="rounded-3xl p-6 sm:p-8 shadow-xl"
            style={{ background: '#fff', border: '1px solid var(--bam-border)' }}
          >
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-extrabold" style={{ color: 'var(--bam-text)' }}>
                {phase === 'otp' ? 'Check your email' : 'Create account'}
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
                {phase === 'otp' ? `We sent a 6-digit code to ${form.email}` : 'Free to join — takes 30 seconds'}
              </p>
            </div>

            {phase === 'otp' ? (
              <form onSubmit={submitOtp} className="space-y-4">
                <div
                  className="flex items-center gap-3 p-4 rounded-2xl"
                  style={{ background: 'rgba(91,63,234,0.06)', border: '1px solid rgba(91,63,234,0.15)' }}
                >
                  <Mail className="w-5 h-5 flex-shrink-0" style={{ color: '#5B3FEA' }} />
                  <p className="text-sm" style={{ color: 'var(--bam-text)' }}>
                    Enter the 6-digit code sent to{' '}
                    <strong>{form.email}</strong>
                  </p>
                </div>
                <input
                  className="input text-center text-2xl tracking-[0.4em] font-mono"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Spinner /> : 'Verify & continue →'}
                </button>
                <p className="text-center text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                  Didn't get it?{' '}
                  <button type="button" onClick={resend} className="font-semibold hover:underline" style={{ color: '#5B3FEA' }}>
                    Resend code
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Full name</label>
                  <input className="input" placeholder="Your full name" required value={form.full_name} onChange={set('full_name')} autoComplete="name" />
                </div>
                <div>
                  <label className="label">Email address</label>
                  <input className="input" type="email" placeholder="you@email.com" required value={form.email} onChange={set('email')} autoComplete="email" />
                </div>
                <div>
                  <label className="label">Password</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showPw ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      required
                      value={form.password}
                      onChange={set('password')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                      style={{ color: 'var(--bam-text-faint)' }}
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                  {loading ? <Spinner /> : 'Create account →'}
                </button>

                <p className="text-center text-xs leading-5" style={{ color: 'var(--bam-text-faint)' }}>
                  By continuing, you agree to our{' '}
                  <Link to="/legal/terms" className="hover:underline" style={{ color: '#5B3FEA' }}>Terms</Link>
                  {' '}and{' '}
                  <Link to="/legal/privacy" className="hover:underline" style={{ color: '#5B3FEA' }}>Privacy Policy</Link>.
                </p>
              </form>
            )}

            <div className="mt-5 pt-4 space-y-2.5" style={{ borderTop: '1px solid var(--bam-border)' }}>
              <p className="text-center text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                Already have an account?{' '}
                <Link to="/customer/login" className="font-semibold hover:underline" style={{ color: '#5B3FEA' }}>
                  Sign in
                </Link>
              </p>
              <p className="text-center text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                Business owner?{' '}
                <Link to="/admin/register" className="hover:underline" style={{ color: 'var(--bam-text-muted)' }}>
                  Create a business account →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />;
}
