import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'bookam_cookie_consent_v1';

export function getCookieConsent() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return getCookieConsent()?.analytics === true;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setVisible(!getCookieConsent());
  }, []);

  const saveChoice = (analytics) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      essential: true,
      analytics,
      saved_at: new Date().toISOString(),
    }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 pointer-events-none">
      <div className="mx-auto max-w-4xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl pointer-events-auto overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-900/25 text-primary-600 dark:text-primary-300 flex items-center justify-center flex-shrink-0">
              <Cookie className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Cookies and app storage</h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    BookAm uses essential cookies and local storage to keep you signed in, protect accounts, remember preferences, and make bookings work. Optional analytics helps us improve the product.
                  </p>
                </div>
                <button
                  onClick={() => saveChoice(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  aria-label="Close cookie notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {showDetails && (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3">
                    <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Essential storage
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Required for sign-in, security, chat, booking sessions, preferences, and consent records.</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-3">
                    <p className="font-bold text-gray-900 dark:text-white">Optional analytics</p>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Used only if accepted to understand product usage and improve reliability.</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <button onClick={() => setShowDetails(v => !v)} className="font-semibold text-primary-600 dark:text-primary-300 hover:underline">
                    {showDetails ? 'Hide details' : 'Manage details'}
                  </button>
                  <Link to="/legal/cookies" className="font-semibold text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300">
                    Cookie policy
                  </Link>
                  <Link to="/legal/privacy" className="font-semibold text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-300">
                    Privacy policy
                  </Link>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button onClick={() => saveChoice(false)} className="btn-secondary text-xs px-4 py-2">
                    Essential only
                  </button>
                  <button onClick={() => saveChoice(true)} className="btn-primary text-xs px-4 py-2">
                    Accept all
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
