#!/usr/bin/env bash
# High Noon 스프라이트 생성
#   ./scripts/run_sprite_generator.sh --concept        컨셉 시트 4명 (즉시)
#   ./scripts/run_sprite_generator.sh --pollinations   전체 26명 (Pollinations 무료)
#   ./scripts/run_sprite_generator.sh --pollinations "먼지바람"  1명만
# 결투 aim/shoot: ./scripts/duel_sprite_library.py npc_02
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q pillow requests "rembg[cpu]" 2>/dev/null || true

MODE="${1:-}"
if [[ "$MODE" == "--concept" || "$MODE" == "-c" ]]; then
  .venv/bin/python highnoon_sprite_generator.py --concept
  exit 0
fi

if [[ "$MODE" == "--pollinations" || "$MODE" == "--free" || "$MODE" == "-f" ]]; then
  .venv/bin/python highnoon_sprite_generator.py "$@"
  exit 0
fi

echo "사용법:"
echo "  ./scripts/run_sprite_generator.sh --concept"
echo "  ./scripts/run_sprite_generator.sh --pollinations [캐릭터이름]"
echo "결투 포즈: .venv/bin/python scripts/duel_sprite_library.py npc_02"
exit 1
