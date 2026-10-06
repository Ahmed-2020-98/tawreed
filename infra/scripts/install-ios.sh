#!/usr/bin/env bash
# Builds a standalone Release app (own icon + name, JS bundled inside — no Expo Go, no Metro) and installs it
# on the booted iOS simulator. The API must be running on :8030.
#   infra/scripts/install-ios.sh buyer|supplier|driver [--keep-build]
# Native build output goes to apps/<app>-app/ios/build (gitignored) and is removed after install unless --keep-build.
set -euo pipefail
app=${1:?usage: install-ios.sh buyer|supplier|driver [--keep-build]}
keep=${2:-}
root="$(cd "$(dirname "$0")/../.." && pwd)"
dir="$root/apps/$app-app"
[ -d "$dir" ] || { echo "unknown app: $app"; exit 1; }

need=6
free=$(df -g "$HOME" | awk 'NR==2{print $4}')
if [ "$free" -lt "$need" ]; then
  echo "✗ Not enough disk: ${free} GB free, a first iOS build needs about ${need} GB."; exit 1
fi
xcrun simctl list devices booted | grep -q Booted || { echo "✗ No booted simulator (open Simulator.app first)"; exit 1; }

cd "$dir"
[ -d ios ] || npx expo prebuild --platform ios --no-install
(cd ios && pod install)
npx expo run:ios --configuration Release --no-bundler --device "$(xcrun simctl list devices booted | awk -F'[()]' '/Booted/{print $2; exit}')"

if [ "$keep" != "--keep-build" ]; then
  rm -rf ios/build
  echo "Build intermediates removed (ios/build). Re-run to rebuild."
fi
echo "✓ $app installed on the simulator."
