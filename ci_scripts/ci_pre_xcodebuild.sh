#!/bin/sh
set -e

echo ">>> ci_pre_xcodebuild: START"
echo ">>> CI_PRIMARY_REPOSITORY_PATH=$CI_PRIMARY_REPOSITORY_PATH"
echo ">>> HOME=$HOME"
echo ">>> whoami=$(whoami)"
echo ">>> DATE=$(date)"

# ── Nuclear option: redirect Xcode to a fresh empty DerivedData directory ────
# defaults write sets an Xcode preference that tells xcodebuild where to store
# derived data. Pointing it at a new empty path forces a full recompile of every
# framework — regardless of what Xcode Cloud's cache layer restored elsewhere.
FRESH_DD="/tmp/xc-dd-$$-$(date +%s)"
mkdir -p "$FRESH_DD"
echo ">>> Redirecting DerivedData to fresh path: $FRESH_DD"
defaults write com.apple.dt.Xcode IDECustomDerivedDataLocation -string "$FRESH_DD"
echo ">>> defaults write result: $?"

# ── Also nuke every standard DerivedData location just in case ───────────────
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
    echo ">>> Not present: $DD_PATH"
  fi
done

# ── Touch Capacitor Swift sources ─────────────────────────────────────────────
PODS_DIR="$CI_PRIMARY_REPOSITORY_PATH/frontend/ios/App/Pods"
echo ">>> Pods dir exists: $([ -d "$PODS_DIR" ] && echo YES || echo NO)"

if [ -d "$PODS_DIR" ]; then
  for POD in Capacitor CapacitorApp CapacitorCordova; do
    POD_PATH="$PODS_DIR/$POD"
    if [ -d "$POD_PATH" ]; then
      COUNT=$(find "$POD_PATH" -name "*.swift" 2>/dev/null | wc -l | tr -d ' ')
      echo ">>> $POD: $COUNT Swift files — touching"
      find "$POD_PATH" -name "*.swift" -exec touch {} + 2>/dev/null || true
    else
      echo ">>> $POD NOT FOUND at $POD_PATH"
    fi
  done
fi

echo ">>> ci_pre_xcodebuild: DONE"
