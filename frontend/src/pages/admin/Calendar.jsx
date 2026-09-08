import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameDay, isToday, startOfDay,
} from 'date-fns';
import { bookingsAPI, staffAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NewBookingSheet from '../../components/admin/NewBookingSheet';
import { currencySymbol } from '../../utils/currency';
import toast from 'react-hot-toast';

/* ── constants ───────────────────────────────────────────────────────────── */

const GRID_START = 7;   // 7 AM
const GRID_END   = 21;  // 9 PM
const HOUR_H     = 70;  // px per hour — generous for readability
const TOTAL_H    = (GRID_END - GRID_START) * HOUR_H;
const HOURS      = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);
const WEEKDAYS   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const STATUS_META = {
  pending:   { label: 'Pending',   bg: '#f59e0b20', border: '#f59e0b', text: '#92400e', bgDark: '#f59e0b18', borderDark: '#f59e0b80', textDark: '#fbbf24' },
  confirmed: { label: 'Confirmed', bg: '#5b3eea18', border: '#5b3eea', text: '#3730a3', bgDark: '#5b3eea20', borderDark: '#5b3eea80', textDark: '#a78bfa' },
  completed: { label: 'Done',      bg: '#10b98118', border: '#10b981', text: '#065f46', bgDark: '#10b98118', borderDark: '#10b98180', textDark: '#34d399' },
  cancelled: { label: 'Cancelled', bg: '#64748b12', border: '#94a3b8', text: '#475569', bgDark: '#64748b18', borderDark: '#64748b80', textDark: '#94a3b8' },
  no_show:   { label: 'No-show',   bg: '#ef444418', border: '#ef4444', text: '#991b1b', bgDark: '#ef444418', borderDark: '#ef444480', textDark: '#f87171' },
};

/* ── helpers ─────────────────────────────────────────────────────────────── */

function timeToMin(t = '') {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function timeToY(t) {
  if (!t) return 0;
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return ((h + m / 60) - GRID_START) * HOUR_H;
}
function durationToH(mins) {
  return Math.max(((mins || 30) / 60) * HOUR_H, 28);
}
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const AVATAR_COLORS = ['#5b3eea','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16'];
function avatarColor(name = '') {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase();
}

/* Greedy column layout for overlapping appointments */
function layoutBookings(list) {
  const sorted = [...list].sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time));
  const colEnds = []; // end-time in minutes for last booking in each column

  for (const b of sorted) {
    const start = timeToMin(b.start_time);
    const end   = start + (b.duration_minutes || 30);
    let col = colEnds.findIndex(e => e <= start);
    if (col === -1) col = colEnds.length;
    colEnds[col] = end;
    b._col = col;
  }

  const totalCols = colEnds.length || 1;
  for (const b of sorted) b._totalCols = totalCols;
  return sorted;
}

/* ── AppointmentBlock ────────────────────────────────────────────────────── */

function AppointmentBlock({ booking, onClick, isDark, containerWidth }) {
  const meta = STATUS_META[booking.status] || STATUS_META.confirmed;
  const top    = timeToY(booking.start_time);
  const height = durationToH(booking.duration_minutes);
  const cols   = booking._totalCols || 1;
  const col    = booking._col || 0;

  const pct = 1 / cols;
  const left = `${col * pct * 100}%`;
  const width = `calc(${pct * 100}% - ${cols > 1 ? 4 : 6}px)`;
  const marginLeft = col > 0 ? '4px' : '3px';

  const compact = height < 50;

  return (
    <button
      onClick={() => onClick(booking)}
      className="absolute text-left rounded-lg border overflow-hidden transition-all tap-highlight-none"
      style={{
        top:        `${top}px`,
        height:     `${height}px`,
        left,
        width,
        marginLeft,
        background: isDark ? meta.bgDark : meta.bg,
        borderColor: isDark ? meta.borderDark : meta.border,
        borderLeftWidth: 3,
      }}
    >
      <div className={`flex flex-col ${compact ? 'px-1.5 py-0.5' : 'px-2 py-1.5'}`}>
        <p
          className="font-bold leading-tight truncate"
          style={{
            color:    isDark ? meta.textDark : meta.text,
            fontSize: compact ? 9 : 11,
          }}
        >
          {booking.customer_name}
        </p>
        {!compact && (
          <p
            className="truncate leading-tight mt-0.5"
            style={{
              color:    isDark ? meta.textDark : meta.text,
              opacity:  0.8,
              fontSize: 10,
            }}
          >
            {booking.service_name}
          </p>
        )}
        {!compact && (
          <p
            className="truncate leading-tight"
            style={{
              color:    isDark ? meta.textDark : meta.text,
              opacity:  0.6,
              fontSize: 9,
            }}
          >
            {fmtTime(booking.start_time)}{booking.end_time ? ` – ${fmtTime(booking.end_time)}` : ''}
          </p>
        )}
      </div>
    </button>
  );
}

