import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { bookingsAPI } from '../../services/api';
import { LOGO_BLUE_H, LOGO_WHITE_H } from '../../config/logos';
import toast from 'react-hot-toast';
import VerifyRequired from '../shared/VerifyRequired';

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
      { to: '/admin/services',  icon: TagIcon,    label: 'Services' },
      { to: '/admin/customers', icon: UsersIcon,  label: 'Customers' },
      { to: '/admin/posts',     icon: PostsIcon,  label: 'Posts' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/admin/messages',     icon: MessageIcon, label: 'Messages' },
      { to: '/admin/staff-report', icon: ChartIcon,   label: 'Reports' },
      { to: '/admin/settings',     icon: SettingsIcon, label: 'Settings' },
    ],
  },
];

/* ── Mobile bottom nav (4 items + More) ─────────────────────────────────── */
const BOTTOM_NAV = [
  { to: '/admin/dashboard', icon: GridIcon,         label: 'Home' },
  { to: '/admin/bookings',  icon: CalendarCheckIcon, label: 'Bookings', badge: true },
  { to: '/admin/calendar',  icon: CalendarIcon,      label: 'Calendar' },
  { to: '/admin/messages',  icon: MessageIcon,        label: 'Messages' },
];

/* ── "More" sheet items ──────────────────────────────────────────────────── */
const MORE_ITEMS = [
  { to: '/admin/services',     icon: TagIcon,     label: 'Services' },
  { to: '/admin/customers',    icon: UsersIcon,   label: 'Customers' },
  { to: '/admin/posts',        icon: PostsIcon,   label: 'Posts' },
  { to: '/admin/staff-report', icon: ChartIcon,   label: 'Reports' },
  { to: '/admin/settings',     icon: SettingsIcon, label: 'Settings' },
];

