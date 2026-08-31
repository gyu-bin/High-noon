#!/usr/bin/env bash
# App Store Connect용 iPhone 스크린샷 자동 캡처
# — 화면별 deep link 직접 이동 + simctl screenshot
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SIMULATOR_NAME="${SIMULATOR_NAME:-iPhone 17 Pro Max}"
SIMULATOR_UDID="${SIMULATOR_UDID:-}"
BUNDLE_ID="${BUNDLE_ID:-com.highnoon.app}"
SCHEME="${SCHEME:-high-noon}"
SCENE_WAIT="${SCENE_WAIT:-5}"
BUILD_FIRST="${BUILD_FIRST:-0}"
USE_RELEASE="${USE_RELEASE:-1}"
# ko = 기존 raw/. en|ja 는 raw-en / raw-ja (한국어 원본을 덮어쓰지 않음)
CAPTURE_LANG="${CAPTURE_LANG:-ko}"
MARKETING_ONLY="${MARKETING_ONLY:-0}"

OUT_DIR="$ROOT/marketing/app-store-screenshots"
if [[ "$CAPTURE_LANG" == "ko" ]]; then
  RAW_DIR="$OUT_DIR/raw"
else
  RAW_DIR="$OUT_DIR/raw-${CAPTURE_LANG}"
fi
P67_DIR="$OUT_DIR/6.7-portrait"
L67_DIR="$OUT_DIR/6.7-landscape"
P65_DIR="$OUT_DIR/6.5-portrait"
L65_DIR="$OUT_DIR/6.5-landscape"

mkdir -p "$RAW_DIR"

# name|route|orientation
SCENES=(
  "01-menu|menu|portrait"
  "02-npc-select|npc-select|portrait"
  "03-duel-steady|capture/duel-steady|portrait"
  "04-duel-bang|capture/duel-bang|portrait"
  "05-round-win|capture/duel-win|portrait"
  "06-round-defeat|capture/duel-defeat|portrait"
  "07-character-select|character-select|portrait"
  "08-boss-duel|capture/duel-boss|portrait"
  "09-local-duel|capture/local-duel|portrait"
  "10-duel-landscape|capture/duel-landscape|landscape"
)

if [[ "$MARKETING_ONLY" == "1" ]]; then
  SCENES=(
    "00-title|index|portrait"
    "02-npc-select|npc-select|portrait"
    "07-character-select|character-select|portrait"
    "03-duel-steady|capture/duel-steady|portrait"
    "04-duel-bang|capture/duel-bang|portrait"
    "09-local-duel|capture/local-duel|portrait"
    "01-menu|menu|portrait"
  )
fi

APP_PATH="$ROOT/.derivedData/Build/Products/Release-iphonesimulator/HighNoon.app"
if [[ "$USE_RELEASE" != "1" ]]; then
  APP_PATH="$ROOT/.derivedData/Build/Products/Debug-iphonesimulator/HighNoon.app"
fi

apply_capture_language() {
  local lang="$1"
  case "$lang" in
    en) xcrun simctl spawn "$SIMULATOR_UDID" defaults write NSGlobalDomain AppleLanguages -array en
        xcrun simctl spawn "$SIMULATOR_UDID" defaults write NSGlobalDomain AppleLocale -string en_US
        ;;
    ja) xcrun simctl spawn "$SIMULATOR_UDID" defaults write NSGlobalDomain AppleLanguages -array ja
        xcrun simctl spawn "$SIMULATOR_UDID" defaults write NSGlobalDomain AppleLocale -string ja_JP
        ;;
    *)  xcrun simctl spawn "$SIMULATOR_UDID" defaults write NSGlobalDomain AppleLanguages -array ko
        xcrun simctl spawn "$SIMULATOR_UDID" defaults write NSGlobalDomain AppleLocale -string ko_KR
        ;;
  esac
}

