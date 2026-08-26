#!/bin/sh
set -e

# Install frontend npm dependencies (needed for node_modules/@capacitor/*)
cd "$CI_WORKSPACE/frontend"
npm install

# Install CocoaPods dependencies (creates Pods/ and regenerates App.xcworkspace)
cd "$CI_WORKSPACE/frontend/ios/App"
pod install
