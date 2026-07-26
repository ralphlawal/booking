import React, { useEffect, useState, useRef } from 'react';
import { Check, CalendarDays, ChevronLeft, ChevronRight, Clock, User, Scissors } from 'lucide-react';
import { bookingsAPI } from '../../services/api';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday,
  addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks,
} from 'date-fns';

// ─── Constants ───────────────────────────────────────────────────────────────
const HOUR_START = 7;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const PX_PER_HOUR = 64; // height in px each hour slot takes
const TOTAL_HEIGHT = PX_PER_HOUR * TOTAL_HOURS;

const STATUS_BG = {
  pending:   'bg-amber-400/90 border-amber-500 text-amber-950',
  confirmed: 'bg-emerald-500/90 border-emerald-600 text-white',
  cancelled: 'bg-gray-200 border-gray-300 text-gray-500 opacity-50',
  completed: 'bg-primary-500/90 border-primary-600 text-white',
};

const STATUS_DOT = {
  pending: 'bg-amber-400',
  confirmed: 'bg-emerald-500',
  cancelled: 'bg-gray-400',
  completed: 'bg-primary-500',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

function bookingLayout(startTime, durationMinutes = 60) {
  const startMin = timeToMinutes(startTime);
  const fromGrid = startMin - HOUR_START * 60;
  const top = Math.max(0, (fromGrid / (TOTAL_HOURS * 60)) * TOTAL_HEIGHT);
  const height = Math.max(22, (durationMinutes / (TOTAL_HOURS * 60)) * TOTAL_HEIGHT);
  return { top, height };
}

function currentTimeOffset() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < HOUR_START || h >= HOUR_END) return null;
  const fromGrid = h * 60 + m - HOUR_START * 60;
  return (fromGrid / (TOTAL_HOURS * 60)) * TOTAL_HEIGHT;
}

