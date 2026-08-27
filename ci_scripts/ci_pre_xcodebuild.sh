#!/bin/sh
set -e

# Static framework linkage (use_frameworks! :linkage => :static in Podfile)
# means Capacitor code is linked into the app binary at compile time.
# No Capacitor.framework ships in the bundle, so the dyld "Symbol not found:
# ApplicationDelegateProxy.shared" crash cannot occur.
# The post_install hook sets DIAGNOSE_MISSING_TARGET_DEPENDENCIES=NO to
# suppress Xcode 26 explicit-dependency warnings that otherwise fail the build.
echo ">>> ci_pre_xcodebuild: static linkage active (dyld crash fix)"
