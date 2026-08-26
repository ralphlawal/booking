#!/bin/sh
set -e

# Install Node.js via Homebrew (Xcode Cloud has Homebrew available)
brew install node@20 || true
export PATH="/usr/local/opt/node@20/bin:$PATH"

# Install frontend dependencies
cd "$CI_WORKSPACE/frontend"
npm install

# Sync Capacitor so ios/App has all plugin references
npx cap sync ios
