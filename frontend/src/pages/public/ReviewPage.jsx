import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { reviewTokenAPI } from '../../services/api';

function Star({ filled, half, onClick, size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" onClick={onClick}
      className="cursor-pointer transition-transform active:scale-90"
      style={{ filter: filled || half ? 'drop-shadow(0 2px 6px rgba(251,191,36,.4))' : 'none' }}>
      <defs>
        <linearGradient id={`half-${size}`}>
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#e5e7eb" />
        </linearGradient>
      </defs>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={filled ? '#fbbf24' : half ? `url(#half-${size})` : '#e5e7eb'}
        stroke={filled || half ? '#f59e0b' : '#d1d5db'} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LABELS = { 1: 'Poor', 2: 'Below average', 3: 'Okay', 4: 'Good', 5: 'Excellent!' };

export default function ReviewPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [state, setState] = useState('loading'); // loading | form | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    reviewTokenAPI.get(token)
      .then(data => { setInfo(data); setName(data.reviewer_name || ''); setState('form'); })
      .catch(err => {
        const msg = err.response?.data?.error || 'Invalid or expired review link';
        const already = err.response?.data?.already_reviewed;
        setErrorMsg(msg);
        setState(already ? 'already' : 'error');
      });
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (rating === 0) return;
    setState('submitting');
    try {
      await reviewTokenAPI.submit(token, { rating, comment: comment.trim() || undefined, reviewer_name: name.trim() || undefined });
      setState('done');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit review. Please try again.');
      setState('form');
    }
  };

  const displayRating = hover || rating;

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f8fafc' }}>
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thanks for your review!</h1>
          <p className="text-gray-500 mb-8">
            Your feedback helps {info?.business_name || 'this business'} improve and helps others discover great local services.
          </p>
          <div className="flex justify-center gap-1 mb-8">
            {[1,2,3,4,5].map(i => <Star key={i} filled={i <= rating} size={32} />)}
          </div>
          {info?.slug && (
            <Link to={`/book/${info.slug}`}
              className="inline-block px-6 py-3 rounded-2xl font-semibold text-white text-sm"
              style={{ background: '#6366f1' }}>
              Book again at {info.business_name}
            </Link>
          )}
        </motion.div>
      </div>
    );
  }

  if (state === 'already') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f8fafc' }}>
        <div className="text-center max-w-sm mx-auto">
          <div className="text-5xl mb-4">⭐</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Already reviewed</h1>
          <p className="text-gray-500">A review has already been submitted for this appointment. Thank you!</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f8fafc' }}>
        <div className="text-center max-w-sm mx-auto">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link unavailable</h1>
          <p className="text-gray-500">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#f0f4ff' }}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="p-8 text-center" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
          <p className="text-indigo-200 text-sm font-medium mb-1">{info?.business_name}</p>
          <h1 className="text-2xl font-extrabold text-white">How was your visit?</h1>
          <div className="mt-3 inline-block px-4 py-1.5 rounded-full text-xs font-semibold" style={{ background: 'rgba(255,255,255,.15)', color: '#e0e7ff' }}>
            {info?.service_name && <>{info.service_name} · </>}{info?.booking_date}
          </div>
        </div>

        <form onSubmit={submit} className="p-8 space-y-6">
          {/* Star picker */}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">Your rating</p>
            <div className="flex justify-center gap-1"
              onMouseLeave={() => setHover(0)}>
              {[1,2,3,4,5].map(i => (
                <Star key={i} filled={i <= displayRating} size={44}
                  onClick={() => setRating(i)}
                  onMouseOver={() => setHover(i)} />
              ))}
            </div>
            {displayRating > 0 && (
              <motion.p key={displayRating} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                className="text-lg font-bold mt-3" style={{ color: '#6366f1' }}>
                {LABELS[displayRating]}
              </motion.p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your name</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              placeholder="e.g. Sarah M."
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tell them how it went <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              rows={4}
              placeholder="What did you love? What could be improved?"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          {errorMsg && state === 'form' && (
            <p className="text-red-500 text-sm text-center">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={rating === 0 || state === 'submitting'}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: rating > 0 ? '#6366f1' : '#a5b4fc' }}>
            {state === 'submitting' ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting…
              </span>
            ) : 'Submit review'}
          </button>

          <p className="text-center text-xs text-gray-400">
            Your review will be visible on {info?.business_name}'s public booking page.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
