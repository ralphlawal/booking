import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

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
      toast.error(err.message || 'Incorrect email or password. Please try again.');
    } finally {
      setLoading(false);
    }
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
            Customer account
          </p>
          <h1 className="text-5xl font-black leading-[1.1] text-wrap-balance" style={{ color: 'var(--bam-text)' }}>
            Your bookings,<br />all in one place.
          </h1>
          <p className="mt-4 text-lg max-w-md" style={{ color: 'var(--bam-text-muted)' }}>
            Track appointments, rebook your favourite services, and get support — all from one tidy dashboard.
          </p>

          <div className="mt-10 space-y-3 max-w-sm">
            {[
              { emoji: '📅', title: 'Manage every booking', sub: 'View, reschedule or cancel in seconds' },
              { emoji: '❤️', title: 'One-tap rebooking', sub: 'Your favourites are always one tap away' },
              { emoji: '🛡', title: 'Buyer protection', sub: 'Disputes reviewed within 48 hours' },
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
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--bam-text)' }}>Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>Sign in to your customer account</p>
          </div>

          <div
            className="rounded-3xl p-6 sm:p-8 shadow-xl"
            style={{ background: '#fff', border: '1px solid var(--bam-border)' }}
          >
            <div className="hidden lg:block mb-6">
              <h2 className="text-xl font-extrabold" style={{ color: 'var(--bam-text)' }}>Sign in</h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>For people booking services</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@email.com"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="label mb-0">Password</span>
                  <Link to="/customer/forgot-password" className="text-xs font-semibold hover:underline" style={{ color: '#5B3FEA' }}>
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    value={form.password}
                    onChange={set('password')}
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

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? <Spinner /> : 'Sign in'}
              </button>
            </form>

            <div className="mt-5 pt-5 space-y-3" style={{ borderTop: '1px solid var(--bam-border)' }}>
              <p className="text-center text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                New to BookAm?{' '}
                <Link to="/customer/signup" className="font-semibold hover:underline" style={{ color: '#5B3FEA' }}>
                  Create account
                </Link>
              </p>
              <p className="text-center text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                Business owner?{' '}
                <Link to="/admin/login" className="hover:underline" style={{ color: 'var(--bam-text-muted)' }}>
                  Business sign in →
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: 'var(--bam-text-faint)' }}>
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
