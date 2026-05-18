import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { consumerAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

export default function CustomerForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await consumerAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-5">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-9 w-auto object-contain brightness-0 invert mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Reset password</h1>
          <p className="text-primary-200 text-sm mt-1">
            {sent ? 'Check your email for the reset link' : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Email sent!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                If <strong>{email}</strong> has an account, you'll get a reset link within a minute.
                Check your spam folder too.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="text-sm text-primary-600 hover:underline font-medium block mb-3"
              >
                Try a different email
              </button>
              <Link to="/customer/login" className="btn-primary w-full justify-center">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@email.com"
                  required
                  autoFocus
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                />
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Spinner /> : 'Send reset link'}
              </button>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                <Link to="/customer/login" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
                  ← Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />;
}
