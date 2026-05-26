import React, { useState } from 'react';
import { MailCheck } from 'lucide-react';
import { consumerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function VerifyRequired({ type = 'customer' }) {
  const { resendVerificationEmail } = useAuth();
  const [sending, setSending] = useState(false);
  const isBusiness = type === 'business';

  const resend = async () => {
    setSending(true);
    try {
      if (isBusiness) await resendVerificationEmail();
      else await consumerAPI.resendVerification();
      toast.success('Verification email sent. Check your inbox.');
    } catch (err) {
      toast.error(err.message || 'Could not send verification email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="card p-6 max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
          <MailCheck className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Verify your email first</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {isBusiness
            ? 'Business accounts must verify their email before managing bookings, services, posts, payments, and messages.'
            : 'Customer accounts must verify their email before booking management, favourites, messages, payments, and support features.'}
        </p>
        <button type="button" onClick={resend} disabled={sending} className="btn-primary mt-5 w-full">
          {sending ? 'Sending...' : 'Send verification email'}
        </button>
      </div>
    </div>
  );
}
