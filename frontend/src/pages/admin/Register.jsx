import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const LOGO = 'https://res.cloudinary.com/dco9drzzp/image/upload/v1779054818/99A671C3-1992-4C69-A170-BB994A854543_tf8sb4.png';

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
          <img src={LOGO} alt="BookAm" className="h-12 w-auto object-contain" />
        </Link>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-white text-center mb-1">Create your account</h1>
          <p className="text-white/50 text-sm text-center mb-6">Start booking in under 2 minutes — free</p>

          <form onSubmit={submit} className="space-y-4">
            {[
              { key: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Jane Smith' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@business.com' },
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
              {loading ? <Spinner /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-white/50 mt-5">
            Already have an account?{' '}
            <Link to="/admin/login" className="text-primary-300 font-medium hover:text-primary-200 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}
