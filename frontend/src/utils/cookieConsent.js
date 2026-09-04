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
  // Lets other fixed-position prompts (e.g. BrowserNotificationPrompt) know
  // they can now appear — they wait for this so the two never collide at the
  // bottom of the screen at once.
  window.dispatchEvent(new Event('bookam:cookie-consent'));
}
