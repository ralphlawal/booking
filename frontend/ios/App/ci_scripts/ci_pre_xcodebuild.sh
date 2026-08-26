#!/bin/sh
set -e

# This runs RIGHT BEFORE xcodebuild — after Xcode Cloud has restored its cloud build cache.
# ci_post_clone.sh already deletes DerivedData, but Xcode Cloud restores it afterwards.
# Deleting it here (the last moment before compilation) guarantees Capacitor.framework
# is compiled fresh, preventing the "Symbol not found: ApplicationDelegateProxy.shared"
# dyld crash caused by a stale cached binary.

echo ">>> ci_pre_xcodebuild: clearing stale build cache"

# Clear DerivedData — forces Xcode to recompile all frameworks from source
rm -rf ~/Library/Developer/Xcode/DerivedData

# Touch all Capacitor pod Swift sources so Xcode marks them as changed,
# guaranteeing recompilation even if DerivedData is partially restored
PODS_DIR="$CI_PRIMARY_REPOSITORY_PATH/frontend/ios/App/Pods"
if [ -d "$PODS_DIR" ]; then
  find "$PODS_DIR/Capacitor" -name "*.swift" -exec touch {} + 2>/dev/null || true
  find "$PODS_DIR/CapacitorApp" -name "*.swift" -exec touch {} + 2>/dev/null || true
fi

echo ">>> ci_pre_xcodebuild: done"
