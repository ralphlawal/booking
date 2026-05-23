import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGO_WHITE_H } from '../../config/logos';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <Link to="/" className="flex items-center justify-center mb-8">
          <img src={LOGO_WHITE_H} alt="BookAm Business" className="h-10 w-auto object-contain" />
        </Link>

        {/* Business owner badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs font-semibold px-3 py-1.5 rounded-full">
            <BusinessIcon /> Business Owner Account
          </span>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-white text-center mb-1">Business Sign In</h1>
          <p className="text-white/50 text-sm text-center mb-6">Sign in to manage your bookings and dashboard</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Email</label>
              <input
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
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
                className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
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
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold text-sm transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
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

        {/* Customer separator */}
        <div className="mt-5 text-center">
          <p className="text-white/40 text-xs mb-2">Not a business owner?</p>
          <Link
            to="/customer/login"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <CustomerIcon /> Sign in as Customer
          </Link>
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