// ─── Booking card ─────────────────────────────────────────────────────────────
function BookingBlock({ booking, onSelect, selected }) {
  const { top, height } = bookingLayout(booking.start_time, booking.duration_minutes || 60);
  const isSelected = selected?.id === booking.id;
  return (
    <button
      onClick={() => onSelect(booking)}
      title={`${booking.customer_name} · ${booking.service_name}`}
      style={{ top, height, left: 2, right: 2 }}
      className={`absolute rounded-md border px-1.5 py-0.5 text-left text-[11px] font-semibold leading-tight truncate transition-all z-10 cursor-pointer
        ${STATUS_BG[booking.status] || STATUS_BG.pending}
        ${isSelected ? 'ring-2 ring-offset-1 ring-primary-400 z-20' : 'hover:brightness-110'}`}
    >
      <span className="block truncate">{booking.start_time?.slice(0, 5)} {booking.customer_name?.split(' ')[0]}</span>
      {height > 36 && <span className="block truncate opacity-80">{booking.service_name}</span>}
    </button>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────
function WeekView({ bookings, weekDays, selected, onSelect, timeRef }) {
  const [nowOffset, setNowOffset] = useState(currentTimeOffset());
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const t = setInterval(() => setNowOffset(currentTimeOffset()), 60_000);
    return () => clearInterval(t);
  }, []);

  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

  return (
    <div className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Sticky day headers */}
      <div className="sticky top-0 z-30 flex bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="w-14 sm:w-16 flex-shrink-0 border-r border-gray-100 dark:border-gray-800" />
        {weekDays.map((day) => {
          const isNow = format(day, 'yyyy-MM-dd') === todayStr;
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-[80px] py-2 text-center text-xs font-bold border-r border-gray-100 dark:border-gray-800 last:border-r-0
                ${isNow ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'}`}
            >
              <span className="block">{format(day, 'EEE')}</span>
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full mt-0.5 text-sm
                ${isNow ? 'bg-primary-600 text-white' : 'text-gray-900 dark:text-white'}`}>
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex" ref={timeRef}>
        {/* Hour labels */}
        <div className="w-14 sm:w-16 flex-shrink-0 relative" style={{ height: TOTAL_HEIGHT }}>
          {hours.map((h) => (
            <div
              key={h}
              style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
              className="absolute left-0 right-0 -translate-y-2"
            >
              <span className="block text-right pr-2 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {String(h).padStart(2, '0')}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isNow = dateStr === todayStr;
          const dayBookings = bookings.filter(b => b.booking_date === dateStr);
          return (
            <div
              key={day.toISOString()}
              className={`flex-1 min-w-[80px] relative border-l border-gray-100 dark:border-gray-800
                ${isNow ? 'bg-primary-50/30 dark:bg-primary-900/10' : ''}`}
              style={{ height: TOTAL_HEIGHT }}
            >
              {/* Hour gridlines */}
              {hours.map((h) => (
                <div
                  key={h}
                  style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                  className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800"
                />
              ))}
              {/* Half-hour gridlines */}
              {hours.map((h) => (
                <div
                  key={`${h}-half`}
                  style={{ top: (h - HOUR_START) * PX_PER_HOUR + PX_PER_HOUR / 2 }}
                  className="absolute left-0 right-0 border-t border-gray-50 dark:border-gray-800/50 border-dashed"
                />
              ))}

              {/* Current time indicator */}
              {isNow && nowOffset !== null && (
                <div
                  style={{ top: nowOffset }}
                  className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                  <div className="flex-1 border-t-2 border-red-500" />
                </div>
              )}

              {/* Booking cards */}
              {dayBookings.map(b => (
                <BookingBlock key={b.id} booking={b} onSelect={onSelect} selected={selected} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month view ───────────────────────────────────────────────────────────────
function MonthView({ bookings, currentMonth, setCurrentMonth, selected, onSelect }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getDay = (day) => bookings.filter(b => b.booking_date === format(day, 'yyyy-MM-dd'));

  return (
    <div className="app-panel p-4 sm:p-5">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="font-bold text-gray-900 dark:text-white">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(day => {
          const dayBks = getDay(day);
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isSel = selected && isSameDay(day, selected);
          const dayIsToday = isToday(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-sm transition-all
                ${isSel ? 'bg-primary-600 text-white' :
                  dayIsToday ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-bold' :
                  isCurrentMonth ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300' :
                  'text-gray-300 dark:text-gray-600'}`}
            >
              <span className="font-medium text-xs">{format(day, 'd')}</span>
              {dayBks.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {dayBks.slice(0, 3).map((b, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${isSel ? 'bg-white' : STATUS_DOT[b.status] || 'bg-gray-400'}`} />
                  ))}
                  {dayBks.length > 3 && <div className="text-[8px] font-bold">+{dayBks.length - 3}</div>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        {Object.entries(STATUS_DOT).map(([s, cls]) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${cls}`} />
            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function DetailPanel({ selected, dayBookings, view }) {
  const title = view === 'week' && selected
    ? `${selected.customer_name || 'Booking'}`
    : selected
    ? format(selected, 'EEEE, MMMM d')
    : null;

  const items = view === 'week' && selected?.customer_name
    ? [selected]
    : dayBookings;

  return (
    <div className="app-panel p-4 sm:p-5">
      {title ? (
        <>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">{title}</h3>
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Check className="w-7 h-7 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
              <p className="text-sm">No bookings this day</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...items].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')).map(b => (
                <div key={b.id} className={`p-3 rounded-xl border ${
                  b.status === 'confirmed' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800' :
                  b.status === 'pending' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800' :
                  'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {b.start_time?.slice(0, 5)}{b.duration_minutes ? ` · ${b.duration_minutes}min` : ''}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      b.status === 'confirmed' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' :
                      b.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                      b.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                      'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                    }`}>{b.status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{b.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Scissors className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.service_name}</p>
                  </div>
                  {b.customer_phone && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{b.customer_phone}</p>
                  )}
                  {b.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 italic">"{b.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 text-gray-200 dark:text-gray-700" />
          <p className="text-sm">
            {view === 'week' ? 'Click a booking to view details' : 'Select a day to see bookings'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Calendar() {
  const [view, setView] = useState('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dayBookings, setDayBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const timeRef = useRef(null);

  useEffect(() => {
    bookingsAPI.list({ limit: 500 }).then(d => setBookings(d.bookings || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Scroll to current time on mount (week view)
  useEffect(() => {
    if (view === 'week' && timeRef.current) {
      const offset = currentTimeOffset();
      if (offset !== null) {
        timeRef.current.scrollTop = Math.max(0, offset - 80);
      }
    }
  }, [view, loading]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleSelectBooking = (booking) => {
    setSelected(booking);
    setDayBookings([booking]);
  };

  const handleSelectMonthDay = (day) => {
    const dayBks = bookings.filter(b => b.booking_date === format(day, 'yyyy-MM-dd'));
    setSelected(day);
    setDayBookings(dayBks);
  };

  const navigatePrev = () => {
    if (view === 'week') setCurrentDate(d => subWeeks(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  };
  const navigateNext = () => {
    if (view === 'week') setCurrentDate(d => addWeeks(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };
  const goToday = () => { setCurrentDate(new Date()); setSelected(null); };

  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {view === 'week' ? weekLabel : format(currentDate, 'MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
            {['week', 'month'].map(v => (
              <button
                key={v}
                onClick={() => { setView(v); setSelected(null); }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold capitalize transition-all
                  ${view === v
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Nav */}
          <div className="flex items-center gap-1">
            <button onClick={navigatePrev} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300">
              Today
            </button>
            <button onClick={navigateNext} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'week' ? (
        <div className="grid lg:grid-cols-[1fr_240px] gap-4">
          <div className="max-h-[680px] overflow-y-auto rounded-xl">
            <WeekView
              bookings={bookings}
              weekDays={weekDays}
              selected={selected}
              onSelect={handleSelectBooking}
              timeRef={timeRef}
            />
          </div>
          <DetailPanel selected={selected} dayBookings={dayBookings} view={view} />
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_260px] gap-4">
          <MonthView
            bookings={bookings}
            currentMonth={currentDate}
            setCurrentMonth={setCurrentDate}
            selected={selected}
            onSelect={handleSelectMonthDay}
          />
          <DetailPanel selected={selected} dayBookings={dayBookings} view={view} />
        </div>
      )}
    </div>
  );
}
