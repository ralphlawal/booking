import React, { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { consumerAPI, reviewsAPI } from '../../services/api';

const DISMISSED_KEY = 'bam_review_dismissed';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}'); } catch { return {}; }
}
function setDismissed(id) {
  try {
    const d = getDismissed();
    d[id] = Date.now();
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(d));
  } catch {}
}

export default function ReviewPromptModal({ consumer }) {
  const [booking, setBooking] = useState(null);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!consumer) return;
    const run = async () => {
      try {
        const items = await consumerAPI.myBookings();
        const all = Array.isArray(items) ? items : (items?.bookings ?? []);
        const dismissed = getDismissed();
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days
        const completed = all.filter(b => {
          if (b.status !== 'completed') return false;
          if (dismissed[b.id]) return false;
          if (!b.booking_date) return false;
          const bDate = new Date(b.booking_date).getTime();
          return bDate >= cutoff && bDate <= Date.now();
        });
        for (const b of completed) {
          const { can_review } = await reviewsAPI.checkReviewable(b.id).catch(() => ({ can_review: false }));
          if (can_review) { setBooking(b); break; }
        }
      } catch {}
    };
    // Delay 5s so it doesn't pop up instantly on load
    const t = setTimeout(run, 5000);
    return () => clearTimeout(t);
  }, [consumer]);

  const dismiss = () => {
    if (booking) setDismissed(booking.id);
    setBooking(null);
  };

  const submit = async () => {
    if (!rating || !booking) return;
    setSubmitting(true);
    try {
      await reviewsAPI.create({ booking_id: booking.id, rating, comment: comment.trim() || undefined });
      setDismissed(booking.id);
      setDone(true);
      setTimeout(() => { setBooking(null); }, 2000);
    } catch {
      setDismissed(booking.id);
      setBooking(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {booking && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={dismiss}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[91] rounded-t-3xl p-6 pb-safe"
            style={{ background: 'var(--bam-surface)', boxShadow: '0 -8px 40px rgba(91,63,234,0.14)' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-base font-bold" style={{ color: 'var(--bam-text)' }}>Thanks for your review!</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--bam-primary)' }}>
                      How was your visit?
                    </p>
                    <p className="text-base font-bold" style={{ color: 'var(--bam-text)' }}>
                      {booking.business_name}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                      {booking.service_name}
                    </p>
                  </div>
                  <button onClick={dismiss} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Stars */}
                <div className="flex gap-2 justify-center mb-5">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(n)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className="w-9 h-9 transition-colors"
                        fill={(hovered || rating) >= n ? '#F59E0B' : 'none'}
                        stroke={(hovered || rating) >= n ? '#F59E0B' : '#CBD5E1'}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>

                {/* Optional comment */}
                {rating > 0 && (
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Anything to add? (optional)"
                    rows={2}
                    maxLength={400}
                    className="w-full rounded-xl p-3 text-sm resize-none mb-4"
                    style={{
                      background: 'var(--bam-surface-soft)',
                      border: '1px solid var(--bam-border)',
                      color: 'var(--bam-text)',
                      outline: 'none',
                    }}
                  />
                )}

                <button
                  type="button"
                  onClick={submit}
                  disabled={!rating || submitting}
                  className="w-full btn-primary py-3 text-sm font-bold disabled:opacity-40"
                >
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full mt-2 py-2 text-sm font-medium"
                  style={{ color: 'var(--bam-text-muted)' }}
                >
                  Maybe later
                </button>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
