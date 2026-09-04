import { isNativeApp } from '../config/platform';
import { hasAnalyticsConsent } from './cookieConsent';

const GA_ID = 'G-78Y2SFEHR1';
let loaded = false;

// Google Analytics must never run inside the native app (App Store Guideline
// 5.1.2 — no tracking cookies without ATT permission, which BookAm does not
// request since it doesn't track users). On the web it may only load after
// the visitor explicitly accepts analytics cookies in CookieConsent.
export function loadAnalytics() {
  if (loaded || isNativeApp() || !hasAnalyticsConsent()) return;
  loaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
}
