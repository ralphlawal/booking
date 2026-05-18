import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const POLL_INTERVAL = 60_000; // 60 seconds

const STATUS_COLORS = { pending: 'badge-pending', confirmed: 'badge-confirmed', cancelled: 'badge-cancelled', completed: 'badge-completed' };
const STATUSES = ['all','pending','confirmed','cancelled','completed'];

const PAGE_SIZE = 20;

export default function Bookings() {
  const [data, setData] = useState({ bookings: [], stats: null, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null); // 'status' | 'reschedule'
  const [statusForm, setStatusForm] = useState({ status: '', cancelled_reason: '' });
  const [rescheduleForm, setRescheduleForm] = useState({ booking_date: '', start_time: '' });
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);
    bookingsAPI.list({ status: filter === 'all' ? undefined : filter, page, limit: PAGE_SIZE })
      .then(d => { setData(d); setLastUpdated(new Date()); })
      .finally(() => { if (!silent) setLoading(false); });
  }, [filter, page]);

  useEffect(() => {
    load();
    timerRef.current = setInterval(() => {
      if (!document.hidden) load(true);
    }, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const handleFilterChange = (s) => { setFilter(s); setPage(1); };

  const openStatus = (b) => { setSelected(b); setStatusForm({ status: b.status, cancelled_reason: '', no_show: false }); setModal('status'); };
  const openReschedule = (b) => { setSelected(b); setRescheduleForm({ booking_date: b.booking_date, start_time: b.start_time?.slice(0,5) }); setModal('reschedule'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const saveStatus = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await bookingsAPI.updateStatus(selected.id, statusForm.status, statusForm.cancelled_reason, statusForm.no_show);
      toast.success(statusForm.no_show ? 'Marked as no-show' : 'Status updated');
      closeModal();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveReschedule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await bookingsAPI.reschedule(selected.id, rescheduleForm);
      toast.success('Booking rescheduled');
      closeModal();
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return data.bookings;
    const q = search.toLowerCase();
    return data.bookings.filter(b =>
      b.customer_name?.toLowerCase().includes(q) ||
      b.customer_email?.toLowerCase().includes(q) ||
      b.customer_phone?.toLowerCase().includes(q) ||
      b.reference_id?.toLowerCase().includes(q) ||
      b.service_name?.toLowerCase().includes(q)
    );
  }, [data.bookings, search]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage all your appointments</p>
        </div>
        <button
          onClick={() => load(false)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 transition-colors mt-1 flex-shrink-0"
          title="Refresh bookings"
        >
          <RefreshIcon />
          {lastUpdated && (
            <span className="hidden sm:inline text-xs">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </button>
      </div>

      {/* Stats strip */}
      {data.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[['Total',data.stats.total,'text-gray-700'],['Pending',data.stats.pending,'text-yellow-600'],['Confirmed',data.stats.confirmed,'text-green-600'],['Cancelled',data.stats.cancelled,'text-red-500']].map(([l,v,c]) => (
            <div key={l} className="card px-4 py-3 text-center">
              <p className={`text-xl font-bold ${c}`}>{v}</p>
              <p className="text-xs text-gray-500">{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            placeholder="Search customer, reference…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XSmIcon />
            </button>
          )}
        </div>

        {/* Status filter — scrollable on mobile */}
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-max">
            {STATUSES.map(s => (
              <button key={s} onClick={() => handleFilterChange(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all whitespace-nowrap ${filter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count when searching */}
      {search && (
        <p className="text-sm text-gray-500">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "<span className="font-medium text-gray-700">{search}</span>"
        </p>
      )}

      {/* Desktop table / Mobile cards */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-medium">{search ? 'No matching bookings' : 'No bookings found'}</p>
            {search && <button onClick={() => setSearch('')} className="text-sm text-primary-600 mt-1 hover:underline">Clear search</button>}
          </div>
        ) : (
          <>
            {/* Desktop table — hidden on mobile */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-left">
                    {['Reference','Customer','Service','Date & Time','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-primary-700 font-bold">{b.reference_id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{b.customer_name}</p>
                        <p className="text-xs text-gray-400">{b.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p>{b.service_name}</p>
                        <p className="text-xs text-gray-400">£{parseFloat(b.service_price || 0).toFixed(2)}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p>{b.booking_date}</p>
                        <p className="text-xs text-gray-400">{b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}</p>
                      </td>
                      <td className="px-4 py-3"><span className={STATUS_COLORS[b.status]}>{b.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openStatus(b)} className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors">Status</button>
                          {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <button onClick={() => openReschedule(b)} className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors">Reschedule</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards — shown only on mobile */}
            <div className="md:hidden divide-y divide-gray-50">
              {filtered.map(b => (
                <div key={b.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
                        {b.customer_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{b.customer_name}</p>
                        <p className="text-xs text-gray-400">{b.customer_phone}</p>
                      </div>
                    </div>
                    <span className={`${STATUS_COLORS[b.status]} flex-shrink-0`}>{b.status}</span>
                  </div>
                  <div className="ml-11 space-y-1">
                    <p className="text-sm text-gray-700">{b.service_name} · <span className="font-semibold">£{parseFloat(b.service_price || 0).toFixed(2)}</span></p>
                    <p className="text-xs text-gray-400">{b.booking_date} · {b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}</p>
                    <p className="text-xs font-mono text-primary-600">{b.reference_id}</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => openStatus(b)} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors font-medium">Update Status</button>
                      {b.status !== 'cancelled' && b.status !== 'completed' && (
                        <button onClick={() => openReschedule(b)} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors font-medium">Reschedule</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {!search && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * PAGE_SIZE >= data.total || loading}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Status modal */}
      {modal === 'status' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold">Update Status</h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg"><XIcon /></button>
            </div>
            <form onSubmit={saveStatus} className="p-5 space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-3">{selected?.reference_id} · {selected?.customer_name}</p>
                <label className="label">New Status</label>
                <select className="input" value={statusForm.status} onChange={e => setStatusForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {statusForm.status === 'cancelled' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none p-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-amber-500"
                      checked={statusForm.no_show}
                      onChange={e => setStatusForm(p => ({ ...p, no_show: e.target.checked, cancelled_reason: e.target.checked ? 'No-show' : '' }))}
                    />
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Mark as no-show</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400">Records a no-show on the customer's profile</p>
                    </div>
                  </label>
                  {!statusForm.no_show && (
                    <div>
                      <label className="label">Cancellation Reason</label>
                      <input className="input" placeholder="Optional reason…" value={statusForm.cancelled_reason} onChange={e => setStatusForm(p => ({ ...p, cancelled_reason: e.target.value }))} />
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Spinner /> : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {modal === 'reschedule' && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold">Reschedule Booking</h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg"><XIcon /></button>
            </div>
            <form onSubmit={saveReschedule} className="p-5 space-y-4">
              <p className="text-sm text-gray-500">{selected?.reference_id} · {selected?.customer_name} · {selected?.service_name}</p>
              <div>
                <label className="label">New Date</label>
                <input className="input" type="date" required value={rescheduleForm.booking_date} onChange={e => setRescheduleForm(p => ({ ...p, booking_date: e.target.value }))} />
              </div>
              <div>
                <label className="label">New Start Time</label>
                <input className="input" type="time" required value={rescheduleForm.start_time} onChange={e => setRescheduleForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Spinner /> : 'Reschedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />; }
function XIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function XSmIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function SearchIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function RefreshIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>; }
