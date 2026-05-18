import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookingsAPI } from '../../services/api';

export default function BookingLookup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ reference_id: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await bookingsAPI.lookup(form.reference_id, form.email);
      navigate(`/booking-success/${form.reference_id.trim().toUpperCase()}`);
    } catch (err) {
      setError('No booking found with that reference and email. Check your confirmation email and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Find your booking</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your reference ID and email to view your booking</p>
        </div>

        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Booking Reference</label>
              <input
                className="input font-mono uppercase tracking-widest"
                type="text"
                placeholder="e.g. BK-A1B2C3"
                required
                autoFocus
                value={form.reference_id}
                onChange={e => { setForm(p => ({ ...p, reference_id: e.target.value.toUpperCase() })); setError(''); }}
              />
              <p className="text-xs text-gray-400 mt-1">Found in your booking confirmation email</p>
            </div>
            <div>
              <label className="label">Email address</label>
              <input
                className="input"
                type="email"
                placeholder="The email you used when booking"
                required
                value={form.email}
                onChange={e => { setForm(p => ({ ...p, email: e.target.value })); setError(''); }}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner /> : 'Find booking'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center space-y-2">
            <p className="text-xs text-gray-400">Have an account?</p>
            <Link to="/customer/login" className="text-sm font-semibold text-primary-600 hover:underline block">
              Sign in to see all your bookings →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />;
}
