import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isValid } from 'date-fns';
import { customersAPI, aiAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import NewBookingSheet from '../../components/admin/NewBookingSheet';
import { businessCurrencySymbol } from '../../utils/currency';

/* ── constants ───────────────────────────────────────────────────────────── */

const SEGMENTS = {
  all:        { label: 'All',        color: 'var(--bam-text-muted)',  bg: 'var(--bam-surface-soft)' },
  new:        { label: 'New',        color: '#3b82f6', bg: '#eff6ff', dark: '#1d4ed820' },
  returning:  { label: 'Returning',  color: '#10b981', bg: '#ecfdf5', dark: '#065f4620' },
  vip:        { label: 'VIP',        color: '#8b5cf6', bg: '#f5f3ff', dark: '#5b3eea20' },
  high_value: { label: 'High Value', color: '#f59e0b', bg: '#fffbeb', dark: '#92400e20' },
  at_risk:    { label: 'At Risk',    color: '#f97316', bg: '#fff7ed', dark: '#9a340820' },
  inactive:   { label: 'Inactive',   color: '#94a3b8', bg: '#f8fafc', dark: '#1e293b40' },
};

const SYM = businessCurrencySymbol();

/* ── helpers ─────────────────────────────────────────────────────────────── */

const daysSince = (dateStr) => {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr + 'T00:00:00');
  if (!isValid(d)) return Infinity;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};

const fmtDate = (s) => {
  if (!s) return '—';
  try { return format(parseISO(s.slice(0, 10)), 'MMM d, yyyy'); } catch { return s.slice(0, 10); }
};

const AVATAR_COLORS = ['#5b3eea','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];
function avatarColor(name = '') {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + p[p.length-1][0] : p[0].slice(0,2)).toUpperCase();
}

/* Compute percentile thresholds and per-customer segments from actual data */
function buildStats(customers) {
  const spends = customers.map(c => parseFloat(c.lifetime_spend || 0)).sort((a, b) => a - b);
  const n = spends.length;
  if (!n) return { p75: 0, p90: 0 };
  const p75 = spends[Math.floor(n * 0.75)] || 0;
  const p90 = spends[Math.floor(n * 0.90)] || 0;
  return { p75, p90 };
}

function computeSegment(customer, { p75, p90 }) {
  const ds         = daysSince(customer.last_booking_date);
  const bookings   = parseInt(customer.total_bookings || 0);
  const spend      = parseFloat(customer.lifetime_spend || 0);
  const joinedDays = daysSince(customer.created_at);

  if (ds > 90 && bookings >= 2) return 'inactive';
  if (bookings === 0 && joinedDays > 45) return 'inactive';
  if (spend >= p90 && p90 > 0 && bookings >= 5) return 'vip';
  if (spend >= p75 && p75 > 0 && bookings >= 3) return 'high_value';
  if (ds > 30 && ds <= 90 && bookings >= 2) return 'at_risk';
  if (bookings <= 1 || joinedDays <= 45) return 'new';
  return 'returning';
}

function computeInsights(customer, bookings) {
  const insights = [];
  const ds = daysSince(customer.last_booking_date);

  if (ds !== Infinity && ds > 0) {
    const tone = ds > 60 ? 'danger' : ds > 30 ? 'warning' : 'good';
    insights.push({ text: `Last visited ${ds} day${ds !== 1 ? 's' : ''} ago`, tone });
  }

  const done = bookings.filter(b => ['completed','confirmed'].includes(b.status));
  if (done.length >= 2) {
    const dates = done
      .map(b => new Date(b.booking_date + 'T00:00:00'))
      .sort((a, b) => a - b);
    const gaps = [];
    for (let i = 1; i < dates.length; i++) gaps.push((dates[i] - dates[i-1]) / 86400000);
    const avgGap = Math.round(gaps.reduce((a,b)=>a+b,0) / gaps.length);
    if (avgGap >= 3) {
      const weeks = Math.round(avgGap / 7);
      const freq = weeks <= 1 ? 'every week' : `every ${weeks} weeks`;
      insights.push({ text: `Usually books ${freq}`, tone: 'muted' });
      if (ds > avgGap * 1.5 && ds !== Infinity) {
        insights.push({ text: `Overdue — normally visits ${freq}`, tone: 'warning' });
      }
    }
  }

  const spend = parseFloat(customer.lifetime_spend || 0);
  if (spend > 0) insights.push({ text: `Spent ${SYM}${spend.toFixed(0)} in total`, tone: 'good' });

  const ns = parseInt(customer.no_shows || 0);
  if (ns >= 2) insights.push({ text: `${ns} no-shows on record`, tone: 'danger' });

  const canc = parseInt(customer.cancellations || 0);
  if (canc >= 3) insights.push({ text: `${canc} cancellations`, tone: 'warning' });

  if (customer.next_booking_date) {
    insights.push({ text: `Next: ${fmtDate(customer.next_booking_date)}`, tone: 'good' });
  }

  return insights;
}

