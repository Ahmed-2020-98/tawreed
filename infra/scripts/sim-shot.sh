#!/usr/bin/env bash
# Dev helper: open a deep link in Expo Go on the booted iOS simulator and save a downscaled screenshot.
#   infra/scripts/sim-shot.sh <port> <path> <out.png> [wait-seconds]
set -euo pipefail
port=$1; path=$2; out=$3; wait=${4:-6}
xcrun simctl openurl booted "exp://127.0.0.1:${port}/--${path}"
sleep "$wait"
tmp=$(mktemp -t simshot).png
xcrun simctl io booted screenshot "$tmp" >/dev/null 2>&1
python3 -c "
from PIL import Image
im=Image.open('$tmp'); im.resize((im.size[0]//3, im.size[1]//3)).save('$out')"
rm -f "$tmp"
