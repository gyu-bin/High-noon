#!/usr/bin/env python3
"""기존 NPC aim/shoot를 idle(READY) 조준 방향에 맞춤."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.regenerate_npc_sprites_magenta import mirror_if_faces_left  # noqa: E402
from scripts.generate_duel_animation import regenerate_sprite_assets_ts  # noqa: E402

SKIP = {1, 2}
ASSETS = ROOT / "assets" / "sprites" / "npc"
SHOOT_NAMES = ("shoot.png", "shoot_00.png", "shoot_01.png")


def main() -> int:
    fixed = 0
    for idle_path in sorted(ASSETS.glob("npc_*_idle.png")):
        nid = int(idle_path.stem.split("_")[1])
        if nid in SKIP:
            continue
        prefix = f"npc_{nid:02d}"
        aim_path = ASSETS / f"{prefix}_aim.png"
        if not aim_path.exists():
            continue
        idle = Image.open(idle_path).convert("RGBA")
        for name in ("aim.png", *SHOOT_NAMES):
            pose_path = ASSETS / f"{prefix}_{name}"
            if not pose_path.exists():
                continue
            before = Image.open(pose_path).convert("RGBA")
            aligned = mirror_if_faces_left(before)
            if aligned.tobytes() != before.tobytes():
                aligned.save(pose_path, "PNG")
                fixed += 1
                print(f"  fixed {prefix}_{name}")
    if fixed:
        regenerate_sprite_assets_ts()
    print(f"\naim/shoot 방향 정렬: {fixed}개")
    return fixed


if __name__ == "__main__":
    main()
