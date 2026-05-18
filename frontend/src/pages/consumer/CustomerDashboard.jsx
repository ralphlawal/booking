import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Zap, Search } from 'lucide-react';
import { consumerAPI, bookingsAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

const STATUS_STYLES = {
  pending:   'badge-pending',
  confirmed: 'badge-confirmed',
  cancelled: 'badge-cancelled',
  completed: 'badge-completed',
};

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

function BookingCard({ booking, onRebook, onCancel, past }) {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
          {booking.logo_url ? (
            <img src={booking.logo_url} alt={booking.business_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">🏢</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">{booking.business_name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{booking.service_name}</p>
            </div>
            <span className={`badge ${STATUS_STYLES[booking.status] || 'badge-pending'}`}>
              {booking.status}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
            <p>📅 {fmtDate(booking.booking_date)}</p>
            <p>⏰ {booking.start_time?.slice(0, 5)} – {booking.end_time?.slice(0, 5)}</p>
            {booking.price > 0 && <p>💷 £{parseFloat(booking.price).toFixed(2)}</p>}
            {booking.location && <p>📍 {booking.location}</p>}
          </div>
          <p className="text-xs text-gray-400 mt-1">Ref: {booking.reference_id}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        {past ? (
          <button
            onClick={() => onRebook(booking)}
            className="btn-primary flex-1 text-sm py-2"
          >
            ↩ Rebook
          </button>
        ) : (
          <>
            <Link
              to={`/book/${booking.slug}`}
              className="btn-secondary flex-1 text-sm py-2 text-center"
            >
              View business
            </Link>
            {booking.status === 'pending' || booking.status === 'confirmed' ? (
              <button
                onClick={() => onCancel(booking)}
                className="text-sm px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Cancel
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function PreferenceCard({ pref, onRemove, onBook }) {
  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
          {pref.logo_url ? (
            <img src={pref.logo_url} alt={pref.business_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">❤️</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm">{pref.business_name}</h3>
          {pref.service_name && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Usual: {pref.service_name}
              {pref.price > 0 && ` · £${parseFloat(pref.price).toFixed(0)}`}
            </p>
          )}
          {pref.location && <p className="text-xs text-gray-400 mt-0.5">📍 {pref.location}</p>}
          <p className="text-xs text-gray-400 mt-0.5">
            Booked {pref.total_bookings}× · Last {pref.last_booked_at ? fmtDate(pref.last_booked_at.split('T')[0]) : 'N/A'}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={() => onBook(pref)} className="btn-primary flex-1 text-sm py-2">
          Book again →
        </button>
        <button
          onClick={() => onRemove(pref.business_id)}
          className="text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const { consumer, loading: authLoading } = useCustomerAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!consumer) { navigate('/customer/login'); return; }
    Promise.all([
      consumerAPI.myBookings(),
      consumerAPI.getPreferences(),
    ])
      .then(([b, p]) => { setBookings(b); setPrefs(p); })
      .catch(() => toast.error('Failed to load your data'))
      .finally(() => setLoading(false));
  }, [consumer, authLoading]);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter((b) => b.booking_date >= today && !['cancelled', 'completed'].includes(b.status));
  const past = bookings.filter((b) => b.booking_date < today || ['completed', 'cancelled'].includes(b.status));

  const handleRebook = (booking) => {
    navigate(`/book/${booking.slug}`, { state: { prefill_service_id: booking.service_id } });
  };

  const handleCancel = async (booking) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await bookingsAPI.cancelByCustomer(booking.reference_id);
      setBookings((prev) => prev.map((b) => b.id === booking.id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRemovePref = async (businessId) => {
    try {
      await consumerAPI.removePreference(businessId);
      setPrefs((prev) => prev.filter((p) => p.business_id !== businessId));
      toast.success('Removed from favourites');
    } catch {
      toast.error('Failed to remove');
    }
  };

  const TABS = [
    { id: 'upcoming',   label: `Upcoming (${upcoming.length})` },
    { id: 'past',       label: `Past (${past.length})` },
    { id: 'favourites', label: `Favourites (${prefs.length})` },
  ];

  if (authLoading || !consumer) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-7 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/explore" className="text-sm text-gray-600 dark:text-gray-400 font-medium hidden sm:block">Explore</Link>
            <Link to="/customer/profile" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Settings className="w-4 h-4 text-gray-500" />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome header */}
        <div className="mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-primary">
            {consumer.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Hi, {consumer.full_name?.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{consumer.email}</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Link to="/match" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">Smart Match</p>
              <p className="text-xs text-gray-400">Best available</p>
            </div>
          </Link>
          <Link to="/explore" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
              <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">Explore</p>
              <p className="text-xs text-gray-400">Browse services</p>
            </div>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-5 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tab === 'upcoming' ? (
          upcoming.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📅</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">No upcoming bookings</h3>
              <p className="text-sm text-gray-500 mb-4">Book a service to get started</p>
              <Link to="/explore" className="btn-primary text-sm">Explore services</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} onRebook={handleRebook} onCancel={handleCancel} past={false} />
              ))}
            </div>
          )
        ) : tab === 'past' ? (
          past.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No past bookings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} onRebook={handleRebook} onCancel={handleCancel} past />
              ))}
            </div>
          )
        ) : (
          prefs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">❤️</div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">No favourites yet</h3>
              <p className="text-sm text-gray-500 mb-4">Businesses you book will appear here for one-tap rebooking</p>
              <Link to="/explore" className="btn-primary text-sm">Find services</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {prefs.map((p) => (
                <PreferenceCard
                  key={p.business_id}
                  pref={p}
                  onRemove={handleRemovePref}
                  onBook={(pref) => navigate(`/book/${pref.slug}`, { state: { prefill_service_id: pref.service_id } })}
                />
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
