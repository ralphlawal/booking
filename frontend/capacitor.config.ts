import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'business.bookam.app',
  appName: 'BookAm',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow Stripe's 3DS redirect flows to navigate the WebView temporarily.
    // Without this, the WKWebView blocks Stripe's intermediate redirect pages
    // and 3DS-required payments silently fail.
    allowNavigation: [
      '*.stripe.com',
      '*.stripe.network',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F5F7FF',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
