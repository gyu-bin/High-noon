#!/usr/bin/env python3
"""기존 aim/shoot PNG 방향을 먼지바람 기준(우측 조준)으로 일괄 보정."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.generate_duel_animation import normalize_duel_aim_right  # noqa: E402


def main() -> int:
    total = 0
    for folder in (
        ROOT / "assets" / "sprites" / "npc",
        ROOT / "assets" / "sprites" / "player",
    ):
        print(folder.name)
        for p in sorted(folder.glob("*.png")):
            if "_aim.png" not in p.name and "_shoot" not in p.name:
                continue
            img = Image.open(p).convert("RGBA")
            fixed = normalize_duel_aim_right(img)
            if fixed.tobytes() != img.tobytes():
                fixed.save(p, "PNG")
                total += 1
                print(f"  flipped {p.name}")
    print(f"\n보정 완료: {total}개")
    return total


if __name__ == "__main__":
    main()
