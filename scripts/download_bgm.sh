#!/usr/bin/env bash
# Mixkit Free License — https://mixkit.co/license/#musicFree
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)/assets/sounds"
mkdir -p "$ROOT"

# 로비·메인 — The Duel (Country Rock, 메인 테마)
curl -sL "https://assets.mixkit.co/music/817/817.mp3" -o "$ROOT/bgm_menu.mp3"
# 경기 — K.O. (Rock, 박진감)
curl -sL "https://assets.mixkit.co/music/1068/1068.mp3" -o "$ROOT/bgm_duel.mp3"
# 보스 — Kroks (Rock, 스파게티 웨스턴)
curl -sL "https://assets.mixkit.co/music/591/591.mp3" -o "$ROOT/bgm_boss.mp3"

echo "BGM saved to $ROOT/bgm_{menu,duel,boss}.mp3"
