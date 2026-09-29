import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { Mail, Zap } from 'lucide-react';

export default function Register() {
  const { register, verifyEmailOtp, resendEmailOtp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('form'); // 'form' | 'otp'
  const [otp, setOtp] = useState('');

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name);
      toast.success('Account created — check your email for a 6-digit code');
      setPhase('otp');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
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
      toast.success('Email verified — welcome aboard!');
      navigate('/admin/onboarding');
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
        background: 'linear-gradient(150deg, #eef0ff 0%, #f8f7ff 50%, #fff 100%)',
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1fr_430px] items-center">

        {/* Left hero — desktop */}
        <div className="hidden lg:flex flex-col">
          <Link to="/" className="inline-block mb-10">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain" />
          </Link>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 w-fit"
            style={{ background: 'rgba(91,63,234,0.08)', color: '#5B3FEA' }}
          >
            <Zap className="w-3.5 h-3.5" /> Free to start · Live in 2 minutes
          </div>

          <h1 className="text-5xl font-black leading-[1.1] text-wrap-balance" style={{ color: 'var(--bam-text)' }}>
            Get your booking<br />page live today.
          </h1>
          <p className="mt-4 text-lg max-w-md" style={{ color: 'var(--bam-text-muted)' }}>
            Set your services, hours, staff and payments. Share your link and start taking bookings in minutes.
          </p>

          <div className="mt-10 space-y-3 max-w-sm">
            {[
              { emoji: '🔗', title: 'Your own booking page', sub: 'bookam.app/book/yourname — shareable anywhere' },
              { emoji: '💳', title: 'Payments & deposits', sub: 'Accept card, require deposits, issue refunds' },
              { emoji: '📊', title: 'Analytics & growth tools', sub: 'Campaigns, loyalty, reviews — all built in' },
            ].map(f => (
              <div
                key={f.title}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid var(--bam-border)' }}
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
              <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain mx-auto" />
            </Link>
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--bam-text)' }}>
              {phase === 'otp' ? 'Verify your email' : 'Create business account'}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>
              {phase === 'otp' ? `Code sent to ${form.email}` : 'Free forever · Get live in 2 minutes'}
            </p>
          </div>

          <div
            className="rounded-3xl p-6 sm:p-8 shadow-xl"
            style={{ background: '#fff', border: '1px solid var(--bam-border)' }}
          >
            {phase === 'otp' ? (
              <>
                <div className="hidden lg:block mb-6">
                  <h2 className="text-xl font-extrabold" style={{ color: 'var(--bam-text)' }}>Check your email</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
                    We sent a 6-digit code to <strong>{form.email}</strong>
                  </p>
                </div>

                <div
                  className="flex items-center gap-3 p-4 rounded-2xl mb-5"
                  style={{ background: 'rgba(91,63,234,0.06)', border: '1px solid rgba(91,63,234,0.15)' }}
                >
                  <Mail className="w-5 h-5 flex-shrink-0" style={{ color: '#5B3FEA' }} />
                  <p className="text-sm" style={{ color: 'var(--bam-text)' }}>
                    Enter the 6-digit code sent to <strong>{form.email}</strong>
                  </p>
                </div>

                <form onSubmit={submitOtp} className="space-y-4">
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
              </>
            ) : (
              <>
                <div className="hidden lg:block mb-6">
                  <h2 className="text-xl font-extrabold" style={{ color: 'var(--bam-text)' }}>Create business account</h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>Free forever · Live in 2 minutes</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label className="label">Your Full Name</label>
                    <input className="input" type="text" placeholder="Jane Smith" required value={form.full_name} onChange={set('full_name')} autoComplete="name" />
                  </div>
                  <div>
                    <label className="label">Business Email</label>
                    <input className="input" type="email" placeholder="you@yourbusiness.com" required value={form.email} onChange={set('email')} autoComplete="email" />
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input className="input" type="password" placeholder="Min. 6 characters" required value={form.password} onChange={set('password')} autoComplete="new-password" />
                  </div>
                  <div>
                    <label className="label">Confirm Password</label>
                    <input className="input" type="password" placeholder="Repeat password" required value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                    {loading ? <Spinner /> : 'Create Business Account →'}
                  </button>
                </form>

                <p className="text-center text-xs leading-5 mt-4" style={{ color: 'var(--bam-text-faint)' }}>
                  By continuing, you agree to our{' '}
                  <Link to="/legal/terms" className="hover:underline" style={{ color: '#5B3FEA' }}>Terms</Link>
                  {' '}and{' '}
                  <Link to="/legal/privacy" className="hover:underline" style={{ color: '#5B3FEA' }}>Privacy Policy</Link>.
                </p>

                <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--bam-border)' }}>
                  <p className="text-center text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                    Already have an account?{' '}
                    <Link to="/admin/login" className="font-semibold hover:underline" style={{ color: '#5B3FEA' }}>
                      Sign in
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--bam-text-faint)' }}>Looking to book an appointment?</p>
            <Link
              to="/customer/signup"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:shadow-sm"
              style={{
                background: 'rgba(255,255,255,0.9)',
                border: '1px solid var(--bam-border)',
                color: 'var(--bam-text)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Create Customer Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />;
}
