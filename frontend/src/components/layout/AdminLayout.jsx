import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { bookingsAPI, businessAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import { copyText, nativeTapFeedback, openExternalLink, publicWebUrl } from '../../services/nativeBridge';
import toast from 'react-hot-toast';
import VerifyRequired from '../shared/VerifyRequired';

function fmtNotifTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  if (diffMs < 60000) return 'Just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ── Sidebar nav groups ──────────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'Manage',
    items: [
      { to: '/admin/dashboard', icon: GridIcon,         label: 'Dashboard' },
      { to: '/admin/bookings',  icon: CalendarCheckIcon, label: 'Bookings', badge: true },
      { to: '/admin/calendar',  icon: CalendarIcon,      label: 'Calendar' },
    ],
  },
  {
    label: 'Business',
    items: [
      { to: '/admin/services',  icon: TagIcon,      label: 'Services' },
      { to: '/admin/staff',     icon: StaffIcon,    label: 'Staff' },
      { to: '/admin/resources', icon: ResourceIcon, label: 'Resources' },
      { to: '/admin/customers', icon: UsersIcon,    label: 'Customers' },
      { to: '/admin/posts',     icon: PostsIcon,    label: 'Posts' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/admin/growth',       icon: GrowthIcon,    label: 'Growth' },
      { to: '/admin/retention',    icon: RetentionIcon, label: 'Retention' },
      { to: '/admin/operations',   icon: ChartIcon,     label: 'Operations' },
      { to: '/admin/intelligence', icon: GrowthIcon,    label: 'Intelligence' },
      { to: '/admin/messages',     icon: MessageIcon,   label: 'Messages' },
      { to: '/admin/notifications',icon: BellIcon,      label: 'Notify' },
      { to: '/admin/staff-report', icon: ChartIcon,     label: 'Reports' },
      { to: '/admin/settings',     icon: SettingsIcon,  label: 'Settings' },
    ],
  },
];

/* ── Mobile bottom nav (4 items + More) ─────────────────────────────────── */
const BOTTOM_NAV = [
  { to: '/admin/dashboard', icon: GridIcon,         label: 'Home' },
  { to: '/admin/bookings',  icon: CalendarCheckIcon, label: 'Bookings', badge: true },
  { to: '/admin/calendar',  icon: CalendarIcon,      label: 'Calendar' },
  { to: '/admin/messages',  icon: MessageIcon,       label: 'Messages' },
];

/* ── "More" sheet items ──────────────────────────────────────────────────── */
const MORE_ITEMS = [
  { to: '/admin/services',     icon: TagIcon,      label: 'Services' },
  { to: '/admin/staff',        icon: StaffIcon,    label: 'Staff' },
  { to: '/admin/resources',    icon: ResourceIcon, label: 'Resources' },
  { to: '/admin/customers',    icon: UsersIcon,    label: 'Customers' },
  { to: '/admin/posts',        icon: PostsIcon,    label: 'Posts' },
  { to: '/admin/growth',       icon: GrowthIcon,   label: 'Growth' },
  { to: '/admin/retention',    icon: RetentionIcon,label: 'Retention' },
  { to: '/admin/operations',   icon: ChartIcon,    label: 'Operations' },
  { to: '/admin/intelligence', icon: GrowthIcon,   label: 'Intelligence' },
  { to: '/admin/notifications',icon: BellIcon,     label: 'Notify' },
  { to: '/admin/staff-report', icon: ChartIcon,    label: 'Reports' },
  { to: '/admin/settings',     icon: SettingsIcon, label: 'Settings' },
];

