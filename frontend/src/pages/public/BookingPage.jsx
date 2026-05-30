import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { MapPin, Wrench, CalendarX, Search, Lock, Shield, RotateCcw, Tag, User } from 'lucide-react';
import { businessAPI, servicesAPI, availabilityAPI, bookingsAPI, consumerAPI, paymentsAPI, staffAPI, intakeAPI, promoAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import BackButton from '../../components/shared/BackButton';
import { format, addDays, isBefore, startOfToday, addMonths, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : Promise.resolve(null);

const STEPS = ['Service', 'Date', 'Time', 'Details', 'Confirm'];

export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { consumer } = useCustomerAuth();
  const prefillServiceId = location.state?.prefill_service_id;
  const bookingAttemptKeyRef = useRef(null);

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(0);
  const [booking, setBooking] = useState({
    service: null, date: null, time: null,
    name: consumer?.full_name || '',
    phone: consumer?.phone || '',
    email: consumer?.email || '',
    notes: '',
  });
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [intakeForm, setIntakeForm] = useState(null);
  const [intakeAnswers, setIntakeAnswers] = useState({});
  const [promoCode, setPromoCode] = useState('');
  const [promoData, setPromoData] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);

  useEffect(() => {
    if (consumer) {
      setBooking(p => ({
        ...p,
        name: p.name || consumer.full_name || '',
        phone: p.phone || consumer.phone || '',
        email: p.email || consumer.email || '',
      }));
    }
  }, [consumer]);

  // Detect redirect return from bank / redirect-based payment methods (e.g. BACS)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const piId = params.get('payment_intent');
    const redirectStatus = params.get('redirect_status');
    if (!piId) return;

    window.history.replaceState({}, '', window.location.pathname);

    if (redirectStatus === 'failed' || redirectStatus === 'canceled') {
      toast.error('Payment was not completed. Please try again.');
      return;
    }
    if (redirectStatus !== 'succeeded') return;

    const saved = sessionStorage.getItem(`bookam_pending_${slug}`);
    if (!saved) return;
    sessionStorage.removeItem(`bookam_pending_${slug}`);
    try {
      const payload = JSON.parse(saved);
      setSubmitting(true);
      bookingsAPI.create(slug, { ...payload, stripe_payment_intent_id: piId })
        .then(r => navigate(`/booking-success/${r.reference_id}`))
        .catch(err => toast.error(err.message || 'Booking failed after payment', { duration: 10000 }))
        .finally(() => setSubmitting(false));
    } catch {}
  }, [slug]);

  useEffect(() => {
    Promise.all([
      businessAPI.getPublic(slug),
      servicesAPI.listPublic(slug),
      staffAPI.listPublic(slug).catch(() => []),
      intakeAPI.getPublic(slug).catch(() => null),
    ]).then(([biz, svcs, staff, intake]) => {
      setBusiness(biz);
      const active = (svcs.filter ? svcs.filter(s => s.is_active) : svcs);
      setServices(active);
      setStaffList(Array.isArray(staff) ? staff : []);
      setIntakeForm(intake?.is_active && intake?.questions?.length ? intake : null);
      if (prefillServiceId) {
        const match = active.find(s => s.id === prefillServiceId);
        if (match) { setBooking(p => ({ ...p, service: match })); setStep(1); }
      }
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
  const getBookingAttemptKey = () => {
    if (!bookingAttemptKeyRef.current) {
      bookingAttemptKeyRef.current = `bk_${Date.now()}_${window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    }
    return bookingAttemptKeyRef.current;
  };

  const servicePrice = booking.service ? parseFloat(booking.service.price || 0) : 0;
  const discount = promoData ? parseFloat(promoData.discount_amount || 0) : 0;
  const finalPrice = Math.max(0, servicePrice - discount);
  const requiresPayment = finalPrice > 0;

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const result = await promoAPI.validate(promoCode.trim(), slug, servicePrice);
      setPromoData(result);
      toast.success(`Promo applied — £${parseFloat(result.discount_amount).toFixed(2)} off!`);
    } catch (err) {
      setPromoData(null);
      toast.error(err.message || 'Invalid promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const goNext = () => setStep(s => Math.min(s + 1, 4));
  const goBack = () => {
    // If on payment step (5), go back to confirm (4) and start a fresh payment attempt.
    if (step === 5) { setStep(4); setClientSecret(null); setPaymentIntentId(null); bookingAttemptKeyRef.current = null; return; }
    setStep(s => Math.max(s - 1, 0));
  };

  const handleConfirm = async () => {
    if (requiresPayment) {
      if (!STRIPE_PK) {
        toast('Online payment is not configured yet. Your booking will be saved as unpaid.');
        await submit(null);
        return;
      }
      setSubmitting(true);
      try {
        const idempotencyKey = getBookingAttemptKey();
        const { client_secret, payment_intent_id } = await paymentsAPI.createIntent({
          amount_pence: Math.round(finalPrice * 100),
          business_name: business.name,
          service_name: booking.service.name,
          idempotency_key: idempotencyKey,
        });
        setClientSecret(client_secret);
        setPaymentIntentId(payment_intent_id);
        // Persist booking data so redirect-based payment methods (e.g. BACS) can
        // complete the booking after the user returns from the bank's page.
        sessionStorage.setItem(`bookam_pending_${slug}`, JSON.stringify({
          service_id: booking.service.id,
          booking_date: format(booking.date, 'yyyy-MM-dd'),
          start_time: booking.time.start,
          customer_name: booking.name,
          customer_phone: booking.phone,
          customer_email: booking.email,
          notes: booking.notes,
          consumer_id: consumer?.id || undefined,
          staff_member_id: selectedStaff?.id || undefined,
          promo_code: promoData ? promoCode : undefined,
          discount_amount: discount > 0 ? discount : undefined,
          idempotency_key: idempotencyKey,
        }));
        setStep(5);
      } catch (err) {
        if (err.code === 'STRIPE_NOT_CONFIGURED' || err.status === 503) {
          toast('Online payment is not configured yet. Your booking will be saved as unpaid.');
          await submit(null);
        } else {
          toast.error(err.message || 'Failed to set up payment');
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      submit(null);
    }
  };

  const submit = async (stripe_payment_intent_id) => {
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
        consumer_id: consumer?.id || undefined,
        website: honeypot,
        stripe_payment_intent_id: stripe_payment_intent_id || undefined,
        staff_member_id: selectedStaff?.id || undefined,
        promo_code: promoData ? promoCode : undefined,
        discount_amount: discount > 0 ? discount : undefined,
        idempotency_key: getBookingAttemptKey(),
      });
      if (consumer && business) {
        consumerAPI.savePreference({ business_id: business.id, service_id: booking.service.id }).catch(() => {});
      }
      navigate(`/booking-success/${result.reference_id}`);
    } catch (err) {
      if (stripe_payment_intent_id) {
        // Payment already taken — give user a clear recovery message
        toast.error(
          `Your payment was processed but the booking could not be saved. Please email hello@bookam.business with payment reference: ${stripe_payment_intent_id}`,
          { duration: 10000 }
        );
      } else {
        toast.error(err.message);
        if (err.message.includes('available')) { setStep(2); setBooking(p => ({ ...p, time: null })); }
      }
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
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 animate-fade-in">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <BackButton
            fallback={`/profile/${slug}`}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 flex-shrink-0"
            iconClassName="w-5 h-5"
          >
            {null}
          </BackButton>
          {business.logo_url ? (
            <img src={business.logo_url} alt={business.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {business.name[0]}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{business.name}</h1>
            {business.category && <p className="text-xs text-gray-500 capitalize">{business.category}</p>}
          </div>
          <Link to={`/profile/${slug}`} state={{ from: location }} className="text-xs text-primary-600 font-medium hover:underline flex-shrink-0">Profile</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-16">
        {/* Business info */}
        {step === 0 && business.description && (
          <div className="mb-5 p-4 bg-white rounded-lg border border-gray-100">
            <p className="text-gray-600 text-sm">{business.description}</p>
            {business.location && <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{business.location}</p>}
          </div>
        )}

        {/* Progress bar */}
        {step < 5 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Step {step + 1} of {requiresPayment ? STEPS.length + 1 : STEPS.length}</span>
              <span className="text-xs font-semibold text-primary-600">{STEPS[step] || 'Payment'}</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div className="h-1.5 bg-primary-600 rounded-full transition-all duration-300" style={{ width: `${((step + 1) / (requiresPayment ? 6 : 5)) * 100}%` }} />
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Step 6 of 6</span>
              <span className="text-xs font-semibold text-primary-600">Payment</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div className="h-1.5 bg-primary-600 rounded-full transition-all duration-300" style={{ width: '100%' }} />
            </div>
          </div>
        )}

        {/* Step 0: Choose service */}
        {step === 0 && (
          <div className="space-y-3 animate-slide-up">
            <h2 className="font-bold text-xl text-gray-900 mb-1">Choose a Service</h2>
            <p className="text-sm text-gray-500 mb-4">Select what you'd like to book</p>
            {services.length === 0 ? (
              <div className="text-center py-16 text-gray-400 bg-white rounded-lg border border-gray-100">
                <Wrench className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No services available yet</p>
              </div>
            ) : services.map(svc => (
              <button
                key={svc.id}
                onClick={() => { set('service')(svc); goNext(); }}
                className="w-full text-left p-4 sm:p-5 rounded-lg border border-gray-200 bg-white hover:border-primary-400 hover:shadow-md transition-all duration-150 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{svc.name}</h3>
                    {svc.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{svc.description}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400 font-medium">{svc.duration_minutes} min</span>
                      {parseFloat(svc.price) === 0 && <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Free</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {parseFloat(svc.price) > 0
                      ? <p className="text-xl font-bold text-primary-700">£{parseFloat(svc.price).toFixed(2)}</p>
                      : <p className="text-xl font-bold text-emerald-600">Free</p>
                    }
                    <p className="text-xs text-primary-500 font-semibold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Book →</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Pick date — horizontal scroll carousel */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-xl text-gray-900">Pick a Date</h2>
              <button onClick={goBack} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg> Back
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Swipe to find your preferred day</p>
            <div className="flex gap-2.5 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
              {dateOptions.map(date => {
                const isSelected = booking.date && isSameDay(date, booking.date);
                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => { set('date')(date); set('time')(null); goNext(); }}
                    className={`flex flex-col items-center py-3.5 px-4 rounded-lg border flex-shrink-0 snap-start transition-all duration-150 ${
                      isSelected
                        ? 'border-primary-600 bg-primary-600 text-white shadow-lg shadow-primary-200'
                        : 'border-gray-100 bg-white hover:border-primary-300 text-gray-700 hover:shadow-sm'
                    }`}
                    style={{ minWidth: 64 }}
                  >
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${isSelected ? 'text-primary-100' : 'text-gray-400'}`}>
                      {format(date, 'EEE')}
                    </span>
                    <span className="text-2xl font-bold mt-0.5 leading-none">{format(date, 'd')}</span>
                    <span className={`text-[11px] mt-1 font-medium ${isSelected ? 'text-primary-200' : 'text-gray-400'}`}>
                      {format(date, 'MMM')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Pick time */}
        {step === 2 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h2 className="font-bold text-xl text-gray-900">Pick a Time</h2>
                <p className="text-sm text-gray-500">{booking.date && format(booking.date, 'EEEE, MMMM d')}</p>
              </div>
              <button onClick={goBack} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg> Back
              </button>
            </div>
            <div className="mt-4">
            {loadingSlots ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {[...Array(9)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-14 bg-white rounded-lg border border-gray-100">
                <CalendarX className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-bold text-gray-900">No slots available</p>
                <p className="text-sm text-gray-500 mt-1">This day is fully booked — try another date</p>
                <button onClick={goBack} className="btn-primary mt-5">← Change Date</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map(slot => (
                  <button
                    key={slot.start}
                    onClick={() => { set('time')(slot); goNext(); }}
                    className={`py-3 rounded-lg text-sm font-bold border transition-all duration-150 ${
                      booking.time?.start === slot.start
                        ? 'border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-200'
                        : 'border-gray-100 bg-white hover:border-primary-400 text-gray-700 hover:shadow-sm'
                    }`}
                  >
                    {slot.start}
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Step 3: Enter details */}
        {step === 3 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-xl text-gray-900">Your Details</h2>
              <button onClick={goBack} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg> Back
              </button>
            </div>
            {!consumer ? (
              <div className="mb-4 mt-3 p-3.5 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-between gap-3">
                <p className="text-sm text-primary-700 font-medium">Sign in to auto-fill your details</p>
                <a href="/customer/login" className="text-xs font-bold text-primary-600 bg-white border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors whitespace-nowrap">Sign in →</a>
              </div>
            ) : (
              <p className="text-sm text-emerald-600 font-medium mt-1 mb-4">✓ Signed in as {consumer.full_name}</p>
            )}
            <div className="card p-5 space-y-4">
              {/* Honeypot — hidden from real users, bots fill it */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <input tabIndex={-1} autoComplete="off" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} />
              </div>
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

              {/* Staff picker — only shown if business has staff members */}
              {staffList.length > 0 && (
                <div>
                  <label className="label flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Preferred staff member</label>
                  <select className="input text-sm" value={selectedStaff?.id || ''} onChange={e => {
                    const found = staffList.find(s => String(s.id) === e.target.value);
                    setSelectedStaff(found || null);
                  }}>
                    <option value="">No preference</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}{s.role ? ` (${s.role})` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Intake form questions */}
              {intakeForm && intakeForm.questions.map((q, i) => (
                <div key={i}>
                  <label className="label">{q.question}{q.required ? ' *' : ''}</label>
                  {q.type === 'textarea' ? (
                    <textarea className="input resize-none text-sm" rows={2} required={q.required}
                      value={intakeAnswers[i] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [i]: e.target.value }))} />
                  ) : q.type === 'select' ? (
                    <select className="input text-sm" required={q.required}
                      value={intakeAnswers[i] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [i]: e.target.value }))}>
                      <option value="">Select…</option>
                      {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : q.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input type="checkbox" className="w-4 h-4 accent-primary-600"
                        checked={intakeAnswers[i] === 'yes'} onChange={e => setIntakeAnswers(p => ({ ...p, [i]: e.target.checked ? 'yes' : 'no' }))} />
                      {q.question}
                    </label>
                  ) : (
                    <input className="input text-sm" required={q.required}
                      value={intakeAnswers[i] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [i]: e.target.value }))} />
                  )}
                </div>
              ))}

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
              <button onClick={goBack} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg> Back
              </button>
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
                  ['Price', `£${parseFloat(booking.service?.price || 0).toFixed(2)}`],
                  ['Duration', `${booking.service?.duration_minutes} min`],
                  ['Date', booking.date ? format(booking.date, 'EEEE, MMMM d, yyyy') : ''],
                  ['Time', booking.time ? `${booking.time.start} – ${booking.time.end}` : ''],
                  ['Name', booking.name],
                  ['Phone', booking.phone],
                  ...(booking.email ? [['Email', booking.email]] : []),
                  ...(booking.notes ? [['Note', booking.notes]] : []),
                  ...(selectedStaff ? [['Staff', selectedStaff.name]] : []),
                  ...(discount > 0 ? [['Discount', `-£${discount.toFixed(2)}`]] : []),
                  ...(discount > 0 ? [['Total', `£${finalPrice.toFixed(2)}`]] : []),
                ].map(([k, v]) => (
                  <div key={k} className={`flex justify-between text-sm ${k === 'Total' ? 'font-bold text-gray-900 border-t border-gray-100 pt-2 mt-2' : ''}`}>
                    <span className={k === 'Discount' ? 'text-green-600' : 'text-gray-500'}>{k}</span>
                    <span className={`font-medium text-right max-w-[60%] ${k === 'Discount' ? 'text-green-600' : ''}`}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Promo code input */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Promo code
                </p>
                <div className="flex gap-2">
                  <input
                    className="input flex-1 text-sm"
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={e => { setPromoCode(e.target.value.toUpperCase()); if (promoData) setPromoData(null); }}
                    disabled={!!promoData}
                  />
                  {promoData ? (
                    <button type="button" onClick={() => { setPromoData(null); setPromoCode(''); }} className="px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors whitespace-nowrap">Remove</button>
                  ) : (
                    <button type="button" onClick={applyPromo} disabled={promoLoading || !promoCode.trim()} className="px-3 py-2 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 whitespace-nowrap">
                      {promoLoading ? '…' : 'Apply'}
                    </button>
                  )}
                </div>
                {promoData && <p className="text-xs text-green-600 font-medium mt-1">✓ {promoData.code} applied — £{parseFloat(promoData.discount_amount).toFixed(2)} off</p>}
              </div>
            </div>
            <button onClick={handleConfirm} disabled={submitting} className="btn-primary w-full text-base py-3.5">
              {submitting ? <Spinner /> : requiresPayment ? `Pay £${finalPrice.toFixed(2)} & Confirm` : 'Confirm Booking'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">By booking you agree to the cancellation policy</p>

            {requiresPayment && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { icon: <Lock className="w-4 h-4 mx-auto text-primary-600" />, title: 'Secure payment', desc: 'Encrypted by Stripe' },
                  { icon: <Shield className="w-4 h-4 mx-auto text-primary-600" />, title: 'Protected funds', desc: 'Held until service confirmed' },
                  { icon: <RotateCcw className="w-4 h-4 mx-auto text-primary-600" />, title: 'Refund policy', desc: 'Dispute within 14 days' },
                ].map(b => (
                  <div key={b.title} className="bg-white border border-gray-100 rounded-lg p-3 text-center">
                    <div className="mb-1">{b.icon}</div>
                    <p className="text-xs font-semibold text-gray-700">{b.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{b.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Payment */}
        {step === 5 && clientSecret && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-xl text-gray-900">Payment</h2>
                <p className="text-sm text-gray-500">£{finalPrice.toFixed(2)} · {booking.service?.name}</p>
              </div>
              <button onClick={goBack} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7"/></svg> Back
              </button>
            </div>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#4f46e5',
                    colorBackground: '#ffffff',
                    colorText: '#1e293b',
                    colorDanger: '#ef4444',
                    borderRadius: '12px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontSizeBase: '15px',
                  },
                },
              }}
            >
              <PaymentForm
                onSuccess={(pi_id) => submit(pi_id)}
                submitting={submitting}
                setSubmitting={setSubmitting}
                amount={finalPrice}
                returnUrl={window.location.href}
              />
            </Elements>
          </div>
        )}
      </main>
    </div>
  );
}

function PaymentForm({ onSuccess, submitting, setSubmitting, amount, returnUrl }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [ready, setReady] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !ready) return;
    setProcessing(true);
    setError(null);

    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required', // only redirects for methods that need it (e.g. BACS)
    });

    if (stripeErr) {
      setError(stripeErr.message);
      setProcessing(false);
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else if (paymentIntent) {
      // processing / requires_action states — webhook will confirm
      setError('Payment is being processed. You will receive confirmation shortly.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="card p-5 space-y-4">
        {/* Stripe Payment Element — shows cards, Apple Pay, Google Pay, BACS, Link etc. */}
        <PaymentElement
          onReady={() => setReady(true)}
          options={{ layout: 'tabs' }}
        />

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-3 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">BookAm Buyer Protection</p>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-0.5">Your payment is held securely until you confirm the service was received. You have 14 days to dispute if anything goes wrong.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!stripe || !ready || processing || submitting}
          className="btn-primary w-full text-base py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {processing || submitting ? (
            <><Spinner /> Processing…</>
          ) : (
            <><Lock className="w-4 h-4" /> Pay £{amount?.toFixed(2)} securely</>
          )}
        </button>

        <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3" /> 256-bit SSL · Powered by Stripe
        </p>
      </div>
    </form>
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
      <Search className="w-14 h-14 mb-2 text-gray-300 mx-auto" />
      <h1 className="text-2xl font-bold text-gray-900">Business not found</h1>
      <p className="text-gray-500">This booking page doesn't exist or has been removed.</p>
    </div>
  );
}

function Spinner() { return <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />; }
