import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { authAPI, consumerAPI } from '../../services/api';
import { LOGO_BLUE_ICON } from '../../config/logos';

export default function VerifyEmail({ type = 'business' }) {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    const verify = type === 'consumer'
      ? consumerAPI.verifyEmail(token)
      : authAPI.verifyEmail(token);
    verify
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token, type]);

  const dashboardLink = type === 'consumer' ? '/customer/dashboard' : '/admin/dashboard';
  const dashboardLabel = type === 'consumer' ? 'Go to Dashboard' : 'Go to Dashboard';

  return (
    <div className="app-page bg-gradient-to-br from-gray-50 to-primary-50/30 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm app-panel p-8 text-center animate-fade-in">
        <img src={LOGO_BLUE_ICON} alt="BookAm Business" className="w-10 h-10 object-contain mx-auto mb-6" />

        {status === 'loading' && (
          <>
            <Loader className="w-12 h-12 text-primary-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-xl font-black text-gray-900 mb-2">Verifying your email…</h1>
            <p className="text-sm text-gray-500">This only takes a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-black text-gray-900 mb-2">Email verified!</h1>
            <p className="text-sm text-gray-500 mb-6">Your email address has been confirmed. You're all set.</p>
            <Link to={dashboardLink} className="btn-primary w-full block text-center">
              {dashboardLabel}
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-black text-gray-900 mb-2">Verification failed</h1>
            <p className="text-sm text-gray-500 mb-6">
              This link is invalid or has expired. Try signing in and requesting a new verification email.
            </p>
            <Link to={dashboardLink} className="btn-primary w-full block text-center">
              Back to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
