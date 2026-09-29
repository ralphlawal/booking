import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Cookie, ShieldCheck, X } from 'lucide-react';
import { loadAnalytics } from '../../utils/analytics';
import { getCookieConsent, hasAnalyticsConsent, saveCookieConsent } from '../../utils/cookieConsent';

export { getCookieConsent, hasAnalyticsConsent };

export default function CookieConsent() {
  const [visible, setVisible]         = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const location = useLocation();

  useEffect(() => { setVisible(!getCookieConsent()); }, []);

  const saveChoice = (analytics) => {
    saveCookieConsent(analytics);
    if (analytics) loadAnalytics();
    setVisible(false);
  };

  if (!visible) return null;

  const hasBottomNav = [
    '/explore', '/feed', '/match', '/profile',
    '/customer/dashboard', '/customer/messages', '/customer/profile', '/customer/favourites',
  ].some(path => location.pathname === path || location.pathname.startsWith(`${path}/`));

  return (
    <div
      className="fixed inset-x-0 z-[70] px-3 sm:px-6 pointer-events-none"
      style={{
        bottom: hasBottomNav
          ? 'calc(var(--consumer-nav-height) + 0.5rem)'
          : 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        className="mx-auto max-w-4xl rounded-xl sm:rounded-2xl shadow-2xl pointer-events-auto overflow-hidden max-h-[48dvh] sm:max-h-none overflow-y-auto"
        style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}
      >
        <div className="p-3 sm:p-5">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 items-center justify-center flex-shrink-0">
              <Cookie className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold" style={{ color: 'var(--bam-text)' }}>Cookies and app storage</h2>
                  <p className="text-xs sm:text-sm mt-1 leading-relaxed" style={{ color: 'var(--bam-text-muted)' }}>
                    <span className="sm:hidden">Essential storage keeps sign-in, bookings, chat, and preferences working.</span>
                    <span className="hidden sm:inline">BookAm uses essential cookies and local storage to keep you signed in, protect accounts, remember preferences, and make bookings work. Optional analytics helps us improve the product.</span>
                  </p>
                </div>
                <button
                  onClick={() => saveChoice(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  aria-label="Close cookie notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showDetails && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl p-3" style={{ background: 'var(--bam-surface-soft)', border: '1px solid var(--bam-border)' }}>
                    <p className="font-bold flex items-center gap-1.5" style={{ color: 'var(--bam-text)' }}>
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Essential storage
                    </p>
                    <p className="mt-1" style={{ color: 'var(--bam-text-muted)' }}>Required for sign-in, security, chat, booking sessions, preferences, and consent records.</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: 'var(--bam-surface-soft)', border: '1px solid var(--bam-border)' }}>
                    <p className="font-bold" style={{ color: 'var(--bam-text)' }}>Optional analytics</p>
                    <p className="mt-1" style={{ color: 'var(--bam-text-muted)' }}>Used only if accepted to understand product usage and improve reliability.</p>
                  </div>
                </div>
              )}

              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <button onClick={() => setShowDetails(v => !v)} className="font-semibold text-primary-600 hover:underline">
                    {showDetails ? 'Hide details' : 'Manage details'}
                  </button>
                  <Link to="/legal/cookies" className="font-semibold text-gray-500 hover:text-primary-600">Cookie policy</Link>
                  <Link to="/legal/privacy" className="font-semibold text-gray-500 hover:text-primary-600">Privacy policy</Link>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2">
                  <button onClick={() => saveChoice(false)} className="btn-secondary text-xs px-2.5 sm:px-4 py-2">Essential only</button>
                  <button onClick={() => saveChoice(true)}  className="btn-primary  text-xs px-2.5 sm:px-4 py-2">Accept all</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
