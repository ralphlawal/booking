#!/bin/sh
set -e

# Install Node.js (Xcode Cloud has Homebrew but not Node by default)
brew install node

# Install frontend npm dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm install

# Install CocoaPods dependencies
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend/ios/App"
pod install
