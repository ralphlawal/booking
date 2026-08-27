import { Capacitor } from '@capacitor/core';

// Keep the marketing website and installed app intentionally distinct while
// sharing the same routes, API, authentication, and business data.
export const isNativeApp = () => Capacitor.isNativePlatform();