const INSIGHT_TONE = {
  good:    { dot: '#10b981', text: 'var(--bam-text)' },
  muted:   { dot: 'var(--bam-text-faint)', text: 'var(--bam-text-muted)' },
  warning: { dot: '#f59e0b', text: 'var(--bam-text)' },
  danger:  { dot: '#ef4444', text: 'var(--bam-text)' },
};

/* ── SegmentBadge ─────────────────────────────────────────────────────────── */

function SegmentBadge({ segment, isDark, size = 'sm' }) {
  const meta = SEGMENTS[segment] || SEGMENTS.returning;
  const bg   = isDark ? meta.dark || meta.bg : meta.bg;
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}
      style={{ background: bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

/* ── CustomerAvatar ──────────────────────────────────────────────────────── */

function CustomerAvatar({ name = '', size = 10 }) {
  const bg = avatarColor(name);
  const sizeClass = { 8: 'w-8 h-8 text-xs', 10: 'w-10 h-10 text-sm', 14: 'w-14 h-14 text-lg' }[size] || 'w-10 h-10 text-sm';
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`} style={{ background: bg }}>
      {initials(name)}
    </div>
  );
}

/* ── Add Customer Sheet ──────────────────────────────────────────────────── */

function AddCustomerSheet({ open, onClose, onCreated }) {
  const [form, setForm]     = useState({ full_name: '', phone: '', email: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const customer = await customersAPI.create(form);
      toast.success(`${customer.full_name} added ✓`);
      onCreated(customer);
      onClose();
      setForm({ full_name: '', phone: '', email: '', notes: '' });
    } catch (err) { toast.error(err.message || 'Failed to add customer'); }
    finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="add-backdrop"
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="add-sheet"
            className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl flex flex-col overflow-hidden sm:inset-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-[400px] sm:rounded-2xl"
            style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)', maxHeight: '90dvh' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
          >
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bam-border-medium)' }} />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--bam-border)' }}>
              <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>Add Customer</h2>
              <button onClick={onClose} className="p-1.5 rounded-xl" style={{ color: 'var(--bam-text-muted)' }}>
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-4" style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom,0px))' }}>
              <div>
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Jane Smith" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+353…" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="jane@…" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={3} placeholder="Any notes…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <SmallSpinner /> : 'Add Customer'}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── CustomerProfile ─────────────────────────────────────────────────────── */

function CustomerProfile({ customer, segment, onClose, onUpdated, isDark, onBook }) {
  const [bookings, setBookings]   = useState([]);
  const [loadingB, setLoadingB]   = useState(true);
  const [notes, setNotes]         = useState(customer.notes || '');
  const [savingN, setSavingN]     = useState(false);
  const [tab, setTab]             = useState('overview');
  const [aiMsg, setAiMsg]         = useState(null);
  const [genAi, setGenAi]         = useState(false);
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  useEffect(() => {
    setNotes(customer.notes || '');
    setTab('overview');
    setAiMsg(null);
    setLoadingB(true);
    customersAPI.getBookings(customer.id)
      .then(setBookings)
      .catch(() => toast.error('Could not load history'))
      .finally(() => setLoadingB(false));
  }, [customer.id]);

  const insights = useMemo(() => computeInsights(customer, bookings), [customer, bookings]);

  const spend     = parseFloat(customer.lifetime_spend || 0);
  const bookCount = parseInt(customer.total_bookings || 0);
  const avgSpend  = bookCount > 0 ? spend / bookCount : 0;

  const saveNotes = async () => {
    setSavingN(true);
    try {
      await customersAPI.updateNotes(customer.id, notes);
      onUpdated(customer.id, notes);
      toast.success('Notes saved');
    } catch { toast.error('Failed to save notes'); }
    finally { setSavingN(false); }
  };

  const generateMessage = async () => {
    setGenAi(true);
    try {
      const msg = await aiAPI.personaliseMessage({
        customer_name: customer.full_name,
        last_service_name: customer.last_service_name,
        days_since: daysSince(customer.last_booking_date),
      });
      setAiMsg(msg);
    } catch { toast.error('Could not generate message'); }
    finally { setGenAi(false); }
  };

  /* Group bookings by month for timeline */
  const timeline = useMemo(() => {
    const groups = {};
    for (const b of bookings) {
      const key = b.booking_date?.slice(0, 7) || 'unknown';
      (groups[key] = groups[key] || []).push(b);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [bookings]);

  const STATUS_STYLE = {
    completed: { color: '#10b981', label: 'Done' },
    confirmed: { color: '#5b3eea', label: 'Confirmed' },
    pending:   { color: '#f59e0b', label: 'Pending' },
    cancelled: { color: '#94a3b8', label: 'Cancelled' },
    no_show:   { color: '#ef4444', label: 'No-show' },
  };

  return (
    <AnimatePresence>
      <motion.div
        key="profile-backdrop"
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="profile-panel"
        className="fixed inset-y-0 right-0 z-[91] flex flex-col overflow-hidden w-full sm:max-w-[440px]"
        style={{ background: isDark ? '#0c1528' : '#fff', borderLeft: `1px solid ${border}`, boxShadow: '-8px 0 60px rgba(0,0,0,0.3)' }}
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.9 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b p-5" style={{ borderColor: border }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <CustomerAvatar name={customer.full_name} size={14} />
              <div>
                <h2 className="font-bold text-xl leading-tight" style={{ color: 'var(--bam-text)' }}>{customer.full_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <SegmentBadge segment={segment} isDark={isDark} size="base" />
                  <span className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                    Since {fmtDate(customer.created_at)}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl flex-shrink-0 mt-1" style={{ color: 'var(--bam-text-muted)' }}>
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Contact row */}
          <div className="flex flex-wrap gap-2">
            {customer.phone && (
              <a href={`tel:${customer.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}`, color: 'var(--bam-text-muted)' }}
              >
                <PhoneIcon className="w-3.5 h-3.5" /> {customer.phone}
              </a>
            )}
            {customer.email && (
              <a href={`mailto:${customer.email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}`, color: 'var(--bam-text-muted)' }}
              >
                <MailIcon className="w-3.5 h-3.5" /> {customer.email}
              </a>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex-shrink-0 flex gap-2 px-5 py-3 border-b" style={{ borderColor: border }}>
          <button onClick={() => onBook(customer)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <CalIcon className="w-3.5 h-3.5" /> Book
          </button>
          {customer.email && (
            <a
              href={`mailto:${customer.email}?subject=From ${encodeURIComponent('BookAm')}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}`, color: 'var(--bam-text-muted)' }}
            >
              <MailIcon className="w-3.5 h-3.5" /> Email
            </a>
          )}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}`, color: 'var(--bam-text-muted)' }}
            >
              <PhoneIcon className="w-3.5 h-3.5" /> Call
            </a>
          )}
          <button onClick={() => setTab('notes')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}`, color: 'var(--bam-text-muted)' }}
          >
            <NoteIcon className="w-3.5 h-3.5" /> Note
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 flex border-b px-5" style={{ borderColor: border }}>
          {[['overview', 'Overview'], ['history', 'History'], ['notes', 'Notes']].map(([t, l]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === t ? 'border-primary-600 text-primary-600 dark:text-primary-400' : 'border-transparent'}`}
              style={{ color: tab === t ? undefined : 'var(--bam-text-muted)' }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="p-5 space-y-5">
              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Bookings', value: customer.total_bookings || 0, color: 'var(--bam-text)' },
                  { label: 'Spent', value: `${SYM}${spend.toFixed(0)}`, color: '#10b981' },
                  { label: 'Avg / visit', value: `${SYM}${avgSpend.toFixed(0)}`, color: '#5b3eea' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] font-semibold mt-0.5 uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'No-shows', value: customer.no_shows || 0, color: parseInt(customer.no_shows) >= 2 ? '#ef4444' : 'var(--bam-text)' },
                  { label: 'Cancellations', value: customer.cancellations || 0, color: parseInt(customer.cancellations) >= 3 ? '#f97316' : 'var(--bam-text)' },
                ].map(s => (
                  <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
                    <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] font-semibold mt-0.5 uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--bam-text-faint)' }}>Customer Insights</p>
                  <div className="space-y-2.5">
                    {insights.map((ins, i) => {
                      const t = INSIGHT_TONE[ins.tone] || INSIGHT_TONE.muted;
                      return (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: t.dot }} />
                          <p className="text-sm leading-relaxed" style={{ color: t.text }}>{ins.text}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Preferences */}
              {(customer.preferred_service || customer.preferred_staff || customer.last_service_name) && (
                <div className="rounded-2xl p-4" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--bam-text-faint)' }}>Preferences</p>
                  <div className="space-y-2">
                    {customer.preferred_service && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>Favourite service</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>{customer.preferred_service}</span>
                      </div>
                    )}
                    {customer.preferred_staff && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>Favourite staff</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>{customer.preferred_staff}</span>
                      </div>
                    )}
                    {customer.last_service_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>Last service</span>
                        <span className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>{customer.last_service_name}</span>
                      </div>
                    )}
                    {customer.next_booking_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>Next appointment</span>
                        <span className="text-sm font-semibold text-emerald-600">{fmtDate(customer.next_booking_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI message */}
              <div className="rounded-2xl p-4" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>Re-engagement Message</p>
                  <button
                    onClick={generateMessage}
                    disabled={genAi}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 disabled:opacity-50"
                  >
                    {genAi ? <SmallSpinner dark /> : <SparkleIcon className="w-3.5 h-3.5" />}
                    {genAi ? 'Generating…' : 'Generate'}
                  </button>
                </div>
                {aiMsg ? (
                  <div className="mt-2">
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--bam-text-muted)' }}>{aiMsg}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(aiMsg); toast.success('Copied!'); }}
                      className="mt-2 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      Copy message
                    </button>
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                    Generate a personalised re-engagement message for this customer.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── HISTORY ── */}
          {tab === 'history' && (
            <div className="p-5">
              {loadingB ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-3xl mb-2">📋</p>
                  <p className="font-semibold" style={{ color: 'var(--bam-text-muted)' }}>No bookings yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {timeline.map(([monthKey, monthBookings]) => {
                    const label = (() => {
                      try { return format(parseISO(monthKey + '-01'), 'MMMM yyyy'); } catch { return monthKey; }
                    })();
                    return (
                      <div key={monthKey}>
                        <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--bam-text-faint)' }}>{label}</p>
                        <div className="space-y-2 relative">
                          {/* Timeline line */}
                          <div className="absolute left-3 top-3 bottom-3 w-px" style={{ background: 'var(--bam-border)' }} />
                          {monthBookings.map(b => {
                            const st = STATUS_STYLE[b.status] || STATUS_STYLE.confirmed;
                            return (
                              <div
                                key={b.id}
                                className="relative flex gap-4 pl-8"
                              >
                                {/* Dot */}
                                <div
                                  className="absolute left-2.5 top-3 w-2 h-2 rounded-full -translate-x-0.5 flex-shrink-0"
                                  style={{ background: st.color }}
                                />
                                {/* Card */}
                                <div
                                  className="flex-1 rounded-xl p-3.5"
                                  style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--bam-text)' }}>{b.service_name}</p>
                                      <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
                                        {fmtDate(b.booking_date)} · {b.start_time?.slice(0, 5)}
                                        {b.staff_name && ` · ${b.staff_name}`}
                                      </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: st.color + '20', color: st.color }}>
                                        {st.label}
                                      </span>
                                      <p className="text-sm font-bold mt-1" style={{ color: 'var(--bam-text)' }}>
                                        {SYM}{parseFloat(b.service_price || 0).toFixed(0)}
                                      </p>
                                    </div>
                                  </div>
                                  {b.notes && (
                                    <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--bam-text-faint)' }}>{b.notes}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {tab === 'notes' && (
            <div className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--bam-text-faint)' }}>Private Notes</p>
              <textarea
                className="input resize-none w-full text-sm leading-relaxed"
                rows={8}
                placeholder="Add notes about this customer — allergies, preferences, VIP status, anything relevant…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
              <button
                onClick={saveNotes}
                disabled={savingN}
                className="btn-primary text-sm mt-3 w-full"
              >
                {savingN ? <SmallSpinner /> : 'Save Notes'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main Customers Page ─────────────────────────────────────────────────── */

const ALL_FILTERS = ['all', 'new', 'returning', 'vip', 'high_value', 'at_risk', 'inactive'];

export default function Customers() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [segFilter, setSegFilter]   = useState('all');
  const [selected, setSelected]     = useState(null);
  const [addOpen, setAddOpen]       = useState(false);
  const [bookingFor, setBookingFor] = useState(null); // customer to pre-fill in NewBookingSheet
  const searchRef = useRef(null);

  const load = useCallback(() => {
    customersAPI.list()
      .then(setCustomers)
      .catch(() => toast.error('Failed to load customers'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Compute segment stats once for whole list */
  const segStats = useMemo(() => buildStats(customers), [customers]);

  /* Enrich each customer with segment */
  const enriched = useMemo(() =>
    customers.map(c => ({ ...c, _segment: computeSegment(c, segStats) })),
    [customers, segStats]
  );

  /* Segment counts for filter chips */
  const segCounts = useMemo(() => {
    const counts = { all: enriched.length };
    for (const c of enriched) counts[c._segment] = (counts[c._segment] || 0) + 1;
    return counts;
  }, [enriched]);

  /* Summary stats for header strip */
  const summaryStats = useMemo(() => ({
    total:     enriched.length,
    newCount:  enriched.filter(c => c._segment === 'new').length,
    vip:       enriched.filter(c => c._segment === 'vip').length,
    atRisk:    enriched.filter(c => c._segment === 'at_risk').length,
    inactive:  enriched.filter(c => c._segment === 'inactive').length,
    totalRevenue: enriched.reduce((s, c) => s + parseFloat(c.lifetime_spend || 0), 0),
  }), [enriched]);

  /* Filtered list */
  const filtered = useMemo(() => {
    let list = enriched;
    if (segFilter !== 'all') list = list.filter(c => c._segment === segFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.full_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enriched, segFilter, search]);

  const handleNotesUpdated = (id, notes) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, notes } : c));
    setSelected(prev => prev?.id === id ? { ...prev, notes } : prev);
  };

  const handleCreated = (newCustomer) => {
    setCustomers(prev => [{ ...newCustomer, total_bookings: 0, no_shows: 0, lifetime_spend: 0, cancellations: 0, _segment: 'new' }, ...prev]);
  };

  const openBook = (customer) => {
    setSelected(null);
    setBookingFor(customer);
  };

  const selectedEnriched = selected
    ? enriched.find(c => c.id === selected.id) || selected
    : null;

  return (
    <div className="space-y-5 animate-fade-in" style={{ paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>Customers</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
            {summaryStats.total} customers · {SYM}{summaryStats.totalRevenue.toFixed(0)} total revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--bam-text-faint)' }} />
            <input
              ref={searchRef}
              className="input pl-9 sm:w-60 text-sm"
              placeholder="Search name, phone, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="btn-primary flex items-center gap-1.5 text-sm px-3 py-2 whitespace-nowrap"
          >
            <PlusIcon className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* ── Summary stats strip ─────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',     value: summaryStats.total,    color: 'var(--bam-text)' },
            { label: 'New',       value: summaryStats.newCount,  color: '#3b82f6' },
            { label: 'VIP',       value: summaryStats.vip,       color: '#8b5cf6' },
            { label: 'At Risk',   value: summaryStats.atRisk,   color: '#f97316' },
          ].map(s => (
            <div key={s.label} className="card px-4 py-3 text-center">
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-faint)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Segment filter chips ─────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
        {ALL_FILTERS.map(seg => {
          const meta  = SEGMENTS[seg];
          const count = segCounts[seg] || 0;
          const active = segFilter === seg;
          return (
            <button
              key={seg}
              onClick={() => setSegFilter(seg)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={active
                ? { background: meta.color, color: '#fff' }
                : { background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)', border: `1px solid ${border}` }
              }
            >
              {meta.label}
              {count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? 'bg-white/20' : ''}`}
                style={active ? {} : { background: 'var(--bam-border)', color: 'var(--bam-text-muted)' }}>{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Customer list ────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-3">👤</p>
            <p className="font-semibold" style={{ color: 'var(--bam-text-muted)' }}>{search ? 'No matching customers' : 'No customers yet'}</p>
            {!search && <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>Your customers will appear here after your first booking.</p>}
            {search && <button onClick={() => setSearch('')} className="text-sm text-primary-600 mt-1 hover:underline">Clear search</button>}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b" style={{ borderColor: border }}>
                  <tr>
                    {['Customer', 'Contact', 'Segment', 'Bookings', 'Spent', 'Last Visit', 'Next'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="border-b cursor-pointer transition-colors hover:bg-[--bam-surface-hover]"
                      style={{ borderColor: border }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CustomerAvatar name={c.full_name} size={8} />
                          <span className="font-semibold truncate max-w-[140px]" style={{ color: 'var(--bam-text)' }}>{c.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{c.phone || '—'}</p>
                        <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>{c.email || ''}</p>
                      </td>
                      <td className="px-4 py-3"><SegmentBadge segment={c._segment} isDark={isDark} /></td>
                      <td className="px-4 py-3 font-bold" style={{ color: 'var(--bam-text)' }}>{c.total_bookings || 0}</td>
                      <td className="px-4 py-3 font-bold text-emerald-600">{SYM}{parseFloat(c.lifetime_spend || 0).toFixed(0)}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--bam-text-muted)' }}>
                        {c.last_booking_date ? fmtDate(c.last_booking_date) : '—'}
                        {c.last_booking_date && (
                          <span className="block" style={{ color: 'var(--bam-text-faint)' }}>{daysSince(c.last_booking_date)}d ago</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-emerald-600">
                        {c.next_booking_date ? fmtDate(c.next_booking_date) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: border }}>
              {filtered.map(c => {
                const ds = daysSince(c.last_booking_date);
                return (
                  <div key={c.id} onClick={() => setSelected(c)} className="p-4 cursor-pointer" style={{ borderColor: border }}>
                    <div className="flex items-center gap-3">
                      <CustomerAvatar name={c.full_name} size={10} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm truncate" style={{ color: 'var(--bam-text)' }}>{c.full_name}</p>
                          <SegmentBadge segment={c._segment} isDark={isDark} />
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
                          {c.phone || c.email || 'No contact'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-emerald-600">{SYM}{parseFloat(c.lifetime_spend || 0).toFixed(0)}</p>
                        <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                          {ds !== Infinity ? `${ds}d ago` : 'New'}
                        </p>
                      </div>
                      <ChevRIcon className="w-4 h-4 ml-1" style={{ color: 'var(--bam-text-faint)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Customer profile panel ───────────────────────────────────── */}
      {selectedEnriched && (
        <CustomerProfile
          key={selectedEnriched.id}
          customer={selectedEnriched}
          segment={selectedEnriched._segment}
          onClose={() => setSelected(null)}
          onUpdated={handleNotesUpdated}
          isDark={isDark}
          onBook={openBook}
        />
      )}

      {/* ── Add customer sheet ───────────────────────────────────────── */}
      <AddCustomerSheet open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleCreated} />

      {/* ── Book for customer ────────────────────────────────────────── */}
      {bookingFor && (
        <NewBookingSheet
          open={true}
          onClose={() => setBookingFor(null)}
          onCreated={() => { setBookingFor(null); load(); }}
          prefillCustomer={bookingFor}
        />
      )}
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function XIcon({ className })       { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function PlusIcon({ className })    { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function SearchIcon({ className, style }) { return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function PhoneIcon({ className })   { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z"/></svg>; }
function MailIcon({ className })    { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>; }
function CalIcon({ className })     { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function NoteIcon({ className })    { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>; }
function SparkleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>; }
function ChevRIcon({ className, style }) { return <svg className={className} style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>; }
function SmallSpinner({ dark }) { return <div className={`w-4 h-4 border-2 ${dark ? 'border-violet-400 border-t-transparent' : 'border-white border-t-transparent'} rounded-full animate-spin mx-auto`} />; }
