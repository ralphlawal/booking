import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Geolocation } from '@capacitor/geolocation';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const APP_ORIGINS = new Set([
  'https://bookam.business',
  'https://www.bookam.business',
]);

export const NATIVE_NAVIGATE_EVENT = 'bookam:navigate';

export const isNativePlatform = () => Capacitor.isNativePlatform();

// Small, purposeful feedback makes app navigation feel native without adding
// decorative animation to every interaction. It is intentionally best-effort
// so a missing plugin can never block a tap.
export function nativeTapFeedback(style = ImpactStyle.Light) {
  if (!isNativePlatform()) return;
  Haptics.impact({ style }).catch(() => {});
}

export function publicWebUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (isNativePlatform()) return `https://bookam.business${normalizedPath}`;
  return `${window.location.origin}${normalizedPath}`;
}

export async function openExternalUrl(url, { onClose } = {}) {
  if (!url) return;
  if (isNativePlatform()) {
    if (onClose) {
      // Fires when the in-app browser (SFSafariViewController / Custom Tab) is
      // dismissed — lets callers refresh state that changed on the external site.
      const handle = await Browser.addListener('browserFinished', () => {
        handle.remove();
        onClose();
      });
    }
    await Browser.open({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openExternalLink(event, url) {
  event?.preventDefault?.();
  openExternalUrl(url).catch(() => {});
}

export function toAppPath(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.startsWith('/')) return url;
  try {
    const parsed = new URL(url);
    if (!APP_ORIGINS.has(parsed.origin)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

// Services that run outside React (push callbacks and web notification events)
// can request an SPA navigation without reloading the Capacitor WebView.
export function navigateWithinApp(url) {
  const path = toAppPath(url);
  if (!path) return false;
  window.dispatchEvent(new CustomEvent(NATIVE_NAVIGATE_EVENT, { detail: path }));
  return true;
}

function utf8ToBase64(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

export async function shareCsvFile({ filename, contents, title }) {
  if (!isNativePlatform()) {
    const blob = new Blob([contents], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }

  await Filesystem.writeFile({
    path: filename,
    data: utf8ToBase64(contents),
    directory: Directory.Cache,
    recursive: true,
  });
  const file = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  await Share.share({
    title: title || filename,
    url: file.uri,
    dialogTitle: 'Export CSV',
  });
}

export async function shareContent({ title, text, url }) {
  if (isNativePlatform()) {
    await Share.share({ title, text, url, dialogTitle: title || 'Share with' });
    return;
  }
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return;
  }
  if (url && navigator.clipboard) {
    await navigator.clipboard.writeText(url);
    return;
  }
  throw new Error('Sharing is not available on this device');
}

/** A WebView-safe clipboard helper. WKWebView does not consistently expose
 * navigator.clipboard, especially after a cold launch, so retain the proven
 * selection fallback for short booking references and share links. */
export async function copyText(value) {
  if (!value) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* fall through to the iOS selection fallback */ }

  try {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:0;left:0;';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, field.value.length);
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  } catch {
    return false;
  }
}

// Drop-in replacement for navigator.geolocation.getCurrentPosition. On native
// the WebView's own geolocation is unreliable / silently denied without the
// @capacitor/geolocation plugin driving the OS runtime prompt, so route
// through it and hand back a browser-shaped position object.
const LOCATION_DENIED_MESSAGE = 'Location access is off. Turn it on for BookAm in your device Settings to see businesses near you.';

function hasGrantedLocationPermission(permission = {}) {
  return permission.location === 'granted' || permission.coarseLocation === 'granted';
}

/**
 * Ask the operating system for a fresh location. Keeping this promise-based
 * means screens can show an honest loading/error state without relying on the
 * WKWebView geolocation shim (which is inconsistent after app resumes).
 */
export async function requestDeviceLocation(options = {}) {
  const config = {
    enableHighAccuracy: options.enableHighAccuracy ?? false,
    timeout: options.timeout ?? 12000,
    maximumAge: options.maximumAge ?? 300000,
  };

  if (!isNativePlatform()) {
    if (!navigator.geolocation) {
      const error = new Error('Location is unavailable in this browser.');
      error.code = 2;
      throw error;
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, (error) => reject(error), config);
    });
  }

  try {
    // Calling checkPermissions first prevents a repeated native prompt after a
    // user has already declined access, and makes the Settings guidance exact.
    let permission = await Geolocation.checkPermissions();
    if (!hasGrantedLocationPermission(permission)) {
      permission = await Geolocation.requestPermissions();
    }
    if (!hasGrantedLocationPermission(permission)) {
      const error = new Error(LOCATION_DENIED_MESSAGE);
      error.code = 1;
      throw error;
    }
    return await Geolocation.getCurrentPosition(config);
  } catch (originalError) {
    const text = originalError?.message || '';
    const error = originalError instanceof Error ? originalError : new Error(text || 'Could not get location');
    if (error.code === 1 || /denied|not authorized|permission/i.test(text)) {
      error.code = 1;
      error.message = LOCATION_DENIED_MESSAGE;
    } else if (!error.code) {
      error.code = 2;
      error.message = 'We could not find your location. Check your connection and try again.';
    }
    throw error;
  }
}

export function getCurrentPosition(onSuccess, onError, options = {}) {
  if (!isNativePlatform()) {
    if (!navigator.geolocation) {
      onError?.({ code: 2, message: 'Geolocation unavailable' });
      return;
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    return;
  }

  requestDeviceLocation(options).then(onSuccess).catch(onError);
}
