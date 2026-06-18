#!/usr/bin/env bash
# High Noon 스프라이트 생성
#   ./scripts/run_sprite_generator.sh --concept        컨셉 시트 4명 (즉시)
#   ./scripts/run_sprite_generator.sh --pollinations   전체 26명 (Pollinations 무료)
#   ./scripts/run_sprite_generator.sh --pollinations "먼지바람"  1명만
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
.venv/bin/pip install -q replicate pillow requests "rembg[cpu]" 2>/dev/null || true

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

MODE="${1:-}"
if [[ "$MODE" == "--concept" || "$MODE" == "-c" ]]; then
  .venv/bin/python highnoon_sprite_generator.py --concept
  exit 0
fi

if [[ "$MODE" == "--pollinations" || "$MODE" == "--free" || "$MODE" == "-f" ]]; then
  .venv/bin/python highnoon_sprite_generator.py "$@"
  exit 0
fi

if [[ -n "${REPLICATE_API_TOKEN:-}" && "${REPLICATE_API_TOKEN}" != "YOUR_TOKEN_HERE" ]]; then
  .venv/bin/python highnoon_sprite_generator.py "$@"
else
  echo "Replicate 크레딧 없음 → Pollinations(무료) 모드로 실행합니다."
  echo "  (--concept: 컨셉 시트만 | --pollinations: AI 전체 생성)"
  .venv/bin/python highnoon_sprite_generator.py --pollinations "$@"
fi
