#!/usr/bin/env python3
"""
NPC 1개씩 생성 → 검증 통과 시에만 저장.

  .venv/bin/python scripts/regen_one_npc.py npc_04
  .venv/bin/python scripts/regen_one_npc.py 4 --max-attempts 8
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.generate_duel_animation import (  # noqa: E402
    char_paths,
    content_bbox_metrics,
    regenerate_sprite_assets_ts,
)
from scripts.regenerate_npc_sprites_magenta import (  # noqa: E402
    SKIP_IDS,
    audit_poses,
    export_character,
    png_faces_right,
)

# npc_01~03 idle 기준 — 너무 크게 채우면 선택 화면에서 확대돼 보임
IDLE_MAX_W = 0.62
IDLE_MIN_H = 0.50
AIM_MIN_DIFF = 0.08  # aim이 idle과 최소 이 정도 달라야 함 (단순 회전 방지)


def npc_id_from_arg(raw: str) -> tuple[str, int]:
    if raw.startswith("npc_"):
        nid = int(raw.split("_")[1])
        return f"npc_{nid:02d}", nid
    nid = int(raw)
    return f"npc_{nid:02d}", nid


def delete_npc_assets(char_id: str) -> int:
    _, assets_dir, prefix = char_paths(char_id)
    removed = 0
    for p in assets_dir.glob(f"{prefix}_*.png"):
        p.unlink()
        removed += 1
    return removed


def poses_differ_enough(idle: Image.Image, aim: Image.Image) -> bool:
    a = idle.convert("RGBA").resize((64, 64))
    b = aim.convert("RGBA").resize((64, 64))
    diff = sum(
        1
        for i in range(3)
        for y in range(64)
        for x in range(64)
        if abs(a.getpixel((x, y))[i] - b.getpixel((x, y))[i]) > 24
    )
    return diff / (64 * 64 * 3) >= AIM_MIN_DIFF


def validate_npc(char_id: str) -> list[str]:
    idle_path, assets_dir, prefix = char_paths(char_id)
    issues: list[str] = []

    for pose in ("idle", "aim", "shoot", "defeat"):
        p = assets_dir / f"{prefix}_{pose}.png"
        if not p.exists():
            issues.append(f"{pose} 없음")
            continue
        img = Image.open(p)
        if pose in ("idle", "aim", "shoot") and not png_faces_right(img):
            issues.append(f"{pose} 방향")

    issues.extend(audit_poses(char_id))

    defeat_path = assets_dir / f"{prefix}_defeat.png"
    if idle_path.exists() and defeat_path.exists():
        from scripts.generate_duel_animation import is_valid_defeat_pose

        idle = Image.open(idle_path)
        defeat = Image.open(defeat_path)
        if not is_valid_defeat_pose(defeat, idle):
            issues.append("defeat가 서 있는 포즈(쓰러짐 아님)")

    if idle_path.exists() and (assets_dir / f"{prefix}_aim.png").exists():
        idle = Image.open(idle_path)
        aim = Image.open(assets_dir / f"{prefix}_aim.png")
        _cy, w, h = content_bbox_metrics(idle)
        if w > IDLE_MAX_W:
            issues.append(f"idle 너무 큼 (w={w:.2f} > {IDLE_MAX_W})")
        if h < IDLE_MIN_H:
            issues.append(f"idle 너무 작음 (h={h:.2f})")
        if not poses_differ_enough(idle, aim):
            issues.append("aim이 idle과 동일(회전 placeholder 의심)")

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description="NPC 1명 생성 + 검증")
    parser.add_argument("target", help="npc_04 또는 4")
    parser.add_argument("--max-attempts", type=int, default=6)
    parser.add_argument("--regen-ts", action="store_true", help="성공 시 spriteAssets.ts 갱신")
    parser.add_argument("--no-delete", action="store_true", help="기존 에셋 유지")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="생성 없이 기존 에셋만 검증",
    )
    args = parser.parse_args()

    char_id, nid = npc_id_from_arg(args.target)
    if nid in SKIP_IDS:
        print(f"[skip] {char_id} — 기준 캐릭터")
        return 0

    if args.validate_only:
        issues = validate_npc(char_id)
        if issues:
            print(f"검증 실패: {', '.join(issues)}")
            return 1
        print(f"✓ {char_id} 검증 통과")
        return 0

    if not args.no_delete:
        n = delete_npc_assets(char_id)
        print(f"[{char_id}] 기존 에셋 {n}개 삭제")

    seed = 9000 + nid
    for attempt in range(1, args.max_attempts + 1):
        print(f"\n[{char_id}] 생성 시도 {attempt}/{args.max_attempts}")
        delete_npc_assets(char_id)
        try:
            export_character(char_id, seed + attempt * 17)
        except Exception as exc:
            print(f"  [실패] {exc}")
            continue

        issues = validate_npc(char_id)
        if not issues:
            print(f"\n✓ {char_id} 검증 통과")
            if args.regen_ts:
                regenerate_sprite_assets_ts()
            print(f"  → Expo r 리로드 후 npc_{nid:02d} 확인하고 다음 번호 진행")
            return 0

        print(f"  검증 실패: {', '.join(issues)}")

    print(f"\n✗ {char_id} — {args.max_attempts}회 시도 후 실패")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
