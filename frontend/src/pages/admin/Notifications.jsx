import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { businessAPI } from '../../services/api';
import toast from 'react-hot-toast';

const SEGMENTS = [
  { id: 'all',       label: 'All customers',    desc: 'Everyone who has booked with you',          color: '#5b3eea' },
  { id: 'returning', label: 'Returning',         desc: 'Customers with more than one booking',      color: '#10b981' },
  { id: 'vip',       label: 'VIP',               desc: 'Customers with 5+ bookings',                color: '#f59e0b' },
  { id: 'new',       label: 'New',               desc: 'First-time customers',                      color: '#3b82f6' },
  { id: 'at_risk',   label: 'At risk',           desc: 'No visit in the last 60 days',              color: '#ef4444' },
];

const MAX_TITLE   = 60;
const MAX_MESSAGE = 200;

export default function Notifications() {
  const [segment,  setSegment]  = useState('all');
  const [title,    setTitle]    = useState('');
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [result,   setResult]   = useState(null); // { sent, total }

  const canSend = title.trim().length > 0 && message.trim().length > 0 && !sending;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    try {
      const data = await businessAPI.notifyCustomers({ title: title.trim(), message: message.trim(), segment });
      setResult(data);
      toast.success(`Sent to ${data.sent} customer${data.sent !== 1 ? 's' : ''}`);
      setTitle('');
      setMessage('');
    } catch {
      toast.error('Failed to send — please try again');
    } finally {
      setSending(false);
    }
  }

  const seg = SEGMENTS.find(s => s.id === segment);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-10">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>Push Notifications</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>
          Send a message directly to your customers' phones
        </p>
      </div>

      {/* Compose card */}
      <div className="rounded-2xl p-5 space-y-5" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}>

        {/* Audience */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--bam-text-faint)' }}>
            Audience
          </label>
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map(s => (
              <button
                key={s.id}
                onClick={() => setSegment(s.id)}
                className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
                style={segment === s.id
                  ? { background: s.color, color: '#fff', boxShadow: `0 2px 10px ${s.color}40` }
                  : { background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)' }
                }
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--bam-text-faint)' }}>{seg.desc}</p>
        </div>

        {/* Title */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--bam-text-faint)' }}>Title</label>
            <span className="text-xs" style={{ color: title.length > MAX_TITLE * 0.85 ? '#ef4444' : 'var(--bam-text-faint)' }}>
              {title.length}/{MAX_TITLE}
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, MAX_TITLE))}
            placeholder="e.g. Special offer just for you"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-shadow"
            style={{
              background: 'var(--bam-surface-soft)',
              color: 'var(--bam-text)',
              border: '1px solid var(--bam-border)',
            }}
          />
        </div>

        {/* Message */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--bam-text-faint)' }}>Message</label>
            <span className="text-xs" style={{ color: message.length > MAX_MESSAGE * 0.85 ? '#ef4444' : 'var(--bam-text-faint)' }}>
              {message.length}/{MAX_MESSAGE}
            </span>
          </div>
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            placeholder="e.g. 20% off your next appointment this week only. Book now →"
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition-shadow"
            style={{
              background: 'var(--bam-surface-soft)',
              color: 'var(--bam-text)',
              border: '1px solid var(--bam-border)',
            }}
          />
        </div>

        {/* Preview */}
        <AnimatePresence>
          {(title || message) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="rounded-2xl p-4"
              style={{ background: 'var(--bam-surface-soft)', border: '1px solid var(--bam-border-soft)' }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--bam-text-faint)' }}>Preview</p>
              <div className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-lg font-bold"
                  style={{ background: 'linear-gradient(135deg,#5b3eea,#7878f0)' }}>
                  B
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--bam-text)' }}>
                    {title || 'Notification title'}
                  </p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: 'var(--bam-text-muted)' }}>
                    {message || 'Your message will appear here.'}
                  </p>
                </div>
                <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--bam-text-faint)' }}>now</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className="w-full py-3.5 rounded-xl text-sm font-bold transition-all"
          style={canSend
            ? { background: '#5b3eea', color: '#fff', boxShadow: '0 4px 16px rgba(91,62,234,.35)' }
            : { background: 'var(--bam-surface-soft)', color: 'var(--bam-text-faint)', cursor: 'not-allowed' }
          }
        >
          {sending ? 'Sending…' : `Send to ${seg.label.toLowerCase()}`}
        </button>
      </div>

      {/* Result banner */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: '#ecfdf5', border: '1px solid #bbf7d0' }}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#10b981' }}>
              <CheckIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-green-800">Notification sent</p>
              <p className="text-sm text-green-700 mt-0.5">
                Delivered to <strong>{result.sent}</strong> of <strong>{result.total}</strong> customers
                {result.total > result.sent && ' — some may not have push enabled'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--bam-text-faint)' }}>Tips</p>
        {[
          'Keep titles under 40 characters — they get cut off on lock screens',
          'Mention the benefit immediately — "20% off" beats "Special announcement"',
          'Send at the right time — 10am–12pm and 6pm–8pm get the most taps',
          'Customers must have installed the BookAm app and allowed notifications',
        ].map((tip, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#5b3eea' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--bam-text-muted)' }}>{tip}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
