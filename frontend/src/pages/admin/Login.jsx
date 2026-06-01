import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGO_WHITE_H } from '../../config/logos';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      toast.success('Welcome back!');
      const destination = data.onboardingComplete
        ? (from?.pathname?.startsWith('/admin') ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/admin/dashboard')
        : '/admin/onboarding';
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Invalid email or password'
        : err.code === 'auth/user-not-found'
        ? 'No account found with this email'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Try again later.'
        : err.code === 'auth/unauthorized-domain'
        ? 'Sign-in is not enabled for this domain. Contact support.'
        : err.code === 'auth/network-request-failed'
        ? 'Network error — check your connection and try again'
        : err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const data = await googleLogin();
      toast.success('Welcome back!');
      const destination = data.onboardingComplete
        ? (from?.pathname?.startsWith('/admin') ? `${from.pathname}${from.search || ''}${from.hash || ''}` : '/admin/dashboard')
        : '/admin/onboarding';
      navigate(destination, { replace: true });
    } catch (err) {
      const msg = err.code === 'auth/popup-closed-by-user'
        ? 'Google sign-in was cancelled'
        : err.code === 'auth/unauthorized-domain'
        ? 'Google sign-in is not enabled for this domain. Contact support.'
        : err.code === 'auth/network-request-failed'
        ? 'Network error — check your connection and try again'
        : err.message || 'Google sign-in failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center px-3 py-6 sm:p-6">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-center animate-fade-in">
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

        <div className="w-full max-w-sm mx-auto lg:max-w-none">
          <Link to="/" className="flex items-center justify-center mb-8 lg:hidden">
            <img src={LOGO_WHITE_H} alt="BookAm Business" className="h-10 w-auto object-contain" />
          </Link>

          <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
            <span className="inline-flex items-center gap-1.5 bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs font-semibold px-3 py-1.5 rounded-full">
              <BusinessIcon /> Business Owner Account
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-4 sm:p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-white text-center mb-1">Business Sign In</h1>
          <p className="text-white/50 text-sm text-center mb-6">Sign in to manage your bookings and dashboard</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-2.5 bg-white hover:bg-gray-50 text-gray-800 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mb-4"
          >
            <GoogleIcon /> Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/15" />
            <span className="text-xs text-white/35">or with email</span>
            <div className="h-px flex-1 bg-white/15" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Email</label>
              <input
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
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
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
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

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.37c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.37 12 5.37z" />
    </svg>
  );
}
