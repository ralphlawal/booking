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

export function saveCookieConsent(analytics) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    essential: true,
    analytics,
    saved_at: new Date().toISOString(),
  }));
}