/* ── CurrentTimeIndicator ────────────────────────────────────────────────── */

function CurrentTimeLine() {
  const [nowY, setNowY] = useState(null);

  useEffect(() => {
    const calc = () => {
      const now  = new Date();
      const mins = now.getHours() + now.getMinutes() / 60;
      if (mins >= GRID_START && mins <= GRID_END) {
        setNowY((mins - GRID_START) * HOUR_H);
      }
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, []);

  if (nowY === null) return null;
  return (
    <div className="absolute left-0 right-0 z-20 flex items-center pointer-events-none" style={{ top: `${nowY}px` }}>
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 -ml-1.5" />
      <div className="flex-1 h-px bg-red-500" />
    </div>
  );
}

/* ── Hour grid lines ─────────────────────────────────────────────────────── */

function HourLines({ isDark }) {
  return (
    <>
      {HOURS.map(h => (
        <div
          key={h}
          className="absolute left-0 right-0 border-t"
          style={{
            top:         `${(h - GRID_START) * HOUR_H}px`,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          }}
        />
      ))}
    </>
  );
}

/* ── DAY VIEW ────────────────────────────────────────────────────────────── */

function DayView({ bookings, focusDate, onBookingClick, onSlotClick, isDark, borderColor }) {
  const scrollRef = useRef(null);
  const dayStr = format(focusDate, 'yyyy-MM-dd');
  const dayBookings = useMemo(() =>
    layoutBookings(bookings.filter(b => b.booking_date?.slice(0, 10) === dayStr)),
    [bookings, dayStr]
  );

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const scroll = Math.max(0, (now.getHours() - GRID_START - 1) * HOUR_H);
      scrollRef.current.scrollTop = scroll;
    }
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor }}>
        <div className={`text-center ${isToday(focusDate) ? 'text-primary-600' : ''}`}>
          <p className="text-xs font-bold uppercase">{format(focusDate, 'EEE')}</p>
          <p className={`text-2xl font-black ${isToday(focusDate) ? 'w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto' : ''}`}>
            {format(focusDate, 'd')}
          </p>
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>{format(focusDate, 'MMMM yyyy')}</p>
          <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>
            {dayBookings.length} appointment{dayBookings.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${TOTAL_H}px` }}>
          {/* Hour labels */}
          <div className="w-14 flex-shrink-0 relative">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-2 text-right text-[10px] font-medium"
                style={{
                  top:   `${(h - GRID_START) * HOUR_H - 8}px`,
                  color: 'var(--bam-text-faint)',
                }}
              >
                {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day column */}
          <div className="flex-1 relative border-l" style={{ borderColor }}>
            <HourLines isDark={isDark} />
            {isToday(focusDate) && <CurrentTimeLine />}

            {/* Click to create */}
            {HOURS.map(h => (
              <button
                key={h}
                className="absolute left-0 right-0 hover:bg-primary-500/5 transition-colors z-10 tap-highlight-none"
                style={{ top: `${(h - GRID_START) * HOUR_H}px`, height: `${HOUR_H}px` }}
                onClick={() => onSlotClick(dayStr, `${String(h).padStart(2, '0')}:00`)}
              />
            ))}

            {dayBookings.map(b => (
              <AppointmentBlock key={b.id} booking={b} onClick={onBookingClick} isDark={isDark} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── WEEK VIEW ───────────────────────────────────────────────────────────── */

function WeekView({ bookings, focusDate, onBookingClick, onSlotClick, isDark, borderColor }) {
  const scrollRef = useRef(null);
  const weekStart = startOfWeek(focusDate, { weekStartsOn: 1 });
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (scrollRef.current) {
      const now    = new Date();
      const scroll = Math.max(0, (now.getHours() - GRID_START - 1) * HOUR_H);
      scrollRef.current.scrollTop = scroll;
    }
  }, []);

  const bookingsByDay = useMemo(() => {
    const map = {};
    for (const d of weekDays) {
      const key = format(d, 'yyyy-MM-dd');
      map[key] = layoutBookings(bookings.filter(b => b.booking_date?.slice(0, 10) === key));
    }
    return map;
  }, [bookings, weekStart]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Day headers row */}
      <div className="flex-shrink-0 flex border-b" style={{ borderColor }}>
        <div className="w-14 flex-shrink-0" />
        {weekDays.map(day => {
          const todayFlag = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className="flex-1 min-w-0 text-center py-2 border-l"
              style={{ borderColor }}
            >
              <p className="text-[10px] font-bold uppercase" style={{ color: todayFlag ? '#5b3eea' : 'var(--bam-text-faint)' }}>
                {format(day, 'EEE')}
              </p>
              <div
                className={`text-sm font-black mx-auto mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${todayFlag ? 'bg-primary-600 text-white' : ''}`}
                style={{ color: todayFlag ? undefined : 'var(--bam-text)' }}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: `${TOTAL_H}px` }}>
          {/* Hour labels */}
          <div className="w-14 flex-shrink-0 relative">
            {HOURS.map(h => (
              <div
                key={h}
                className="absolute right-2 text-right text-[10px] font-medium"
                style={{ top: `${(h - GRID_START) * HOUR_H - 8}px`, color: 'var(--bam-text-faint)' }}
              >
                {h === 12 ? '12 PM' : h < 12 ? `${h} AM` : `${h - 12} PM`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map(day => {
            const dayStr   = format(day, 'yyyy-MM-dd');
            const dayBkgs  = bookingsByDay[dayStr] || [];
            const todayFlag = isToday(day);

            return (
              <div
                key={dayStr}
                className="flex-1 min-w-0 relative border-l"
                style={{
                  borderColor,
                  background: todayFlag ? (isDark ? 'rgba(91,62,234,0.03)' : 'rgba(91,62,234,0.015)') : undefined,
                }}
              >
                <HourLines isDark={isDark} />
                {todayFlag && <CurrentTimeLine />}

                {/* Click to create slots */}
                {HOURS.map(h => (
                  <button
                    key={h}
                    className="absolute left-0 right-0 hover:bg-primary-500/5 transition-colors z-10 tap-highlight-none"
                    style={{ top: `${(h - GRID_START) * HOUR_H}px`, height: `${HOUR_H}px` }}
                    onClick={() => onSlotClick(dayStr, `${String(h).padStart(2, '0')}:00`)}
                  />
                ))}

                {dayBkgs.map(b => (
                  <AppointmentBlock key={b.id} booking={b} onClick={onBookingClick} isDark={isDark} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── MONTH VIEW ──────────────────────────────────────────────────────────── */

function MonthView({ bookings, focusDate, onBookingClick, onDayClick, isDark, borderColor }) {
  const monthStart = startOfMonth(focusDate);
  const monthEnd   = endOfMonth(focusDate);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const bookingsByDay = useMemo(() => {
    const map = {};
    for (const b of bookings) {
      const key = b.booking_date?.slice(0, 10);
      if (key) (map[key] = map[key] || []).push(b);
    }
    return map;
  }, [bookings]);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Weekday headers */}
      <div className="flex-shrink-0 grid grid-cols-7 border-b" style={{ borderColor }}>
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-[10px] font-bold uppercase" style={{ color: 'var(--bam-text-faint)' }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="flex-1 grid grid-cols-7" style={{ gridAutoRows: 'minmax(80px, 1fr)' }}>
        {days.map(day => {
          const dayStr    = format(day, 'yyyy-MM-dd');
          const inMonth   = day.getMonth() === focusDate.getMonth();
          const todayFlag = isToday(day);
          const dayBkgs   = (bookingsByDay[dayStr] || []).sort((a, b) => timeToMin(a.start_time) - timeToMin(b.start_time));

          return (
            <div
              key={dayStr}
              onClick={() => onDayClick(day)}
              className="border-b border-r p-1.5 cursor-pointer hover:bg-[--bam-surface-hover] transition-colors overflow-hidden"
              style={{
                borderColor,
                background: todayFlag ? (isDark ? 'rgba(91,62,234,0.06)' : 'rgba(91,62,234,0.03)') : undefined,
                opacity: inMonth ? 1 : 0.4,
              }}
            >
              <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1 ${todayFlag ? 'bg-primary-600 text-white' : ''}`}
                style={{ color: todayFlag ? undefined : 'var(--bam-text)' }}>
                {format(day, 'd')}
              </div>

              <div className="space-y-0.5">
                {dayBkgs.slice(0, 3).map(b => {
                  const meta = STATUS_META[b.status] || STATUS_META.confirmed;
                  return (
                    <div
                      key={b.id}
                      onClick={e => { e.stopPropagation(); onBookingClick(b); }}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold truncate cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        background:  isDark ? meta.bgDark   : meta.bg,
                        color:       isDark ? meta.textDark : meta.text,
                        borderLeft:  `2px solid ${isDark ? meta.borderDark : meta.border}`,
                      }}
                    >
                      {fmtTime(b.start_time)} {b.customer_name}
                    </div>
                  );
                })}
                {dayBkgs.length > 3 && (
                  <p className="text-[10px] font-semibold pl-1" style={{ color: 'var(--bam-text-muted)' }}>
                    +{dayBkgs.length - 3} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Booking Detail Sheet ────────────────────────────────────────────────── */

function BookingDetailSheet({ booking, onClose, onUpdated, isDark, borderColor }) {
  const [saving, setSaving]   = useState(false);
  const [mode, setMode]       = useState('view'); // 'view' | 'status' | 'reschedule'
  const [newStatus, setStatus] = useState(booking.status);
  const [reason, setReason]   = useState('');
  const [noShow, setNoShow]   = useState(false);
  const [newDate, setNewDate] = useState(booking.booking_date?.slice(0, 10) || '');
  const [newTime, setNewTime] = useState(booking.start_time?.slice(0, 5) || '');

  const meta = STATUS_META[booking.status] || STATUS_META.confirmed;

  const updateStatus = async () => {
    setSaving(true);
    try {
      await bookingsAPI.updateStatus(booking.id, newStatus, reason, noShow);
      toast.success('Status updated');
      onUpdated?.();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const reschedule = async () => {
    setSaving(true);
    try {
      await bookingsAPI.reschedule(booking.id, { booking_date: newDate, start_time: newTime });
      toast.success('Rescheduled ✓');
      onUpdated?.();
      onClose();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const sym = currencySymbol(booking.currency);
  const price = parseFloat(booking.service_price || 0);

  return (
    <AnimatePresence>
      <motion.div
        key="detail-backdrop"
        className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        key="detail-sheet"
        className="fixed inset-x-0 bottom-0 z-[91] rounded-t-3xl sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[400px] sm:rounded-2xl flex flex-col overflow-hidden"
        style={{ background: isDark ? '#0c1528' : '#fff', border: `1px solid ${borderColor}`, maxHeight: '90dvh', boxShadow: '0 -8px 60px rgba(0,0,0,0.4)' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
      >
        {/* Pull handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 sm:hidden">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bam-border-medium)' }} />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 flex-shrink-0 border-b" style={{ borderColor }}>
          <div>
            <p className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">{booking.reference_id}</p>
            <h2 className="font-bold text-base mt-1" style={{ color: 'var(--bam-text)' }}>{booking.customer_name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{ background: isDark ? meta.bgDark : meta.bg, color: isDark ? meta.textDark : meta.text }}
            >
              {meta.label}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-xl" style={{ color: 'var(--bam-text-muted)' }}>
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {mode === 'view' && (
            <div className="p-5 space-y-4">
              {/* Appointment time */}
              <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${borderColor}` }}>
                <div className="text-2xl">📅</div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>
                    {format(new Date(booking.booking_date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                    {fmtTime(booking.start_time)}{booking.end_time ? ` – ${fmtTime(booking.end_time)}` : ''}
                    {booking.duration_minutes ? ` · ${booking.duration_minutes}min` : ''}
                  </p>
                </div>
              </div>

              {/* Service + price */}
              <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${borderColor}` }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--bam-text-faint)' }}>Service</p>
                  <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>{booking.service_name}</p>
                </div>
                <p className="text-xl font-black text-primary-600 dark:text-primary-400">{sym}{price.toFixed(2)}</p>
              </div>

              {/* Customer */}
              <div className="p-4 rounded-2xl" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${borderColor}` }}>
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--bam-text-faint)' }}>Customer</p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ background: avatarColor(booking.customer_name || '') }}
                  >
                    {initials(booking.customer_name || '')}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>{booking.customer_name}</p>
                    {booking.customer_phone && (
                      <a href={`tel:${booking.customer_phone}`} className="text-xs text-primary-600 dark:text-primary-400 hover:underline block">
                        {booking.customer_phone}
                      </a>
                    )}
                    {booking.customer_email && (
                      <a href={`mailto:${booking.customer_email}`} className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>
                        {booking.customer_email}
                      </a>
                    )}
                  </div>
                  {booking.consumer_no_show_count > 0 && (
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex-shrink-0">
                      ⚠ {booking.consumer_no_show_count} no-show
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${borderColor}` }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--bam-text-faint)' }}>Notes</p>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--bam-text-muted)' }}>{booking.notes}</p>
                </div>
              )}

              {/* Cancel reason */}
              {booking.cancelled_reason && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50">
                  <p className="text-xs font-bold uppercase tracking-wide mb-1 text-red-500">Cancellation reason</p>
                  <p className="text-sm text-red-700 dark:text-red-300">{booking.cancelled_reason}</p>
                </div>
              )}

              {/* Payment status */}
              {booking.payment_status && booking.payment_status !== 'unpaid' && (
                <div className="p-4 rounded-2xl" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${borderColor}` }}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--bam-text-faint)' }}>Payment</p>
                  <p className="text-sm font-semibold capitalize" style={{ color: 'var(--bam-text)' }}>{booking.payment_status}</p>
                </div>
              )}
            </div>
          )}

          {mode === 'status' && (
            <div className="p-5 space-y-4">
              <h3 className="font-bold" style={{ color: 'var(--bam-text)' }}>Update Status</h3>
              <div>
                <label className="label">New Status</label>
                <select className="input" value={newStatus} onChange={e => setStatus(e.target.value)}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No-show</option>
                </select>
              </div>
              {newStatus === 'cancelled' && (
                <>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={noShow} onChange={e => { setNoShow(e.target.checked); if (e.target.checked) setStatus('no_show'); }} />
                    <span className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>Mark as no-show</span>
                  </label>
                  <div>
                    <label className="label">Reason (optional)</label>
                    <input className="input" placeholder="Cancellation reason…" value={reason} onChange={e => setReason(e.target.value)} />
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <button onClick={() => setMode('view')} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={updateStatus} disabled={saving} className="btn-primary flex-1 text-sm">{saving ? <Spinner /> : 'Update'}</button>
              </div>
            </div>
          )}

          {mode === 'reschedule' && (
            <div className="p-5 space-y-4">
              <h3 className="font-bold" style={{ color: 'var(--bam-text)' }}>Reschedule</h3>
              <div>
                <label className="label">New Date</label>
                <input className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
              </div>
              <div>
                <label className="label">New Time</label>
                <input className="input" type="time" value={newTime} onChange={e => setNewTime(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMode('view')} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button onClick={reschedule} disabled={saving} className="btn-primary flex-1 text-sm">{saving ? <Spinner /> : 'Reschedule ✓'}</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions — only in view mode */}
        {mode === 'view' && (
          <div className="flex-shrink-0 p-4 border-t" style={{ borderColor, paddingBottom: `calc(1rem + env(safe-area-inset-bottom, 0px))` }}>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setMode('status')}
                className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)' }}
              >
                <StatusIcon className="w-4 h-4" />
                Status
              </button>
              {!['cancelled','completed'].includes(booking.status) && (
                <button
                  onClick={() => setMode('reschedule')}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)' }}
                >
                  <RescheduleIcon className="w-4 h-4" />
                  Reschedule
                </button>
              )}
              {booking.customer_phone && (
                <a
                  href={`tel:${booking.customer_phone}`}
                  className="flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)' }}
                >
                  <PhoneIcon className="w-4 h-4" />
                  Call
                </a>
              )}
            </div>
            {booking.status === 'pending' && (
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    await bookingsAPI.updateStatus(booking.id, 'confirmed');
                    toast.success('Booking confirmed ✓');
                    onUpdated?.();
                    onClose();
                  } catch { toast.error('Failed'); }
                  finally { setSaving(false); }
                }}
                disabled={saving}
                className="btn-primary w-full text-sm mt-2"
              >
                {saving ? <Spinner /> : '✓ Confirm Booking'}
              </button>
            )}
            {booking.status === 'confirmed' && (
              <button
                onClick={async () => {
                  setSaving(true);
                  try {
                    await bookingsAPI.updateStatus(booking.id, 'completed');
                    toast.success('Marked as done ✓');
                    onUpdated?.();
                    onClose();
                  } catch { toast.error('Failed'); }
                  finally { setSaving(false); }
                }}
                disabled={saving}
                className="btn-primary w-full text-sm mt-2"
              >
                {saving ? <Spinner /> : '✓ Mark Completed'}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Main Calendar page ──────────────────────────────────────────────────── */

export default function Calendar() {
  const { business } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const [view, setView]               = useState('week');
  const [focusDate, setFocusDate]     = useState(new Date());
  const [bookings, setBookings]       = useState([]);
  const [staff, setStaff]             = useState([]);
  const [selectedStaff, setSelStaff]  = useState('all');
  const [loading, setLoading]         = useState(true);
  const [selectedBooking, setSelBkg]  = useState(null);
  const [newBooking, setNewBooking]   = useState(null); // { date, time } prefill

  const loadData = useCallback(() => {
    bookingsAPI.list({ limit: 500 })
      .then(d => setBookings(d.bookings || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    staffAPI.list().then(setStaff).catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* staff filter */
  const filteredBookings = useMemo(() =>
    selectedStaff === 'all'
      ? bookings
      : bookings.filter(b => b.staff_member_id === selectedStaff),
    [bookings, selectedStaff]
  );

  /* navigation */
  const navigate = (dir) => {
    const d = dir === 1 ? 1 : -1;
    setFocusDate(prev => {
      if (view === 'day')   return addDays(prev, d);
      if (view === 'week')  return addWeeks(prev, d);
      return addMonths(prev, d);
    });
  };

  const goToday = () => setFocusDate(new Date());

  /* handlers */
  const handleSlotClick = (date, time) => {
    setNewBooking({ date, time });
  };

  const handleDayClick = (day) => {
    setFocusDate(day);
    setView('day');
  };

  const handleBookingClick = (b) => {
    setSelBkg(b);
  };

  const handleCreated = () => {
    setNewBooking(null);
    loadData();
  };

  /* title display */
  const titleLabel = useMemo(() => {
    if (view === 'day')   return format(focusDate, 'EEEE, MMMM d, yyyy');
    if (view === 'week')  {
      const ws = startOfWeek(focusDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(focusDate, 'MMMM yyyy');
  }, [view, focusDate]);

  // Compact form for narrow screens, where the full label (with the New/Today
  // buttons and Day/Week/Month toggle alongside it) has no room to breathe.
  const titleLabelShort = useMemo(() => {
    if (view === 'day')   return format(focusDate, 'EEE, MMM d');
    if (view === 'week')  {
      const ws = startOfWeek(focusDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return `${format(ws, 'd')} – ${format(we, 'd MMM')}`;
    }
    return format(focusDate, 'MMM yyyy');
  }, [view, focusDate]);

  return (
    <div
      className="flex flex-col animate-fade-in"
      style={{
        height: 'calc(100dvh - 64px - env(safe-area-inset-top, 0px))',
        background: 'var(--bam-bg)',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex flex-col gap-2.5 px-3 sm:px-4 pt-3 pb-3 border-b"
        style={{ background: 'var(--bam-bg)', borderColor }}
      >
        {/* Row 1: Title + View toggle + New button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl transition-colors flex-shrink-0" style={{ color: 'var(--bam-text-muted)' }}>
              <ChevronLIcon className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-sm sm:text-base truncate min-w-0" style={{ color: 'var(--bam-text)' }}>
              <span className="sm:hidden">{titleLabelShort}</span>
              <span className="hidden sm:inline">{titleLabel}</span>
            </h2>
            <button onClick={() => navigate(1)} className="p-2 rounded-xl transition-colors flex-shrink-0" style={{ color: 'var(--bam-text-muted)' }}>
              <ChevronRIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={goToday} className="px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex-shrink-0"
              style={{ background: 'var(--bam-surface-soft)', borderColor: 'var(--bam-border)', color: 'var(--bam-text-muted)' }}>
              Today
            </button>
            {/* View toggle */}
            <div className="flex rounded-xl p-0.5 gap-0.5" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${borderColor}` }}>
              {['day','week','month'].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${
                    view === v ? 'bg-primary-600 text-white shadow-primary-sm' : ''
                  }`}
                  style={{ color: view === v ? undefined : 'var(--bam-text-muted)' }}
                >
                  <span className="sm:hidden">{v[0].toUpperCase()}</span>
                  <span className="hidden sm:inline">{v}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setNewBooking({ date: format(focusDate, 'yyyy-MM-dd'), time: '' })}
              className="btn-primary text-xs px-3 py-1.5 hidden sm:flex gap-1.5"
            >
              <PlusIcon className="w-4 h-4" />
              New
            </button>
          </div>
        </div>

        {/* Row 2: Staff filter */}
        {staff.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              onClick={() => setSelStaff('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${selectedStaff === 'all' ? 'bg-primary-600 text-white' : ''}`}
              style={selectedStaff !== 'all' ? { background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)', border: `1px solid ${borderColor}` } : {}}
            >
              All Staff
            </button>
            {staff.map(s => (
              <button
                key={s.id}
                onClick={() => setSelStaff(selectedStaff === s.id ? 'all' : s.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${selectedStaff === s.id ? 'bg-primary-600 text-white' : ''}`}
                style={selectedStaff !== s.id ? { background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)', border: `1px solid ${borderColor}` } : {}}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Status legend ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center gap-4 px-4 py-1.5 overflow-x-auto scrollbar-hide border-b" style={{ borderColor }}>
        {Object.entries(STATUS_META).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: isDark ? v.borderDark : v.border }} />
            <span className="text-[10px] font-semibold" style={{ color: 'var(--bam-text-faint)' }}>{v.label}</span>
          </div>
        ))}
      </div>

      {/* ── Calendar body ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div
          className="flex-1 overflow-hidden"
          style={{ background: 'var(--bam-surface)', border: `1px solid ${borderColor}`, margin: '0 0 0 0' }}
        >
          {view === 'day'   && <DayView   bookings={filteredBookings} focusDate={focusDate} onBookingClick={handleBookingClick} onSlotClick={handleSlotClick} isDark={isDark} borderColor={borderColor} />}
          {view === 'week'  && <WeekView  bookings={filteredBookings} focusDate={focusDate} onBookingClick={handleBookingClick} onSlotClick={handleSlotClick} isDark={isDark} borderColor={borderColor} />}
          {view === 'month' && <MonthView bookings={filteredBookings} focusDate={focusDate} onBookingClick={handleBookingClick} onDayClick={handleDayClick}  isDark={isDark} borderColor={borderColor} />}
        </div>
      )}

      {/* Mobile new booking FAB */}
      <button
        onClick={() => setNewBooking({ date: format(focusDate, 'yyyy-MM-dd'), time: '' })}
        className="sm:hidden fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] right-4 z-30 w-14 h-14 bg-primary-600 text-white rounded-full flex items-center justify-center shadow-primary"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Booking detail sheet */}
      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          onClose={() => setSelBkg(null)}
          onUpdated={loadData}
          isDark={isDark}
          borderColor={borderColor}
        />
      )}

      {/* New booking sheet */}
      <NewBookingSheet
        open={!!newBooking}
        onClose={() => setNewBooking(null)}
        onCreated={handleCreated}
        prefillDate={newBooking?.date}
        prefillTime={newBooking?.time}
      />
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
function ChevronLIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevronRIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>; }
function PlusIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function XIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function StatusIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function RescheduleIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>; }
function PhoneIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012.18 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 8.1a16 16 0 006 6l1.46-1.46a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>; }
function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />; }
