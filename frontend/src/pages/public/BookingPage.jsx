import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { businessAPI, servicesAPI, availabilityAPI, bookingsAPI } from '../../services/api';
import { format, addDays, isBefore, startOfToday, addMonths, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';

const STEPS = ['Service', 'Date', 'Time', 'Details', 'Confirm'];

export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState({ service: null, date: null, time: null, name: '', phone: '', email: '', notes: '' });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      businessAPI.getPublic(slug),
      servicesAPI.listPublic(slug),
    ]).then(([biz, svcs]) => {
      setBusiness(biz);
      setServices(svcs.filter ? svcs.filter(s => s.is_active) : svcs);
    }).catch(() => setNotFound(true));
  }, [slug]);

  useEffect(() => {
    if (!booking.service || !booking.date) return;
    setLoadingSlots(true);
    availabilityAPI.getSlots(slug, format(booking.date, 'yyyy-MM-dd'), booking.service.id)
      .then(setSlots).catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [booking.service, booking.date, slug]);

  const set = (k) => (v) => setBooking(p => ({ ...p, [k]: v }));

  const goNext = () => setStep(s => Math.min(s + 1, 4));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await bookingsAPI.create(slug, {
        service_id: booking.service.id,
        booking_date: format(booking.date, 'yyyy-MM-dd'),
        start_time: booking.time.start,
        customer_name: booking.name,
        customer_phone: booking.phone,
        customer_email: booking.email,
        notes: booking.notes,
      });
      navigate(`/booking-success/${result.reference_id}`);
    } catch (err) {
      toast.error(err.message);
      if (err.message.includes('available')) { setStep(2); setBooking(p => ({ ...p, time: null })); }
    } finally {
      setSubmitting(false);
    }
  };

  if (notFound) return <PageNotFound />;
  if (!business) return <Loading />;

  const today = startOfToday();
  const maxDate = addMonths(today, 3);

  // Generate date options (next 60 days)
  const dateOptions = Array.from({ length: 60 }, (_, i) => addDays(today, i));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold">
              {business.name[0]}
            </div>
          )}
          <div>
            <h1 className="font-bold text-gray-900">{business.name}</h1>
            {business.category && <p className="text-xs text-gray-500 capitalize">{business.category}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Business info */}
        {step === 0 && business.description && (
          <div className="mb-5 p-4 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-600 text-sm">{business.description}</p>
            {business.location && <p className="text-xs text-gray-400 mt-2">📍 {business.location}</p>}
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">Step {step + 1} of {STEPS.length}</span>
            <span className="text-xs font-semibold text-primary-600">{STEPS[step]}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full">
            <div className="h-1.5 bg-primary-600 rounded-full transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* Step 0: Choose service */}
        {step === 0 && (
          <div className="space-y-3 animate-slide-up">
            <h2 className="font-bold text-xl text-gray-900 mb-4">Choose a Service</h2>
            {services.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-4xl mb-3">🛠</p>
                <p>No services available yet</p>
              </div>
            ) : services.map(svc => (
              <button
                key={svc.id}
                onClick={() => { set('service')(svc); goNext(); }}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all hover:border-primary-300 hover:shadow-sm ${
                  booking.service?.id === svc.id ? 'border-primary-600 bg-primary-50' : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{svc.name}</h3>
                    {svc.description && <p className="text-sm text-gray-500 mt-0.5">{svc.description}</p>}
                    <p className="text-sm text-gray-400 mt-1">{svc.duration_minutes} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-700">${parseFloat(svc.price).toFixed(2)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Pick date */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-xl text-gray-900">Pick a Date</h2>
              <button onClick={goBack} className="btn-secondary text-sm">← Back</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {dateOptions.map(date => {
                const isSelected = booking.date && isSameDay(date, booking.date);
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => { set('date')(date); set('time')(null); goNext(); }}
                    className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                      isSelected ? 'border-primary-600 bg-primary-600 text-white' :
                      'border-gray-100 bg-white hover:border-primary-300 text-gray-700'
                    }`}
                  >
                    <span className="text-xs font-medium opacity-70">{format(date, 'EEE')}</span>
                    <span className="text-lg font-bold mt-0.5">{format(date, 'd')}</span>
                    <span className="text-xs opacity-70">{format(date, 'MMM')}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Pick time */}
        {step === 2 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-xl text-gray-900">Pick a Time</h2>
                <p className="text-sm text-gray-500">{booking.date && format(booking.date, 'EEEE, MMMM d')}</p>
              </div>
              <button onClick={goBack} className="btn-secondary text-sm">← Back</button>
            </div>
            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2">
                {[...Array(9)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <p className="text-4xl mb-3">😔</p>
                <p className="font-semibold">No slots available</p>
                <p className="text-sm text-gray-500 mt-1">Try another date</p>
                <button onClick={goBack} className="btn-primary mt-4">Change Date</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.start}
                    onClick={() => { set('time')(slot); goNext(); }}
                    className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                      booking.time?.start === slot.start
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-100 bg-white hover:border-primary-300 text-gray-700'
                    }`}
                  >
                    {slot.start}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Enter details */}
        {step === 3 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-xl text-gray-900">Your Details</h2>
              <button onClick={goBack} className="btn-secondary text-sm">← Back</button>
            </div>
            <div className="card p-5 space-y-4">
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="John Doe" required value={booking.name} onChange={e => set('name')(e.target.value)} />
              </div>
              <div>
                <label className="label">Phone Number *</label>
                <input className="input" type="tel" placeholder="+1-555-0100" required value={booking.phone} onChange={e => set('phone')(e.target.value)} />
              </div>
              <div>
                <label className="label">Email (optional – for confirmation)</label>
                <input className="input" type="email" placeholder="you@example.com" value={booking.email} onChange={e => set('email')(e.target.value)} />
              </div>
              <div>
                <label className="label">Note / Message (optional)</label>
                <textarea className="input resize-none" rows={2} placeholder="Any special requests?" value={booking.notes} onChange={e => set('notes')(e.target.value)} />
              </div>
              <button
                onClick={goNext}
                disabled={!booking.name || !booking.phone}
                className="btn-primary w-full"
              >
                Review Booking →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirm */}
        {step === 4 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-xl text-gray-900">Confirm Booking</h2>
              <button onClick={goBack} className="btn-secondary text-sm">← Back</button>
            </div>
            <div className="card p-5 mb-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100 mb-4">
                {business.logo_url ? (
                  <img src={business.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold">{business.name[0]}</div>
                )}
                <div>
                  <p className="font-semibold">{business.name}</p>
                  {business.phone && <p className="text-xs text-gray-500">{business.phone}</p>}
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ['Service', booking.service?.name],
                  ['Price', `$${parseFloat(booking.service?.price || 0).toFixed(2)}`],
                  ['Duration', `${booking.service?.duration_minutes} min`],
                  ['Date', booking.date ? format(booking.date, 'EEEE, MMMM d, yyyy') : ''],
                  ['Time', booking.time ? `${booking.time.start} – ${booking.time.end}` : ''],
                  ['Name', booking.name],
                  ['Phone', booking.phone],
                  ...(booking.email ? [['Email', booking.email]] : []),
                  ...(booking.notes ? [['Note', booking.notes]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-right max-w-[60%]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={submit} disabled={submitting} className="btn-primary w-full text-base py-3.5">
              {submitting ? <Spinner /> : 'Confirm Booking'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">By booking you agree to the cancellation policy</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PageNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-4 text-center">
      <div className="text-6xl mb-2">🔍</div>
      <h1 className="text-2xl font-bold text-gray-900">Business not found</h1>
      <p className="text-gray-500">This booking page doesn't exist or has been removed.</p>
    </div>
  );
}

function Spinner() { return <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />; }
