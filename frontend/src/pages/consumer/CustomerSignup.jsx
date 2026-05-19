import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

export default function CustomerSignup() {
  const { register } = useCustomerAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Check your inbox to verify your email.');
      navigate('/customer/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-5">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain brightness-0 invert mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-primary-200 text-sm mt-1">Book services and track your appointments</p>
        </div>

        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" placeholder="Your full name" required value={form.full_name} onChange={set('full_name')} />
            </div>
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@email.com" required value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input className="input" type="tel" placeholder="+44 7700 000000" value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min 6 characters" required value={form.password} onChange={set('password')} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner /> : 'Create account →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Already have an account?{' '}
            <Link to="/customer/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400 mt-3">
            Business owner?{' '}
            <Link to="/admin/register" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Register your business
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />;
}