# 앱 persist에 언어를 직접 심는다 (기기 로케일이 한국어여도 강제).
patch_capture_settings() {
  python3 - "$BUNDLE_ID" "$CAPTURE_LANG" <<'PY'
import json, os, sys, time
bundle, lang = sys.argv[1], sys.argv[2]
if lang not in ("en", "ja", "ko"):
    sys.exit(0)
settings = {
    "state": {
        "soundEnabled": True,
        "musicEnabled": True,
        "hapticEnabled": True,
        "localMatchPreset": "bo5",
        "selectedCharacterId": 1,
        "language": lang,
        "landscapeHintSeen": True,
    },
    "version": 0,
}
key = "high-noon-settings"
man = None
data = ""
for _ in range(20):
    data = os.popen(f"xcrun simctl get_app_container booted {bundle} data").read().strip()
    if data and os.path.isdir(data):
        for root, dirs, files in os.walk(data):
            if "manifest.json" in files and "RCTAsyncLocalStorage" in root:
                man = os.path.join(root, "manifest.json")
                break
    if man:
        break
    time.sleep(0.5)
if not man:
    print("no async storage manifest under", data)
    sys.exit(0)
try:
    with open(man) as fh:
        m = json.load(fh)
    if not isinstance(m, dict):
        m = {}
except Exception:
    m = {}
m[key] = json.dumps(settings, ensure_ascii=False)
with open(man, "w") as fh:
    json.dump(m, fh, ensure_ascii=False)
# 일부 RN 버전은 키별 파일도 읽는다
with open(os.path.join(os.path.dirname(man), key), "w") as fh:
    fh.write(json.dumps(settings, ensure_ascii=False))
print("patched language=", lang, "->", man)
PY
}

echo "▶ 시뮬레이터 준비: $SIMULATOR_NAME"

if [[ -z "$SIMULATOR_UDID" ]]; then
  SIMULATOR_UDID="$(python3 - <<'PY'
import json, subprocess, sys
want = [
    "iPhone 17 Pro Max", "iPhone 17 Pro",
    "iPhone 16 Pro Max", "iPhone 15 Pro Max",
]
raw = subprocess.check_output(["xcrun", "simctl", "list", "devices", "available", "-j"], text=True)
data = json.loads(raw)["devices"]
for name in want:
    for devs in data.values():
        for d in devs:
            if d.get("name") == name and d.get("isAvailable"):
                print(d["udid"])
                sys.exit(0)
sys.exit(1)
PY
)" || {
    echo "사용 가능한 iPhone Pro 시뮬레이터를 찾지 못했습니다."
    exit 1
  }
fi

echo "   UDID: $SIMULATOR_UDID"

preapprove_url_schemes() {
  local plist="$HOME/Library/Developer/CoreSimulator/Devices/$SIMULATOR_UDID/data/Library/Preferences/com.apple.launchservices.schemeapproval.plist"
  mkdir -p "$(dirname "$plist")"
  /usr/libexec/PlistBuddy -c "Delete :com.apple.CoreSimulator.CoreSimulatorBridge" "$plist" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Add :com.apple.CoreSimulator.CoreSimulatorBridge dict" "$plist"
  /usr/libexec/PlistBuddy -c "Add :com.apple.CoreSimulator.CoreSimulatorBridge:${BUNDLE_ID} string ${SCHEME}://" "$plist"
}

rotate_simulator_landscape() {
  osascript <<'EOF' >/dev/null 2>&1 || true
tell application "Simulator" to activate
delay 0.4
tell application "System Events"
  tell process "Simulator"
    try
      click menu item "Rotate Left" of menu "Device" of menu bar 1
    on error
      key code 123 using {command down}
    end try
  end tell
end tell
EOF
  sleep 1.5
}

rotate_simulator_portrait() {
  osascript <<'EOF' >/dev/null 2>&1 || true
tell application "Simulator" to activate
delay 0.4
tell application "System Events"
  tell process "Simulator"
    try
      repeat 2 times
        click menu item "Rotate Right" of menu "Device" of menu bar 1
      end repeat
    on error
      key code 124 using {command down}
    end try
  end tell
end tell
EOF
  sleep 1
}

preapprove_url_schemes
defaults write com.apple.iphonesimulator CurrentDeviceUDID "$SIMULATOR_UDID"
xcrun simctl shutdown "$SIMULATOR_UDID" 2>/dev/null || true
sleep 1
xcrun simctl boot "$SIMULATOR_UDID" 2>/dev/null || true
open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_UDID"
xcrun simctl bootstatus "$SIMULATOR_UDID" -b
sleep 2
apply_capture_language "$CAPTURE_LANG"

