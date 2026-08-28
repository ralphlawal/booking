/**
 * Guard for iOS/Android release builds.
 *
 * The Capacitor app talks to the live API over an absolute origin and renders
 * Mapbox for discovery, geocoding and static maps. The API origin is required
 * for a usable app; Mapbox is optional because the product has an intentional
 * non-map fallback. Do not block an App Store archive just because a map token
 * has not yet been configured in Xcode Cloud.
 *
 * Used by `npm run build:native`, which both the Xcode Cloud iOS build and the
 * local Android `./gradlew` release build should run instead of `vite build`.
 */

const REQUIRED = ['VITE_API_URL'];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `\nNative build aborted — missing required environment variable(s): ${missing.join(', ')}\n\n` +
    `Run the native build like:\n` +
    `  VITE_API_URL=https://bookam.business npm run build:native\n\n` +
    `In Xcode Cloud, set VITE_API_URL as a build environment variable.\n`
  );
  process.exit(1);
}

console.log(`✓ native build preflight: ${REQUIRED.join(', ')} present`);
if (!process.env.VITE_MAPBOX_TOKEN) {
  console.warn('⚠ Mapbox token is not set; the app will use its map fallback until VITE_MAPBOX_TOKEN is configured.');
}
