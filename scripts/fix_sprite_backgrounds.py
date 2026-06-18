#!/usr/bin/env python3
"""스프라이트 PNG 배경 제거 + 256 캔버스 재정렬."""

from __future__ import annotations

import sys
from io import BytesIO
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from highnoon_sprite_generator import fit_center_sprite, remove_background  # noqa: E402

SPRITES = ROOT / "assets" / "sprites"


def needs_fix(img: Image.Image) -> bool:
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if any(c[3] > 200 and sum(c[:3]) > 700 for c in corners):
        return True
    if any(c[3] > 200 and c[0] > 120 and c[1] < 120 and c[2] < 120 for c in corners):
        return True
    opaque = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 200)
    return opaque / (w * h) > 0.55


def fix_file(path: Path) -> bool:
    img = Image.open(path).convert("RGBA")
    if not needs_fix(img):
        return False
    cleaned = remove_background(img)
    out = fit_center_sprite(cleaned, 256)
    out.save(path, "PNG")
    print(f"  fixed: {path.relative_to(ROOT)}")
    return True


def main() -> None:
    fixed = 0
    for png in sorted(SPRITES.rglob("*.png")):
        if fix_file(png):
            fixed += 1
    print(f"완료 — {fixed}개 배경 제거")


if __name__ == "__main__":
    main()
