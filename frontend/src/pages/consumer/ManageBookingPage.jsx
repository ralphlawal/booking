import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingsAPI, consumerAPI, availabilityAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Calendar, Clock, MapPin, Building2, Scissors,
  PoundSterling, RotateCcw, X, ShieldCheck, AlertTriangle, CalendarClock,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isBefore, startOfDay } from 'date-fns';

function fmtDate(d) {
  if (!d) return '—';
  const raw = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (raw) {
    const date = new Date(Number(raw[1]), Number(raw[2]) - 1, Number(raw[3]), 12);
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  return d;
}

function StatusBadge({ status }) {
  const styles = {
    pending:   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    confirmed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    completed: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300',
  };
  const labels = { pending: 'Awaiting confirmation', confirmed: 'Confirmed', cancelled: 'Cancelled', completed: 'Completed' };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

function ReschedulePanel({ booking, onClose, onDone }) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(addDays(new Date(), 1), { weekStartsOn: 1 }));

  const today = startOfDay(new Date());
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

  const pickDate = async (day) => {
    if (isBefore(day, today)) return;
    setSelectedDate(day);
    setSelectedSlot(null);
    setLoadingSlots(true);
    try {
      const dateStr = format(day, 'yyyy-MM-dd');
      const data = await availabilityAPI.getSlots(booking.slug, dateStr, booking.service_id);
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const submit = async () => {
    if (!selectedDate) { toast.error('Please select a date'); return; }
    setSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      await consumerAPI.rescheduleRequest(booking.reference_id, {
        preferred_date: dateStr,
        preferred_time: selectedSlot || '',
        message,
      });
      toast.success('Reschedule request sent to the business');
      onDone();
    } catch (err) {
      toast.error(err.message || 'Could not send request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white text-lg">Choose new date</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Week mini-calendar */}
      <div className="app-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setWeekStart(w => addDays(w, -7))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {format(weekStart, 'd MMM')} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd MMM yyyy')}
          </span>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['M','T','W','T','F','S','S'].map((d,i) => (
            <div key={i} className="text-center text-[10px] font-bold text-gray-400 pb-1">{d}</div>
          ))}
          {weekDays.map(day => {
            const isPast = isBefore(day, today);
            const isSel = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const isNow = isToday(day);
            return (
              <button
                key={day.toISOString()}
                disabled={isPast}
                onClick={() => pickDate(day)}
                className={`aspect-square rounded-lg text-sm font-semibold transition-all flex items-center justify-center
                  ${isPast ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' :
                    isSel ? 'bg-primary-600 text-white' :
                    isNow ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-bold' :
                    'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Available times — {format(selectedDate, 'EEEE d MMM')}
          </p>
          {loadingSlots ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">No slots available on this day</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                  className={`py-2 rounded-lg text-sm font-semibold border transition-all
                    ${selectedSlot === slot
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600'}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Message */}
      <div>
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1 block">
          Message to business (optional)
        </label>
        <textarea className="input resize-none text-sm" rows={2}
          placeholder="Any specific preferences or notes…"
          value={message} onChange={e => setMessage(e.target.value)} maxLength={300} />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
        This sends a request to the business — they'll confirm the new time directly with you.
      </div>

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button
          onClick={submit}
          disabled={submitting || !selectedDate}
          className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CalendarClock className="w-4 h-4" />}
          Send request
        </button>
      </div>
    </div>
  );
}

function CancelPanel({ booking, onClose, onDone }) {
  const [cancelling, setCancelling] = useState(false);

  const apptDateTime = booking.booking_date && booking.start_time
    ? new Date(`${booking.booking_date}T${booking.start_time}`)
    : null;
  const hoursUntil = apptDateTime ? (apptDateTime - Date.now()) / (1000 * 60 * 60) : null;
  const isPaid = booking.payment_status === 'paid';
  const price = parseFloat(booking.price || 0);

  let refundInfo = null;
  if (isPaid && price > 0 && hoursUntil !== null) {
    if (hoursUntil > 24) refundInfo = { label: 'Full refund', color: 'emerald' };
    else if (hoursUntil > 0) refundInfo = { label: '50% refund — late cancellation', color: 'amber' };
  }

  const confirm = async () => {
    setCancelling(true);
    try {
      await consumerAPI.cancelBooking(booking.reference_id);
      toast.success(refundInfo ? `Booking cancelled — ${refundInfo.label}` : 'Booking cancelled');
      onDone();
    } catch (err) {
      toast.error(err.message || 'Could not cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white text-lg">Cancel booking?</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="app-panel p-4 space-y-1">
        <p className="font-bold text-gray-900 dark:text-white">{booking.service_name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">at {booking.business_name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{fmtDate(booking.booking_date)} · {booking.start_time?.slice(0,5)}</p>
      </div>

      {refundInfo && (
        <div className={`rounded-lg p-3 text-sm font-semibold ${
          refundInfo.color === 'emerald'
            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
        }`}>
          {refundInfo.label} applies. Refund will go to your original payment method.
        </div>
      )}

      {!refundInfo && isPaid && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-500 dark:text-gray-400">
          The appointment has already passed. No refund will be issued.
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="btn-secondary flex-1">Keep booking</button>
        <button
          onClick={confirm}
          disabled={cancelling}
          className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
        >
          {cancelling ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <X className="w-4 h-4" />}
          Cancel booking
        </button>
      </div>
    </div>
  );
}

export default function ManageBookingPage() {
  const { ref } = useParams();
  const navigate = useNavigate();
  const { consumer } = useCustomerAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [panel, setPanel] = useState(null); // null | 'reschedule' | 'cancel'

  useEffect(() => {
    if (!ref) return;
    bookingsAPI.getByRef(ref)
      .then(data => setBooking(data))
      .catch(err => setError(err.message || 'Booking not found'))
      .finally(() => setLoading(false));
  }, [ref]);

  if (loading) return (
    <div className="app-page pb-consumer-nav flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !booking) return (
    <div className="app-page pb-consumer-nav flex flex-col items-center justify-center gap-4 px-6">
      <AlertTriangle className="w-10 h-10 text-amber-400" />
      <p className="font-bold text-gray-900 dark:text-white text-center">{error || 'Booking not found'}</p>
      <Link to="/customer/dashboard" className="btn-primary">Back to dashboard</Link>
      <ConsumerBottomNav />
    </div>
  );

  const today = new Date().toISOString().split('T')[0];
  const bookingDateStr = String(booking.booking_date || '').slice(0, 10);
  const isUpcoming = bookingDateStr >= today && !['cancelled', 'completed'].includes(booking.status);
  const canReschedule = isUpcoming && (booking.status === 'pending' || booking.status === 'confirmed');
  const canCancel = isUpcoming;

  const handleDone = (action) => {
    setPanel(null);
    if (action === 'cancel') {
      setBooking(b => ({ ...b, status: 'cancelled' }));
    } else {
      // After reschedule request, just show success state
    }
  };

  return (
    <div className="app-page pb-consumer-nav">
      {/* Header */}
      <nav className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <h1 className="font-bold text-gray-900 dark:text-white">Manage Booking</h1>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Booking summary */}
        <div className="app-panel p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              {booking.logo_url ? (
                <img src={booking.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-7 h-7 text-primary-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <h2 className="font-bold text-gray-900 dark:text-white">{booking.business_name}</h2>
                <StatusBadge status={booking.status} />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{booking.service_name}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
              {fmtDate(booking.booking_date)}
            </div>
            <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
              {booking.start_time?.slice(0, 5)} – {booking.end_time?.slice(0, 5)}
              {booking.duration_minutes && ` (${booking.duration_minutes} min)`}
            </div>
            {booking.location && (
              <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {booking.location}
              </div>
            )}
            {booking.price > 0 && (
              <div className="flex items-center gap-2.5 text-gray-600 dark:text-gray-400">
                <PoundSterling className="w-4 h-4 flex-shrink-0 text-gray-400" />
                £{parseFloat(booking.price).toFixed(2)}
                {booking.payment_status === 'paid' && (
                  <span className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Paid</span>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex items-center gap-1.5">
            Ref: <span className="font-mono">{booking.reference_id}</span>
          </div>
        </div>

        {/* Inline panel (reschedule or cancel) */}
        {panel === 'reschedule' && (
          <div className="app-panel p-5">
            <ReschedulePanel booking={booking} onClose={() => setPanel(null)} onDone={() => handleDone('reschedule')} />
          </div>
        )}

        {panel === 'cancel' && (
          <div className="app-panel p-5">
            <CancelPanel booking={booking} onClose={() => setPanel(null)} onDone={() => handleDone('cancel')} />
          </div>
        )}

        {/* Action buttons */}
        {!panel && (
          <div className="space-y-3">
            {canReschedule && (
              <button
                onClick={() => setPanel('reschedule')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              >
                <CalendarClock className="w-5 h-5" />
                Reschedule appointment
              </button>
            )}

            {canCancel && (
              <button
                onClick={() => setPanel('cancel')}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              >
                <X className="w-5 h-5" />
                Cancel booking
              </button>
            )}

            {!isUpcoming && booking.slug && (
              <Link
                to={`/book/${booking.slug}`}
                state={{ prefill_service_id: booking.service_id }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all"
              >
                <RotateCcw className="w-5 h-5" />
                Book again
              </Link>
            )}

            {booking.slug && (
              <Link
                to={`/profile/${booking.slug}`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all"
              >
                <Building2 className="w-5 h-5" />
                View business
              </Link>
            )}
          </div>
        )}

        {booking.status === 'cancelled' && (
          <div className="app-panel p-4 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">This booking has been cancelled.</p>
            {booking.slug && (
              <Link to={`/book/${booking.slug}`} state={{ prefill_service_id: booking.service_id }}
                className="btn-primary mt-3 inline-flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Book again
              </Link>
            )}
          </div>
        )}
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
