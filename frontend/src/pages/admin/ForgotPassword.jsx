import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { Mail } from 'lucide-react';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(150deg, #eef0ff 0%, #f8f7ff 50%, #fff 100%)',
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center mb-8">
          <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain" />
        </Link>

        <div
          className="rounded-3xl p-7 shadow-xl"
          style={{ background: '#fff', border: '1px solid var(--bam-border)' }}
        >
          {sent ? (
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(16,185,129,0.1)' }}
              >
                <Mail className="w-7 h-7 text-emerald-500" />
              </div>
              <h2 className="font-extrabold text-lg" style={{ color: 'var(--bam-text)' }}>Check your email</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--bam-text-muted)' }}>
                A reset link was sent to <strong>{email}</strong>
              </p>
              <Link
                to="/admin/login"
                className="inline-block mt-6 text-sm font-semibold hover:underline"
                style={{ color: '#5B3FEA' }}
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-extrabold mb-1" style={{ color: 'var(--bam-text)' }}>Forgot password?</h1>
              <p className="text-sm mb-6" style={{ color: 'var(--bam-text-muted)' }}>
                Enter your email and we'll send a reset link.
              </p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@business.com"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? <Spinner /> : 'Send reset link'}
                </button>
              </form>
              <p className="text-center mt-4">
                <Link to="/admin/login" className="text-sm hover:underline" style={{ color: 'var(--bam-text-muted)' }}>
                  ← Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />;
}
