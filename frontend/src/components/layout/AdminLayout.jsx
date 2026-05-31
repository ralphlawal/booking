import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { bookingsAPI } from '../../services/api';
import { LOGO_BLUE_H, LOGO_WHITE_H } from '../../config/logos';
import { auth } from '../../config/firebase';
import toast from 'react-hot-toast';
import VerifyRequired from '../shared/VerifyRequired';

const NAV = [
  { to: '/admin/dashboard', icon: GridIcon,         label: 'Dashboard' },
  { to: '/admin/bookings',  icon: CalendarCheckIcon, label: 'Bookings', badge: true },
  { to: '/admin/calendar',  icon: CalendarIcon,      label: 'Calendar' },
  { to: '/admin/services',  icon: TagIcon,            label: 'Services' },
  { to: '/admin/posts',     icon: PostsIcon,          label: 'Posts' },
  { to: '/admin/customers', icon: UsersIcon,          label: 'Customers' },
  { to: '/admin/messages',  icon: MessageIcon,        label: 'Messages' },
  { to: '/admin/settings',  icon: SettingsIcon,       label: 'Settings' },
];

const BOTTOM_NAV = [
  { to: '/admin/dashboard', icon: GridIcon,         label: 'Home' },
  { to: '/admin/bookings',  icon: CalendarCheckIcon, label: 'Bookings', badge: true },
  { to: '/admin/calendar',  icon: CalendarIcon,      label: 'Calendar' },
  { to: '/admin/messages',  icon: MessageIcon,        label: 'Messages' },
  { to: '/admin/settings',  icon: SettingsIcon,       label: 'Settings' },
];

export default function AdminLayout() {
  const { user, business, logout, resendVerificationEmail } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [emailUnverified, setEmailUnverified] = useState(false);
  const [resendingVerif, setResendingVerif] = useState(false);

  useEffect(() => {
    if (!business) {
      navigate('/admin/onboarding', { replace: true });
    }
  }, [business, navigate]);

  useEffect(() => {
    if (auth.currentUser) {
      setEmailUnverified(!auth.currentUser.emailVerified);
    }
  }, [user]);

  useEffect(() => {
    bookingsAPI.list({ status: 'pending', limit: 200 })
      .then(data => setPendingCount(data?.total ?? data?.bookings?.length ?? 0))
      .catch(() => {});
  }, []);

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

  const isDark = theme === 'dark';
  const logoSrc = isDark ? LOGO_WHITE_H : LOGO_BLUE_H;

  return (
    <div className="flex h-dvh bg-slate-50 dark:bg-gray-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transform lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ transition: 'transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Logo — top padding clears notch in landscape */}
        <div className="flex items-center px-5 border-b border-gray-100 dark:border-gray-800" style={{ height: 'calc(4rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}>
          <img src={logoSrc} alt="BookAm Business" className="h-9 w-auto object-contain" />
        </div>

        {/* Business badge + copy link */}
        {business && (
          <div className="mx-3 mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-100 dark:border-primary-800/50">
            <p className="text-xs text-primary-500 dark:text-primary-400 font-medium">Your booking page</p>
            <p className="text-sm font-bold text-primary-800 dark:text-primary-300 truncate mt-0.5">/book/{business.slug}</p>
            <button
              onClick={copyLink}
              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/40 hover:bg-primary-200 dark:hover:bg-primary-900/60 rounded-lg py-1.5 transition-colors"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-primary'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  {badge && pendingCount > 0 && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${isActive ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Support */}
        <div className="px-3 pb-2 space-y-1">
          <NavLink
            to="/admin/messages"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <HeadphonesIcon className="w-4 h-4 flex-shrink-0" />
            Contact Support
          </NavLink>
        </div>

        {/* User */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-400 flex-shrink-0">
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{user?.full_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} title="Sign out" className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors flex-shrink-0">
              <LogoutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar — padding-top pushes content below notch / Dynamic Island */}
        <header
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 flex-shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
        <div className="min-h-14 lg:min-h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2 lg:py-0">
          {/* Mobile: hamburger */}
          <button className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => setSidebarOpen(true)}>
            <MenuIcon className="w-5 h-5" />
          </button>

          {/* Mobile: centered logo */}
          <div className="lg:hidden absolute left-1/2 -translate-x-1/2 max-w-[42vw]">
            <img src={logoSrc} alt="BookAm Business" className="h-7 sm:h-8 w-auto object-contain" />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            {business && (
              <>
                <button onClick={copyLink} title="Copy booking link"
                  className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  {copied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <CopyIcon className="w-5 h-5" />}
                </button>
                <a href={`/book/${business.slug}`} target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-xs hidden sm:flex gap-1.5">
                  <ExternalLinkIcon className="w-3.5 h-3.5" />
                  View Booking Page
                </a>
              </>
            )}

            {/* Mobile sign-out */}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <LogoutIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 lg:pb-6 pb-admin-nav">
          {emailUnverified && (
            <div className="mb-4 sm:mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
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
          {emailUnverified ? <VerifyRequired type="business" /> : <Outlet />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 flex shadow-[0_-8px_24px_rgba(15,23,42,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {BOTTOM_NAV.map(({ to, icon: Icon, label, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 min-h-[58px] gap-0.5 text-[10px] sm:text-xs font-semibold transition-colors relative ${
                isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-full" />}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {badge && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* ── Icons ─────────────────────────────────── */
function GridIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>; }
function CalendarCheckIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>; }
function CalendarIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>; }
function TagIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>; }
function UsersIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function SettingsIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function LogoutIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
function MailIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function MenuIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>; }
function ExternalLinkIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
function CopyIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function CheckIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>; }
function MoonIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>; }
function SunIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>; }
function PostsIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>; }
function MessageIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>; }
function HeadphonesIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>; }
