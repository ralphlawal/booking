import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LinkIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { resetPasswordWithCode } = useAuth();
  const oobCode = params.get('oobCode');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!oobCode) {
    return (
      <div className="app-page bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
        <div className="app-panel p-8 text-center max-w-sm w-full">
          <div className="w-12 h-12 rounded-lg bg-primary-50 flex items-center justify-center mx-auto mb-4"><LinkIcon className="w-6 h-6 text-primary-400" /></div>
          <p className="font-bold text-gray-900 text-lg mb-2">Invalid reset link</p>
          <p className="text-sm text-gray-500 mb-5">
            This link is missing or has already been used. Request a new one.
          </p>
          <Link to="/admin/forgot-password" className="btn-primary w-full justify-center">
            Request a new link
          </Link>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      await resetPasswordWithCode(oobCode, form.password);
      toast.success('Password updated! Please sign in.');
      navigate('/admin/login');
    } catch (err) {
      const msg = err.code === 'auth/invalid-action-code'
        ? 'This reset link has expired or already been used. Request a new one.'
        : err.code === 'auth/weak-password'
        ? 'Password is too weak. Use at least 6 characters.'
        : 'Failed to reset password. Try requesting a new link.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-page bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-lg mb-4 shadow-lg shadow-primary-200">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
          <p className="text-gray-500 mt-1 text-sm">Choose a strong password for your account</p>
        </div>
        <div className="app-panel p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input
                className="input"
                type="password"
                placeholder="Min. 6 characters"
                required
                autoFocus
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                className="input"
                type="password"
                placeholder="Repeat password"
                required
                value={form.confirm}
                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner /> : 'Update password'}
            </button>
          </form>
          <p className="text-center mt-4 text-sm">
            <Link to="/admin/forgot-password" className="text-primary-600 hover:underline font-medium">
              Request a new link
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
