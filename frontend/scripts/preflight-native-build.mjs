/**
 * Guard for iOS/Android release builds.
 *
 * The Capacitor app talks to the live API over an absolute origin and renders
 * Mapbox for discovery, geocoding and static maps. Both need build-time env
 * vars — a release without them ships a broken map and (worse) a broken API
 * base URL. Fail loudly instead.
 *
 * Used by `npm run build:native`, which both the Xcode Cloud iOS build and the
 * local Android `./gradlew` release build should run instead of `vite build`.
 */

const REQUIRED = ['VITE_API_URL', 'VITE_MAPBOX_TOKEN'];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `\nNative build aborted — missing required environment variable(s): ${missing.join(', ')}\n\n` +
    `Run the native build like:\n` +
    `  VITE_API_URL=https://bookam.business VITE_MAPBOX_TOKEN=<token> npm run build:native\n\n` +
    `In Xcode Cloud, set these as secret environment variables on the workflow.\n`
  );
  process.exit(1);
}

console.log(`✓ native build preflight: ${REQUIRED.join(', ')} present`);