build_and_install() {
  if [[ "$USE_RELEASE" == "1" ]]; then
    echo "▶ iOS 시뮬레이터 빌드 (Release — 번들 내장)"
    (cd "$ROOT/ios" && xcodebuild \
      -workspace HighNoon.xcworkspace \
      -scheme HighNoon \
      -configuration Release \
      -sdk iphonesimulator \
      -destination "platform=iOS Simulator,id=$SIMULATOR_UDID" \
      -derivedDataPath "$ROOT/.derivedData" \
      CODE_SIGN_IDENTITY="-" \
      CODE_SIGNING_REQUIRED=NO \
      CODE_SIGNING_ALLOWED=NO \
      build)
  else
    echo "▶ iOS 시뮬레이터 빌드 (Debug)"
    (cd "$ROOT/ios" && xcodebuild \
      -workspace HighNoon.xcworkspace \
      -scheme HighNoon \
      -configuration Debug \
      -sdk iphonesimulator \
      -destination "platform=iOS Simulator,id=$SIMULATOR_UDID" \
      -derivedDataPath "$ROOT/.derivedData" \
      CODE_SIGN_IDENTITY="-" \
      CODE_SIGNING_REQUIRED=NO \
      CODE_SIGNING_ALLOWED=NO \
      build)
  fi
  echo "▶ 시뮬레이터에 설치"
  xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
}

if [[ "$CAPTURE_LANG" != "ko" ]]; then
  echo "▶ 기존 앱 삭제 (언어 초기화)"
  xcrun simctl uninstall booted "$BUNDLE_ID" >/dev/null 2>&1 || true
fi
if [[ "$BUILD_FIRST" == "1" ]]; then
  build_and_install
else
  echo "▶ 앱 설치 (기존 Release 번들)"
  xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
fi

echo "▶ 앱 실행 (lang=$CAPTURE_LANG)"
xcrun simctl terminate booted "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl openurl booted "${SCHEME}://menu?lang=${CAPTURE_LANG}" >/dev/null || xcrun simctl launch booted "$BUNDLE_ID" >/dev/null || true
sleep 5
patch_capture_settings || true
xcrun simctl terminate booted "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl openurl booted "${SCHEME}://menu?lang=${CAPTURE_LANG}" >/dev/null || true
sleep 4

open_scene() {
  local route="$1"
  local orient="$2"
  if [[ "$orient" == "landscape" ]]; then
    rotate_simulator_landscape
  else
    rotate_simulator_portrait
  fi
  xcrun simctl openurl booted "${SCHEME}://${route}?lang=${CAPTURE_LANG}"
  sleep "$SCENE_WAIT"
}

resize_outputs() {
  local raw="$1"
  local base="$2"
  local orient="$3"
  if [[ "$MARKETING_ONLY" == "1" ]]; then
    return 0
  fi
  mkdir -p "$P67_DIR" "$L67_DIR" "$P65_DIR" "$L65_DIR"

  if [[ "$orient" == "landscape" ]]; then
    sips -z 1284 2778 "$raw" --out "$L67_DIR/${base}.png" >/dev/null
    sips -z 1242 2688 "$raw" --out "$L65_DIR/${base}.png" >/dev/null
  else
    sips -z 2778 1284 "$raw" --out "$P67_DIR/${base}.png" >/dev/null
    sips -z 2688 1242 "$raw" --out "$P65_DIR/${base}.png" >/dev/null
  fi
}

for entry in "${SCENES[@]}"; do
  IFS='|' read -r name route orient <<< "$entry"
  echo "▶ 이동: $route"
  open_scene "$route" "$orient"
  echo "▶ 캡처: $name"
  raw="$RAW_DIR/${name}.png"
  xcrun simctl io booted screenshot "$raw"
  resize_outputs "$raw" "$name" "$orient"
  echo "   ✓ 저장됨"
done

echo ""
echo "✅ 완료 — lang=$CAPTURE_LANG"
echo "   원본       : $RAW_DIR"
