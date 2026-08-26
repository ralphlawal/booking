#!/bin/sh
set -e

echo ">>> ci_pre_xcodebuild: START"
echo ">>> CI_PRIMARY_REPOSITORY_PATH=$CI_PRIMARY_REPOSITORY_PATH"
echo ">>> HOME=$HOME"
echo ">>> whoami=$(whoami)"

# ── Delete DerivedData from every known location on Xcode Cloud ──────────────
# Xcode Cloud restores its build cache AFTER ci_post_clone.sh runs.
# This script runs right before xcodebuild — the last safe point to nuke it.
for DD_PATH in \
  "$HOME/Library/Developer/Xcode/DerivedData" \
  "/Users/administrator/Library/Developer/Xcode/DerivedData" \
  "/Users/runner/Library/Developer/Xcode/DerivedData" \
  "/Volumes/workspace/DerivedData"; do
  if [ -d "$DD_PATH" ]; then
    echo ">>> Deleting DerivedData at: $DD_PATH"
    rm -rf "$DD_PATH"
    echo ">>> Deleted."
  else
    echo ">>> DerivedData not present at: $DD_PATH"
  fi
done

# ── Touch Capacitor Swift sources to bust any content-hash cache ──────────────
PODS_DIR="$CI_PRIMARY_REPOSITORY_PATH/frontend/ios/App/Pods"
echo ">>> Pods dir exists: $([ -d "$PODS_DIR" ] && echo YES || echo NO)"

if [ -d "$PODS_DIR" ]; then
  for POD in Capacitor CapacitorApp CapacitorCordova; do
    POD_PATH="$PODS_DIR/$POD"
    if [ -d "$POD_PATH" ]; then
      COUNT=$(find "$POD_PATH" -name "*.swift" 2>/dev/null | wc -l | tr -d ' ')
      echo ">>> $POD: found $COUNT Swift files — touching"
      find "$POD_PATH" -name "*.swift" -exec touch {} + 2>/dev/null || true
    else
      echo ">>> $POD dir not found at $POD_PATH"
    fi
  done
fi

echo ">>> ci_pre_xcodebuild: DONE"
