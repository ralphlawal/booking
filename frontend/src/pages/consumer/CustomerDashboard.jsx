import React, { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Zap, Search, LogOut, X, Bell, Copy, Check, Building2, Calendar, Clock, MapPin, Phone, Heart, Sparkles, PoundSterling, RotateCcw, Star, Mail, MessageSquare, ShieldCheck, AlertTriangle, CalendarClock } from 'lucide-react';
import { consumerAPI, reviewsAPI } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
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

function CopyRefButton({ refId }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(refId); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { toast.error('Could not copy'); }
  };
  return (
    <button onClick={copy} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors" title="Copy reference">
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {refId}
    </button>
  );
}

function BookingCard({ booking, onRebook, onCancel, onReview, onConfirmService, onDispute, onReschedule, past, from }) {
  const today = new Date().toISOString().split('T')[0];
  const isPastDate = booking.booking_date < today;
  const isPaid = booking.payment_status === 'paid';
  const serviceDate = new Date(booking.booking_date + 'T12:00:00Z');
  const daysSinceService = (Date.now() - serviceDate.getTime()) / (1000 * 60 * 60 * 24);
  const canDispute = isPaid && isPastDate && !booking.has_dispute && !booking.service_confirmed && daysSinceService <= 14;
  const canConfirm = isPaid && isPastDate && !booking.service_confirmed && !booking.has_dispute;

  return (
    <div className="card p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
          {booking.logo_url ? (
            <img src={booking.logo_url} alt={booking.business_name} className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-5 h-5 text-primary-400" />
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
            <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 flex-shrink-0" />{fmtDate(booking.booking_date)}</p>
            <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 flex-shrink-0" />{booking.start_time?.slice(0, 5)} – {booking.end_time?.slice(0, 5)}</p>
            {booking.price > 0 && (
              <p className="flex items-center gap-1.5">
                <PoundSterling className="w-3.5 h-3.5 flex-shrink-0" />
                £{parseFloat(booking.price).toFixed(2)}
                {isPaid && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Paid</span>}
                {booking.payment_status === 'refunded' && <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Refunded</span>}
              </p>
            )}
            {booking.location && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{booking.location}</p>}
            {!past && booking.business_phone && (
              <a href={`tel:${booking.business_phone}`} className="flex items-center gap-1.5 text-primary-600 dark:text-primary-400 hover:underline">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />{booking.business_phone}
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1"><CopyRefButton refId={booking.reference_id} /></p>

          {/* Trust status indicators */}
          {booking.service_confirmed && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Service confirmed
            </div>
          )}
          {booking.has_dispute && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Dispute {booking.dispute_status === 'open' ? 'under review' : booking.dispute_status === 'resolved_refunded' ? '— refund issued' : '— resolved'}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4 flex-wrap">
        {past ? (
          <>
            <button onClick={() => onRebook(booking)} className="btn-secondary text-sm py-2 flex items-center justify-center gap-1.5 px-3">
              <RotateCcw className="w-3.5 h-3.5" /> Rebook
            </button>
            {booking.status === 'completed' && !booking.reviewed && (
              <button onClick={() => onReview(booking)} className="btn-primary text-sm py-2 flex items-center justify-center gap-1.5 px-3">
                <Star className="w-3.5 h-3.5" /> Review
              </button>
            )}
            {canConfirm && (
              <button
                onClick={() => onConfirmService(booking)}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 font-semibold hover:bg-green-100 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Confirm received
              </button>
            )}
            {canDispute && (
              <button
                onClick={() => onDispute(booking)}
                className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-semibold hover:bg-red-100 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Dispute
              </button>
            )}
          </>
        ) : (
          <>
            <Link to={`/profile/${booking.slug}`} state={{ from }} className="btn-secondary flex-1 text-sm py-2 text-center">
              View business
            </Link>
            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <>
                <button
                  onClick={() => onReschedule(booking)}
                  className="text-sm px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-1"
                >
                  <CalendarClock className="w-3.5 h-3.5" /> Reschedule
                </button>
                <button
                  onClick={() => onCancel(booking)}
                  className="text-sm px-3 py-2 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={`w-7 h-7 transition-colors ${(hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!rating) { toast.error('Please select a rating'); return; }
    setSubmitting(true);
    try {
      await reviewsAPI.create({ booking_id: booking.id, rating, comment });
      toast.success('Review submitted — thank you!');
      onSubmitted(booking.id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Leave a review</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <strong className="text-gray-700 dark:text-gray-300">{booking.service_name}</strong> at {booking.business_name}
        </p>
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Your rating</p>
          <StarPicker value={rating} onChange={setRating} />
        </div>
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Comment (optional)</p>
          <textarea
            className="input resize-none text-sm"
            rows={3}
            placeholder="How was your experience?"
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={500}
          />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={submit} disabled={submitting || !rating} className="btn-primary flex-1 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ booking, onConfirm, onClose, cancelling }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Cancel booking?</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          <strong className="text-gray-700 dark:text-gray-300">{booking.service_name}</strong> at {booking.business_name}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {fmtDate(booking.booking_date)} · {booking.start_time?.slice(0, 5)}
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-5">
          Cancellations must be made at least 2 hours before the appointment.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Keep it</button>
          <button
            onClick={onConfirm}
            disabled={cancelling}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {cancelling ? 'Cancelling…' : 'Yes, cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmServiceModal({ booking, onConfirm, onClose, confirming }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Confirm service received?</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
          <strong className="text-gray-700 dark:text-gray-300">{booking.service_name}</strong> at {booking.business_name}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {fmtDate(booking.booking_date)} · {booking.start_time?.slice(0, 5)}
        </p>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 mb-5 text-xs text-green-700 dark:text-green-400">
          By confirming, you let us know the service was completed as expected. This helps us release payment to the business and keeps your booking history accurate.
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Not yet</button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {confirming ? 'Confirming…' : 'Yes, confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DisputeModal({ booking, consumer, onClose, onSubmitted }) {
  const REASONS = [
    'Service was not rendered',
    'Service quality was unacceptable',
    'Business was unresponsive / no-show',
    'Wrong service provided',
    'Other',
  ];
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) { toast.error('Please select a reason'); return; }
    setSubmitting(true);
    try {
      await consumerAPI.raiseDispute(booking.reference_id, { reason, description, consumer_id: consumer?.id });
      toast.success('Dispute raised — we\'ll review within 48 hours');
      onSubmitted(booking.id);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to raise dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Raise a dispute</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <strong className="text-gray-700 dark:text-gray-300">{booking.service_name}</strong> at {booking.business_name} · {fmtDate(booking.booking_date)}
        </p>
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1 block">Reason</label>
            <select
              className="input text-sm"
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              <option value="">Select a reason…</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1 block">Additional details (optional)</label>
            <textarea
              className="input resize-none text-sm"
              rows={3}
              placeholder="Please describe what happened…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-5 text-xs text-amber-700 dark:text-amber-400">
          Our team will review your dispute within 48 hours. If valid, a full refund will be issued to your original payment method.
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={submit}
            disabled={submitting || !reason}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit dispute'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RescheduleModal({ booking, onClose }) {
  const [form, setForm] = useState({ preferred_date: '', preferred_time: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.preferred_date) { toast.error('Please select a preferred date'); return; }
    setSubmitting(true);
    try {
      await consumerAPI.rescheduleRequest(booking.reference_id, form);
      toast.success('Reschedule request sent to the business');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Could not send reschedule request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Request Reschedule</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <strong className="text-gray-700 dark:text-gray-300">{booking.service_name}</strong> at {booking.business_name}
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1 block">Preferred date *</label>
            <input type="date" className="input text-sm" required value={form.preferred_date} onChange={set('preferred_date')} min={new Date().toISOString().split('T')[0]} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1 block">Preferred time (optional)</label>
            <input type="time" className="input text-sm" value={form.preferred_time} onChange={set('preferred_time')} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1 block">Message (optional)</label>
            <textarea className="input resize-none text-sm" rows={2} placeholder="Any specific preferences or notes…" value={form.message} onChange={set('message')} maxLength={300} />
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-400">
            This sends a request to the business — they'll confirm the new time directly with you.
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CalendarClock className="w-4 h-4" />}
              {submitting ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>
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
            <Heart className="w-5 h-5 text-rose-400" />
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
          {pref.location && <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{pref.location}</p>}
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
          className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  const { consumer, loading: authLoading, logout } = useCustomerAuth();
  const { notifications, unreadCount, markAllRead, setNotifications } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [disputeTarget, setDisputeTarget] = useState(null);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [resending, setResending] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [bookingsError, setBookingsError] = useState(false);
  const notifRef = useRef(null);

  const loadData = () => {
    setLoading(true);
    setBookingsError(false);
    Promise.allSettled([
      consumerAPI.myBookings(),
      consumerAPI.getPreferences(),
    ])
      .then(([bResult, pResult]) => {
        if (bResult.status === 'fulfilled') {
          setBookings(bResult.value);
        } else {
          setBookingsError(true);
        }
        if (pResult.status === 'fulfilled') setPrefs(pResult.value);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (authLoading) return;
    if (!consumer) { navigate('/customer/login'); return; }
    loadData();
  }, [consumer, authLoading]);

  useEffect(() => {
    if (!notifOpen) return;
    const close = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [notifOpen]);

  const openNotifications = () => {
    setNotifOpen(v => !v);
    if (unreadCount > 0) markAllRead();
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter((b) => b.booking_date >= today && !['cancelled', 'completed'].includes(b.status));
  const past = bookings.filter((b) => b.booking_date < today || ['completed', 'cancelled'].includes(b.status));

  const handleRebook = (booking) => {
    navigate(`/book/${booking.slug}`, { state: { prefill_service_id: booking.service_id } });
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await consumerAPI.cancelBooking(cancelTarget.reference_id);
      setBookings((prev) => prev.map((b) => b.id === cancelTarget.id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled');
      setCancelTarget(null);
    } catch (err) {
      toast.error(err.message || 'Could not cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleConfirmService = async () => {
    if (!confirmTarget) return;
    setConfirming(true);
    try {
      await consumerAPI.confirmService(confirmTarget.reference_id, consumer?.id);
      setBookings(prev => prev.map(b => b.id === confirmTarget.id ? { ...b, service_confirmed: true, status: 'completed' } : b));
      toast.success('Service confirmed — thank you!');
      setConfirmTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to confirm service');
    } finally {
      setConfirming(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await consumerAPI.resendVerification();
      toast.success('Verification email sent — check your inbox');
    } catch {
      toast.error('Failed to send — try again later');
    } finally {
      setResending(false);
    }
  };

  const handleReviewSubmitted = (bookingId) => {
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, reviewed: true } : b));
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
    { id: 'upcoming',   label: 'Upcoming',   count: upcoming.length },
    { id: 'past',       label: 'Past',        count: past.length },
    { id: 'favourites', label: 'Favourites',  count: prefs.length },
  ];

  if (authLoading || !consumer) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-fade-in">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-7 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          <div className="flex items-center gap-1">

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotifications}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                title="Notifications"
              >
                <Bell className="w-4 h-4 text-gray-500" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">Notifications</p>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">No notifications yet</div>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-80 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 ${!n.is_read ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>
                          {n.body && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>}
                          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                            {new Date(n.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Link to="/customer/profile" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Profile settings">
              <Settings className="w-4 h-4 text-gray-500" />
            </Link>
            <button
              onClick={() => { logout(); navigate('/'); }}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 hover:text-red-500 dark:hover:text-red-400"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {/* Welcome header */}
        <div className="mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-2xl font-bold shadow-primary">
            {consumer.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Hi, {consumer.full_name?.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{consumer.email}</p>
            {bookings.length > 0 && (
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium mt-0.5">
                {bookings.length} booking{bookings.length !== 1 ? 's' : ''} total
              </p>
            )}
          </div>
        </div>

        {/* Email verification banner */}
        {consumer.email_verified === false && (
          <div className="mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium truncate">
                Please verify your email address — check your inbox.
              </p>
            </div>
            <button
              onClick={handleResendVerification}
              disabled={resending}
              className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline whitespace-nowrap disabled:opacity-50"
            >
              {resending ? 'Sending…' : 'Resend →'}
            </button>
          </div>
        )}

        {/* First-time welcome guidance — shown only when user has no bookings yet */}
        {!loading && bookings.length === 0 && (
          <div className="mb-5 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 p-5 text-white shadow-primary">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-base">Welcome to BookAm!</p>
                <p className="text-sm text-primary-100 mt-0.5">Find and book services near you in seconds.</p>
                <div className="mt-3 flex flex-col gap-2 text-sm text-primary-100">
                  <span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">1</span> Browse services below or use Smart Match</span>
                  <span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">2</span> Pick a date &amp; time that works for you</span>
                  <span className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">3</span> Confirm — we'll send you a reminder</span>
                </div>
                <Link to="/explore" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-white underline underline-offset-2">
                  Explore services now →
                </Link>
              </div>
            </div>
          </div>
        )}

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
          <Link to="/customer/messages" className="card p-4 flex items-center gap-3 hover:shadow-md transition-shadow col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white">Messages</p>
              <p className="text-xs text-gray-400">Chat &amp; support</p>
            </div>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                tab === t.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${tab === t.id ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
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
        ) : bookingsError ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Could not load your bookings</h3>
            <p className="text-sm text-gray-500 mb-4">The server may be starting up — please try again in a moment.</p>
            <button onClick={loadData} className="btn-primary text-sm">Try again</button>
          </div>
        ) : tab === 'upcoming' ? (
          upcoming.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-7 h-7 text-primary-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-1">No upcoming bookings</h3>
              <p className="text-sm text-gray-500 mb-4">Book a service to get started</p>
              <Link to="/explore" className="btn-primary text-sm">Explore services</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <BookingCard key={b.id} booking={b} onRebook={handleRebook} onCancel={setCancelTarget} onConfirmService={setConfirmTarget} onDispute={setDisputeTarget} onReschedule={setRescheduleTarget} past={false} from={location} />
              ))}
            </div>
          )
        ) : tab === 'past' ? (
          past.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-7 h-7 text-indigo-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">No past bookings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {past.map((b) => (
                <BookingCard key={b.id} booking={b} onRebook={handleRebook} onCancel={setCancelTarget} onReview={setReviewTarget} onConfirmService={setConfirmTarget} onDispute={setDisputeTarget} past from={location} />
              ))}
            </div>
          )
        ) : (
          prefs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-3">
                <Heart className="w-7 h-7 text-rose-400" />
              </div>
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

      {cancelTarget && (
        <CancelModal
          booking={cancelTarget}
          onConfirm={handleCancel}
          onClose={() => setCancelTarget(null)}
          cancelling={cancelling}
        />
      )}

      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      {confirmTarget && (
        <ConfirmServiceModal
          booking={confirmTarget}
          onConfirm={handleConfirmService}
          onClose={() => setConfirmTarget(null)}
          confirming={confirming}
        />
      )}

      {disputeTarget && (
        <DisputeModal
          booking={disputeTarget}
          consumer={consumer}
          onClose={() => setDisputeTarget(null)}
          onSubmitted={(bookingId) => {
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, has_dispute: true, dispute_status: 'open' } : b));
          }}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          booking={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
        />
      )}

      <ConsumerBottomNav />
    </div>
  );
}
