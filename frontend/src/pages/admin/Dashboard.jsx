import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { bookingsAPI, servicesAPI, availabilityAPI, staffAPI, aiAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { openExternalLink, publicWebUrl } from '../../services/nativeBridge';
import { currencySymbol } from '../../utils/currency';
import toast from 'react-hot-toast';
import { Ban, CalendarClock, CalendarDays, CalendarPlus, ChartColumn, CircleDollarSign, ClipboardList, Lightbulb, Megaphone, Scissors, Star, UserPlus, Users } from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function greetingWord() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtTime(t) {
  if (!t) return '';
  const [hh, mm] = t.slice(0, 5).split(':').map(Number);
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
}

function fmtDuration(mins) {
  if (!mins) return '';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function plainRecommendation(value) {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_`#]/g, '')
    .replace(/^\s*(?:[-•]|\d+[.)])\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPast(dateStr, timeStr) {
  if (!dateStr || !timeStr) return false;
  return new Date(`${dateStr}T${timeStr}`) < new Date();
}

const AVATAR_PALETTE = [
  '#5b3eea','#10b981','#f59e0b','#ef4444','#3b82f6',
  '#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316',
];

function avatarColor(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[h];
}

function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
}

const STATUS_META = {
  pending:   { label: 'Pending',   cls: 'badge-pending' },
  confirmed: { label: 'Confirmed', cls: 'badge-confirmed' },
  cancelled: { label: 'Cancelled', cls: 'badge-cancelled' },
  completed: { label: 'Done',      cls: 'badge-completed' },
};

function statsFromDaily(daily = [], days) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  return daily
    .filter(d => new Date(d.date) >= cutoff)
    .reduce((s, d) => ({
      appointments: s.appointments + (parseInt(d.bookings) || 0),
      revenue:      s.revenue      + (parseFloat(d.revenue) || 0),
    }), { appointments: 0, revenue: 0 });
}

/* ── micro components ────────────────────────────────────────────────────── */

function Skeleton({ className = '' }) {
  return <div className={`skeleton animate-pulse ${className}`} />;
}

function PeriodToggle({ value, onChange }) {
  const opts = ['Today', 'Week', 'Month'];
  return (
    <div
      className="inline-flex rounded-xl p-1 gap-0.5"
      style={{ background: 'var(--bam-surface-soft)', border: '1px solid var(--bam-border)' }}
    >
      {opts.map(o => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
            value === o
              ? 'bg-primary-600 text-white shadow-primary-sm'
              : 'text-[--bam-text-muted] hover:text-[--bam-text]'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function SnapshotCard({ label, value, sub, icon, accent, loading, trend }) {
  const Icon = icon;
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col gap-3"
      style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}
    >
      <div className="flex items-center justify-between">
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0"
          style={{ background: accent }}
        >
          <Icon className="w-5 h-5" strokeWidth={1.9} aria-hidden="true" />
        </span>
        {trend != null && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            trend >= 0
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-3 w-28 rounded-full" />
        </>
      ) : (
        <>
          <p className="text-2xl font-black tab-nums" style={{ color: 'var(--bam-text)' }}>{value ?? '—'}</p>
          <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{sub || label}</p>
        </>
      )}
    </div>
  );
}

function QuickActionBtn({ icon, label, to, onClick, accent = '#5b3eea' }) {
  const Icon = icon;
  const cls = 'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border text-xs font-semibold transition-all tap-highlight-none active:scale-[0.97]';
  const style = { background: 'var(--bam-surface-soft)', borderColor: 'var(--bam-border)', color: 'var(--bam-text-muted)' };
  const inner = (
    <>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background: accent }}><Icon className="w-5 h-5" strokeWidth={1.9} aria-hidden="true" /></span>
      {label}
    </>
  );
  if (onClick) return <button onClick={onClick} className={cls} style={style}>{inner}</button>;
  return <Link to={to} className={cls} style={style}>{inner}</Link>;
}

function BookingCard({ booking, staffMap, onAction, loadingAction }) {
  const [expanded, setExpanded] = useState(false);
  const sym   = currencySymbol(booking.currency);
  const staff = staffMap?.[booking.staff_member_id];
  const past  = isPast(booking.booking_date, booking.end_time || booking.start_time);
  const meta  = STATUS_META[booking.status] || STATUS_META.pending;
  const accentColor = avatarColor(booking.customer_name);

  const actions = [];
  if (booking.status === 'pending') {
    actions.push({ key: 'confirm',   label: 'Confirm',     icon: '✓', tone: 'emerald', status: 'confirmed' });
    actions.push({ key: 'cancel',    label: 'Cancel',      icon: '✕', tone: 'red',     status: 'cancelled' });
  }
  if (booking.status === 'confirmed') {
    actions.push({ key: 'complete',  label: past ? 'Mark Done' : 'Check In', icon: '✓', tone: 'primary', status: 'completed' });
    actions.push({ key: 'cancel',    label: 'Cancel',      icon: '✕', tone: 'red',     status: 'cancelled' });
  }

  const TONE = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-700/50',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700/50',
    red:     'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-400    border-red-200    dark:border-red-700/50',
  };

  return (
    <motion.div
      layout
      className="rounded-2xl border overflow-hidden transition-shadow"
      style={{ background: 'var(--bam-surface)', borderColor: 'var(--bam-border)' }}
    >
      <button
        className="w-full text-left p-4 tap-highlight-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
            style={{ background: accentColor }}
          >
            {initials(booking.customer_name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>
                {booking.customer_name}
              </span>
              <span className={meta.cls}>{meta.label}</span>
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--bam-text-muted)' }}>
              {booking.service_name}
              {booking.duration_minutes ? ` · ${fmtDuration(booking.duration_minutes)}` : ''}
              {booking.service_price ? ` · ${sym}${Number(booking.service_price).toFixed(0)}` : ''}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-faint)' }}>
              {fmtTime(booking.start_time)}{booking.end_time ? ` – ${fmtTime(booking.end_time)}` : ''}
              {staff ? ` · ${staff.name}` : ''}
            </p>
          </div>

          {/* Chevron */}
          <svg
            className={`w-4 h-4 flex-shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--bam-text-faint)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="actions"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1 flex flex-wrap gap-2 border-t"
              style={{ borderColor: 'var(--bam-border)' }}
            >
              {/* Reschedule link */}
              {['pending','confirmed'].includes(booking.status) && (
                <Link
                  to="/admin/bookings"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                    bg-[--bam-surface-soft] border-[--bam-border] text-[--bam-text-muted]`}
                >
                  <RescheduleIcon className="w-3.5 h-3.5" /> Reschedule
                </Link>
              )}

              {/* Message link */}
              {booking.status !== 'cancelled' && (
                <Link
                  to="/admin/messages"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all
                    bg-[--bam-surface-soft] border-[--bam-border] text-[--bam-text-muted]`}
                >
                  <MessageIcon className="w-3.5 h-3.5" /> Message
                </Link>
              )}

              {/* Status actions */}
              {actions.map(a => (
                <button
                  key={a.key}
                  disabled={!!loadingAction}
                  onClick={() => onAction(booking.id, a.status)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all disabled:opacity-50 ${TONE[a.tone]}`}
                >
                  {loadingAction === a.status ? (
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{a.icon}</span>
                  )}
                  {a.label}
                </button>
              ))}

              {/* View full booking */}
              <Link
                to="/admin/bookings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all bg-[--bam-surface-soft] border-[--bam-border] text-[--bam-text-muted]"
              >
                <ExternalIcon className="w-3.5 h-3.5" /> View
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InsightRow({ icon, text, tone = 'default' }) {
  const Icon = icon;
  const TONES = {
    default: 'bg-[--bam-surface-soft] text-[--bam-text-muted]',
    green:   'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
    amber:   'bg-amber-50   dark:bg-amber-900/20   text-amber-700   dark:text-amber-400',
    blue:    'bg-blue-50    dark:bg-blue-900/20    text-blue-700    dark:text-blue-400',
    violet:  'bg-violet-50  dark:bg-violet-900/20  text-violet-700  dark:text-violet-400',
    red:     'bg-red-50     dark:bg-red-900/20     text-red-700     dark:text-red-400',
  };
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium ${TONES[tone]}`}>
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.9} aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function TrendChart({ data, period, isDark }) {
  if (!data?.length) return (
    <div className="h-40 flex items-center justify-center text-xs" style={{ color: 'var(--bam-text-faint)' }}>
      No data yet
    </div>
  );
  const stroke = '#5b3eea';
  const fill   = isDark ? 'rgba(91,62,234,0.12)' : 'rgba(91,62,234,0.10)';
  const revenueColor = '#10b981';

  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
        <defs>
          <linearGradient id="bkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={stroke} stopOpacity={0.15} />
            <stop offset="95%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: isDark ? '#3d5070' : '#94a3b8' }}
          tickLine={false} axisLine={false}
          interval={period === 'Month' ? 6 : 1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: isDark ? '#3d5070' : '#94a3b8' }}
          tickLine={false} axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background:   isDark ? '#0f1c32' : '#fff',
            border:       `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
            borderRadius: 10,
            fontSize:     12,
            color:        isDark ? '#e4eaf8' : '#111827',
          }}
          cursor={{ stroke: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', strokeWidth: 1 }}
        />
        <Area
          type="monotone" dataKey="Bookings" stroke={stroke} strokeWidth={2}
          fill="url(#bkGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: stroke }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── main component ─────────────────────────────────────────────────────── */

export default function Dashboard() {
  const { user, business } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  /* state */
  const [period, setPeriod]           = useState('Today');
  const [todayData, setTodayData]     = useState(null);
  const [analytics, setAnalytics]     = useState(null);
  const [staff, setStaff]             = useState([]);
  const [gapSuggestion, setGap]       = useState(null);
  const [gapDismissed, setGapDismiss] = useState(false);
  const [checklist, setChecklist]     = useState(null);

  const [loadingToday, setLoadingToday]       = useState(true);
  const [loadingAnalytics, setLoadingAnalytic] = useState(true);
  const [actionLoading, setActionLoading]      = useState({}); // { [bookingId]: statusBeingSet }

  /* data fetching */
  const loadToday = useCallback(() => {
    setLoadingToday(true);
    bookingsAPI.list({ date: todayISO(), limit: 200 })
      .then(setTodayData)
      .catch(() => {})
      .finally(() => setLoadingToday(false));
  }, []);

  useEffect(() => {
    loadToday();
    bookingsAPI.getAnalytics()
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setLoadingAnalytic(false));
    staffAPI.list()
      .then(setStaff)
      .catch(() => {});
    aiAPI.gapSuggestions()
      .then(r => { if (r?.suggestion) setGap(r); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!business) return;
    Promise.all([servicesAPI.list(), availabilityAPI.get()]).then(([svcs, avail]) => {
      const hasServices     = (svcs?.length || 0) > 0;
      const hasAvailability = !!(avail?.working_days?.length);
      if (!hasServices || !hasAvailability) setChecklist({ hasServices, hasAvailability });
    }).catch(() => {});
  }, [business]);

  /* booking actions */
  const handleAction = async (bookingId, newStatus) => {
    setActionLoading(prev => ({ ...prev, [bookingId]: newStatus }));
    try {
      await bookingsAPI.updateStatus(bookingId, newStatus);
      toast.success(
        newStatus === 'confirmed' ? 'Booking confirmed ✓'
        : newStatus === 'completed' ? 'Marked as done ✓'
        : 'Booking cancelled'
      );
      loadToday();
    } catch {
      toast.error('Action failed — please try again');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[bookingId]; return n; });
    }
  };

  /* derived data */
  const staffMap = useMemo(() =>
    Object.fromEntries(staff.map(s => [s.id, s])), [staff]
  );

  const todayBookings = useMemo(() => {
    const list = todayData?.bookings || [];
    return [...list].sort((a, b) => (a.start_time || '') < (b.start_time || '') ? -1 : 1);
  }, [todayData]);

  const todayStats = useMemo(() => {
    const list = todayBookings;
    const sym  = currencySymbol(list[0]?.currency || business?.bank_currency);
    const appointments  = list.filter(b => b.status !== 'cancelled').length;
    const revenue       = list.filter(b => ['completed','confirmed'].includes(b.status))
                              .reduce((s, b) => s + (parseFloat(b.service_price) || 0), 0);
    const pending       = list.filter(b => b.status === 'pending').length;
    const cancellations = list.filter(b => b.status === 'cancelled').length;
    return { appointments, revenue, pending, cancellations, sym };
  }, [todayBookings, business?.bank_currency]);

  const periodStats = useMemo(() => {
    if (period === 'Today') return null;
    const daily  = analytics?.daily || [];
    const days   = period === 'Week' ? 7 : 30;
    const curr   = statsFromDaily(daily, days);
    const prev   = statsFromDaily(daily, days * 2).appointments
                 - statsFromDaily(daily, days).appointments;
    const trend  = curr.appointments > 0 && prev > 0
      ? Math.round(((curr.appointments - prev) / prev) * 100)
      : null;
    return { ...curr, trend };
  }, [period, analytics]);

  const chartData = useMemo(() => {
    const daily = analytics?.daily || [];
    const days  = period === 'Month' ? 30 : 7;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return daily
      .filter(d => new Date(d.date) >= cutoff)
      .map(d => ({
        date:     d.date?.slice(5),
        Bookings: parseInt(d.bookings) || 0,
        Revenue:  parseFloat(d.revenue) || 0,
      }));
  }, [analytics, period]);

  const topService = analytics?.topServices?.[0]?.name;

  const insights = useMemo(() => {
    const list = [];
    const daily = analytics?.daily || [];
    const statusBreakdown = analytics?.statusBreakdown || [];

    if (todayStats.pending > 0) {
      list.push({ icon: CalendarClock, text: `${todayStats.pending} booking${todayStats.pending > 1 ? 's' : ''} waiting for confirmation`, tone: 'amber' });
    }
    if (topService) {
      list.push({ icon: Star, text: `Your most popular service is ${topService}`, tone: 'violet' });
    }

    /* Week-over-week booking trend */
    const last7  = statsFromDaily(daily, 7).appointments;
    const prev7  = statsFromDaily(daily, 14).appointments - last7;
    if (prev7 > 0 && last7 !== prev7) {
      const pct = Math.round(((last7 - prev7) / prev7) * 100);
      list.push({
        icon: ChartColumn,
        text: `Bookings are ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct)}% vs last week`,
        tone: pct >= 0 ? 'green' : 'red',
      });
    }

    /* Remaining appointments today */
    const remaining = todayBookings.filter(b =>
      !['cancelled','completed'].includes(b.status) &&
      !isPast(b.booking_date, b.start_time)
    ).length;
    if (remaining > 0) {
      list.push({ icon: CalendarDays, text: `${remaining} appointment${remaining > 1 ? 's' : ''} still ahead today`, tone: 'blue' });
    }

    /* Completion rate hint */
    const completed = parseInt(statusBreakdown.find(s => s.status === 'completed')?.count || 0);
    const total     = statusBreakdown.reduce((s, r) => s + parseInt(r.count || 0), 0);
    if (total >= 10) {
      const rate = Math.round((completed / total) * 100);
      if (rate < 60) {
        list.push({ icon: Lightbulb, text: `Completion rate is ${rate}% — try sending reminders`, tone: 'amber' });
      }
    }

    return list.slice(0, 5);
  }, [todayStats, todayBookings, analytics, topService]);

  const profileMissing = useMemo(() => {
    if (!business) return [];
    return [
      !business.description && 'Write a short description',
      !business.logo_url    && 'Upload a logo',
      !business.phone       && 'Add a contact number',
      !business.location    && 'Add your address',
      !business.category    && 'Choose a category',
    ].filter(Boolean);
  }, [business]);

  const profilePct = Math.round(((5 - profileMissing.length) / 5) * 100);

  /* ── render ─────────────────────────────────────────────────────────── */

  return (
    <div className="page-shell animate-fade-in">

      {/* ── GREETING ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--bam-text)' }}>
            {greetingWord()}, {business?.name || 'there'} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* ── SNAPSHOT ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--bam-text-faint)' }}>
            Snapshot
          </h2>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {period === 'Today' ? (
            <>
              <SnapshotCard
                label="Appointments"
                value={todayStats.appointments}
                sub="Today's appointments"
                icon={ClipboardList} accent="#5b3eea"
                loading={loadingToday}
              />
              <SnapshotCard
                label="Revenue"
                value={`${todayStats.sym}${todayStats.revenue.toFixed(0)}`}
                sub="Confirmed + completed"
                icon={CircleDollarSign} accent="#10b981"
                loading={loadingToday}
              />
              <SnapshotCard
                label="Pending"
                value={todayStats.pending}
                sub="Awaiting confirmation"
                icon={CalendarClock} accent="#f59e0b"
                loading={loadingToday}
              />
              <SnapshotCard
                label="Cancellations"
                value={todayStats.cancellations}
                sub="Cancelled today"
                icon={Ban} accent="#ef4444"
                loading={loadingToday}
              />
            </>
          ) : (
            <>
              <SnapshotCard
                label="Appointments"
                value={periodStats?.appointments ?? '—'}
                sub={`This ${period.toLowerCase()}`}
                trend={periodStats?.trend}
                icon={ClipboardList} accent="#5b3eea"
                loading={loadingAnalytics}
              />
              <SnapshotCard
                label="Revenue"
                value={periodStats ? `${currencySymbol(business?.bank_currency)}${periodStats.revenue.toFixed(0)}` : '—'}
                sub={`This ${period.toLowerCase()}`}
                icon={CircleDollarSign} accent="#10b981"
                loading={loadingAnalytics}
              />
              <SnapshotCard
                label="Top Service"
                value={topService || '—'}
                sub="Most booked service"
                icon={Star} accent="#8b5cf6"
                loading={loadingAnalytics}
              />
              <SnapshotCard
                label="Avg/Day"
                value={periodStats && (period === 'Week' ? 7 : 30) > 0
                  ? (periodStats.appointments / (period === 'Week' ? 7 : 30)).toFixed(1)
                  : '—'}
                sub="Bookings per day"
                icon={ChartColumn} accent="#3b82f6"
                loading={loadingAnalytics}
              />
            </>
          )}
        </div>
      </div>

      {/* ── MAIN GRID ────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-5">

        {/* ── LEFT: Today's Schedule ─────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>
              Today's Schedule
            </h2>
            <Link to="/admin/bookings" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline">
              View all →
            </Link>
          </div>

          {loadingToday ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : todayBookings.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center border"
              style={{ background: 'var(--bam-surface)', borderColor: 'var(--bam-border)' }}
            >
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>No appointments today</p>
              <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>
                Your schedule is clear — share your booking link to fill it.
              </p>
              {business && (
                <a
                  href={publicWebUrl(`/book/${business.slug}`)} target="_blank" rel="noopener noreferrer"
                  onClick={(event) => openExternalLink(event, publicWebUrl(`/book/${business.slug}`))}
                  className="btn-primary mt-4 inline-flex text-sm"
                >
                  Open booking page
                </a>
              )}
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div
                className="absolute left-[21px] top-6 bottom-6 w-px"
                style={{ background: 'var(--bam-border)' }}
              />

              <div className="space-y-3">
                {todayBookings.map((b, i) => (
                  <div key={b.id} className="flex gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center flex-shrink-0" style={{ width: 44 }}>
                      <div
                        className="w-2.5 h-2.5 rounded-full mt-4 flex-shrink-0 z-10"
                        style={{ background: b.status === 'completed' ? '#10b981' : b.status === 'cancelled' ? '#ef4444' : '#5b3eea' }}
                      />
                      <div className="text-[10px] font-bold mt-1 leading-none text-center tab-nums"
                        style={{ color: 'var(--bam-text-faint)' }}
                      >
                        {fmtTime(b.start_time).replace(' ', '\n')}
                      </div>
                    </div>

                    {/* Card */}
                    <div className="flex-1 min-w-0">
                      <BookingCard
                        booking={b}
                        staffMap={staffMap}
                        onAction={handleAction}
                        loadingAction={actionLoading[b.id]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── RIGHT: sidebar ─────────────────────────────────────── */}
        <aside className="space-y-5">

          {/* Quick Actions */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--bam-text-faint)' }}>
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickActionBtn to="/admin/bookings"  label="New Booking"  icon={CalendarPlus} accent="#5b3eea" />
              <QuickActionBtn to="/admin/customers" label="Add Customer" icon={UserPlus} accent="#10b981" />
              <QuickActionBtn to="/admin/services"  label="Add Service"  icon={Scissors} accent="#f59e0b" />
              <QuickActionBtn to="/admin/settings"  label="Block Time"   icon={Ban} accent="#ef4444" />
              <QuickActionBtn to="/admin/posts"     label="Promote"      icon={Megaphone} accent="#8b5cf6" />
              <QuickActionBtn to="/admin/customers" label="Customers"    icon={Users} accent="#3b82f6" />
            </div>
          </section>

          {/* Business Insights */}
          {insights.length > 0 && (
            <section>
              <h2 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--bam-text-faint)' }}>
                Business Insights
              </h2>
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <InsightRow key={i} {...ins} />
                ))}
              </div>
            </section>
          )}

          {/* BookAm Recommends */}
          {(!gapDismissed && gapSuggestion?.suggestion) && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--bam-text-faint)' }}>
                  BookAm Recommends
                </h2>
                <button onClick={() => setGapDismiss(true)} style={{ color: 'var(--bam-text-faint)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div
                className="rounded-2xl p-4 border"
                style={{
                  background: isDark ? 'rgba(91,62,234,0.08)' : '#f5f3ff',
                  borderColor: isDark ? 'rgba(91,62,234,0.2)' : '#ede9fe',
                }}
              >
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-violet-800 dark:text-violet-300">
                      {gapSuggestion.gaps?.length
                        ? `${gapSuggestion.gaps.length} open day${gapSuggestion.gaps.length > 1 ? 's' : ''} this week`
                        : 'Tip from BookAm Intelligence'}
                    </p>
                    <p className="text-xs leading-relaxed mt-1 text-violet-700 dark:text-violet-400">
                      {plainRecommendation(gapSuggestion.suggestion)}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Link to="/admin/posts"
                        className="text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-100/80 dark:bg-violet-900/30 px-3 py-1.5 rounded-lg hover:bg-violet-200/80 dark:hover:bg-violet-900/50 transition-colors">
                        Create promo →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Profile completeness */}
          {profileMissing.length > 0 && (
            <section>
              <div
                className="rounded-2xl p-4 border"
                style={{
                  background: isDark ? 'rgba(245,158,11,0.06)' : '#fffbeb',
                  borderColor: isDark ? 'rgba(245,158,11,0.2)' : '#fde68a',
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Profile {profilePct}% complete
                  </p>
                  <Link
                    to="/admin/settings"
                    className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline"
                  >
                    Finish →
                  </Link>
                </div>
                <div className="h-1.5 rounded-full bg-amber-200 dark:bg-amber-800 overflow-hidden mb-2">
                  <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${profilePct}%` }} />
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  Missing: {profileMissing.join(', ')}
                </p>
              </div>
            </section>
          )}

          {/* Go-live checklist */}
          {checklist && (
            <section>
              <div
                className="rounded-2xl p-4 border-l-4 border-l-primary-500"
                style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>Set up to go live</p>
                  <button onClick={() => setChecklist(null)} style={{ color: 'var(--bam-text-faint)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="space-y-2">
                  <ChecklistRow done label="Account created" />
                  <ChecklistRow done label="Business profile" />
                  <ChecklistRow done={checklist.hasServices} label="Add a service" linkTo="/admin/services" linkLabel="Add service" />
                  <ChecklistRow done={checklist.hasAvailability} label="Set working hours" linkTo="/admin/settings" linkLabel="Set hours" />
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* ── TREND CHART ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>
            Booking trend
          </h2>
          <PeriodToggle
            value={period === 'Today' ? 'Week' : period}
            onChange={p => { setPeriod(p); }}
          />
        </div>
        <div
          className="rounded-2xl p-4 sm:p-5 border"
          style={{ background: 'var(--bam-surface)', borderColor: 'var(--bam-border)' }}
        >
          {loadingAnalytics ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <TrendChart data={chartData} period={period} isDark={isDark} />
          )}
        </div>
      </section>

      {/* ── TOP SERVICES ─────────────────────────────────────────── */}
      {analytics?.topServices?.length > 0 && (
        <section>
          <h2 className="font-bold text-base mb-3" style={{ color: 'var(--bam-text)' }}>
            Top services
          </h2>
          <div
            className="rounded-2xl border divide-y"
            style={{
              background: 'var(--bam-surface)',
              borderColor: 'var(--bam-border)',
              '--tw-divide-opacity': 1,
            }}
          >
            {analytics.topServices.slice(0, 5).map((s, i) => {
              const max = parseInt(analytics.topServices[0]?.count) || 1;
              const pct = Math.round((parseInt(s.count) / max) * 100);
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5" style={{ borderColor: 'var(--bam-border)' }}>
                  <span className="text-xs font-bold w-4 text-right tab-nums" style={{ color: 'var(--bam-text-faint)' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate pr-3" style={{ color: 'var(--bam-text)' }}>{s.name}</span>
                      <span className="tab-nums flex-shrink-0" style={{ color: 'var(--bam-text-muted)' }}>{s.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bam-surface-soft)' }}>
                      <div
                        className="h-full rounded-full bg-primary-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

    </div>
  );
}

/* ── small shared components ─────────────────────────────────────────────── */

function ChecklistRow({ done, label, linkTo, linkLabel }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
        {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
      </div>
      <span className={`text-xs flex-1 ${done ? 'line-through' : ''}`} style={{ color: done ? 'var(--bam-text-faint)' : 'var(--bam-text-muted)' }}>
        {label}
      </span>
      {!done && linkTo && (
        <Link to={linkTo} className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex-shrink-0">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

/* ── inline icon components ──────────────────────────────────────────────── */
function ExternalIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
function MessageIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>; }
function RescheduleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>; }
