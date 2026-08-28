#!/bin/sh
set -e

# Clear Xcode DerivedData cache so all frameworks are compiled fresh from current sources.
# Without this, Xcode Cloud reuses cached binaries that may be from a different Capacitor version,
# causing "Symbol not found" dyld crashes at launch.
rm -rf ~/Library/Developer/Xcode/DerivedData

# Install Node.js (Xcode Cloud has Homebrew but not Node by default)
brew install node

# Install frontend npm dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm install

# Explore, geocoding and static booking maps need the public Mapbox token at
# compile time. Failing explicitly prevents a release with a non-functional
# map experience. Add VITE_MAPBOX_TOKEN as a secret Xcode Cloud environment
# variable (the value itself is never echoed here).
if [ -z "${VITE_MAPBOX_TOKEN:-}" ]; then
  echo "Missing required Xcode Cloud environment variable: VITE_MAPBOX_TOKEN"
  exit 1
fi

# Build the web app (creates dist/ with all assets).
# VITE_API_URL tells the Capacitor app to call the Vercel proxy at the live domain
# instead of using a relative /api path that doesn't work from capacitor://localhost.
VITE_API_URL=https://bookam.business VITE_MAPBOX_TOKEN="$VITE_MAPBOX_TOKEN" npm run build

# Sync web assets and Capacitor configs into the iOS project
# This creates public/, capacitor.config.json, and config.xml inside ios/App/App/
npx cap sync ios

# Install CocoaPods dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend/ios/App"
pod install
