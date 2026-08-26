#!/bin/sh
set -e

# Install Node.js (Xcode Cloud has Homebrew but not Node by default)
brew install node

# Install frontend npm dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm install

# Build the web app (creates dist/ with all assets)
npm run build

# Sync web assets and Capacitor configs into the iOS project
# This creates public/, capacitor.config.json, and config.xml inside ios/App/App/
npx cap sync ios

# Install CocoaPods dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend/ios/App"
pod install
