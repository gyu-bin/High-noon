#!/usr/bin/env bash
# npc 결투 포즈 일괄 생성
# 사용: ./scripts/batch_npc_poses.sh [시작번호, 기본 4]
set -uo pipefail
cd "$(dirname "$0")/.."
LOG=output/generate_npc_poses.log
FROM=${1:-4}
mkdir -p output

if [ "${BATCH_DAEMON:-}" != 1 ]; then
  export BATCH_DAEMON=1
  nohup "$0" "$FROM" </dev/null >>"$LOG" 2>&1 &
  echo "배치 시작 PID $! — tail -f $LOG"
  exit 0
fi

exec >>"$LOG" 2>&1

echo ""
echo "======== batch start $(date) from npc_$(printf '%02d' "$FROM") ========"

for i in $(seq "$FROM" 22); do
  id=$(printf 'npc_%02d' "$i")
  echo ""
  echo "======== $(date) $id ========"
  .venv/bin/python scripts/generate_duel_animation.py "$id" || echo "[$id] failed, continue"
done

.venv/bin/python scripts/generate_duel_animation.py --regen-ts
echo "======== batch done $(date) ========"
