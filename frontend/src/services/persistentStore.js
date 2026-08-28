import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '../config/platform';

/**
 * iOS WKWebView does not reliably keep localStorage across a full app
 * termination, so anything stored only in localStorage (auth tokens, cached
 * profile) is gone on the next cold launch and the user lands back on sign-in.
 *
 * This module mirrors a small whitelist of keys into @capacitor/preferences
 * (UserDefaults on iOS — always persists) and rehydrates them into localStorage
 * at boot, before React renders, so the synchronous axios interceptors keep
 * working unchanged.
 */

const PERSIST_KEYS = [
  'bam_token',          // business JWT
  'bam_refresh_token',  // rotating business refresh session
  'bookam_biz_auth',    // cached business user + business
  'customerToken',      // consumer JWT
  'customerRefreshToken', // rotating consumer refresh session
  'customerProfile',    // cached consumer profile
  'adminSupportToken',  // admin support JWT
];

let installed = false;
// Capacitor bridge calls are asynchronous. Keep them strictly ordered: without
// this, a remove from the start of sign-in can finish after the new token's
// set and silently log the person back out on the next app launch.
let nativeWriteQueue = Promise.resolve();

function queueNativeWrite(operation) {
  nativeWriteQueue = nativeWriteQueue
    .catch(() => {})
    .then(operation);
  return nativeWriteQueue;
}

/**
 * Commit important values to UserDefaults before a caller continues. The
 * localStorage write-through wrapper is useful for ordinary preferences, but
 * authentication must not depend on a fire-and-forget native bridge call: an
 * iOS app can be backgrounded or terminated immediately after sign-in.
 */
export async function persistCriticalValues(values) {
  if (!isNativeApp()) return;
  try {
    await Promise.all(
      Object.entries(values)
        .filter(([key, value]) => PERSIST_KEYS.includes(key) && value != null)
        .map(([key, value]) => queueNativeWrite(() => Preferences.set({ key, value: String(value) })))
    );
  } catch {
    // Keep sign-in usable if a development build is missing a native plugin.
    // Release builds include CapacitorPreferences through the iOS Podfile.
  }
}

/** Copy persisted values from Preferences into localStorage, then keep the two
 *  in sync for every future write. Call once, awaited, before rendering. */
export async function hydratePersistentStore() {
  if (!isNativeApp() || installed) return;
  installed = true;

  const rawSetItem = window.localStorage.setItem.bind(window.localStorage);
  const rawRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

  // 1. Rehydrate: Preferences is the source of truth on native.
  await Promise.all(
    PERSIST_KEYS.map(async (key) => {
      try {
        const { value } = await Preferences.get({ key });
        if (value != null) {
          rawSetItem(key, value);
        } else {
          // First launch after adding this: seed Preferences from whatever
          // localStorage still holds so we don't lose an active session.
          const existing = window.localStorage.getItem(key);
          if (existing != null) await Preferences.set({ key, value: existing });
        }
      } catch {
        /* ignore — fall back to whatever localStorage has */
      }
    })
  );

  // 2. Write-through: mirror future localStorage writes for whitelisted keys.
  window.localStorage.setItem = function (key, value) {
    rawSetItem(key, value);
    if (PERSIST_KEYS.includes(key)) {
      queueNativeWrite(() => Preferences.set({ key, value: String(value) })).catch(() => {});
    }
  };
  window.localStorage.removeItem = function (key) {
    rawRemoveItem(key);
    if (PERSIST_KEYS.includes(key)) {
      queueNativeWrite(() => Preferences.remove({ key })).catch(() => {});
    }
  };
}

/**
 * Re-copy persisted values from Preferences into localStorage. iOS can evict
 * WKWebView localStorage while the app is merely backgrounded (not just on a
 * full termination), so call this on every app resume — it's cheap and keeps
 * the auth token available for the next request without a re-login.
 */
export async function rehydratePersistentStore() {
  if (!isNativeApp()) return;
  await Promise.all(
    PERSIST_KEYS.map(async (key) => {
      try {
        const { value } = await Preferences.get({ key });
        if (value != null && window.localStorage.getItem(key) !== value) {
          window.localStorage.setItem(key, value);
        }
      } catch {
        /* ignore */
      }
    })
  );
}
