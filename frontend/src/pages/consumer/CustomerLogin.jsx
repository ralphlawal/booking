import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

export default function CustomerLogin() {
  const { login, googleLogin } = useCustomerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/customer/dashboard';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await googleLogin();
      navigate(from, { replace: true });
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(err.message || 'Google sign-in failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-5">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain brightness-0 invert mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-primary-200 text-sm mt-1">Sign in to manage your bookings</p>
        </div>

        <div className="card p-6 space-y-4">
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-semibold text-sm py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-60"
          >
            {googleLoading ? (
              <Spinner color="gray" />
            ) : (
              <GoogleIcon />
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            <span className="text-xs text-gray-400">or sign in with email</span>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@email.com" required value={form.email} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  required
                  value={form.password}
                  onChange={set('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link to="/customer/forgot-password" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading || googleLoading} className="btn-primary w-full">
              {loading ? <Spinner /> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            New to BookAm?{' '}
            <Link to="/customer/signup" className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">
              Create account
            </Link>
          </p>
          <p className="text-center text-xs text-gray-400">
            Business owner?{' '}
            <Link to="/admin/login" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner({ color = 'white' }) {
  return <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin mx-auto ${color === 'gray' ? 'border-gray-400' : 'border-white'}`} />;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
