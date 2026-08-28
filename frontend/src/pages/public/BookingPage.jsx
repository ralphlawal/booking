import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  businessAPI, servicesAPI, availabilityAPI, bookingsAPI,
  consumerAPI, paymentsAPI, staffAPI, intakeAPI, promoAPI,
  reviewsAPI, photosAPI, followsAPI,
} from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { format, addDays, startOfToday, addMonths, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import { openExternalLink, publicWebUrl, shareContent } from '../../services/nativeBridge';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : Promise.resolve(null);
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* ── helpers ─────────────────────────────────────────────────────────────── */

function cur(biz) { return biz?.settings?.currency || '€'; }

function isOpenNow(avail) {
  if (!avail?.working_days?.length || !avail.opening_time || !avail.closing_time) return null;
  const now = new Date();
  const day = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
  if (!avail.working_days.map(d => d.toLowerCase()).includes(day)) return false;
  const [oh, om] = avail.opening_time.split(':').map(Number);
  const [ch, cm] = avail.closing_time.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${ampm}`;
}

function formatHours(avail) {
  if (!avail?.working_days?.length) return null;
  const wd = avail.working_days.map(d => d.toLowerCase());
  const ALL = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const SHORT = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun' };
  const present = ALL.filter(d => wd.includes(d));
  const label = present.length === 7 ? 'Every day'
    : wd.includes('monday') && wd.includes('friday') && !wd.includes('saturday') && !wd.includes('sunday') && present.length === 5 ? 'Mon–Fri'
    : present.map(d => SHORT[d]).join(', ');
  const time = avail.opening_time && avail.closing_time
    ? `${fmtTime(avail.opening_time)} – ${fmtTime(avail.closing_time)}` : '';
  return time ? `${label} · ${time}` : label;
}

function Stars({ rating, size = 'sm' }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} className={`${cls} flex-shrink-0`} viewBox="0 0 24 24"
          fill={i <= full ? '#f59e0b' : (i === full + 1 && half ? 'url(#half)' : 'none')}
          stroke="#f59e0b" strokeWidth={1.5}>
          {i === full + 1 && half && (
            <defs><linearGradient id="half"><stop offset="50%" stopColor="#f59e0b"/><stop offset="50%" stopColor="transparent"/></linearGradient></defs>
          )}
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </span>
  );
}

function Avatar({ name, photo, size = 48 }) {
  const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const hue = (name?.charCodeAt(0) || 0) * 37 % 360;
  if (photo) return <img src={photo} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: `hsl(${hue},60%,45%)`, fontSize: size * 0.33 }}>
      {initials}
    </div>
  );
}

function SectionHeader({ children }) {
  return <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--bp-text)' }}>{children}</h2>;
}

/* ── service card ─────────────────────────────────────────────────────────── */

function ServiceCard({ svc, biz, onBook, preselected }) {
  const [expanded, setExpanded] = useState(false);
  const [participants, setParticipants] = useState(1);
  const max = parseInt(svc.max_group_size) || 1;
  const price = parseFloat(svc.price || 0);
  const C = cur(biz);

  return (
    <div className={`rounded-2xl overflow-hidden border transition-all duration-200 ${preselected ? 'ring-2 ring-[var(--bp-accent)]' : ''}`}
      style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-border)' }}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-snug" style={{ color: 'var(--bp-text)' }}>{svc.name}</h3>
            {svc.description && (
              <p className={`text-sm mt-1 ${expanded ? '' : 'line-clamp-2'}`} style={{ color: 'var(--bp-muted)' }}>{svc.description}</p>
            )}
            {svc.description?.length > 100 && (
              <button onClick={() => setExpanded(e => !e)} className="text-xs font-semibold mt-0.5" style={{ color: 'var(--bp-accent)' }}>
                {expanded ? 'Less' : 'More'}
              </button>
            )}
            <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--bp-chip)', color: 'var(--bp-muted)' }}>
                ⏱ {svc.duration_minutes} min
              </span>
              {svc.buffer_time > 0 && (
                <span className="text-xs" style={{ color: 'var(--bp-faint)' }}>+{svc.buffer_time}m</span>
              )}
              {svc.deposit_required && parseFloat(svc.deposit_amount) > 0 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                  🔒 {C}{parseFloat(svc.deposit_amount).toFixed(0)} deposit
                </span>
              )}
              {max > 1 && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(99,102,241,.08)', color: 'var(--bp-accent)' }}>
                  Up to {max} people
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <span className="text-xl font-extrabold" style={{ color: price === 0 ? '#10b981' : 'var(--bp-text)' }}>
              {price === 0 ? 'Free' : `${C}${price.toFixed(2)}`}
            </span>
            <button
              onClick={() => { if (max > 1) { setExpanded(true); return; } onBook(svc, 1); }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
              style={{ background: 'var(--bp-accent)' }}>
              Book
            </button>
          </div>
        </div>

        {/* Group size picker */}
        {max > 1 && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--bp-border)' }}>
            <p className="text-sm font-semibold mb-2" style={{ color: 'var(--bp-text)' }}>How many people?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {Array.from({ length: max }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={() => setParticipants(n)}
                  className={`w-9 h-9 rounded-xl text-sm font-bold border transition-all ${participants === n ? 'text-white border-transparent' : ''}`}
                  style={participants === n ? { background: 'var(--bp-accent)', borderColor: 'var(--bp-accent)' } : { borderColor: 'var(--bp-border)', color: 'var(--bp-muted)', background: 'var(--bp-chip)' }}>
                  {n}
                </button>
              ))}
            </div>
            {price > 0 && participants > 1 && (
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--bp-muted)' }}>
                {participants} × {C}{price.toFixed(2)} = {C}{(participants * price).toFixed(2)}
              </p>
            )}
            <button onClick={() => onBook(svc, participants)}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'var(--bp-accent)' }}>
              Continue with {participants} {participants === 1 ? 'person' : 'people'} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── review card ──────────────────────────────────────────────────────────── */

function ReviewCard({ review }) {
  const initials = (review.reviewer_name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hue = (review.reviewer_name?.charCodeAt(0) || 0) * 37 % 360;
  const d = new Date(review.created_at);
  const ago = (() => {
    const days = Math.floor((Date.now() - d) / 86400000);
    if (days < 1) return 'Today';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  })();

  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)' }}>
      <div className="flex items-start gap-3 mb-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ background: `hsl(${hue},60%,45%)` }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--bp-text)' }}>
              {review.reviewer_name || 'Anonymous'}
            </p>
            <span className="text-xs flex-shrink-0" style={{ color: 'var(--bp-faint)' }}>{ago}</span>
          </div>
          <Stars rating={review.rating} />
        </div>
      </div>
      {review.comment && <p className="text-sm leading-relaxed" style={{ color: 'var(--bp-muted)' }}>{review.comment}</p>}
      {review.reply_text && (
        <div className="mt-3 pl-3 border-l-2 border-[var(--bp-accent)]">
          <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--bp-accent)' }}>Owner reply</p>
          <p className="text-xs" style={{ color: 'var(--bp-muted)' }}>{review.reply_text}</p>
        </div>
      )}
    </div>
  );
}

/* ── booking wizard ───────────────────────────────────────────────────────── */

function BookingWizard({
  biz, services, staffList, intakeForm,
  preService, preStaff, preParticipants,
  onClose, slug, consumer,
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(preService ? 1 : 0);
  const [booking, setBooking] = useState({
    service: preService || null,
    date: null, time: null,
    name: consumer?.full_name || '',
    phone: consumer?.phone || '',
    email: consumer?.email || '',
    notes: '',
  });
  const [participants, setParticipants] = useState(preParticipants || 1);
  const [selectedStaff, setSelectedStaff] = useState(preStaff || null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [intakeAnswers, setIntakeAnswers] = useState({});
  const [promoCode, setPromoCode] = useState('');
  const [promoData, setPromoData] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [honeypot, setHoneypot] = useState('');
  const bookingKeyRef = useRef(null);
  const bodyRef = useRef(null);

  // Filter staff for selected service
  const filteredStaff = booking.service
    ? staffList.filter(s => !s.service_ids?.length || s.service_ids.includes(booking.service.id))
    : staffList;

  const set = k => v => setBooking(p => ({ ...p, [k]: v }));
  const C = cur(biz);
  const servicePrice = booking.service ? parseFloat(booking.service.price || 0) * participants : 0;
  const discount = promoData ? parseFloat(promoData.discount_amount || 0) : 0;
  const finalPrice = Math.max(0, servicePrice - discount);
  const requiresPayment = finalPrice > 0;

  const getKey = () => {
    if (!bookingKeyRef.current) {
      bookingKeyRef.current = `bk_${Date.now()}_${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
    }
    return bookingKeyRef.current;
  };

  // Scroll wizard body to top on step change
  useEffect(() => { bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  // Load slots when date+service changes
  useEffect(() => {
    if (!booking.service || !booking.date) return;
    setLoadingSlots(true);
    availabilityAPI.getSlots(slug, format(booking.date, 'yyyy-MM-dd'), booking.service.id)
      .then(setSlots).catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [booking.service?.id, booking.date]);

  const dateOptions = Array.from({ length: 60 }, (_, i) => addDays(startOfToday(), i));

  const STEPS = booking.service
    ? (filteredStaff.length > 0 ? ['Service','Staff','Date','Time','Details','Confirm'] : ['Service','Date','Time','Details','Confirm'])
    : ['Service'];
  const hasStaffStep = filteredStaff.length > 0;

  // Step indices
  const S = { SERVICE: 0, STAFF: hasStaffStep ? 1 : -1, DATE: hasStaffStep ? 2 : 1, TIME: hasStaffStep ? 3 : 2, DETAILS: hasStaffStep ? 4 : 3, CONFIRM: hasStaffStep ? 5 : 4, PAYMENT: hasStaffStep ? 6 : 5 };

  const goNext = () => setStep(s => s + 1);
  const goBack = () => {
    if (step === S.PAYMENT) { setStep(S.CONFIRM); setClientSecret(null); bookingKeyRef.current = null; return; }
    if (step === 0) { onClose(); return; }
    setStep(s => s - 1);
  };

  const applyPromo = async () => {
    setPromoLoading(true);
    try {
      const res = await promoAPI.validate(promoCode.trim(), slug, servicePrice);
      setPromoData(res);
      toast.success(`Promo applied — ${C}${parseFloat(res.discount_amount).toFixed(2)} off!`);
    } catch (err) { setPromoData(null); toast.error(err.message || 'Invalid code'); }
    finally { setPromoLoading(false); }
  };

  const handleConfirm = async () => {
    if (requiresPayment) {
      if (!STRIPE_PK) { await submit(null); return; }
      setSubmitting(true);
      try {
        const key = getKey();
        const { client_secret } = await paymentsAPI.createIntent({
          business_slug: slug, service_id: booking.service.id,
          promo_code: promoData ? promoCode : undefined,
          idempotency_key: key, participant_count: participants,
        });
        sessionStorage.setItem(`bookam_pending_${slug}`, JSON.stringify({
          service_id: booking.service.id,
          booking_date: format(booking.date, 'yyyy-MM-dd'),
          start_time: booking.time.start,
          customer_name: booking.name, customer_phone: booking.phone, customer_email: booking.email,
          notes: booking.notes, consumer_id: consumer?.id,
          staff_member_id: selectedStaff?.id,
          promo_code: promoData ? promoCode : undefined,
          discount_amount: discount > 0 ? discount : undefined,
          idempotency_key: key, participant_count: participants,
        }));
        setClientSecret(client_secret);
        setStep(S.PAYMENT);
      } catch (err) {
        if (err.code === 'STRIPE_NOT_CONFIGURED' || err.code === 'BUSINESS_STRIPE_NOT_CONNECTED' || err.status === 503) {
          await submit(null);
        } else { toast.error(err.message || 'Payment setup failed'); }
      } finally { setSubmitting(false); }
    } else { submit(null); }
  };

  const submit = async (piId) => {
    setSubmitting(true);
    try {
      const result = await bookingsAPI.create(slug, {
        service_id: booking.service.id,
        booking_date: format(booking.date, 'yyyy-MM-dd'),
        start_time: booking.time.start,
        customer_name: booking.name, customer_phone: booking.phone, customer_email: booking.email,
        notes: booking.notes, consumer_id: consumer?.id,
        website: honeypot,
        stripe_payment_intent_id: piId || undefined,
        staff_member_id: selectedStaff?.id || undefined,
        promo_code: promoData ? promoCode : undefined,
        discount_amount: discount > 0 ? discount : undefined,
        idempotency_key: getKey(), participant_count: participants,
      });
      if (consumer && biz) consumerAPI.savePreference({ business_id: biz.id, service_id: booking.service.id }).catch(() => {});
      navigate(`/booking-success/${result.reference_id}`);
    } catch (err) {
      if (piId) {
        toast.error(`Payment was taken but booking failed. Contact ${biz.email || biz.phone} with ref: ${piId}`, { duration: 12000 });
      } else {
        toast.error(err.message);
        if (err.message?.includes('available')) { setStep(S.TIME); set('time')(null); }
      }
    } finally { setSubmitting(false); }
  };

  const totalSteps = STEPS.length + (requiresPayment ? 1 : 0);
  const progress = ((step + 1) / (totalSteps + (step >= S.CONFIRM ? 1 : 0))) * 100;

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bp-sheet)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: 'var(--bp-border)' }}>
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl transition-colors" style={{ color: 'var(--bp-muted)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 12H5m7-7-7 7 7 7"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--bp-faint)' }}>
            {STEPS[Math.min(step, STEPS.length - 1)] || 'Payment'}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bp-border)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ background: 'var(--bp-accent)', width: `${progress}%` }} />
          </div>
        </div>
        <button onClick={onClose} className="p-2 -mr-2 rounded-xl" style={{ color: 'var(--bp-muted)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Step body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-3">

        {/* Step 0: Service */}
        {step === S.SERVICE && (
          <>
            <p className="font-bold text-lg mb-4" style={{ color: 'var(--bp-text)' }}>Choose a service</p>
            {services.map(svc => (
              <button key={svc.id} onClick={() => { set('service')(svc); setParticipants(1); goNext(); }}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${booking.service?.id === svc.id ? 'ring-2 ring-[var(--bp-accent)]' : ''}`}
                style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-border)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold" style={{ color: 'var(--bp-text)' }}>{svc.name}</p>
                    {svc.description && <p className="text-sm line-clamp-1 mt-0.5" style={{ color: 'var(--bp-muted)' }}>{svc.description}</p>}
                    <p className="text-xs mt-1.5" style={{ color: 'var(--bp-faint)' }}>{svc.duration_minutes} min</p>
                  </div>
                  <span className="font-extrabold text-lg flex-shrink-0" style={{ color: 'var(--bp-text)' }}>
                    {parseFloat(svc.price) === 0 ? 'Free' : `${C}${parseFloat(svc.price).toFixed(2)}`}
                  </span>
                </div>
              </button>
            ))}
          </>
        )}

        {/* Step: Staff */}
        {step === S.STAFF && S.STAFF !== -1 && (
          <>
            <p className="font-bold text-lg mb-4" style={{ color: 'var(--bp-text)' }}>Choose a staff member</p>
            <button onClick={() => { setSelectedStaff(null); goNext(); }}
              className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${!selectedStaff ? 'ring-2 ring-[var(--bp-accent)]' : ''}`}
              style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-border)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-xl" style={{ background: 'var(--bp-chip)' }}>🎲</div>
              <div>
                <p className="font-bold" style={{ color: 'var(--bp-text)' }}>No preference</p>
                <p className="text-sm" style={{ color: 'var(--bp-muted)' }}>Any available staff member</p>
              </div>
              {!selectedStaff && <svg className="w-5 h-5 ml-auto" style={{ color: 'var(--bp-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
            {filteredStaff.map(s => (
              <button key={s.id} onClick={() => { setSelectedStaff(s); goNext(); }}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 ${selectedStaff?.id === s.id ? 'ring-2 ring-[var(--bp-accent)]' : ''}`}
                style={{ background: 'var(--bp-card)', borderColor: 'var(--bp-border)' }}>
                <Avatar name={s.name} photo={s.photo_url} size={48} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold" style={{ color: 'var(--bp-text)' }}>{s.name}</p>
                  {s.role && <p className="text-sm" style={{ color: 'var(--bp-muted)' }}>{s.role}</p>}
                </div>
                {selectedStaff?.id === s.id && <svg className="w-5 h-5" style={{ color: 'var(--bp-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>}
              </button>
            ))}
          </>
        )}

        {/* Step: Date */}
        {step === S.DATE && (
          <>
            <p className="font-bold text-lg mb-4" style={{ color: 'var(--bp-text)' }}>Pick a date</p>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {dateOptions.map(date => {
                const sel = booking.date && isSameDay(date, booking.date);
                return (
                  <button key={date.toISOString()} onClick={() => { set('date')(date); set('time')(null); goNext(); }}
                    className="flex flex-col items-center py-3 rounded-2xl border transition-all"
                    style={sel
                      ? { background: 'var(--bp-accent)', borderColor: 'var(--bp-accent)', color: '#fff' }
                      : { background: 'var(--bp-card)', borderColor: 'var(--bp-border)', color: 'var(--bp-muted)' }
                    }>
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{format(date, 'EEE')}</span>
                    <span className="text-xl font-extrabold leading-tight">{format(date, 'd')}</span>
                    <span className="text-[10px] opacity-60">{format(date, 'MMM')}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Step: Time */}
        {step === S.TIME && (
          <>
            <p className="font-bold text-lg" style={{ color: 'var(--bp-text)' }}>Pick a time</p>
            <p className="text-sm mb-4" style={{ color: 'var(--bp-muted)' }}>
              {booking.date && format(booking.date, 'EEEE, MMMM d')}
            </p>
            {loadingSlots ? (
              <div className="grid grid-cols-3 gap-2">
                {[...Array(9)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--bp-chip)' }} />)}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-2">📅</p>
                <p className="font-bold" style={{ color: 'var(--bp-text)' }}>No slots available</p>
                <p className="text-sm mt-1 mb-4" style={{ color: 'var(--bp-muted)' }}>Try another date</p>
                <button onClick={goBack} className="px-4 py-2 rounded-xl font-semibold text-sm text-white" style={{ background: 'var(--bp-accent)' }}>← Change date</button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => {
                  const sel = booking.time?.start === slot.start;
                  return (
                    <button key={slot.start} onClick={() => { set('time')(slot); goNext(); }}
                      className="py-3 rounded-xl text-sm font-bold border transition-all"
                      style={sel
                        ? { background: 'var(--bp-accent)', borderColor: 'var(--bp-accent)', color: '#fff' }
                        : { background: 'var(--bp-card)', borderColor: 'var(--bp-border)', color: 'var(--bp-text)' }
                      }>
                      {slot.start}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Step: Details */}
        {step === S.DETAILS && (
          <>
            <p className="font-bold text-lg mb-1" style={{ color: 'var(--bp-text)' }}>Your details</p>
            {!consumer ? (
              <div className="rounded-2xl p-4 mb-4 flex items-center justify-between gap-3" style={{ background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.2)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--bp-text)' }}>Sign in to auto-fill</p>
                <a href="/customer/login" className="text-xs font-bold px-3 py-1.5 rounded-xl text-white" style={{ background: 'var(--bp-accent)' }}>Sign in →</a>
              </div>
            ) : (
              <p className="text-sm text-emerald-500 font-semibold mb-4">✓ Signed in as {consumer.full_name}</p>
            )}
            <div style={{ display: 'none' }} aria-hidden><input tabIndex={-1} autoComplete="off" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} /></div>
            <div className="space-y-3">
              {[['Full Name', 'name', 'text', 'Jane Smith', true], ['Phone', 'phone', 'tel', '+353 87…', true], ['Email', 'email', 'email', 'you@email.com', false]].map(([label, key, type, ph, req]) => (
                <div key={key}>
                  <label className="label">{label}{req ? ' *' : ''}</label>
                  <input className="input" type={type} placeholder={ph} required={req} value={booking[key]} onChange={e => set(key)(e.target.value)} />
                </div>
              ))}
              <div>
                <label className="label">Note / special request</label>
                <textarea className="input resize-none" rows={2} placeholder="Anything we should know?" value={booking.notes} onChange={e => set('notes')(e.target.value)} />
              </div>
              {intakeForm?.questions?.map((q, i) => (
                <div key={i}>
                  <label className="label">{q.question}{q.required ? ' *' : ''}</label>
                  {q.type === 'textarea' ? (
                    <textarea className="input resize-none text-sm" rows={2} required={q.required} value={intakeAnswers[i] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [i]: e.target.value }))} />
                  ) : q.type === 'select' ? (
                    <select className="input text-sm" required={q.required} value={intakeAnswers[i] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [i]: e.target.value }))}>
                      <option value="">Select…</option>
                      {(q.options || []).map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input className="input text-sm" required={q.required} value={intakeAnswers[i] || ''} onChange={e => setIntakeAnswers(p => ({ ...p, [i]: e.target.value }))} />
                  )}
                </div>
              ))}
              <button onClick={goNext} disabled={!booking.name || !booking.phone}
                className="w-full py-3.5 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40"
                style={{ background: 'var(--bp-accent)' }}>
                Review Booking →
              </button>
            </div>
          </>
        )}

        {/* Step: Confirm */}
        {step === S.CONFIRM && (
          <>
            <p className="font-bold text-lg mb-4" style={{ color: 'var(--bp-text)' }}>Confirm booking</p>
            {/* Summary card */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)' }}>
              {[
                ['Service', booking.service?.name],
                ['Duration', `${booking.service?.duration_minutes} min`],
                participants > 1 ? ['Participants', `${participants} people`] : null,
                ['Date', booking.date ? format(booking.date, 'EEEE, MMMM d, yyyy') : ''],
                ['Time', booking.time ? `${booking.time.start} – ${booking.time.end}` : ''],
                selectedStaff ? ['Staff', selectedStaff.name] : null,
                ['Name', booking.name],
                ['Phone', booking.phone],
                booking.email ? ['Email', booking.email] : null,
                booking.notes ? ['Note', booking.notes] : null,
                servicePrice > 0 ? ['Price', participants > 1 ? `${participants} × ${C}${parseFloat(booking.service?.price).toFixed(2)} = ${C}${servicePrice.toFixed(2)}` : `${C}${servicePrice.toFixed(2)}`] : null,
                discount > 0 ? ['Discount', `-${C}${discount.toFixed(2)}`] : null,
                discount > 0 ? ['Total', `${C}${finalPrice.toFixed(2)}`] : null,
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} className={`flex justify-between text-sm ${k === 'Total' ? 'font-bold pt-2 border-t' : ''}`} style={{ borderColor: 'var(--bp-border)' }}>
                  <span style={{ color: k === 'Discount' ? '#10b981' : 'var(--bp-faint)' }}>{k}</span>
                  <span className="font-semibold text-right max-w-[60%]" style={{ color: k === 'Discount' ? '#10b981' : 'var(--bp-text)' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Promo */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--bp-faint)' }}>Promo code</p>
              <div className="flex gap-2">
                <input className="input flex-1 text-sm" placeholder="Enter code" value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); if (promoData) setPromoData(null); }} disabled={!!promoData} />
                {promoData
                  ? <button type="button" onClick={() => { setPromoData(null); setPromoCode(''); }} className="px-3 text-xs rounded-xl border" style={{ borderColor: 'var(--bp-border)', color: 'var(--bp-muted)' }}>Remove</button>
                  : <button type="button" onClick={applyPromo} disabled={promoLoading || !promoCode.trim()} className="px-3 text-xs rounded-xl font-bold text-white disabled:opacity-40" style={{ background: 'var(--bp-accent)' }}>
                      {promoLoading ? '…' : 'Apply'}
                    </button>
                }
              </div>
              {promoData && <p className="text-xs text-emerald-500 font-semibold mt-1">✓ {promoData.promo?.code} — {C}{parseFloat(promoData.discount_amount).toFixed(2)} off</p>}
            </div>

            <button onClick={handleConfirm} disabled={submitting}
              className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--bp-accent)' }}>
              {submitting ? <Spinner /> : requiresPayment ? `Pay ${C}${finalPrice.toFixed(2)} & Confirm` : 'Confirm Booking'}
            </button>
            <p className="text-center text-xs" style={{ color: 'var(--bp-faint)' }}>By booking you agree to the cancellation policy</p>

            {requiresPayment && (
              <div className="flex gap-3 text-center">
                {[['🔒','Secure','256-bit SSL'],['🛡','Protected','Held by Stripe'],['↩','Refunds','14-day policy']].map(([ic,t,d]) => (
                  <div key={t} className="flex-1 rounded-2xl p-3" style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)' }}>
                    <p className="text-lg mb-0.5">{ic}</p>
                    <p className="text-xs font-bold" style={{ color: 'var(--bp-text)' }}>{t}</p>
                    <p className="text-[10px]" style={{ color: 'var(--bp-faint)' }}>{d}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Step: Payment */}
        {step === S.PAYMENT && clientSecret && (
          <>
            <p className="font-bold text-lg" style={{ color: 'var(--bp-text)' }}>Payment</p>
            <p className="text-sm mb-4" style={{ color: 'var(--bp-muted)' }}>{C}{finalPrice.toFixed(2)} · {booking.service?.name}</p>
            <Elements stripe={stripePromise} options={{
              clientSecret,
              appearance: { theme: 'stripe', variables: { colorPrimary: '#6366f1', borderRadius: '12px', fontSizeBase: '15px' } },
            }}>
              <PaymentForm onSuccess={piId => submit(piId)} submitting={submitting} setSubmitting={setSubmitting} amount={finalPrice} C={C} returnUrl={window.location.href} />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentForm({ onSuccess, submitting, setSubmitting, amount, C, returnUrl }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [ready, setReady] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !ready) return;
    setProcessing(true); setError(null);
    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements, confirmParams: { return_url: returnUrl }, redirect: 'if_required',
    });
    if (stripeErr) { setError(stripeErr.message); setProcessing(false); }
    else if (paymentIntent?.status === 'succeeded') onSuccess(paymentIntent.id);
    else { setError('Payment is being processed. Check your email for confirmation.'); setProcessing(false); }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="rounded-2xl p-4" style={{ border: '1px solid var(--bp-border)', background: 'var(--bp-card)' }}>
        <PaymentElement onReady={() => setReady(true)} options={{ layout: 'tabs' }} />
        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</div>}
      </div>
      <button type="submit" disabled={!stripe || !ready || processing || submitting}
        className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: 'var(--bp-accent)' }}>
        {processing || submitting ? <><Spinner /> Processing…</> : <>🔒 Pay {C}{amount.toFixed(2)}</>}
      </button>
      <p className="text-center text-xs" style={{ color: 'var(--bp-faint)' }}>256-bit SSL · Powered by Stripe</p>
    </form>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { consumer } = useCustomerAuth();

  const [business, setBusiness]       = useState(null);
  const [services, setServices]       = useState([]);
  const [staffList, setStaffList]     = useState([]);
  const [intakeForm, setIntakeForm]   = useState(null);
  const [reviews, setReviews]         = useState({ reviews: [], stats: null });
  const [photos, setPhotos]           = useState([]);
  const [availability, setAvail]      = useState(null);
  const [notFound, setNotFound]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [followed, setFollowed]       = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllPhotos, setShowAllPhotos]   = useState(false);

  // Booking sheet state
  const [wizardOpen, setWizardOpen]       = useState(false);
  const [preService, setPreService]       = useState(null);
  const [preStaff, setPreStaff]           = useState(null);
  const [preParticipants, setPreParticipants] = useState(1);

  // Header transparency on scroll
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Handle redirect-based payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const piId = params.get('payment_intent');
    const status = params.get('redirect_status');
    if (!piId) return;
    window.history.replaceState({}, '', window.location.pathname);
    if (status !== 'succeeded') { toast.error('Payment was not completed.'); return; }
    const saved = sessionStorage.getItem(`bookam_pending_${slug}`);
    if (!saved) return;
    sessionStorage.removeItem(`bookam_pending_${slug}`);
    try {
      const payload = JSON.parse(saved);
      bookingsAPI.create(slug, { ...payload, stripe_payment_intent_id: piId })
        .then(r => navigate(`/booking-success/${r.reference_id}`))
        .catch(err => toast.error(err.message || 'Booking failed after payment', { duration: 10000 }));
    } catch {}
  }, [slug]);

  // Load all page data
  useEffect(() => {
    const prefillServiceId = location.state?.prefill_service_id;
    Promise.all([
      businessAPI.getPublic(slug),
      servicesAPI.listPublic(slug),
      staffAPI.listPublic(slug).catch(() => []),
      intakeAPI.getPublic(slug).catch(() => null),
      reviewsAPI.getForBusiness(slug).catch(() => ({ reviews: [], stats: null })),
      photosAPI.listPublic(slug).catch(() => []),
      availabilityAPI.getPublicHours(slug).catch(() => null),
    ]).then(([biz, svcs, staff, intake, rvws, phs, avail]) => {
      setBusiness(biz);
      const active = Array.isArray(svcs) ? svcs.filter(s => s.is_active && s.online_booking_enabled !== false) : [];
      setServices(active);
      setStaffList(Array.isArray(staff) ? staff : []);
      setIntakeForm(intake?.is_active && intake?.questions?.length ? intake : null);
      setReviews(rvws || { reviews: [], stats: null });
      setPhotos(Array.isArray(phs) ? phs : []);
      setAvail(avail);
      if (prefillServiceId) {
        const match = active.find(s => s.id === prefillServiceId);
        if (match) { setPreService(match); setWizardOpen(true); }
      }
    }).catch(() => setNotFound(true)).finally(() => setLoading(false));

    if (consumer) followsAPI.check(slug).then(r => setFollowed(r?.following ?? false)).catch(() => {});
  }, [slug]);

  const toggleFollow = async () => {
    if (!consumer) { navigate('/customer/login'); return; }
    try {
      if (followed) { await followsAPI.unfollow(slug); setFollowed(false); toast.success('Removed from favourites'); }
      else { await followsAPI.follow(slug); setFollowed(true); toast.success('Saved to favourites ❤️'); }
    } catch { toast.error('Could not update favourites'); }
  };

  const share = async () => {
    const url = publicWebUrl(`${window.location.pathname}${window.location.search}`);
    try {
      await shareContent({ title: business?.name || 'BookAm', url });
      if (!navigator.share) toast.success('Link copied!');
    } catch {
      toast.error('Could not share this booking page');
    }
  };

  const openBooking = (svc = null, participants = 1, staff = null) => {
    setPreService(svc);
    setPreStaff(staff);
    setPreParticipants(participants);
    setWizardOpen(true);
  };

  if (notFound) return <PageNotFound />;
  if (loading || !business) return <PageSkeleton />;

  const openStatus = isOpenNow(availability);
  const hours = formatHours(availability);
  const avgRating = parseFloat(reviews.stats?.avg_rating || 0);
  const reviewCount = parseInt(reviews.stats?.total || 0);
  const C = cur(business);

  // Cover: first photo with caption=cover, or first photo, or null
  const coverPhoto = photos.find(p => p.caption === 'cover')?.url || photos[0]?.url || null;
  const portfolioPhotos = photos.filter(p => p.caption !== 'cover');

  // Settings-stored extras
  const settings = business.settings || {};
  const website = settings.website || '';
  const instagram = settings.instagram || '';
  const facebook = settings.facebook || '';
  const mapUrl = business.latitude && business.longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`
    : business.location
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`
      : null;

  const visibleReviews = showAllReviews ? reviews.reviews : reviews.reviews.slice(0, 4);
  const visiblePhotos = showAllPhotos ? portfolioPhotos : portfolioPhotos.slice(0, 6);

  return (
    <>
      {/* ── CSS custom properties for this page ── */}
      <style>{`
        :root {
          --bp-bg: #f8f8f6;
          --bp-card: #ffffff;
          --bp-sheet: #ffffff;
          --bp-border: rgba(0,0,0,0.07);
          --bp-text: #111111;
          --bp-muted: #555555;
          --bp-faint: #999999;
          --bp-chip: rgba(0,0,0,0.05);
          --bp-accent: #18181b;
          --bp-hero-overlay: linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.6) 100%);
        }
        @media (prefers-color-scheme: dark) {
          :root:not([data-theme="light"]) {
            --bp-bg: #0a0a0a;
            --bp-card: #141414;
            --bp-sheet: #141414;
            --bp-border: rgba(255,255,255,0.08);
            --bp-text: #f2f2f2;
            --bp-muted: #aaaaaa;
            --bp-faint: #666666;
            --bp-chip: rgba(255,255,255,0.06);
            --bp-accent: #ffffff;
            --bp-hero-overlay: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%);
          }
        }
        :root[data-theme="dark"] {
          --bp-bg: #0a0a0a;
          --bp-card: #141414;
          --bp-sheet: #141414;
          --bp-border: rgba(255,255,255,0.08);
          --bp-text: #f2f2f2;
          --bp-muted: #aaaaaa;
          --bp-faint: #666666;
          --bp-chip: rgba(255,255,255,0.06);
          --bp-accent: #ffffff;
          --bp-hero-overlay: linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.75) 100%);
        }
      `}</style>

      <div className="min-h-screen" style={{ background: 'var(--bp-bg)' }}>

        {/* ── Sticky header ── */}
        <header className={`fixed top-0 inset-x-0 z-30 transition-all duration-300 ${scrolled ? 'shadow-sm' : ''}`}
          style={{ background: scrolled ? 'var(--bp-card)' : 'transparent', borderBottom: scrolled ? '1px solid var(--bp-border)' : 'none' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
            <a href="/" className="p-2 -ml-2 rounded-xl transition-colors" style={{ color: scrolled ? 'var(--bp-text)' : 'white' }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M19 12H5m7-7-7 7 7 7"/></svg>
            </a>
            {scrolled && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {business.logo_url
                  ? <img src={business.logo_url} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                  : <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: 'var(--bp-accent)' }}>{business.name[0]}</div>
                }
                <span className="font-bold text-sm truncate" style={{ color: 'var(--bp-text)' }}>{business.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={toggleFollow} className="p-2 rounded-xl transition-colors" style={{ color: scrolled ? 'var(--bp-text)' : 'white' }}>
                {followed ? '❤️' : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>}
              </button>
              <button onClick={share} className="p-2 rounded-xl transition-colors" style={{ color: scrolled ? 'var(--bp-text)' : 'white' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              </button>
            </div>
          </div>
        </header>

        {/* ── Hero ── */}
        <div className="relative" style={{ height: coverPhoto ? 340 : 220 }}>
          {coverPhoto
            ? <img src={coverPhoto} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
            : <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, hsl(${(business.name.charCodeAt(0) * 37) % 360},60%,22%) 0%, hsl(${(business.name.charCodeAt(0) * 37 + 40) % 360},50%,30%) 100%)` }} />
          }
          <div className="absolute inset-0" style={{ background: 'var(--bp-hero-overlay)' }} />

          {/* Business identity overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
            <div className="max-w-5xl mx-auto flex items-end gap-4">
              {/* Logo */}
              <div className="relative flex-shrink-0">
                {business.logo_url
                  ? <img src={business.logo_url} alt={business.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-xl" />
                  : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white shadow-xl border-2 border-white/20" style={{ background: `hsl(${(business.name.charCodeAt(0) * 37) % 360},60%,35%)` }}>{business.name[0]}</div>
                }
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{business.name}</h1>
                  {business.is_verified && (
                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm">
                      ✓ Verified
                    </span>
                  )}
                </div>
                {business.category && <p className="text-sm font-medium text-white/70 capitalize mt-0.5">{business.category}</p>}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {reviewCount > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Stars rating={avgRating} />
                      <span className="text-sm font-bold text-white">{avgRating.toFixed(1)}</span>
                      <span className="text-xs text-white/60">({reviewCount})</span>
                    </div>
                  )}
                  {business.location && (
                    <div className="flex items-center gap-1 text-xs text-white/70">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {business.location}
                    </div>
                  )}
                  {openStatus !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${openStatus ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                      {openStatus ? '● Open now' : '● Closed'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Page body ── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 lg:py-8">
          <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8">

            {/* Left: content */}
            <div className="space-y-8 min-w-0">

              {/* Quick info bar */}
              <div className="rounded-2xl p-4 flex flex-wrap gap-4" style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)' }}>
                {business.phone && (
                  <a href={`tel:${business.phone}`} className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--bp-text)' }}>
                    <span className="text-base">📞</span> {business.phone}
                  </a>
                )}
                {hours && (
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--bp-muted)' }}>
                    <span className="text-base">🕐</span> {hours}
                  </div>
                )}
                {mapUrl && (
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => openExternalLink(event, mapUrl)} className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--bp-accent)' }}>
                    <span className="text-base">📍</span> Get directions
                  </a>
                )}
              </div>

              {/* About */}
              {business.description && (
                <section>
                  <SectionHeader>About</SectionHeader>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--bp-muted)' }}>{business.description}</p>
                </section>
              )}

              {/* Services */}
              {services.length > 0 && (
                <section>
                  <SectionHeader>Services</SectionHeader>
                  <div className="space-y-3">
                    {services.map(svc => (
                      <ServiceCard key={svc.id} svc={svc} biz={business} onBook={openBooking} />
                    ))}
                  </div>
                </section>
              )}

              {/* Staff */}
              {staffList.length > 0 && (
                <section>
                  <SectionHeader>Our Team</SectionHeader>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {staffList.map(s => (
                      <button key={s.id} onClick={() => openBooking(null, 1, s)}
                        className="rounded-2xl p-4 text-center transition-all hover:scale-[1.02]"
                        style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)' }}>
                        <div className="flex justify-center mb-3">
                          <Avatar name={s.name} photo={s.photo_url} size={56} />
                        </div>
                        <p className="font-bold text-sm" style={{ color: 'var(--bp-text)' }}>{s.name}</p>
                        {s.role && <p className="text-xs mt-0.5" style={{ color: 'var(--bp-muted)' }}>{s.role}</p>}
                        {s.bio && <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--bp-faint)' }}>{s.bio}</p>}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs mt-2 text-center" style={{ color: 'var(--bp-faint)' }}>Tap a team member to book with them</p>
                </section>
              )}

              {/* Reviews */}
              {reviewCount > 0 && (
                <section>
                  <SectionHeader>Reviews</SectionHeader>
                  {/* Summary */}
                  <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)' }}>
                    <div className="flex items-center gap-6">
                      <div className="text-center flex-shrink-0">
                        <p className="text-5xl font-extrabold leading-none" style={{ color: 'var(--bp-text)' }}>{avgRating.toFixed(1)}</p>
                        <Stars rating={avgRating} size="lg" />
                        <p className="text-xs mt-1" style={{ color: 'var(--bp-faint)' }}>{reviewCount} review{reviewCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {[5,4,3,2,1].map(n => {
                          const count = parseInt(reviews.stats?.[`${['','one','two','three','four','five'][n]}_star`] || 0);
                          return (
                            <div key={n} className="flex items-center gap-2">
                              <span className="text-xs w-3 text-right" style={{ color: 'var(--bp-faint)' }}>{n}</span>
                              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="#f59e0b"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bp-chip)' }}>
                                <div className="h-full rounded-full bg-amber-400" style={{ width: reviewCount > 0 ? `${(count / reviewCount) * 100}%` : '0%', transition: 'width .6s' }} />
                              </div>
                              <span className="text-xs w-4" style={{ color: 'var(--bp-faint)' }}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {visibleReviews.map(r => <ReviewCard key={r.id} review={r} />)}
                  </div>
                  {reviews.reviews.length > 4 && (
                    <button onClick={() => setShowAllReviews(s => !s)}
                      className="mt-3 w-full py-3 rounded-2xl text-sm font-semibold border transition-all"
                      style={{ borderColor: 'var(--bp-border)', color: 'var(--bp-muted)', background: 'var(--bp-card)' }}>
                      {showAllReviews ? 'Show fewer reviews' : `See all ${reviews.reviews.length} reviews`}
                    </button>
                  )}
                </section>
              )}

              {/* Portfolio / Gallery */}
              {portfolioPhotos.length > 0 && (
                <section>
                  <SectionHeader>Portfolio</SectionHeader>
                  <div className="grid grid-cols-3 gap-2">
                    {visiblePhotos.map((p, i) => (
                      <div key={p.id || i} className="aspect-square rounded-xl overflow-hidden" style={{ background: 'var(--bp-chip)' }}>
                        <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                  {portfolioPhotos.length > 6 && (
                    <button onClick={() => setShowAllPhotos(s => !s)}
                      className="mt-3 w-full py-3 rounded-2xl text-sm font-semibold border transition-all"
                      style={{ borderColor: 'var(--bp-border)', color: 'var(--bp-muted)', background: 'var(--bp-card)' }}>
                      {showAllPhotos ? 'Show fewer' : `View all ${portfolioPhotos.length} photos`}
                    </button>
                  )}
                </section>
              )}

              {/* Location */}
              {(business.location || business.latitude) && (
                <section>
                  <SectionHeader>Location</SectionHeader>
                  <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bp-border)' }}>
                    {business.latitude && business.longitude && MAPBOX_TOKEN ? (
                      <img
                        src={`https://api.mapbox.com/styles/v1/mapbox/light-v11/static/pin-s+18181b(${business.longitude},${business.latitude})/${business.longitude},${business.latitude},14,0/600x200@2x?access_token=${MAPBOX_TOKEN}`}
                        alt="Map"
                        className="w-full h-40 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-32 flex items-center justify-center text-4xl" style={{ background: 'var(--bp-chip)' }}>🗺</div>
                    )}
                    <div className="p-4 flex items-center justify-between gap-3" style={{ background: 'var(--bp-card)' }}>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--bp-text)' }}>{business.name}</p>
                        {business.location && <p className="text-xs mt-0.5" style={{ color: 'var(--bp-muted)' }}>{business.location}</p>}
                      </div>
                      {mapUrl && (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" onClick={(event) => openExternalLink(event, mapUrl)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                          style={{ background: 'var(--bp-accent)' }}>
                          Directions ↗
                        </a>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Contact */}
              {(business.phone || business.email || website || instagram || facebook) && (
                <section>
                  <SectionHeader>Contact</SectionHeader>
                  <div className="rounded-2xl divide-y" style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)', divideColor: 'var(--bp-border)' }}>
                    {[
                      business.phone && { icon: '📞', label: 'Phone', value: business.phone, href: `tel:${business.phone}` },
                      business.email && { icon: '✉️', label: 'Email', value: business.email, href: `mailto:${business.email}` },
                      website && { icon: '🌐', label: 'Website', value: website.replace(/^https?:\/\//, ''), href: website },
                      instagram && { icon: '📷', label: 'Instagram', value: `@${instagram.replace('@', '')}`, href: `https://instagram.com/${instagram.replace('@', '')}` },
                      facebook && { icon: '👥', label: 'Facebook', value: facebook, href: facebook.startsWith('http') ? facebook : `https://facebook.com/${facebook}` },
                    ].filter(Boolean).map(({ icon, label, value, href }) => (
                      <a key={label} href={href} target={href.startsWith('http') ? '_blank' : '_self'} rel="noopener noreferrer"
                        className="flex items-center gap-3 px-5 py-4 transition-colors" style={{ color: 'var(--bp-text)' }}>
                        <span className="text-lg w-6 flex-shrink-0">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs" style={{ color: 'var(--bp-faint)' }}>{label}</p>
                          <p className="text-sm font-medium truncate">{value}</p>
                        </div>
                        <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--bp-faint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6"/></svg>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {/* Report link */}
              <div className="pb-24 lg:pb-8">
                <button className="text-xs" style={{ color: 'var(--bp-faint)' }}
                  onClick={() => toast('Thanks for letting us know. Our team will review this listing.')}>
                  Report this listing
                </button>
              </div>
            </div>

            {/* Right: sticky booking card (desktop) */}
            <div className="hidden lg:block">
              <div className="sticky top-20 rounded-2xl p-5 space-y-4" style={{ background: 'var(--bp-card)', border: '1px solid var(--bp-border)' }}>
                <div>
                  <p className="font-bold text-lg" style={{ color: 'var(--bp-text)' }}>Book an appointment</p>
                  {reviewCount > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Stars rating={avgRating} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--bp-text)' }}>{avgRating.toFixed(1)}</span>
                      <span className="text-xs" style={{ color: 'var(--bp-faint)' }}>({reviewCount} reviews)</span>
                    </div>
                  )}
                </div>
                {services.slice(0, 4).map(svc => (
                  <button key={svc.id} onClick={() => openBooking(svc, 1)}
                    className="w-full text-left px-4 py-3 rounded-xl border transition-all hover:border-[var(--bp-accent)]"
                    style={{ background: 'var(--bp-bg)', borderColor: 'var(--bp-border)' }}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate" style={{ color: 'var(--bp-text)' }}>{svc.name}</p>
                        <p className="text-xs" style={{ color: 'var(--bp-faint)' }}>{svc.duration_minutes} min</p>
                      </div>
                      <span className="font-bold text-sm flex-shrink-0" style={{ color: 'var(--bp-text)' }}>
                        {parseFloat(svc.price) === 0 ? 'Free' : `${C}${parseFloat(svc.price).toFixed(2)}`}
                      </span>
                    </div>
                  </button>
                ))}
                {services.length > 4 && (
                  <p className="text-xs text-center" style={{ color: 'var(--bp-faint)' }}>+ {services.length - 4} more services</p>
                )}
                <button onClick={() => openBooking(null)}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
                  style={{ background: 'var(--bp-accent)' }}>
                  Book Now
                </button>
                {openStatus !== null && (
                  <p className={`text-center text-xs font-semibold ${openStatus ? 'text-emerald-500' : 'text-red-400'}`}>
                    {openStatus ? `● Open now` : '● Currently closed'}
                    {hours ? ` · ${hours}` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mobile sticky Book Now bar ── */}
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 p-4 pb-safe" style={{ background: 'var(--bp-card)', borderTop: '1px solid var(--bp-border)', backdropFilter: 'blur(16px)' }}>
          <button onClick={() => openBooking(null)}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all active:scale-[.98]"
            style={{ background: 'var(--bp-accent)' }}>
            Book Now
          </button>
        </div>

        {/* ── Booking wizard sheet ── */}
        <AnimatePresence>
          {wizardOpen && (
            <>
              <motion.div key="bw-backdrop" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setWizardOpen(false)} />
              <motion.div key="bw-sheet"
                className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl overflow-hidden sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[460px] sm:rounded-2xl"
                style={{ maxHeight: '95dvh', display: 'flex', flexDirection: 'column', background: 'var(--bp-sheet)' }}
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 350, mass: 0.85 }}
                onClick={e => e.stopPropagation()}>
                {/* Pull handle */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
                  <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bp-border)' }} />
                </div>
                <BookingWizard
                  key={`${preService?.id}-${preStaff?.id}`}
                  biz={business}
                  services={services}
                  staffList={staffList}
                  intakeForm={intakeForm}
                  preService={preService}
                  preStaff={preStaff}
                  preParticipants={preParticipants}
                  onClose={() => setWizardOpen(false)}
                  slug={slug}
                  consumer={consumer}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/* ── Loading skeleton ─────────────────────────────────────────────────────── */

function PageSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bp-bg, #f8f8f6)' }}>
      <div className="h-72 animate-pulse" style={{ background: '#e5e5e5' }} />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: '#e5e5e5' }} />)}
      </div>
    </div>
  );
}

/* ── Not found ────────────────────────────────────────────────────────────── */

function PageNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center" style={{ background: '#f8f8f6' }}>
      <p className="text-6xl">🔍</p>
      <h1 className="text-2xl font-bold">Business not found</h1>
      <p className="text-gray-500">This booking page doesn't exist or has been removed.</p>
      <a href="/" className="mt-2 px-6 py-3 rounded-xl text-white font-semibold" style={{ background: '#18181b' }}>Go home</a>
    </div>
  );
}

/* ── Spinner ──────────────────────────────────────────────────────────────── */
function Spinner() { return <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />; }
