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
      toast.success('Account created! Setting up your workspace…');
      navigate('/admin/onboarding');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-950 to-slate-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_430px] items-center animate-fade-in">
        <section className="hidden lg:block text-white">
          <Link to="/" className="inline-flex items-center mb-10">
            <img src={LOGO_WHITE_H} alt="BookAm Business" className="h-11 w-auto object-contain" />
          </Link>
          <span className="inline-flex items-center gap-1.5 bg-primary-500/20 border border-primary-500/30 text-primary-200 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <BusinessIcon /> Business Owner Account
          </span>
          <h1 className="text-4xl xl:text-5xl font-black leading-tight max-w-xl">Create a booking page people can use anywhere.</h1>
          <p className="text-white/65 mt-5 text-lg max-w-lg">Set services, hours, staff, payments, posts, customer chat, and your public booking link.</p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-xl">
            {['Free start', 'Live link', 'Admin tools'].map(item => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/10 px-4 py-3">
                <p className="text-sm font-bold">{item}</p>
                <p className="text-xs text-white/45 mt-1">Included</p>
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

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-white text-center mb-1">Create Business Account</h1>
          <p className="text-white/50 text-sm text-center mb-6">Free forever · Get your booking page live today</p>

          <form onSubmit={submit} className="space-y-4">
              {[
                { key: 'full_name', label: 'Your Full Name', type: 'text', placeholder: 'Jane Smith', required: true },
                { key: 'email', label: 'Business Email', type: 'email', placeholder: 'you@yourbusiness.com', required: true },
                { key: 'password', label: 'Password', type: 'password', placeholder: 'Min. 6 characters', required: true },
                { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: 'Repeat password', required: true },
              ].map(({ key, label, type, placeholder, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
                  <input
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
                    type={type}
                    placeholder={placeholder}
                    required={required}
                    value={form[key]}
                    onChange={set(key)}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-semibold text-sm transition-all mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
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

          <div className="mt-5 text-center">
          <p className="text-white/40 text-xs mb-2">Looking to book an appointment instead?</p>
          <Link
            to="/customer/signup"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            <CustomerIcon /> Create Customer Account
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
