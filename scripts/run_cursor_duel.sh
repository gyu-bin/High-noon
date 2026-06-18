#!/usr/bin/env bash
# Cursor duel 프레임 → sprite-gen → assets (player_01 예시)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PY="${ROOT}/.venv/bin/python"
CHAR="${1:-player_01}"
shift || true

exec "$PY" scripts/cursor_duel_pipeline.py "$CHAR" "$@"
