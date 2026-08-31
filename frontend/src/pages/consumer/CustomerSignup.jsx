import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { CalendarCheck, Eye, EyeOff, Heart, Search, ShieldCheck } from 'lucide-react';

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
      toast.error(err.message);
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
    <div className="app-page bg-gradient-to-br from-primary-50 via-white to-slate-50 flex items-center justify-center px-3 py-6 sm:p-4">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] items-center animate-fade-in">
        <div className="hidden lg:block">
          <Link to="/" className="inline-block mb-8">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-10 w-auto object-contain" />
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-4">Customer account</p>
          <h1 className="text-4xl xl:text-5xl font-black text-gray-900 leading-tight max-w-xl">Create your personal booking hub.</h1>
          <p className="text-gray-500 mt-5 text-lg max-w-lg">Save favourite businesses, manage appointments, chat with providers, and get support when you need it.</p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl">
            {[
              [Search, 'Discover services'],
              [Heart, 'Save favourites'],
              [ShieldCheck, 'Support built in'],
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
            <h1 className="text-2xl font-black text-gray-900">Customer sign up</h1>
            <p className="text-gray-500 text-sm mt-1">Book services and track appointments</p>
          </div>

          <div className="mb-3 hidden lg:block">
            <p className="text-sm font-bold text-gray-900">Customer sign up</p>
            <p className="text-xs text-gray-500 mt-0.5">For people booking services</p>
          </div>

          <div className="app-panel p-4 sm:p-6 space-y-4">
            <div className="lg:hidden inline-flex items-center gap-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 px-3 py-1 text-xs font-bold">
              <CalendarCheck className="w-3.5 h-3.5" /> Customer
            </div>

            {phase === 'otp' ? (
              <form onSubmit={submitOtp} className="space-y-3">
                <p className="text-sm text-gray-500">Enter the 6-digit code we sent to <span className="font-semibold text-gray-700 dark:text-gray-200">{form.email}</span>.</p>
                <input
                  className="input text-center text-2xl tracking-[0.5em] font-mono"
                  inputMode="numeric" maxLength={6} autoFocus placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Spinner /> : 'Verify & continue →'}
                </button>
                <p className="text-center text-sm text-gray-500">
                  Didn’t get it? <button type="button" onClick={resend} className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Resend code</button>
                </p>
              </form>
            ) : (
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
              <button type="submit" disabled={loading} className="btn-primary w-full mt-1">
                {loading ? <Spinner /> : 'Create account →'}
              </button>
            </form>
            )}

            <p className="text-center text-xs leading-5 text-gray-400">
              By creating an account, you agree to BookAm’s{' '}
              <Link to="/legal/terms" className="text-primary-600 dark:text-primary-400 hover:underline">Terms</Link>{' '}
              and{' '}
              <Link to="/legal/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">Privacy Policy</Link>.
            </p>

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
