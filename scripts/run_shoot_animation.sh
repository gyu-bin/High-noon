#!/usr/bin/env bash
# 총 쏘기 duel 애니메이션 (sprite-gen + Pollinations)
#   ./scripts/run_shoot_animation.sh player_01     1명
#   ./scripts/run_shoot_animation.sh --all         전체 (시간 오래 걸림)
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q pillow requests "rembg[cpu]" 2>/dev/null || true

if [[ "${1:-}" == "--all" ]]; then
  .venv/bin/python scripts/generate_duel_animation.py --all --regen-ts
else
  CHAR="${1:-player_01}"
  .venv/bin/python scripts/generate_duel_animation.py "$CHAR" --regen-ts
fi
