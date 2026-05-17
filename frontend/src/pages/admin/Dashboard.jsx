import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

const StatCard = ({ label, value, color, icon }) => (
  <div className="card p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export default function Dashboard() {
  const { business } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingsAPI.list({ limit: 5 }).then(setData).finally(() => setLoading(false));
  }, []);

  const stats = data?.stats;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back, here's what's happening</p>
        </div>
        {business && (
          <a href={`/book/${business.slug}`} target="_blank" rel="noopener noreferrer" className="btn-primary self-start">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open Booking Page
          </a>
        )}
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Bookings" value={stats?.total} color="bg-primary-50" icon={<CalIcon />} />
          <StatCard label="Pending" value={stats?.pending} color="bg-yellow-50" icon={<ClockIcon />} />
          <StatCard label="Confirmed" value={stats?.confirmed} color="bg-green-50" icon={<CheckIcon />} />
          <StatCard label="Revenue" value={stats?.revenue ? `$${parseFloat(stats.revenue).toFixed(0)}` : '$0'} color="bg-blue-50" icon={<DollarIcon />} />
        </div>
      )}

      {/* Recent bookings */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
          <Link to="/admin/bookings" className="text-primary-600 text-sm font-medium hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : data?.bookings?.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-4xl mb-3">📅</p>
            <p className="font-medium">No bookings yet</p>
            <p className="text-sm">Share your booking page to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data?.bookings?.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-700">
                    {b.customer_name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{b.customer_name}</p>
                    <p className="text-xs text-gray-500">{b.service_name} · {b.start_time?.slice(0,5)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`badge-${b.status}`}>{b.status}</span>
                  <p className="text-xs text-gray-400 mt-1">{b.booking_date}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      {business && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickLink to="/admin/services" label="Manage Services" desc="Add or edit what you offer" />
          <QuickLink to="/admin/settings" label="Set Availability" desc="Configure your working hours" />
          <QuickLink to="/admin/settings" label="Share Booking Link" desc="Get your QR code & link" />
        </div>
      )}
    </div>
  );
}

const QuickLink = ({ to, label, desc }) => (
  <Link to={to} className="card p-4 hover:border-primary-200 hover:shadow-md transition-all group">
    <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">{label}</p>
    <p className="text-xs text-gray-500 mt-1">{desc}</p>
  </Link>
);

function CalIcon() { return <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function ClockIcon() { return <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function CheckIcon() { return <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>; }
function DollarIcon() { return <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
