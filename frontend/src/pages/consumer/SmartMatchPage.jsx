import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { discoverAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import toast from 'react-hot-toast';

const TIME_PREFS = [
  { value: 'morning',   label: 'Morning',   desc: '6am – 12pm', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon',  desc: '12pm – 5pm', icon: '☀️' },
  { value: 'evening',   label: 'Evening',    desc: '5pm – 10pm', icon: '🌆' },
  { value: 'any',       label: 'Any time',   desc: 'Flexible',    icon: '🕐' },
];

const DATE_OPTIONS = [
  { value: 'today',     label: 'Today' },
  { value: 'tomorrow',  label: 'Tomorrow' },
  { value: 'this-week', label: 'This week' },
  { value: 'custom',    label: 'Pick a date' },
];

function resolveDate(opt, custom) {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  if (opt === 'today')    return fmt(today);
  if (opt === 'tomorrow') { today.setDate(today.getDate() + 1); return fmt(today); }
  if (opt === 'this-week') { today.setDate(today.getDate() + 3); return fmt(today); }
  return custom || fmt(today);
}

function MatchCard({ match, onBook }) {
  const [expanded, setExpanded] = useState(false);
  const price = parseFloat(match.price) || 0;
  const rating = parseFloat(match.avg_rating) || 0;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* Logo / icon */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
          {match.logo_url ? (
            <img src={match.logo_url} alt={match.business_name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl">🏢</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">{match.business_name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{match.service_name}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm">£{price.toFixed(0)}</p>
              <p className="text-xs text-gray-400">{match.duration_minutes} min</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {rating > 0 && (
              <span className="text-amber-400 text-xs">★ {rating.toFixed(1)}</span>
            )}
            {match.location && (
              <span className="text-xs text-gray-400">📍 {match.location}</span>
            )}
            {match.distance_km !== null && match.distance_km !== undefined && (
              <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                {match.distance_km} km away
              </span>
            )}
          </div>

          {/* Earliest slot */}
          {match.earliest_slot && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500">Next available:</span>
              <span className="text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-lg">
                {match.earliest_slot.start.slice(0, 5)}
              </span>
              {match.slot_count > 1 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-primary-600 dark:text-primary-400 font-medium"
                >
                  +{match.slot_count - 1} more slots
                </button>
              )}
            </div>
          )}

          {expanded && match.available_slots?.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {match.available_slots.slice(1).map((s) => (
                <span key={s.start} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">
                  {s.start.slice(0, 5)}
                </span>
              ))}
            </div>
          )}

          {match.deposit_required && match.deposit_amount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              🔒 £{parseFloat(match.deposit_amount).toFixed(2)} deposit required (no-show protection)
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => onBook(match)}
        className="btn-primary w-full mt-4 text-sm"
      >
        Book this →
      </button>
    </div>
  );
}

export default function SmartMatchPage() {
  const navigate = useNavigate();
  const { consumer } = useCustomerAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [locating, setLocating] = useState(false);

  const [form, setForm] = useState({
    service_type: '',
    date_opt: 'tomorrow',
    custom_date: '',
    time_pref: 'any',
    coords: null,
  });

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('coords')({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success('Location found!');
      },
      () => { setLocating(false); toast.error('Could not get location'); },
      { timeout: 8000 }
    );
  };

  const findMatch = async () => {
    if (!form.service_type.trim()) return toast.error('Please tell us what you need');
    setLoading(true);
    try {
      const date = resolveDate(form.date_opt, form.custom_date);
      const params = {
        service_type: form.service_type.trim(),
        date,
        time_pref: form.time_pref,
        lat: form.coords?.lat,
        lng: form.coords?.lng,
      };
      const data = await discoverAPI.match(params);
      setResults(data);
      setStep(3);
    } catch (err) {
      toast.error(err.message || 'No matches found');
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (match) => {
    navigate(`/book/${match.slug}`, {
      state: { prefill_service_id: match.service_id },
    });
  };

  const SUGGESTIONS = ['Haircut', 'Nail treatment', 'Massage', 'Personal training', 'Photography', 'Tutoring'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-7 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/explore" className="text-sm text-gray-600 dark:text-gray-400 font-medium">Browse</Link>
            {consumer ? (
              <Link to="/customer/dashboard" className="btn-primary text-sm py-1.5">My Bookings</Link>
            ) : (
              <Link to="/customer/login" className="btn-primary text-sm py-1.5">Sign in</Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Match</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Tell us what you need — we find the best available option instantly
          </p>
        </div>

        {results === null ? (
          <div className="space-y-4">
            {/* Step 1: What */}
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">1. What do you need?</h2>
              <input
                className="input"
                placeholder="e.g. Haircut, Massage, Nail treatment…"
                value={form.service_type}
                onChange={(e) => set('service_type')(e.target.value)}
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => set('service_type')(s)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                      form.service_type === s
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: When */}
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">2. When?</h2>
              <div className="grid grid-cols-2 gap-2">
                {DATE_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => set('date_opt')(d.value)}
                    className={`p-3 rounded-xl text-sm font-medium border transition-all text-left ${
                      form.date_opt === d.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {form.date_opt === 'custom' && (
                <input
                  type="date"
                  className="input mt-3"
                  value={form.custom_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => set('custom_date')(e.target.value)}
                />
              )}
            </div>

            {/* Step 3: Time */}
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3">3. What time?</h2>
              <div className="grid grid-cols-2 gap-2">
                {TIME_PREFS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => set('time_pref')(t.value)}
                    className={`p-3 rounded-xl border transition-all text-left ${
                      form.time_pref === t.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{t.icon}</div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.label}</p>
                    <p className="text-xs text-gray-400">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 4: Location (optional) */}
            <div className="card p-5">
              <h2 className="font-bold text-gray-900 dark:text-white mb-1">4. Where? (optional)</h2>
              <p className="text-xs text-gray-400 mb-3">Share your location to prioritise nearby providers</p>
              <button
                onClick={getLocation}
                disabled={locating || !!form.coords}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  form.coords
                    ? 'border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-300'
                }`}
              >
                {locating ? '⋯ Getting location…' : form.coords ? '✓ Location saved' : '📍 Use my location'}
              </button>
            </div>

            {/* Find button */}
            <button
              onClick={findMatch}
              disabled={loading || !form.service_type.trim()}
              className="btn-primary w-full py-4 text-base"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Finding best match…
                </span>
              ) : '⚡ Find my best match'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">
                  {results.length > 0 ? `${results.length} match${results.length !== 1 ? 'es' : ''} found` : 'No matches found'}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  For "{form.service_type}" · Ranked by {form.coords ? 'distance, ' : ''}availability &amp; price
                </p>
              </div>
              <button
                onClick={() => setResults(null)}
                className="text-sm text-primary-600 dark:text-primary-400 font-medium"
              >
                ← Edit
              </button>
            </div>

            {results.length === 0 ? (
              <div className="card p-8 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">No available slots found</h3>
                <p className="text-sm text-gray-500 mb-4">Try a different date, time, or service type</p>
                <button onClick={() => setResults(null)} className="btn-primary text-sm">
                  Try again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((match, i) => (
                  <div key={`${match.business_id}-${match.service_id}`} className="relative">
                    {i === 0 && (
                      <div className="absolute -top-2 left-4 z-10">
                        <span className="text-xs font-bold bg-green-500 text-white px-2.5 py-0.5 rounded-full">
                          Best match ✓
                        </span>
                      </div>
                    )}
                    <MatchCard match={match} onBook={handleBook} />
                  </div>
                ))}
                <div className="text-center pt-2">
                  <Link to="/explore" className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                    Browse all providers →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
