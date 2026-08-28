import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Geolocation } from '@capacitor/geolocation';

const APP_ORIGINS = new Set([
  'https://bookam.business',
  'https://www.bookam.business',
]);

export const NATIVE_NAVIGATE_EVENT = 'bookam:navigate';

export const isNativePlatform = () => Capacitor.isNativePlatform();

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
    await Browser.open({ url, windowName: '_system' });
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

// Drop-in replacement for navigator.geolocation.getCurrentPosition. On native
// the WebView's own geolocation is unreliable / silently denied without the
// @capacitor/geolocation plugin driving the OS runtime prompt, so route
// through it and hand back a browser-shaped position object.
export function getCurrentPosition(onSuccess, onError, options = {}) {
  if (!isNativePlatform()) {
    if (!navigator.geolocation) {
      onError?.({ code: 2, message: 'Geolocation unavailable' });
      return;
    }
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);
    return;
  }

  (async () => {
    try {
      const perm = await Geolocation.requestPermissions();
      if (perm.location === 'denied' && perm.coarseLocation === 'denied') {
        onError?.({ code: 1, message: 'Location permission denied' });
        return;
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy ?? false,
        timeout: options.timeout ?? 10000,
        maximumAge: options.maximumAge ?? 0,
      });
      onSuccess?.({
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        },
        timestamp: pos.timestamp,
      });
    } catch (err) {
      const denied = /denied|permission/i.test(err?.message || '');
      onError?.({ code: denied ? 1 : 2, message: err?.message || 'Could not get location' });
    }
  })();
}
