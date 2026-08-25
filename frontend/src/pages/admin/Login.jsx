import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGO_WHITE_H } from '../../config/logos';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, sendLoginOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;

  const [tab, setTab] = useState('email'); // 'email' | 'code' | 'phone'
  const [form, setForm] = useState({ email: '', password: '' });
  const [codeEmail, setCodeEmail] = useState('');
  const [phone, setPhone] = useState('');
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

  const submitSendOtp = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('Enter your phone number');
    setLoading(true);
    try {
      await sendPhoneOtp(phone.trim());
      setOtpSent(true);
      toast.success('OTP sent — check your messages');
    } catch (err) {
      toast.error(err.message || 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const submitVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const data = await verifyPhoneOtp(phone.trim(), otp.trim());
      toast.success('Welcome back!');
      navigate(destination(data), { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center px-3 py-6 sm:p-6">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-center animate-fade-in">

        {/* Left panel */}
        <section className="hidden lg:block text-white">
          <Link to="/" className="inline-flex items-center mb-10">
            <img src={LOGO_WHITE_H} alt="BookAm Business" className="h-11 w-auto object-contain" />
          </Link>
          <span className="inline-flex items-center gap-1.5 bg-primary-500/20 border border-primary-500/30 text-primary-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <BusinessIcon /> Business Owner Account
          </span>
          <h1 className="text-4xl xl:text-5xl font-black leading-tight max-w-xl">Run bookings from a real dashboard.</h1>
          <p className="text-white/65 mt-5 text-lg max-w-lg">Manage appointments, services, customers, payments, posts, chats, and support from one place.</p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl">
            {['Bookings', 'Payments', 'Messages'].map(item => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-sm font-bold">{item}</p>
                <p className="text-xs text-white/45 mt-1">Built in</p>
              </div>
            ))}
          </div>
        </section>

        {/* Right panel */}
        <div className="w-full max-w-sm mx-auto lg:max-w-none">
          <Link to="/" className="flex items-center justify-center mb-8 lg:hidden">
            <img src={LOGO_WHITE_H} alt="BookAm Business" className="h-10 w-auto object-contain" />
          </Link>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 sm:p-6 shadow-2xl">
            <h1 className="text-xl font-bold text-white text-center mb-1">Business Sign In</h1>
            <p className="text-white/50 text-sm text-center mb-5">Sign in to manage your bookings and dashboard</p>

            {/* Tab switcher */}
            <div className="flex rounded-lg bg-white/10 p-1 mb-5">
              {[['email', 'Password'], ['code', 'Email code'], ['phone', 'Phone']].map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setOtpSent(false); setOtp(''); }}
                  className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${tab === t ? 'bg-white text-gray-900 shadow' : 'text-white/60 hover:text-white'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Email form */}
            {tab === 'email' && (
              <form onSubmit={submitEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Email</label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="email"
                    placeholder="you@business.com"
                    required
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-white/80">Password</label>
                    <Link to="/admin/forgot-password" className="text-xs text-primary-300 hover:text-primary-200 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold text-sm transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : 'Sign In to Dashboard'}
                </button>
              </form>
            )}

            {/* Email code form */}
            {tab === 'code' && !otpSent && (
              <form onSubmit={submitSendEmailCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Email address</label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="email"
                    placeholder="you@business.com"
                    required
                    value={codeEmail}
                    onChange={e => setCodeEmail(e.target.value)}
                  />
                  <p className="text-xs text-white/40 mt-1.5">We'll email you a 6-digit sign-in code</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : 'Send code'}
                </button>
              </form>
            )}

            {tab === 'code' && otpSent && (
              <form onSubmit={submitVerifyEmailCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    6-digit code sent to {codeEmail}
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-xl font-mono tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    required
                    autoFocus
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                  <p className="text-white/40 text-xs mt-1.5 text-center">Check your inbox and spam folder</p>
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : 'Sign In'}
                </button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(''); }} className="w-full text-xs text-white/40 hover:text-white/70 transition-colors">
                  ← Use a different email
                </button>
              </form>
            )}

            {/* Phone form */}
            {tab === 'phone' && !otpSent && (
              <form onSubmit={submitSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">Phone number</label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                    type="tel"
                    placeholder="+44 7700 900000"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                  />
                  <p className="text-xs text-white/40 mt-1.5">Include country code e.g. +44</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : 'Send verification code'}
                </button>
              </form>
            )}

            {tab === 'phone' && otpSent && (
              <form onSubmit={submitVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    6-digit code sent to {phone}
                  </label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 tracking-widest text-center text-lg font-mono"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    required
                    autoFocus
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Spinner /> : 'Verify & Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtp(''); }}
                  className="w-full text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  Wrong number? Go back
                </button>
              </form>
            )}

            <p className="text-center text-sm text-white/50 mt-5">
              No business account?{' '}
              <Link to="/admin/register" className="text-primary-300 font-medium hover:text-primary-200 transition-colors">
                Register free
              </Link>
            </p>
          </div>

          <div className="mt-5 text-center">
            <p className="text-white/40 text-xs mb-2">Not a business owner?</p>
            <Link
              to="/customer/login"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              <CustomerIcon /> Sign in as Customer
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}
function BusinessIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
function CustomerIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
