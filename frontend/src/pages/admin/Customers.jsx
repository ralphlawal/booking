import React, { useEffect, useState, useRef } from 'react';
import { ClipboardList, Users, AlertTriangle } from 'lucide-react';
import { customersAPI } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  pending: 'badge-pending',
  confirmed: 'badge-confirmed',
  cancelled: 'badge-cancelled',
  completed: 'badge-completed',
};

function CustomerPanel({ customer, onClose }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);

  useEffect(() => {
    customersAPI.getBookings(customer.id)
      .then(setBookings)
      .catch(() => toast.error('Could not load bookings'))
      .finally(() => setLoading(false));
  }, [customer.id]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const revenue = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + parseFloat(b.service_price || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 animate-fade-in">
      <div
        ref={panelRef}
        className="w-full max-w-md bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl animate-slide-up sm:animate-none"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-base font-bold text-primary-700 dark:text-primary-400">
              {customer.full_name[0].toUpperCase()}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{customer.full_name}</h2>
              <p className="text-xs text-gray-400">
                Customer since {customer.created_at?.slice(0, 10)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Contact info */}
          <div className="card p-4 space-y-2">
            {customer.phone && (
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors"
              >
                <PhoneIcon />
                {customer.phone}
              </a>
            )}
            {customer.email && (
              <a
                href={`mailto:${customer.email}`}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors"
              >
                <MailIcon />
                {customer.email}
              </a>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-gray-900 dark:text-white">{customer.total_bookings}</p>
              <p className="text-xs text-gray-400 mt-0.5">Bookings</p>
            </div>
            <div className="card p-3 text-center">
              <p className={`text-xl font-bold ${customer.no_shows > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                {customer.no_shows}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">No-shows</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">£{revenue.toFixed(0)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Revenue</p>
            </div>
          </div>

          {/* Booking history */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Booking History</h3>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="card p-6 text-center text-gray-400">
                <ClipboardList className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                <p className="text-sm">No bookings yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.map(b => (
                  <div key={b.id} className="card p-3.5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {b.service_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {b.booking_date} · {b.start_time?.slice(0, 5)}
                      </p>
                      <p className="text-xs font-mono text-primary-500 mt-0.5">{b.reference_id}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={STATUS_COLORS[b.status]}>{b.status}</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        £{parseFloat(b.service_price || 0).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    customersAPI.list().then(setCustomers).finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-gray-500 text-sm mt-0.5">{customers.length} total customers</p>
        </div>
        <input
          className="input sm:w-64"
          placeholder="Search name, phone, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="font-medium">{search ? 'No matching customers' : 'No customers yet'}</p>
            <p className="text-sm mt-1">Customers are added automatically when they book</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100 dark:border-gray-800">
                  <tr className="text-left">
                    {['Customer', 'Contact', 'Bookings', 'No-Shows', 'First Seen'].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-400">
                            {c.full_name[0].toUpperCase()}
                          </div>
                          <span className="font-medium dark:text-white">{c.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 dark:text-gray-300">
                        <p>{c.phone || '—'}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{c.email || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900 dark:text-white">{c.total_bookings}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${c.no_shows > 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
                            {c.no_shows}
                          </span>
                          {c.no_shows > 0 && c.total_bookings > 0 && (
                            <span className="text-xs text-gray-400">
                              ({Math.round((c.no_shows / c.total_bookings) * 100)}%)
                            </span>
                          )}
                          {c.no_shows >= 2 && <AlertTriangle className="w-3.5 h-3.5 text-red-500 dark:text-red-400 inline-block" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm">
                        {c.created_at?.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-400 flex-shrink-0">
                    {c.full_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white">{c.full_name}</p>
                    <p className="text-xs text-gray-400">{c.phone || c.email || 'No contact'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{c.total_bookings}</p>
                    <p className="text-xs text-gray-400">bookings</p>
                  </div>
                  <ChevronIcon />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selected && <CustomerPanel customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
