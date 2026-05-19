import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGO_WHITE_H } from '../../config/logos';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name);
      toast.success('Account created! Check your email to verify.');
      navigate('/admin/onboarding');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'An account with this email already exists'
        : err.code === 'auth/weak-password'
        ? 'Password is too weak (min 6 characters)'
        : err.code === 'auth/unauthorized-domain'
        ? 'Sign-up is not enabled for this domain. Contact support.'
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
          <h1 className="text-xl font-bold text-white text-center mb-1">Create Business Account</h1>
          <p className="text-white/50 text-sm text-center mb-6">Free forever · Get your booking page live today</p>

          <form onSubmit={submit} className="space-y-4">
            {[
              { key: 'full_name', label: 'Your Full Name', type: 'text', placeholder: 'Jane Smith' },
              { key: 'email', label: 'Business Email', type: 'email', placeholder: 'you@yourbusiness.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 characters' },
              { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: 'Repeat password' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
                <input
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                  type={type}
                  placeholder={placeholder}
                  required
                  value={form[key]}
                  onChange={set(key)}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold text-sm transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Spinner /> : 'Create Business Account →'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-5">
            Already have a business account?{' '}
            <Link to="/admin/login" className="text-primary-300 font-medium hover:text-primary-200 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Customer separator */}
        <div className="mt-5 text-center">
          <p className="text-white/40 text-xs mb-2">Looking to book an appointment instead?</p>
          <Link
            to="/customer/signup"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <CustomerIcon /> Create Customer Account
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
