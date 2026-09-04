/**
 * NewBookingSheet — multi-step appointment creation for admin.
 * Steps: Customer → Service → Date → Time → Confirm
 *
 * Props:
 *   open:         boolean
 *   onClose:      () => void
 *   onCreated:    () => void   — called after successful creation
 *   prefillDate:  string|null  — pre-fill booking_date ('yyyy-MM-dd')
 *   prefillTime:  string|null  — pre-fill start_time ('HH:MM')
 *   business:     object       — from useAuth
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  bookingsAPI, servicesAPI, staffAPI, availabilityAPI, customersAPI,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { businessCurrencySymbol } from '../../utils/currency';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday,
  isBefore, startOfDay,
} from 'date-fns';

/* ── helpers ────────────────────────────────────────────────────────────── */

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function fmtPrice(p) {
  if (!p && p !== 0) return '';
  return `${businessCurrencySymbol()}${parseFloat(p).toFixed(2)}`;
}

function avatarInitials(name = '') {
  const p = name.trim().split(/\s+/);
  return p.length > 1 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#5b3eea','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];
function avatarColor(name = '') {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

const STEPS = ['Customer', 'Service', 'Date', 'Time', 'Confirm'];

/* ── main component ──────────────────────────────────────────────────────── */

export default function NewBookingSheet({ open, onClose, onCreated, prefillDate, prefillTime, prefillCustomer }) {
  const { business } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  /* wizard state */
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);

  /* form data */
  const [customer, setCustomer]   = useState(null);   // { id?, name, phone, email } or from list
  const [service, setService]     = useState(null);   // service object
  const [staffMember, setStaff]   = useState(null);   // staff object or null
  const [bookingDate, setDate]    = useState(prefillDate || '');
  const [bookingTime, setTime]    = useState(prefillTime || '');
  const [notes, setNotes]         = useState('');

  /* search & filter */
  const [customerQ, setCustomerQ]     = useState('');
  const [creatingCustomer, setCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [serviceQ, setServiceQ]       = useState('');

  /* loaded data */
  const [customers, setCustomers] = useState([]);
  const [services, setServices]   = useState([]);
  const [staff, setStaff_]        = useState([]);
  const [slots, setSlots]         = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError]     = useState(false);

  /* calendar picker state */
  const [calMonth, setCalMonth] = useState(new Date());

  /* reset on open */
  useEffect(() => {
    if (!open) return;
    setService(null);
    setStaff(null);
    setDate(prefillDate || '');
    setTime(prefillTime || '');
    setNotes('');
    setServiceQ('');
    setSlots([]);

    /* pre-fill customer if provided (e.g. from CRM "Book" action) */
    if (prefillCustomer) {
      setCustomer({ id: prefillCustomer.id, name: prefillCustomer.full_name, phone: prefillCustomer.phone, email: prefillCustomer.email });
      setCustomerQ('');
      setCreating(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      setStep(1); // skip to service step
    } else {
      setCustomer(null);
      setCustomerQ('');
      setCreating(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      setStep(0);
    }

    /* load catalogs */
    customersAPI.list().then(setCustomers).catch(() => {});
    servicesAPI.list().then(s => setServices(s.filter(x => x.is_active))).catch(() => {});
    staffAPI.list().then(setStaff_).catch(() => {});
  }, [open]);

  /* prefill dates from calendar click */
  useEffect(() => { if (prefillDate) setDate(prefillDate); }, [prefillDate]);
  useEffect(() => { if (prefillTime) setTime(prefillTime); }, [prefillTime]);

  /* when date + service change, fetch available slots */
  useEffect(() => {
    if (!bookingDate || !service || !business?.slug) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setSlotsError(false);
    availabilityAPI.getSlots(business.slug, bookingDate, service.id)
      .then(s => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlotsError(true))
      .finally(() => setSlotsLoading(false));
  }, [bookingDate, service, business?.slug]);

  /* filtered lists */
  const filteredCustomers = useMemo(() => {
    const q = customerQ.toLowerCase();
    if (!q) return customers.slice(0, 30);
    return customers.filter(c =>
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [customers, customerQ]);

  const filteredServices = useMemo(() => {
    const q = serviceQ.toLowerCase();
    if (!q) return services;
    return services.filter(s => s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q));
  }, [services, serviceQ]);

  /* navigation */
  const canGoNext = useMemo(() => {
    if (step === 0) return !!customer || (creatingCustomer && newCustomer.name.trim());
    if (step === 1) return !!service;
    if (step === 2) return !!bookingDate;
    if (step === 3) return !!bookingTime;
    return true;
  }, [step, customer, creatingCustomer, newCustomer.name, service, bookingDate, bookingTime]);

  const goNext = () => {
    if (step === 0 && creatingCustomer) {
      setCustomer({ name: newCustomer.name.trim(), phone: newCustomer.phone, email: newCustomer.email });
      setCreating(false);
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const goBack = () => {
    if (step === 0) return onClose();
    setStep(s => s - 1);
  };

  /* submit */
  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = {
        service_id:    service.id,
        booking_date:  bookingDate,
        start_time:    bookingTime,
        customer_name: customer.name || customer.full_name,
        customer_phone: customer.phone || '',
        customer_email: customer.email || '',
        notes,
        staff_member_id: staffMember?.id || null,
      };
      await bookingsAPI.createWalkin(payload);
      toast.success('Booking created ✓');
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to create booking');
    } finally {
      setSaving(false);
    }
  };

  /* calendar days for date picker */
  const calDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
    const end   = endOfWeek(endOfMonth(calMonth),     { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [calMonth]);

  const today = startOfDay(new Date());

  /* ── render ──────────────────────────────────────────────────────────── */
  if (!open) return null;

  const surfaceBg   = isDark ? '#0c1528' : '#fff';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="nbs-backdrop"
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="nbs-sheet"
            className="fixed inset-x-0 bottom-0 z-[101] flex flex-col rounded-t-3xl sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[420px] sm:rounded-2xl"
            style={{
              background:   surfaceBg,
              border:       `1px solid ${borderColor}`,
              boxShadow:    isDark ? '0 -8px 60px rgba(0,0,0,0.7)' : '0 -8px 40px rgba(0,0,0,0.18)',
              maxHeight:    '92dvh',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: `1px solid ${borderColor}` }}>
              <div>
                <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>New Booking</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--bam-text-muted)' }}>
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 flex-shrink-0" style={{ background: 'var(--bam-border)' }}>
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.18 }}
                >
                  {step === 0 && (
                    <CustomerStep
                      customers={filteredCustomers}
                      selected={customer}
                      onSelect={c => { setCustomer(c); setCreating(false); }}
                      query={customerQ}
                      onQueryChange={setCustomerQ}
                      creating={creatingCustomer}
                      onStartCreate={() => { setCreating(true); setCustomer(null); }}
                      onCancelCreate={() => setCreating(false)}
                      newCustomer={newCustomer}
                      onNewCustomerChange={v => setNewCustomer(p => ({ ...p, ...v }))}
                      isDark={isDark}
                      borderColor={borderColor}
                    />
                  )}
                  {step === 1 && (
                    <ServiceStep
                      services={filteredServices}
                      selected={service}
                      onSelect={setService}
                      query={serviceQ}
                      onQueryChange={setServiceQ}
                      isDark={isDark}
                      borderColor={borderColor}
                    />
                  )}
                  {step === 2 && (
                    <DateStep
                      selected={bookingDate}
                      onSelect={setDate}
                      calMonth={calMonth}
                      calDays={calDays}
                      onPrevMonth={() => setCalMonth(m => subMonths(m, 1))}
                      onNextMonth={() => setCalMonth(m => addMonths(m, 1))}
                      today={today}
                      isDark={isDark}
                      borderColor={borderColor}
                    />
                  )}
                  {step === 3 && (
                    <TimeStep
                      slots={slots}
                      selected={bookingTime}
                      onSelect={setTime}
                      loading={slotsLoading}
                      error={slotsError}
                      freeformValue={bookingTime}
                      onFreeform={setTime}
                      isDark={isDark}
                      borderColor={borderColor}
                    />
                  )}
                  {step === 4 && (
                    <ConfirmStep
                      customer={customer}
                      service={service}
                      staff={staffMember}
                      staffList={staff_}
                      onStaffChange={setStaff}
                      date={bookingDate}
                      time={bookingTime}
                      notes={notes}
                      onNotesChange={setNotes}
                      isDark={isDark}
                      borderColor={borderColor}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div
              className="flex gap-3 px-5 pb-5 pt-3 flex-shrink-0"
              style={{
                borderTop: `1px solid ${borderColor}`,
                paddingBottom: `calc(1.25rem + env(safe-area-inset-bottom, 0px))`,
              }}
            >
              <button onClick={goBack} className="btn-secondary flex-1 text-sm">
                {step === 0 ? 'Cancel' : '← Back'}
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  disabled={!canGoNext}
                  className="btn-primary flex-1 text-sm"
                >
                  {step === 0 && creatingCustomer ? 'Use this customer' : 'Continue →'}
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="btn-primary flex-1 text-sm"
                >
                  {saving ? <Spinner /> : 'Create Booking ✓'}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Step components ─────────────────────────────────────────────────────── */

function CustomerStep({ customers, selected, onSelect, query, onQueryChange, creating, onStartCreate, onCancelCreate, newCustomer, onNewCustomerChange, isDark, borderColor }) {
  return (
    <div className="space-y-4">
      {!creating ? (
        <>
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--bam-text-faint)' }} />
            <input
              className="input pl-9"
              placeholder="Search customer name, phone, email…"
              value={query}
              onChange={e => onQueryChange(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            {customers.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--bam-text-faint)' }}>
                {query ? 'No customers found' : 'No customers yet'}
              </p>
            )}
            {customers.map(c => (
              <button
                key={c.id}
                onClick={() => onSelect(c)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all"
                style={{
                  background:   selected?.id === c.id ? (isDark ? 'rgba(91,62,234,0.15)' : '#f0f0ff') : 'var(--bam-surface-soft)',
                  borderColor:  selected?.id === c.id ? '#5b3eea' : borderColor,
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: avatarColor(c.full_name || '') }}
                >
                  {avatarInitials(c.full_name || '')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--bam-text)' }}>{c.full_name}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--bam-text-muted)' }}>
                    {c.phone}{c.phone && c.email ? ' · ' : ''}{c.email}
                  </p>
                </div>
                {selected?.id === c.id && <CheckIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />}
              </button>
            ))}
          </div>

          <button
            onClick={onStartCreate}
            className="w-full flex items-center gap-2 p-3 rounded-xl border-2 border-dashed text-sm font-semibold transition-all"
            style={{ borderColor: 'var(--bam-border-medium)', color: 'var(--bam-text-muted)' }}
          >
            <PlusIcon className="w-4 h-4" />
            Add new customer
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>New customer details</p>
          <div>
            <label className="label">Name *</label>
            <input className="input" placeholder="Full name" autoFocus value={newCustomer.name} onChange={e => onNewCustomerChange({ name: e.target.value })} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" type="tel" placeholder="+44 7700 …" value={newCustomer.phone} onChange={e => onNewCustomerChange({ phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="email@example.com" value={newCustomer.email} onChange={e => onNewCustomerChange({ email: e.target.value })} />
          </div>
          <button onClick={onCancelCreate} className="text-xs font-semibold text-primary-600 hover:underline">
            ← Search existing customers
          </button>
        </div>
      )}
    </div>
  );
}

function ServiceStep({ services, selected, onSelect, query, onQueryChange, isDark, borderColor }) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--bam-text-faint)' }} />
        <input className="input pl-9" placeholder="Search services…" value={query} onChange={e => onQueryChange(e.target.value)} autoFocus />
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: 'var(--bam-text-faint)' }}>
          {query ? 'No matching services' : 'No active services found'}
        </p>
      ) : (
        <div className="space-y-2">
          {services.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border text-left transition-all"
              style={{
                background:   selected?.id === s.id ? (isDark ? 'rgba(91,62,234,0.15)' : '#f0f0ff') : 'var(--bam-surface-soft)',
                borderColor:  selected?.id === s.id ? '#5b3eea' : borderColor,
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>{s.name}</p>
                {s.description && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>{s.description}</p>}
                <div className="flex items-center gap-3 mt-1.5">
                  {s.duration_minutes && (
                    <span className="text-xs font-medium" style={{ color: 'var(--bam-text-faint)' }}>
                      <ClockIcon className="w-3 h-3 inline mr-1" />{s.duration_minutes}min
                    </span>
                  )}
                  {s.price != null && (
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">{fmtPrice(s.price)}</span>
                  )}
                </div>
              </div>
              {selected?.id === s.id && <CheckIcon className="w-5 h-5 text-primary-600 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateStep({ selected, onSelect, calMonth, calDays, onPrevMonth, onNextMonth, today, isDark, borderColor }) {
  const WEEKDAYS = ['M','T','W','T','F','S','S'];
  const selectedDate = selected ? new Date(selected + 'T00:00:00') : null;

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={onPrevMonth} className="p-2 rounded-lg transition-colors hover:bg-[--bam-surface-soft]" style={{ color: 'var(--bam-text-muted)' }}>
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>
          {format(calMonth, 'MMMM yyyy')}
        </p>
        <button onClick={onNextMonth} className="p-2 rounded-lg transition-colors hover:bg-[--bam-surface-soft]" style={{ color: 'var(--bam-text-muted)' }}>
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold uppercase py-1" style={{ color: 'var(--bam-text-faint)' }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {calDays.map(day => {
          const dateStr   = format(day, 'yyyy-MM-dd');
          const inMonth   = day.getMonth() === calMonth.getMonth();
          const isPast    = isBefore(day, today);
          const isSel     = selectedDate && isSameDay(day, selectedDate);
          const todayFlag = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => !isPast && inMonth && onSelect(dateStr)}
              disabled={isPast || !inMonth}
              className="aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all"
              style={{
                background:   isSel     ? '#5b3eea' : todayFlag && !isSel ? (isDark ? 'rgba(91,62,234,0.2)' : '#ede9fe') : '',
                color:        isSel     ? '#fff'
                            : isPast || !inMonth ? 'var(--bam-text-faint)'
                            : todayFlag          ? '#5b3eea'
                                                  : 'var(--bam-text)',
                fontWeight:   todayFlag || isSel ? 700 : 500,
                opacity:      isPast || !inMonth ? 0.35 : 1,
              }}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="p-3 rounded-xl text-sm font-semibold text-center text-primary-600 dark:text-primary-400"
          style={{ background: isDark ? 'rgba(91,62,234,0.1)' : '#f0f0ff' }}>
          {format(new Date(selected + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
        </div>
      )}
    </div>
  );
}

function TimeStep({ slots, selected, onSelect, loading, error, freeformValue, onFreeform, isDark, borderColor }) {
  return (
    <div className="space-y-4">
      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>Checking availability…</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-sm text-amber-800 dark:text-amber-300">
          Could not load slots — enter a time manually below.
        </div>
      )}

      {!loading && !error && slots.length > 0 && (
        <>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>
            Available slots
          </p>
          <div className="grid grid-cols-3 gap-2">
            {slots.map(slot => (
              <button
                key={slot.start}
                onClick={() => onSelect(slot.start)}
                className="py-2.5 rounded-xl text-sm font-semibold border transition-all"
                style={{
                  background:  selected === slot.start ? '#5b3eea' : 'var(--bam-surface-soft)',
                  borderColor: selected === slot.start ? '#5b3eea' : borderColor,
                  color:       selected === slot.start ? '#fff' : 'var(--bam-text)',
                }}
              >
                {fmtTime(slot.start)}
              </button>
            ))}
          </div>
        </>
      )}

      {!loading && !error && slots.length === 0 && (
        <div className="p-4 rounded-xl text-center" style={{ background: 'var(--bam-surface-soft)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>No available slots for this date</p>
          <p className="text-xs mt-1" style={{ color: 'var(--bam-text-muted)' }}>You can still enter a custom time below.</p>
        </div>
      )}

      {/* Manual time input fallback */}
      <div>
        <label className="label">{slots.length ? 'Or enter custom time' : 'Enter time *'}</label>
        <input
          className="input"
          type="time"
          value={freeformValue}
          onChange={e => onFreeform(e.target.value)}
          required
        />
      </div>
    </div>
  );
}

function ConfirmStep({ customer, service, staff, staffList, onStaffChange, date, time, notes, onNotesChange, isDark, borderColor }) {
  const sym = fmtPrice(service?.price);

  return (
    <div className="space-y-4">
      <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>Booking summary</p>

      {/* Summary card */}
      <div className="rounded-xl border divide-y overflow-hidden" style={{ borderColor }}>
        <SummaryRow label="Customer"  value={customer?.name || customer?.full_name} />
        <SummaryRow label="Service"   value={service?.name} sub={service?.duration_minutes ? `${service.duration_minutes} min${sym ? ` · ${sym}` : ''}` : sym} />
        <SummaryRow label="Date"      value={date ? format(new Date(date + 'T00:00:00'), 'EEE d MMMM yyyy') : '—'} />
        <SummaryRow label="Time"      value={time ? fmtTime(time) : '—'} />
      </div>

      {/* Staff assignment */}
      {staffList.length > 0 && (
        <div>
          <label className="label">Staff member (optional)</label>
          <select
            className="input"
            value={staff?.id || ''}
            onChange={e => {
              const s = staffList.find(x => x.id === e.target.value);
              onStaffChange(s || null);
            }}
          >
            <option value="">Any available staff</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.role ? ` — ${s.role}` : ''}</option>
            ))}
          </select>
        </div>
      )}

      {/* Internal notes */}
      <div>
        <label className="label">Internal notes</label>
        <textarea
          className="input resize-none"
          rows={3}
          placeholder="Add notes for your team…"
          value={notes}
          onChange={e => onNotesChange(e.target.value)}
        />
      </div>

      {/* No-show protection hint */}
      <div className="p-3 rounded-xl text-xs" style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)' }}>
        💳 <strong>Deposit & no-show protection</strong> — configurable on the payment settings page. This booking will be created without a deposit requirement.
      </div>
    </div>
  );
}

function SummaryRow({ label, value, sub }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderColor: 'var(--bam-border)' }}>
      <span className="text-xs font-bold uppercase tracking-wide w-20 flex-shrink-0" style={{ color: 'var(--bam-text-faint)' }}>{label}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--bam-text)' }}>{value || '—'}</p>
        {sub && <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Icons ────────────────────────────────────────────────────────────────── */
function XIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function SearchIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function CheckIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>; }
function PlusIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function ClockIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function ChevronLeftIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevronRightIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6"/></svg>; }
function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />; }
