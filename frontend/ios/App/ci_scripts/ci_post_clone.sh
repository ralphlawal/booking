#!/bin/sh
set -e

# CI_PRIMARY_REPOSITORY_PATH is the root of the cloned repo in Xcode Cloud
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"
npm install

cd "$CI_PRIMARY_REPOSITORY_PATH/frontend/ios/App"
pod install