export default function AdminLayout() {
  const { user, business, loading, logout, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen]         = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [copied, setCopied]             = useState(false);
  const [emailUnverified, setEmailUnverified]   = useState(false);
  const [resendingVerif, setResendingVerif]     = useState(false);
  const [notifCount, setNotifCount]     = useState(0);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [notifItems, setNotifItems]     = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifPanelRef                   = useRef(null);

  /* Close More sheet on route change */
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!loading && !business) {
      navigate('/admin/onboarding', { replace: true });
    }
  }, [business, loading, navigate]);

  useEffect(() => {
    if (!loading) setEmailUnverified(!!user && user.email && !user.email_verified);
  }, [user, loading]);

  const refreshPendingCount = useCallback(() => {
    bookingsAPI.list({ status: 'pending', limit: 200 })
      .then(data => setPendingCount(data?.total ?? data?.bookings?.length ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshPendingCount();
    const timer = setInterval(() => {
      if (!document.hidden) refreshPendingCount();
    }, 30000);
    const onFocus = () => refreshPendingCount();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshPendingCount]);

  useEffect(() => {
    if (location.pathname.startsWith('/admin/bookings')) refreshPendingCount();
  }, [location.pathname, refreshPendingCount]);

  /* Notification count polling */
  const refreshNotifCount = useCallback(() => {
    businessAPI.getNotificationCount()
      .then(data => setNotifCount(data?.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshNotifCount();
    const t = setInterval(() => { if (!document.hidden) refreshNotifCount(); }, 30000);
    window.addEventListener('focus', refreshNotifCount);
    return () => { clearInterval(t); window.removeEventListener('focus', refreshNotifCount); };
  }, [refreshNotifCount]);

  /* Click outside closes notification panel */
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  const openNotifPanel = useCallback(async () => {
    if (notifOpen) { setNotifOpen(false); return; }
    setNotifOpen(true);
    setNotifLoading(true);
    try {
      const data = await businessAPI.getNotifications();
      setNotifItems(Array.isArray(data) ? data : (data?.notifications ?? []));
      setNotifCount(0);
      businessAPI.markNotificationsRead().catch(() => {});
    } catch {}
    setNotifLoading(false);
  }, [notifOpen]);

  const handleResendVerif = async () => {
    setResendingVerif(true);
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent — check your inbox');
    } catch {
      toast.error('Failed to send — try again later');
    } finally {
      setResendingVerif(false);
    }
  };

  const bookingUrl = business ? publicWebUrl(`/book/${business.slug}`) : null;

  const copyLink = useCallback(async () => {
    if (!bookingUrl) return;
    try {
      const ok = await copyText(bookingUrl);
      if (!ok) throw new Error();
      setCopied(true);
      toast.success('Booking link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Could not copy link'); }
  }, [bookingUrl]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const canGoBack = location.pathname !== '/admin/dashboard';
  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/admin/dashboard');
  };

  /* Sidebar nav-link builder */
  const sidebarLink = ({ to, icon: Icon, label, badge }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-primary-sm'
            : 'text-[--bam-text-muted] hover:bg-[--bam-surface-hover] hover:text-[--bam-text]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{label}</span>
          {badge && pendingCount > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none ${isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: 'var(--bam-bg)' }}>

      {/* ── Desktop sidebar (lg+) ─────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 border-r"
        style={{
          background: 'var(--bam-sidebar)',
          borderColor: 'var(--bam-border)',
          boxShadow: '4px 0 24px rgba(91,63,234,0.06)',
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center px-5 border-b flex-shrink-0"
          style={{
            height: 'calc(4rem + env(safe-area-inset-top, 0px))',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            borderColor: 'var(--bam-border)',
          }}
        >
          <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain" />
        </div>

        {/* Booking page quick-link */}
        {business && (
          <div
            className="mx-3 mt-3 p-3 rounded-xl border"
            style={{ background: '#f0f0ff', borderColor: '#cdc9fe' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-500">Your booking page</p>
            <p className="text-sm font-bold text-primary-800 truncate mt-0.5">/book/{business.slug}</p>
            <button
              onClick={copyLink}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 bg-primary-100/70 hover:bg-primary-100 rounded-lg py-1.5 transition-colors"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy booking link'}
            </button>
          </div>
        )}

        {/* Sectioned nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-hide">
          {NAV_GROUPS.map(({ label, items }) => (
            <div key={label}>
              <p className="nav-section-label">{label}</p>
              <div className="space-y-0.5 mt-1">
                {items.map(item => sidebarLink(item))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t p-4 flex-shrink-0" style={{ borderColor: 'var(--bam-border)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--bam-text)' }}>{user?.full_name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--bam-text-faint)' }}>{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0"
            >
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header
          className="flex-shrink-0 backdrop-blur-xl border-b"
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderColor: 'var(--bam-border)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            boxShadow: '0 1px 0 rgba(91,63,234,0.06)',
          }}
        >
          <div className="min-h-14 lg:min-h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 lg:py-0">
            {canGoBack && (
              <button
                onClick={goBack}
                className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-100"
                style={{ color: 'var(--bam-text-muted)' }}
                aria-label="Go back"
              >
                <BackIcon className="w-5 h-5" />
              </button>
            )}

            {/* Mobile: logo centered */}
            <div className="lg:hidden absolute left-1/2 -translate-x-1/2 pointer-events-none max-w-[42vw]">
              <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-7 sm:h-8 w-auto object-contain" />
            </div>

            {/* Desktop: spacer */}
            <div className="hidden lg:block" />

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto" ref={notifPanelRef}>
              {/* Notification bell */}
              <div className="relative">
                <button
                  onClick={openNotifPanel}
                  title="Notifications"
                  className="relative p-2 rounded-xl transition-colors hover:bg-gray-100"
                  style={{ color: notifOpen ? 'var(--bam-primary)' : 'var(--bam-text-muted)' }}
                >
                  <BellIcon className="w-5 h-5" />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none border-2 border-white">
                      {notifCount > 99 ? '99+' : notifCount}
                    </span>
                  )}
                </button>

                {/* Notification dropdown panel */}
                {notifOpen && (
                  <div
                    className="absolute right-0 top-full mt-1 w-80 rounded-2xl border shadow-xl z-[200] overflow-hidden"
                    style={{ background: 'var(--bam-surface)', borderColor: 'var(--bam-border)' }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--bam-border)' }}>
                      <p className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>Notifications</p>
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="text-xs font-medium"
                        style={{ color: 'var(--bam-primary)' }}
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : notifItems.length === 0 ? (
                        <div className="py-10 text-center">
                          <BellIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                          <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>No notifications yet</p>
                        </div>
                      ) : (
                        notifItems.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => { setNotifOpen(false); if (n.link) navigate(n.link); }}
                            className="w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-gray-50 flex gap-3 items-start"
                            style={{ borderColor: 'var(--bam-border)' }}
                          >
                            <div
                              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                              style={{ background: n.is_read ? 'var(--bam-border)' : 'var(--bam-primary)' }}
                            >
                              {n.type === 'booking_new' ? '📅' : n.type === 'message' ? '💬' : n.type === 'review' ? '⭐' : '🔔'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--bam-text)' }}>{n.title}</p>
                              {n.body && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>{n.body}</p>}
                              <p className="text-[10px] mt-1" style={{ color: 'var(--bam-text-faint)' }}>{fmtNotifTime(n.created_at)}</p>
                            </div>
                            {!n.is_read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--bam-primary)' }} />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {business && (
                <>
                  <button
                    onClick={copyLink}
                    title="Copy booking link"
                    className="lg:hidden p-2 rounded-xl transition-colors hover:bg-gray-100"
                    style={{ color: 'var(--bam-text-muted)' }}
                  >
                    {copied
                      ? <CheckIcon className="w-5 h-5 text-green-500" />
                      : <CopyIcon className="w-5 h-5" />
                    }
                  </button>
                  <a
                    href={publicWebUrl(`/book/${business.slug}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => openExternalLink(e, publicWebUrl(`/book/${business.slug}`))}
                    className="btn-secondary text-xs hidden sm:flex gap-1.5 !py-1.5"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                    View Page
                  </a>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="native-scroll flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 lg:pb-6 pb-admin-nav"
          data-native-scroll="true"
          style={{
            background: 'var(--bam-bg)',
            color: 'var(--bam-text)',
            paddingLeft:  'max(0.75rem, env(safe-area-inset-left, 0px))',
            paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
          }}
        >
          {emailUnverified && (
            <div className="mb-4 sm:mb-5 bg-amber-50 border border-amber-200 rounded-xl px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <p className="text-xs text-amber-800 font-medium">
                Your email address is not verified. Check your inbox for a verification link.
              </p>
              <button
                onClick={handleResendVerif}
                disabled={resendingVerif}
                className="text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap disabled:opacity-50 flex-shrink-0 self-start sm:self-auto"
              >
                {resendingVerif ? 'Sending…' : 'Resend →'}
              </button>
            </div>
          )}

          {emailUnverified ? (
            <VerifyRequired type="business" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* ── Mobile bottom nav (lg:hidden) ────────────────────────────────── */}
      <nav
        className="admin-bottom-nav lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderColor: 'var(--bam-border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft:   'env(safe-area-inset-left, 0px)',
          paddingRight:  'env(safe-area-inset-right, 0px)',
          boxShadow: '0 -4px 24px rgba(91,63,234,0.07)',
        }}
      >
        {BOTTOM_NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => { setMoreOpen(false); nativeTapFeedback(); }}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 min-h-[64px] gap-0.5 text-[10px] font-bold transition-colors relative tap-highlight-none ${
                isActive ? 'text-gray-900' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                )}
                <div
                  className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive ? 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-sm scale-110' : ''
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  {badge && pendingCount > 0 && !isActive && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none border-2 border-white">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={() => { nativeTapFeedback(); setMoreOpen(v => !v); }}
          className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[64px] gap-0.5 text-[10px] font-bold transition-colors relative tap-highlight-none ${
            moreOpen ? 'text-gray-900' : 'text-gray-400'
          }`}
        >
          {moreOpen && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
              moreOpen ? 'bg-gradient-to-br from-primary-500 to-primary-700 shadow-primary-sm scale-110' : ''
            }`}
          >
            <MoreIcon className={`w-5 h-5 ${moreOpen ? 'text-white' : ''}`} />
          </div>
          <span className="leading-none">More</span>
        </button>
      </nav>

      {/* ── More bottom sheet ─────────────────────────────────────────────── */}
      {moreOpen && (
        <>
          <motion.div
            key="more-backdrop"
            className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMoreOpen(false)}
          />

          <motion.div
            key="more-sheet"
            className="lg:hidden fixed left-0 right-0 z-50 rounded-t-3xl border-t overflow-y-auto native-more-sheet"
            style={{
              background: '#ffffff',
              borderColor: 'var(--bam-border)',
              bottom: `calc(var(--admin-nav-height) - env(safe-area-inset-bottom, 0px))`,
              maxHeight: 'min(72dvh, 640px)',
              boxShadow: '0 -8px 40px rgba(91,63,234,0.12)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-4 pb-4">
              {/* Nav grid */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                  <button
                    key={to}
                    type="button"
                    onClick={() => { nativeTapFeedback(); setMoreOpen(false); navigate(to); }}
                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border text-xs font-semibold transition-all ${
                      location.pathname === to
                        ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white border-primary-600 shadow-primary-sm'
                        : 'border-[--bam-border] text-[--bam-text-muted]'
                    }`}
                    style={location.pathname === to ? {} : { background: 'var(--bam-surface-soft)' }}
                  >
                    <Icon className={`w-5 h-5 ${location.pathname === to ? 'text-white' : 'text-[--bam-text-muted]'}`} />
                    {label}
                  </button>
                ))}
              </div>

              <div className="divider mb-4" />

              {/* Utility row */}
              <div className="flex items-center gap-2.5">
                {business && (
                  <button
                    onClick={() => { copyLink(); setMoreOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border transition-all"
                    style={{
                      background: 'var(--bam-surface-soft)',
                      borderColor: 'var(--bam-border)',
                      color: 'var(--bam-text-muted)',
                    }}
                  >
                    {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy link'}
                  </button>
                )}

                <button
                  onClick={() => { setMoreOpen(false); handleLogout(); }}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-red-50 text-red-600 border border-red-100 transition-all hover:bg-red-100"
                >
                  <LogoutIcon className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */
function GridIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function BackIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" /></svg>; }
function CalendarCheckIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>; }
function CalendarIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function TagIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>; }
function UsersIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function SettingsIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function LogoutIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function CopyIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function CheckIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>; }
function PostsIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>; }
function MessageIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>; }
function ChartIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function MoreIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>; }
function ExternalLinkIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
function StaffIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>; }
function ResourceIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>; }
function GrowthIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>; }
function RetentionIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>; }
function BellIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>; }
