#!/bin/sh
set -e

# Static framework linkage (use_frameworks! :linkage => :static in Podfile)
# means Capacitor code is linked into the app binary at compile time.
# No Capacitor.framework ships in the bundle, so the dyld "Symbol not found:
# ApplicationDelegateProxy.shared" crash cannot occur.
# This script is intentionally minimal — no cache-clearing hacks needed.

echo ">>> ci_pre_xcodebuild: nothing to do (static linkage active)"
