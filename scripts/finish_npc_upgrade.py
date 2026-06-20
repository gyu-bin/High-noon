#!/usr/bin/env python3
"""NPC 스프라이트 설치 후 핑크 제거·검증 (GenerateImage raw → 게임 에셋)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.generate_duel_animation import char_paths, regenerate_sprite_assets_ts  # noqa: E402
from scripts.install_npc_raw_sprites import install_from_dir  # noqa: E402
from scripts.regen_one_npc import validate_npc  # noqa: E402


def purge_pink(img: Image.Image) -> Image.Image:
    a = np.array(img.convert("RGBA"))
    r, g, b, al = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int), a[:, :, 3]
    mask = (
        ((r > 210) & (g < 95) & (b > 210))
        | ((r > 175) & (g < 120) & (b > 175) & (al > 0))
        | ((r - g > 70) & (b - g > 70) & (g < 130) & (al > 128))
    )
    a[mask, 3] = 0
    a[mask, :3] = 0
    out = Image.fromarray(a.astype(np.uint8))
    rs, gs, bs, as_ = out.split()
    as_ = as_.filter(ImageFilter.MaxFilter(3))
    out = Image.merge("RGBA", (rs, gs, bs, as_))
    a = np.array(out)
    r, g, b, al = a[:, :, 0].astype(int), a[:, :, 1].astype(int), a[:, :, 2].astype(int), a[:, :, 3]
    mask = ((r > 210) & (g < 95) & (b > 210)) | ((r > 160) & (b > 140) & (g < 130) & (al > 0))
    a[mask, 3] = 0
    a[mask, :3] = 0
    return Image.fromarray(a.astype(np.uint8))


def fix_holes(img: Image.Image, *, defeat: bool = False) -> Image.Image:
    from scripts.regenerate_npc_sprites_magenta import interior_hole_count, is_valid_sprite

    if is_valid_sprite(img, defeat=defeat):
        return img
    r, g, b, a = img.split()
    for size in (3, 5, 7):
        a2 = a.filter(ImageFilter.MaxFilter(size))
        test = Image.merge("RGBA", (r, g, b, a2))
        if is_valid_sprite(test, defeat=defeat):
            return test
    return Image.merge("RGBA", (r, g, b, a))


def purge_char(char_id: str) -> int:
    _, assets_dir, prefix = char_paths(char_id)
    n = 0
    for p in sorted(assets_dir.glob(f"{prefix}_*.png")):
        defeat = "defeat" in p.name
        img = fix_holes(purge_pink(Image.open(p)), defeat=defeat)
        img.save(p)
        n += 1
    return n


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("targets", nargs="*", help="npc_07 또는 7")
    parser.add_argument("--from", dest="from_id", type=int, default=5)
    parser.add_argument("--to", dest="to_id", type=int, default=22)
    parser.add_argument("--install-raw", action="store_true", help="output/raw/{id} 설치")
    parser.add_argument("--purge-only", action="store_true")
    parser.add_argument("--regen-ts", action="store_true")
    args = parser.parse_args()

    if args.targets:
        ids = []
        for t in args.targets:
            ids.append(int(t.split("_")[-1]) if "npc" in t else int(t))
    else:
        ids = list(range(args.from_id, args.to_id + 1))

    failed: list[str] = []
    for nid in ids:
        char_id = f"npc_{nid:02d}"
        if args.install_raw:
            raw_dir = ROOT / "output" / "raw" / char_id
            if raw_dir.exists():
                install_from_dir(char_id, raw_dir)
                print(f"[{char_id}] raw 설치")
        n = purge_char(char_id)
        print(f"[{char_id}] 핑크 정리 {n}파일")
        if args.purge_only:
            continue
        issues = validate_npc(char_id)
        if issues:
            failed.append(f"{char_id}: {', '.join(issues)}")
            print(f"  ✗ {', '.join(issues)}")
        else:
            print(f"  ✓ 검증 통과")

    if args.regen_ts:
        regenerate_sprite_assets_ts()

    if failed:
        print("\n실패:", *failed, sep="\n")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
