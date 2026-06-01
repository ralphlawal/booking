import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { CalendarCheck, Eye, EyeOff, Heart, Search, ShieldCheck } from 'lucide-react';

export default function CustomerSignup() {
  const { register, googleLogin } = useCustomerAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to BookAm.');
      navigate('/customer/onboarding');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const consumer = await googleLogin();
      toast.success(`Welcome, ${consumer.full_name}!`);
      navigate(consumer.onboarding_complete ? '/customer/dashboard' : '/customer/onboarding');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(err.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-primary-50 flex items-center justify-center px-3 py-6 sm:p-4">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] items-center animate-fade-in">
        <div className="hidden lg:block">
          <Link to="/" className="inline-block mb-8">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-10 w-auto object-contain" />
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-4">Customer account</p>
          <h1 className="text-4xl xl:text-5xl font-black text-gray-900 leading-tight max-w-xl">Create your personal booking hub.</h1>
          <p className="text-gray-500 mt-5 text-lg max-w-lg">Save favourite businesses, manage appointments, chat with providers, and get support when you need it.</p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl">
            {[
              [Search, 'Discover services'],
              [Heart, 'Save favourites'],
              [ShieldCheck, 'Support built in'],
            ].map(([Icon, label]) => (
              <div key={label} className="rounded-lg border border-emerald-100 bg-white/80 p-4 shadow-sm">
                <Icon className="w-5 h-5 text-emerald-600 mb-3" />
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
            <h1 className="text-2xl font-bold text-gray-900">Customer sign up</h1>
            <p className="text-gray-500 text-sm mt-1">Book services and track appointments</p>
          </div>

          <div className="mb-3 hidden lg:block">
            <p className="text-sm font-bold text-gray-900">Customer sign up</p>
            <p className="text-xs text-gray-500 mt-0.5">For people booking services</p>
          </div>

          <div className="card p-4 sm:p-6 space-y-4 shadow-card-hover">
            <div className="lg:hidden inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs font-bold">
              <CalendarCheck className="w-3.5 h-3.5" /> Customer
            </div>
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-semibold text-sm py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
          >
            {googleLoading ? <Spinner color="gray" /> : <GoogleIcon />}
            Sign up with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">or with email</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Full name</label>
              <input className="input" placeholder="Your full name" required value={form.full_name} onChange={set('full_name')} />
            </div>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@email.com" required value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" type="tel" placeholder="+44 7700 000000" value={form.phone} onChange={set('phone')} />
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
            <button type="submit" disabled={loading || googleLoading} className="btn-primary w-full mt-1">
              {loading ? <Spinner /> : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/customer/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400">
            Are you a business owner?{' '}
            <Link to="/admin/register" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Create a business account
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
