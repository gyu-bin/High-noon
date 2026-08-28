#!/usr/bin/env bash
# Expo / Simulator가 iPhone 17 Pro를 자동으로 쓰도록 macOS 기본값 + 부팅
set -euo pipefail

SIMULATOR_NAME="iPhone 17 Pro"

SIMULATOR_UDID="$(xcrun simctl list devices available \
  | grep -F "${SIMULATOR_NAME} (" \
  | head -1 \
  | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')"

if [[ -z "${SIMULATOR_UDID}" ]]; then
  echo "시뮬레이터 '${SIMULATOR_NAME}'를 찾을 수 없습니다."
  echo "Xcode > Settings > Platforms 에서 iOS 런타임을 확인해주세요."
  exit 1
fi

defaults write com.apple.iphonesimulator CurrentDeviceUDID "$SIMULATOR_UDID"

xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true
open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_UDID"
xcrun simctl bootstatus "$SIMULATOR_UDID" -b >/dev/null 2>&1 || true
