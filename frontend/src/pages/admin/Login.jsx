import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { BarChart2, Calendar, MessageSquare } from 'lucide-react';

export default function Login() {
  const { login, sendLoginOtp, verifyEmailOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const [tab, setTab] = useState('email'); // 'email' | 'code'
  const [form, setForm] = useState({ email: '', password: '' });
  const [codeEmail, setCodeEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const destination = (data) =>
    data.onboardingComplete
      ? (from?.pathname?.startsWith('/admin') ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/admin/dashboard')
      : '/admin/onboarding';

  const submitEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate(destination(data), { replace: true });
    } catch (err) {
      if (err.code === 'use_otp' || err.message?.includes('Email code')) {
        setCodeEmail(form.email);
        setTab('code');
        toast.error('No password on this account — use "Email code" to sign in');
      } else {
        toast.error(err.message || 'Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitSendEmailCode = async (e) => {
    e.preventDefault();
    if (!codeEmail.trim()) return toast.error('Enter your email');
    setLoading(true);
    try {
      await sendLoginOtp(codeEmail.trim());
      setOtpSent(true);
      toast.success('Code sent — check your inbox');
    } catch (err) {
      toast.error(err.message || 'Could not send code');
    } finally {
      setLoading(false);
    }
  };

  const submitVerifyEmailCode = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const data = await verifyEmailOtp(codeEmail.trim(), otp.trim());
      toast.success('Welcome back!');
      navigate(destination(data), { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
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
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[1fr_420px] items-center">

        {/* Left hero — desktop */}
        <div className="hidden lg:flex flex-col">
          <Link to="/" className="inline-block mb-10">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain" />
          </Link>

          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ background: 'rgba(91,63,234,0.08)', color: '#5B3FEA' }}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            Business Owner Dashboard
          </div>

          <h1 className="text-5xl font-black leading-[1.1] text-wrap-balance" style={{ color: 'var(--bam-text)' }}>
            Your business,<br />fully in control.
          </h1>
          <p className="mt-4 text-lg max-w-md" style={{ color: 'var(--bam-text-muted)' }}>
            Manage bookings, customers, payments, messages and growth — all from one smart dashboard.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3 max-w-sm">
            {[
              { Icon: Calendar,    label: 'Bookings',  sub: 'Real-time calendar' },
              { Icon: BarChart2,   label: 'Analytics', sub: 'Growth insights' },
              { Icon: MessageSquare, label: 'Messages', sub: 'Customer chat' },
            ].map(({ Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-2xl p-4"
                style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid var(--bam-border)' }}
              >
                <Icon className="w-5 h-5 mb-3" style={{ color: '#5B3FEA' }} strokeWidth={1.8} />
                <p className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-faint)' }}>{sub}</p>
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
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--bam-text)' }}>Business sign in</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>Manage bookings and your dashboard</p>
          </div>

          <div
            className="rounded-3xl p-6 sm:p-8 shadow-xl"
            style={{ background: '#fff', border: '1px solid var(--bam-border)' }}
          >
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-extrabold" style={{ color: 'var(--bam-text)' }}>Sign in</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>For business owners</p>
            </div>

            {/* Tab switcher */}
            <div
              className="flex rounded-xl p-1 mb-6"
              style={{ background: 'var(--bam-surface-soft)' }}
            >
              {[['email', 'Password'], ['code', 'Email code']].map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setOtpSent(false); setOtp(''); }}
                  className="flex-1 text-xs font-bold py-2 rounded-lg transition-all"
                  style={{
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? 'var(--bam-text)' : 'var(--bam-text-muted)',
                    boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'email' && (
              <form onSubmit={submitEmail} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@business.com"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="label mb-0">Password</span>
                    <Link to="/admin/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: '#5B3FEA' }}>
                      Forgot?
                    </Link>
                  </div>
                  <input
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                  {loading ? <Spinner /> : 'Sign in to Dashboard'}
                </button>
              </form>
            )}

            {tab === 'code' && !otpSent && (
              <form onSubmit={submitSendEmailCode} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@business.com"
                    required
                    value={codeEmail}
                    onChange={e => setCodeEmail(e.target.value)}
                  />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--bam-text-faint)' }}>
                    We'll email you a 6-digit sign-in code — no password needed
                  </p>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Spinner /> : 'Send code →'}
                </button>
              </form>
            )}

            {tab === 'code' && otpSent && (
              <form onSubmit={submitVerifyEmailCode} className="space-y-4">
                <div>
                  <label className="label">6-digit code</label>
                  <p className="text-xs mb-2" style={{ color: 'var(--bam-text-muted)' }}>
                    Sent to <strong>{codeEmail}</strong>
                  </p>
                  <input
                    className="input text-center text-2xl tracking-[0.4em] font-mono"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    required
                    autoFocus
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--bam-text-faint)' }}>Check your inbox and spam folder</p>
                </div>
                <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
                  {loading ? <Spinner /> : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(''); }}
                  className="w-full text-xs hover:underline"
                  style={{ color: 'var(--bam-text-muted)' }}
                >
                  ← Use a different email
                </button>
              </form>
            )}

            <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--bam-border)' }}>
              <p className="text-center text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                No business account?{' '}
                <Link to="/admin/register" className="font-semibold hover:underline" style={{ color: '#5B3FEA' }}>
                  Register free
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs mb-2" style={{ color: 'var(--bam-text-faint)' }}>Not a business owner?</p>
            <Link
              to="/customer/login"
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
              Sign in as Customer
            </Link>
          </div>

          <p className="mt-4 text-center text-xs" style={{ color: 'var(--bam-text-faint)' }}>
            <Link to="/legal/terms" className="hover:underline">Terms</Link>
            <span className="mx-2">·</span>
            <Link to="/legal/privacy" className="hover:underline">Privacy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />;
}
