import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { CalendarDays, CheckCircle2, ClipboardList, ExternalLink, MessageSquare, Sparkles, Target, TrendingUp, Camera, Share2 } from 'lucide-react';
import { bookingsAPI, servicesAPI, availabilityAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#10b981', cancelled: '#ef4444', completed: '#6366f1' };
const PIE_PALETTE = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'];

const StatCard = ({ label, value, color, darkColor, icon }) => (
  <div className="app-panel p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${color} ${darkColor}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">{value ?? '—'}</p>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{label}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {prefix}{typeof p.value === 'number' ? p.value.toFixed(0) : p.value}
        </p>
      ))}
    </div>
  );
};

function GrowthCockpit({ stats, business, checklist }) {
  const totalBookings = Number(stats?.total || 0);
  const pending = Number(stats?.pending || 0);
  const confirmed = Number(stats?.confirmed || 0);
  const weeklyGoal = Math.max(10, Math.ceil((totalBookings + 4) / 5) * 5);
  const progress = Math.min(100, Math.round((totalBookings / weeklyGoal) * 100));
  const profileMissing = [
    !business?.description,
    !business?.logo_url,
    !business?.phone,
    !business?.location,
    !business?.category,
  ].filter(Boolean).length;
  const profileScore = Math.round(((5 - profileMissing) / 5) * 100);

  const actions = [
    pending > 0 && { label: 'Confirm pending bookings', desc: `${pending} customer${pending === 1 ? '' : 's'} waiting`, to: '/admin/bookings', Icon: CheckCircle2, tone: 'green' },
    checklist && { label: 'Finish setup', desc: 'Services and availability unlock bookings', to: '/admin/settings', Icon: Target, tone: 'primary' },
    { label: 'Post an update', desc: 'Show availability, offers, or fresh work', to: '/admin/posts', Icon: Camera, tone: 'purple' },
    business && { label: 'Share booking link', desc: 'Use it in WhatsApp, Instagram, and Google', to: '/admin/settings', Icon: Share2, tone: 'blue' },
  ].filter(Boolean).slice(0, 4);

  const toneClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    primary: 'bg-primary-50 dark:bg-primary-900/25 text-primary-700 dark:text-primary-300',
    purple: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="app-panel p-5 bg-gradient-to-br from-primary-950 to-primary-800 text-white border-primary-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary-200">Weekly momentum</p>
            <h2 className="text-2xl font-black mt-1">{totalBookings}/{weeklyGoal} bookings</h2>
            <p className="text-sm text-primary-100 mt-1">
              {progress >= 100
                ? 'Goal hit. Push a post now and keep the week moving.'
                : `${weeklyGoal - totalBookings} more booking${weeklyGoal - totalBookings === 1 ? '' : 's'} to hit this week’s stretch goal.`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-100" />
          </div>
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-xs text-primary-100 mb-1.5">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="rounded-lg bg-white/10 p-2">
            <p className="text-lg font-black">{pending}</p>
            <p className="text-[11px] text-primary-100">pending</p>
          </div>
          <div className="rounded-lg bg-white/10 p-2">
            <p className="text-lg font-black">{confirmed}</p>
            <p className="text-[11px] text-primary-100">confirmed</p>
          </div>
          <div className="rounded-lg bg-white/10 p-2">
            <p className="text-lg font-black">{profileScore}%</p>
            <p className="text-[11px] text-primary-100">profile</p>
          </div>
        </div>
      </div>

      <div className="app-panel p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary-600 dark:text-primary-400">Action queue</p>
            <h2 className="font-bold text-gray-900 dark:text-white">Do this next</h2>
          </div>
          <Sparkles className="w-5 h-5 text-primary-500" />
        </div>
        <div className="space-y-2.5">
          {actions.map(({ label, desc, to, Icon, tone }) => (
            <Link key={label} to={to} className="app-list-row p-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${toneClasses[tone]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { business } = useAuth();
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [checklist, setChecklist] = useState(null);
  const [confirming, setConfirming] = useState(null);

  const loadBookings = useCallback(() => {
    bookingsAPI.list({ limit: 5 })
      .then(d => setData(d))
      .catch(() => toast.error('Could not load bookings — check your connection'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadBookings();
    bookingsAPI.getAnalytics()
      .then(setAnalytics)
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, []);

  const quickConfirm = async (bookingId) => {
    setConfirming(bookingId);
    try {
      await bookingsAPI.updateStatus(bookingId, 'confirmed');
      toast.success('Booking confirmed');
      loadBookings();
    } catch {
      toast.error('Failed to confirm');
    } finally {
      setConfirming(null);
    }
  };

  useEffect(() => {
    if (!business) return;
    Promise.all([servicesAPI.list(), availabilityAPI.get()]).then(([svcs, avail]) => {
      const hasServices = svcs?.length > 0;
      const hasAvailability = !!avail?.working_days?.length;
      if (!hasServices || !hasAvailability) setChecklist({ hasServices, hasAvailability });
    }).catch(() => {});
  }, [business]);

  const stats = data?.stats;
  const chartData = analytics?.daily?.map(d => ({
    date: d.date?.slice(5),
    Bookings: parseInt(d.bookings) || 0,
    Revenue: parseFloat(d.revenue) || 0,
  })) || [];

  const statusData = analytics?.statusBreakdown?.map(s => ({
    name: s.status,
    value: parseInt(s.count) || 0,
  })) || [];

  const topServices = analytics?.topServices || [];

  return (
    <div className="page-shell animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <p className="page-kicker">Business workspace</p>
          <h1 className="page-title">Today at {business?.name || 'your business'}</h1>
          <p className="page-sub">Bookings, money, setup, and customer actions in one place.</p>
        </div>
        {business && (
          <a href={`/book/${business.slug}`} target="_blank" rel="noopener noreferrer" className="btn-primary self-start">
            <ExternalLink className="w-4 h-4" />
            Open Booking Page
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.9fr] gap-4">
        <div className="surface p-5 sm:p-6 bg-white dark:bg-gray-900">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-gray-900 dark:text-white">Your next best move</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {stats?.pending > 0
                  ? `You have ${stats.pending} booking${stats.pending === 1 ? '' : 's'} waiting. Confirm or message customers while intent is fresh.`
                  : checklist
                    ? 'Finish services and availability before sharing your booking link widely.'
                    : 'Share a post or your booking link to bring customers back today.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Link to="/admin/bookings" className="btn-primary text-xs"><ClipboardList className="w-3.5 h-3.5" />Review bookings</Link>
                <Link to="/admin/messages" className="btn-secondary text-xs"><MessageSquare className="w-3.5 h-3.5" />Messages</Link>
                <Link to="/admin/posts" className="btn-secondary text-xs">Post update</Link>
              </div>
            </div>
          </div>
        </div>

        {business && (
          <div className="surface-soft p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Booking link</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate mt-2">/book/{business.slug}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keep this visible on Instagram, Google, WhatsApp, and your bio.</p>
            <div className="flex gap-2 mt-4">
              <a href={`/book/${business.slug}`} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs flex-1">Preview</a>
              <Link to="/admin/settings" className="btn-primary text-xs flex-1">Share tools</Link>
            </div>
          </div>
        )}
      </div>

      {/* Profile completeness banner */}
      {business && (() => {
        const missing = [
          !business.location && 'Add your business address',
          !business.category && 'Choose a category',
          !business.description && 'Write a short description',
          !business.logo_url && 'Upload a logo',
          !business.phone && 'Add a contact phone number',
        ].filter(Boolean);
        const pct = Math.round(((5 - missing.length) / 5) * 100);
        if (missing.length === 0) return null;
        return (
          <div className="app-panel p-4 border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/10">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Complete your profile — {pct}% done</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">A complete profile gets up to 3× more bookings</p>
              </div>
              <a href={pct < 40 ? '/admin/onboarding' : '/admin/settings'} className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors whitespace-nowrap">
                {pct < 40 ? 'Start setup →' : 'Complete →'}
              </a>
            </div>
            <div className="h-1.5 bg-amber-200 dark:bg-amber-800 rounded-full mb-3">
              <div className="h-1.5 bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex flex-wrap gap-2">
              {missing.map(m => (
                <span key={m} className="text-[11px] bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg font-medium">
                  + {m}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Go-live checklist */}
      {checklist && (
        <div className="app-panel p-5 border-l-4 border-l-primary-500">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white mb-1">Finish setting up your page</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Complete these steps before sharing your booking link.</p>
              <div className="space-y-2.5">
                <ChecklistItem done label="Account created" />
                <ChecklistItem done label="Business profile set up" />
                <ChecklistItem done={checklist.hasServices} label="Add at least one service" linkTo="/admin/services" linkLabel="Add service" />
                <ChecklistItem done={checklist.hasAvailability} label="Set your working hours" linkTo="/admin/settings" linkLabel="Set availability" />
                <ChecklistItem done={checklist.hasServices && checklist.hasAvailability} label="Share your booking link" linkTo={`/book/${business?.slug}`} linkLabel="Open link" external />
              </div>
            </div>
            <button onClick={() => setChecklist(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      )}

      {!loading && (
        <GrowthCockpit stats={stats} business={business} checklist={checklist} />
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Bookings" value={stats?.total} color="bg-primary-50" darkColor="dark:bg-primary-900/30" icon={<CalIcon />} />
          <StatCard label="Pending" value={stats?.pending} color="bg-yellow-50" darkColor="dark:bg-yellow-900/30" icon={<ClockIcon />} />
          <StatCard label="Confirmed" value={stats?.confirmed} color="bg-green-50" darkColor="dark:bg-green-900/30" icon={<CheckIcon />} />
          <StatCard label="Revenue" value={stats?.revenue ? `£${parseFloat(stats.revenue).toFixed(0)}` : '£0'} color="bg-blue-50" darkColor="dark:bg-blue-900/30" icon={<DollarIcon />} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings trend */}
        <div className="app-panel p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Bookings — Last 30 Days</h3>
          {analyticsLoading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : chartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Bookings" stroke="#6366f1" strokeWidth={2} fill="url(#bookGrad)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown */}
        <div className="app-panel p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
          {analyticsLoading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : statusData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name] || PIE_PALETTE[i % PIE_PALETTE.length]} />
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{v}</span>}
                />
                <Tooltip formatter={(v, n) => [v, <span style={{ textTransform: 'capitalize' }}>{n}</span>]} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue & top services row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="app-panel p-5 lg:col-span-2">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Revenue — Last 30 Days</h3>
          {analyticsLoading ? (
            <div className="h-48 bg-gray-50 rounded-lg animate-pulse" />
          ) : chartData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip prefix="£" />} />
                <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top services */}
        <div className="app-panel p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Top Services</h3>
          {analyticsLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : topServices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center pt-8">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topServices.map((s, i) => {
                const max = parseInt(topServices[0]?.count) || 1;
                const pct = Math.round((parseInt(s.count) / max) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium truncate pr-2">{s.name}</span>
                      <span className="text-gray-400 flex-shrink-0">{s.count}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent bookings */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">Recent Bookings</h2>
          <Link to="/admin/bookings" className="text-primary-600 text-sm font-medium hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : data?.bookings?.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <div className="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6 text-primary-400" />
            </div>
            <p className="font-medium">No bookings yet</p>
            <p className="text-sm">Share your booking page to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {data?.bookings?.slice(0, 5).map(b => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors gap-3">
                <Link to="/admin/bookings" className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-400 flex-shrink-0">
                    {b.customer_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{b.customer_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{b.service_name} · {b.booking_date} · {b.start_time?.slice(0,5)}</p>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {b.status === 'pending' ? (
                    <button
                      onClick={() => quickConfirm(b.id)}
                      disabled={confirming === b.id}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-semibold border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {confirming === b.id ? (
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Confirm</span>
                      )}
                    </button>
                  ) : (
                    <span className={`badge-${b.status}`}>{b.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      {business && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <QuickLink to="/admin/posts" label="Create a Post" desc="Share offers, availability, and updates" />
          <QuickLink to="/admin/services" label="Manage Services" desc="Add or edit what you offer" />
          <QuickLink to="/admin/settings" label="Set Availability" desc="Configure your working hours" />
          <QuickLink to="/admin/settings" label="Share Booking Link" desc="Get your QR code & link" />
        </div>
      )}
    </div>
  );
}

const EmptyChart = () => (
  <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
);

const ChecklistItem = ({ done, label, linkTo, linkLabel, external }) => (
  <div className="flex items-center gap-3">
    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
      {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>}
    </div>
    <span className={`text-sm flex-1 ${done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>{label}</span>
    {!done && linkTo && (
      external
        ? <a href={linkTo} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline">{linkLabel} →</a>
        : <Link to={linkTo} className="text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline">{linkLabel} →</Link>
    )}
  </div>
);

const QuickLink = ({ to, label, desc }) => (
  <Link to={to} className="app-panel p-4 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-md transition-all group">
    <p className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors">{label}</p>
    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
  </Link>
);

function CalIcon() { return <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function ClockIcon() { return <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function CheckIcon() { return <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>; }
function DollarIcon() { return <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
