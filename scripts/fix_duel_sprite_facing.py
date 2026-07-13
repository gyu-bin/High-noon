#!/usr/bin/env python3
"""결투 스프라이트 조준 방향 일괄 보정 — PNG는 항상 오른쪽(→) 조준.

게임에서 NPC(topRight)는 scaleX 반전으로 플레이어를 향함.
PNG가 좌향이면 반전 후 둘 다 같은 방향을 보는 버그가 난다.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.regenerate_npc_sprites_magenta import (  # noqa: E402
    ensure_png_faces_right,
    png_faces_right,
)

POSE_SUFFIXES = ("idle", "aim", "shoot", "shoot_00", "shoot_01")


def fix_folder(folder: Path, prefix: str) -> int:
    changed = 0
    ids = sorted({int(p.name.split("_")[1]) for p in folder.glob(f"{prefix}_*_idle.png")})
    for npc_id in ids:
        tag = f"{prefix}_{npc_id:02d}"
        for suffix in POSE_SUFFIXES:
            path = folder / f"{tag}_{suffix}.png"
            if not path.exists():
                continue
            before = Image.open(path).convert("RGBA")
            if png_faces_right(before):
                continue
            after = ensure_png_faces_right(before)
            after.save(path, "PNG")
            changed += 1
            print(f"  fixed {path.name}")
    return changed


def main() -> int:
    total = 0
    for folder, prefix in (
        (ROOT / "assets" / "sprites" / "npc", "npc"),
        (ROOT / "assets" / "sprites" / "player", "player"),
    ):
        print(folder.name)
        total += fix_folder(folder, prefix)
    print(f"\n보정 완료: {total}개")
    return total


if __name__ == "__main__":
    raise SystemExit(main())
