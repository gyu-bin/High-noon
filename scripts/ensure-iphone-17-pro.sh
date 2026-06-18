#!/usr/bin/env bash
# Expo / Simulator가 iPhone 17 Pro를 자동으로 쓰도록 macOS 기본값 + 부팅
set -euo pipefail

SIMULATOR_NAME="iPhone 17 Pro"
SIMULATOR_UDID="18AB4DDD-83C9-4622-897D-42BE6FE002FC"

defaults write com.apple.iphonesimulator CurrentDeviceUDID "$SIMULATOR_UDID"

if ! xcrun simctl list devices available | grep -q "$SIMULATOR_UDID"; then
  echo "시뮬레이터 '${SIMULATOR_NAME}' (${SIMULATOR_UDID})를 찾을 수 없습니다."
  echo "Xcode > Settings > Platforms 에서 iOS 26.4 런타임을 확인해주세요."
  exit 1
fi

xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true
open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_UDID"
xcrun simctl bootstatus "$SIMULATOR_UDID" -b >/dev/null 2>&1 || true
