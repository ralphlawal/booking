import React, { useEffect, useState, useCallback } from 'react';
import { bookingsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: 'badge-pending', confirmed: 'badge-confirmed', cancelled: 'badge-cancelled', completed: 'badge-completed' };
const STATUSES = ['all','pending','confirmed','cancelled','completed'];

export default function Bookings() {
  const [data, setData] = useState({ bookings: [], stats: null });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null); // 'status' | 'reschedule'
  const [statusForm, setStatusForm] = useState({ status: '', cancelled_reason: '' });
  const [rescheduleForm, setRescheduleForm] = useState({ booking_date: '', start_time: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    bookingsAPI.list({ status: filter === 'all' ? undefined : filter })
      .then(setData).finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openStatus = (b) => { setSelected(b); setStatusForm({ status: b.status, cancelled_reason: '' }); setModal('status'); };
  const openReschedule = (b) => { setSelected(b); setRescheduleForm({ booking_date: b.booking_date, start_time: b.start_time?.slice(0,5) }); setModal('reschedule'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const saveStatus = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await bookingsAPI.updateStatus(selected.id, statusForm.status, statusForm.cancelled_reason);
      toast.success('Status updated');
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

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage all your appointments</p>
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

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${filter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : data.bookings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-medium">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr className="text-left">
                  {['Reference','Customer','Service','Date & Time','Status','Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary-700 font-bold">{b.reference_id}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.customer_name}</p>
                      <p className="text-xs text-gray-400">{b.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{b.service_name}</p>
                      <p className="text-xs text-gray-400">${parseFloat(b.service_price).toFixed(2)}</p>
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
        )}
      </div>

      {/* Status modal */}
      {modal === 'status' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
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
                <div>
                  <label className="label">Cancellation Reason</label>
                  <input className="input" placeholder="Optional reason…" value={statusForm.cancelled_reason} onChange={e => setStatusForm(p => ({ ...p, cancelled_reason: e.target.value }))} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
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
