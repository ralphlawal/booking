import { Preferences } from '@capacitor/preferences';
import { isNativeApp } from '../config/platform';

/**
 * Keeping an installed app signed in, defence in depth.
 *
 * iOS WKWebView drops localStorage on a full app termination (and sometimes
 * while merely backgrounded), so a token kept only in localStorage is gone on
 * the next launch and the user lands on sign-in. We therefore keep the auth
 * keys in THREE places and reconcile them constantly:
 *
 *   1. @capacitor/preferences  → UserDefaults on iOS, survives termination
 *   2. an in-memory mirror     → survives a mid-session localStorage eviction
 *   3. localStorage            → what the synchronous axios interceptors read
 *
 * Reads go through getPersistedItem() (localStorage → memory). Writes fan out
 * to all three. We rehydrate on boot (before React renders) and on every
 * resume, and force a Preferences flush when the app is backgrounded.
 */

const PERSIST_KEYS = [
  'bam_token',            // business JWT
  'bam_refresh_token',    // rotating business refresh session
  'bookam_biz_auth',      // cached business user + business
  'customerToken',        // consumer JWT
  'customerRefreshToken', // rotating consumer refresh session
  'customerProfile',      // cached consumer profile
  'adminSupportToken',    // admin support JWT
];

// Native storage can become available shortly after React has rendered on a
// cold iOS launch. Contexts listen for this event so they restore the session
// even when the initial startup timeout had to render the app first.
export const PERSISTENCE_REHYDRATED_EVENT = 'bookam:persistence-rehydrated';

// In-memory mirror — the one store iOS can never evict during a session.
const memory = Object.create(null);

let installed = false;
let rawSetItem = null;
let rawRemoveItem = null;

// Capacitor bridge calls are async; keep them strictly ordered so a remove at
// the start of sign-in can't land after the new token's set.
let nativeWriteQueue = Promise.resolve();
function queueNativeWrite(operation) {
  nativeWriteQueue = nativeWriteQueue.catch(() => {}).then(operation);
  return nativeWriteQueue;
}

/** Read a persisted value with fallbacks. Use this instead of localStorage
 *  .getItem for anything in PERSIST_KEYS — it survives a WebView eviction. */
export function getPersistedItem(key) {
  try {
    const v = window.localStorage.getItem(key);
    if (v != null) return v;
  } catch { /* ignore */ }
  return memory[key] ?? null;
}

/** Commit values to every store and wait for the native write. Callers (sign-in,
 *  refresh) must await this before routing away — an iOS app can be killed the
 *  instant after. */
export async function persistCriticalValues(values) {
  const entries = Object.entries(values).filter(([k, v]) => PERSIST_KEYS.includes(k) && v != null);
  for (const [k, v] of entries) {
    memory[k] = String(v);
    try { (rawSetItem || window.localStorage.setItem.bind(window.localStorage))(k, String(v)); } catch { /* ignore */ }
  }
  if (!isNativeApp()) return;
  try {
    await Promise.all(entries.map(([k, v]) => queueNativeWrite(() => Preferences.set({ key: k, value: String(v) }))));
  } catch {
    // Release builds link CapacitorPreferences; a dev build might not.
  }
}

/** Best-effort push of the current whitelisted values into Preferences. Called
 *  when the app is backgrounded, which is also when iOS flushes UserDefaults to
 *  disk — so a force-quit afterwards can't lose the token. */
export function flushToNative() {
  if (!isNativeApp()) return Promise.resolve();
  const jobs = [];
  for (const key of PERSIST_KEYS) {
    const val = getPersistedItem(key);
    if (val != null) jobs.push(queueNativeWrite(() => Preferences.set({ key, value: String(val) })));
  }
  return Promise.all(jobs).catch(() => {});
}

async function pullFromNative() {
  let sawPlugin = false;
  await Promise.all(
    PERSIST_KEYS.map(async (key) => {
      try {
        const { value } = await Preferences.get({ key });
        sawPlugin = true;
        if (value != null) {
          memory[key] = value;
          if (window.localStorage.getItem(key) !== value) {
            (rawSetItem || window.localStorage.setItem.bind(window.localStorage))(key, value);
          }
        } else {
          // Seed Preferences from whatever localStorage still holds.
          const existing = window.localStorage.getItem(key) ?? memory[key];
          if (existing != null) await Preferences.set({ key, value: String(existing) });
        }
      } catch {
        /* plugin missing / not ready */
      }
    })
  );
  // Do not assume the initial React render waited for Preferences. This is
  // especially important after a force-quit, when WKWebView starts first and
  // the Capacitor bridge may arrive a moment later.
  if (sawPlugin && typeof window !== 'undefined') {
    window.dispatchEvent(new Event(PERSISTENCE_REHYDRATED_EVENT));
  }
  return sawPlugin;
}

/** Reconcile all three stores and install the write-through. Call once, awaited,
 *  before rendering. */
export async function hydratePersistentStore() {
  if (!isNativeApp() || installed) return;
  installed = true;

  rawSetItem = window.localStorage.setItem.bind(window.localStorage);
  rawRemoveItem = window.localStorage.removeItem.bind(window.localStorage);

  let ok = await pullFromNative();
  // The bridge can still be warming up on a cold start — one quick retry.
  if (!ok) { await new Promise((r) => setTimeout(r, 150)); ok = await pullFromNative(); }

  window.localStorage.setItem = function (key, value) {
    rawSetItem(key, value);
    if (PERSIST_KEYS.includes(key)) {
      memory[key] = String(value);
      queueNativeWrite(() => Preferences.set({ key, value: String(value) })).catch(() => {});
    }
  };
  window.localStorage.removeItem = function (key) {
    rawRemoveItem(key);
    if (PERSIST_KEYS.includes(key)) {
      delete memory[key];
      queueNativeWrite(() => Preferences.remove({ key })).catch(() => {});
    }
  };
}

/** Re-pull from Preferences into localStorage + memory. Call on every resume —
 *  iOS may have evicted the WebView store while the app was backgrounded. */
export async function rehydratePersistentStore() {
  if (!isNativeApp()) return;
  await pullFromNative();
}
