import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { CalendarCheck, Eye, EyeOff, Search, ShieldCheck } from 'lucide-react';

export default function CustomerLogin() {
  const { login } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/customer/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const afterLogin = (consumer) => {
    const dest = !consumer.onboarding_complete ? '/customer/onboarding' : from;
    navigate(dest, { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const consumer = await login(form.email, form.password);
      afterLogin(consumer);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page bg-gradient-to-br from-primary-50 via-white to-slate-50 flex items-center justify-center px-3 py-6 sm:p-4">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] items-center animate-fade-in">
        <div className="hidden lg:block">
          <Link to="/" className="inline-block mb-8">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-10 w-auto object-contain" />
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-4">Customer account</p>
          <h1 className="text-4xl xl:text-5xl font-black text-gray-900 leading-tight max-w-xl">Welcome back to your bookings.</h1>
          <p className="text-gray-500 mt-5 text-lg max-w-lg">Sign in to view appointments, rebook favourites, chat with businesses, and contact BookAm support.</p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl">
            {[
              [CalendarCheck, 'Track bookings'],
              [Search, 'Find services'],
              [ShieldCheck, 'Buyer support'],
            ].map(([Icon, label]) => (
              <div key={label} className="app-panel p-4">
                <Icon className="w-5 h-5 text-primary-600 mb-3" />
                <p className="text-sm font-bold text-gray-900">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full max-w-sm mx-auto lg:max-w-none">
          <div className="text-center mb-6 lg:hidden">
            <Link to="/" className="inline-block mb-5">
              <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain mx-auto" />
            </Link>
            <h1 className="text-2xl font-black text-gray-900">Customer sign in</h1>
            <p className="text-gray-500 text-sm mt-1">Manage bookings and messages</p>
          </div>

          <div className="mb-3 hidden lg:block">
            <p className="text-sm font-bold text-gray-900">Customer sign in</p>
            <p className="text-xs text-gray-500 mt-0.5">For people booking services</p>
          </div>

          <div className="app-panel p-4 sm:p-6 space-y-4">
            <div className="lg:hidden inline-flex items-center gap-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 px-3 py-1 text-xs font-bold">
              <CalendarCheck className="w-3.5 h-3.5" /> Customer
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input className="input" type="email" placeholder="you@email.com" required value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    value={form.password}
                    onChange={set('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Link to="/customer/forgot-password" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Spinner /> : 'Sign in'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              New to BookAm?{' '}
              <Link to="/customer/signup" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
                Create account
              </Link>
            </p>
            <p className="text-center text-xs text-gray-400">
              Are you a business owner?{' '}
              <Link to="/admin/login" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                Go to business sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner({ color = 'white' }) {
  return <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mx-auto ${color === 'gray' ? 'border-gray-400' : 'border-white'}`} />;
}
