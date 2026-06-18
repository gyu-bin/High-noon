#!/usr/bin/env bash
# sprite-gen atlas 준비 — idle PNG → idle/attack 프레임 레이아웃
# 사용: ./scripts/run_sprite_gen_atlas.sh player_01
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SG="$ROOT/tools/sprite-gen"
CHAR="${1:-player_01}"

if [[ ! -d "$SG/scripts" ]]; then
  echo "sprite-gen 없음. git clone https://github.com/aldegad/sprite-gen tools/sprite-gen"
  exit 1
fi

if [[ "$CHAR" == player_* ]]; then
  NUM="${CHAR#player_}"
  BASE="$ROOT/assets/sprites/player/player_${NUM}_idle.png"
else
  NUM="${CHAR#npc_}"
  BASE="$ROOT/assets/sprites/npc/npc_${NUM}_idle.png"
fi

if [[ ! -f "$BASE" ]]; then
  echo "베이스 idle 없음: $BASE"
  echo "먼저: python highnoon_sprite_generator.py --concept"
  exit 1
fi

OUT="$ROOT/output/sprite-gen/$CHAR"
mkdir -p "$OUT"

python3 "$SG/scripts/prepare_sprite_run.py" \
  --out-dir "$OUT" \
  --character-id "$CHAR" \
  --base-image "$BASE" \
  --description "High Noon western gunslinger duel game character" \
  --style "detailed pixel art western gunslinger, HIGH NOON style, rich shading, crisp pixel edges, game sprite" \
  --cell-size 256 \
  --chroma-key auto \
  --force

echo ""
echo "준비 완료: $OUT"
echo "  sprite-request.json + layout guides 생성됨"
echo "  이미지 생성(image-gen) 후:"
echo "    python3 $SG/scripts/extract_sprite_row_frames.py --run-dir $OUT"
echo "    python3 $SG/scripts/compose_sprite_atlas.py --run-dir $OUT"
