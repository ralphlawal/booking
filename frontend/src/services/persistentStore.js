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
  'bookam_biz_auth',    // cached business user + business
  'customerToken',      // consumer JWT
  'customerProfile',    // cached consumer profile
  'adminSupportToken',  // admin support JWT
];

let installed = false;

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
      Preferences.set({ key, value: String(value) }).catch(() => {});
    }
  };
  window.localStorage.removeItem = function (key) {
    rawRemoveItem(key);
    if (PERSIST_KEYS.includes(key)) {
      Preferences.remove({ key }).catch(() => {});
    }
  };
}