export default function AdminLayout() {
  const { user, business, loading, logout, resendVerificationEmail } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen]     = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [copied, setCopied]         = useState(false);
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [resendingVerif, setResendingVerif]   = useState(false);

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

  const bookingUrl = business ? `${window.location.origin}/book/${business.slug}` : null;

  const copyLink = useCallback(async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      toast.success('Booking link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Could not copy link'); }
  }, [bookingUrl]);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const isDark  = theme === 'dark';
  const logoSrc = isDark ? LOGO_WHITE_H : LOGO_BLUE_H;

  /* Shared nav-link builder for sidebar */
  const sidebarLink = ({ to, icon: Icon, label, badge }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-primary-sm'
            : 'text-navy-500 dark:text-[#7a90ba] hover:bg-[--bam-surface-hover] dark:hover:bg-navy-750/60 hover:text-gray-900 dark:hover:text-[--bam-text]'
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
    <div
      className="flex h-dvh overflow-hidden"
      style={{ background: 'var(--bam-bg)' }}
    >
      {/* ── Desktop sidebar (lg+) ─────────────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 border-r"
        style={{
          background: 'var(--bam-sidebar)',
          borderColor: 'var(--bam-border)',
          boxShadow: isDark ? '4px 0 40px rgba(0,0,0,0.5)' : '4px 0 24px rgba(0,0,0,0.06)',
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
          <img src={logoSrc} alt="BookAm Business" className="h-9 w-auto object-contain" />
        </div>

        {/* Booking page quick-link */}
        {business && (
          <div
            className="mx-3 mt-3 p-3 rounded-xl border"
            style={{
              background: isDark ? 'rgba(91,62,234,0.1)' : '#f0f0ff',
              borderColor: isDark ? 'rgba(91,62,234,0.25)' : '#cdc9fe',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary-500 dark:text-primary-400">Your booking page</p>
            <p className="text-sm font-bold text-primary-800 dark:text-primary-300 truncate mt-0.5">/book/{business.slug}</p>
            <button
              onClick={copyLink}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-100/70 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg py-1.5 transition-colors"
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
        <div
          className="border-t p-4 flex-shrink-0"
          style={{ borderColor: 'var(--bam-border)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--bam-text)' }}>{user?.full_name}</p>
              <p className="text-xs truncate" style={{ color: 'var(--bam-text-faint)' }}>{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg transition-colors text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
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
            background: isDark ? 'rgba(7,13,32,0.95)' : 'rgba(255,255,255,0.95)',
            borderColor: 'var(--bam-border)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            boxShadow: isDark
              ? '0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3)'
              : '0 1px 0 rgba(0,0,0,0.06)',
          }}
        >
          <div className="min-h-14 lg:min-h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 lg:py-0">
            {/* Mobile: logo (centered) */}
            <div className="lg:hidden absolute left-1/2 -translate-x-1/2 pointer-events-none max-w-[42vw]">
              <img src={logoSrc} alt="BookAm Business" className="h-7 sm:h-8 w-auto object-contain" />
            </div>
            {/* Desktop: push right */}
            <div className="hidden lg:block" />

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={toggleTheme}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-2 rounded-xl transition-colors"
                style={{ color: 'var(--bam-text-muted)' }}
              >
                {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>

              {business && (
                <>
                  <button
                    onClick={copyLink}
                    title="Copy booking link"
                    className="lg:hidden p-2 rounded-xl transition-colors"
                    style={{ color: 'var(--bam-text-muted)' }}
                  >
                    {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                  </button>
                  <a
                    href={`/book/${business.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs hidden sm:flex gap-1.5 !py-1.5"
                  >
                    <ExternalLinkIcon className="w-3.5 h-3.5" />
                    View Booking Page
                  </a>
                </>
              )}

              {/* Mobile: theme toggle is above; no hamburger */}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 lg:pb-6 pb-admin-nav"
          style={{ background: 'var(--bam-bg)', color: 'var(--bam-text)' }}
        >
          {emailUnverified && (
            <div className="mb-4 sm:mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-xl px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                ⚠️ Your email address is not verified. Check your inbox for a verification link.
              </p>
              <button
                onClick={handleResendVerif}
                disabled={resendingVerif}
                className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline whitespace-nowrap disabled:opacity-50 flex-shrink-0 self-start sm:self-auto"
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
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t"
        style={{
          background: isDark ? 'rgba(6,11,28,0.97)' : 'rgba(255,255,255,0.97)',
          borderColor: 'var(--bam-border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: isDark
            ? '0 -1px 0 rgba(255,255,255,0.06), 0 -8px 32px rgba(0,0,0,0.45)'
            : '0 -4px 24px rgba(0,0,0,0.07)',
        }}
      >
        {/* 4 primary routes */}
        {BOTTOM_NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 min-h-[64px] gap-0.5 text-[10px] font-bold transition-colors relative tap-highlight-none ${
                isActive
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-400 dark:text-[#3d5070]'
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
                    <span
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none border-2"
                      style={{ borderColor: isDark ? '#060b1c' : '#fff' }}
                    >
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
          onClick={() => setMoreOpen(v => !v)}
          className={`flex-1 flex flex-col items-center justify-center py-2 min-h-[64px] gap-0.5 text-[10px] font-bold transition-colors relative tap-highlight-none ${
            moreOpen
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-[#3d5070]'
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
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="more-backdrop"
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="more-sheet"
              className="lg:hidden fixed left-0 right-0 z-50 rounded-t-3xl border-t overflow-hidden"
              style={{
                background: isDark ? '#0c1528' : '#ffffff',
                borderColor: 'var(--bam-border)',
                bottom: `calc(var(--admin-nav-height) - env(safe-area-inset-bottom, 0px))`,
                boxShadow: isDark
                  ? '0 -8px 60px rgba(0,0,0,0.6)'
                  : '0 -8px 40px rgba(0,0,0,0.12)',
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }}
                />
              </div>

              <div className="px-4 pb-4">
                {/* Nav grid */}
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                  {MORE_ITEMS.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-2 py-4 rounded-2xl border text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white border-primary-600 shadow-primary-sm'
                            : 'border-[--bam-border] text-[--bam-text-muted]'
                        }`
                      }
                      style={({ isActive }) => isActive
                        ? {}
                        : { background: 'var(--bam-surface-soft)' }
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-[--bam-text-muted]'}`} />
                          {label}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>

                {/* Divider */}
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
                    onClick={() => { toggleTheme(); setMoreOpen(false); }}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold border transition-all"
                    style={{
                      background: 'var(--bam-surface-soft)',
                      borderColor: 'var(--bam-border)',
                      color: 'var(--bam-text-muted)',
                    }}
                  >
                    {isDark ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                    {isDark ? 'Light' : 'Dark'}
                  </button>

                  <button
                    onClick={() => { setMoreOpen(false); handleLogout(); }}
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 transition-all"
                  >
                    <LogoutIcon className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */
function GridIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function CalendarCheckIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>; }
function CalendarIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function TagIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>; }
function UsersIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function SettingsIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function LogoutIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function CopyIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function CheckIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>; }
function MoonIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
function SunIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; }
function PostsIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>; }
function MessageIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>; }
function ChartIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function MoreIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>; }
function ExternalLinkIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
