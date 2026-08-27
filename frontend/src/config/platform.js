import { Capacitor } from '@capacitor/core';

// Keep the marketing website and installed app intentionally distinct while
// sharing the same routes, API, authentication, and business data.
export const isNativeApp = () => Capacitor.isNativePlatform();

// A Capacitor WebView is served from capacitor://localhost (iOS) or
// https://localhost (Android), so a relative `/api` URL points at the device,
// not at BookAm's server. The public website can continue to use its relative
// Vercel proxy; installed apps must use the live HTTPS origin.
const configuredApiOrigin = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
const apiOrigin = configuredApiOrigin || (isNativeApp() ? 'https://bookam.business' : '');

export const apiBaseUrl = apiOrigin
  ? `${apiOrigin.replace(/\/api$/, '')}/api`
  : '/api';
