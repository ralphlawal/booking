import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LinkIcon } from 'lucide-react';
import { consumerAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

export default function CustomerResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    if (!token) return setError('Invalid reset link — request a new one');
    setLoading(true);
    try {
      await consumerAPI.resetPassword(token, form.password);
      toast.success('Password updated! Sign in with your new password.');
      navigate('/customer/login');
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="card p-8 text-center max-w-sm w-full">
        <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-4"><LinkIcon className="w-6 h-6 text-primary-400" /></div>
        <p className="font-bold text-gray-900 dark:text-white mb-2">Invalid reset link</p>
        <p className="text-sm text-gray-500 mb-5">
          This link is missing or has already been used. Request a new one.
        </p>
        <Link to="/customer/forgot-password" className="btn-primary w-full justify-center">
          Request a new link
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-5">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-9 w-auto object-contain brightness-0 invert mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Set new password</h1>
          <p className="text-primary-200 text-sm mt-1">Choose a strong password for your account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">New password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                required
                autoFocus
                value={form.password}
                onChange={e => { setForm(p => ({ ...p, password: e.target.value })); setError(''); }}
              />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input
                className="input"
                type="password"
                placeholder="Repeat your password"
                required
                value={form.confirm}
                onChange={e => { setForm(p => ({ ...p, confirm: e.target.value })); setError(''); }}
              />
            </div>
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                {error}
                {(error.includes('expired') || error.includes('Invalid')) && (
                  <span> <Link to="/customer/forgot-password" className="underline font-semibold">Request a new link</Link></span>
                )}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner /> : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />;
}
