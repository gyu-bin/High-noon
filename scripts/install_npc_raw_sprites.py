#!/usr/bin/env python3
"""Cursor GenerateImage raw PNG → 게임 NPC 스프라이트 설치 (npc_03 방식)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from highnoon_sprite_generator import fit_center_sprite, remove_sprite_background, strip_magenta_pixels  # noqa: E402
from scripts.generate_duel_animation import char_paths, regenerate_sprite_assets_ts  # noqa: E402
from scripts.regenerate_npc_sprites_magenta import (  # noqa: E402
    SPRITE_SIZE,
    align_aim_with_idle,
    ensure_png_faces_right,
    interior_hole_count,
    is_valid_sprite,
    mirror_if_faces_left,
    process_raw_frame,
)

POSE_KEYS = ("idle", "aim", "shoot", "defeat")


def install_pose(char_id: str, pose: str, raw_path: Path) -> Path:
    idle_path, assets_dir, prefix = char_paths(char_id)
    out_path = assets_dir / f"{prefix}_{pose}.png"
    raw = Image.open(raw_path).convert("RGBA")

    try:
        if pose == "defeat":
            img = process_raw_frame(raw, defeat=True, pose="defeat")
        else:
            img = process_raw_frame(raw, pose=pose)
    except ValueError:
        img = strip_magenta_pixels(
            fit_center_sprite(remove_sprite_background(raw), SPRITE_SIZE)
        )

    if pose == "idle":
        img = ensure_png_faces_right(img)
    elif pose in ("aim", "shoot"):
        idle_ref = (
            fit_center_sprite(Image.open(idle_path).convert("RGBA"), SPRITE_SIZE)
            if idle_path.exists()
            else img
        )
        img = align_aim_with_idle(idle_ref, img)
    else:
        img = fit_center_sprite(img, SPRITE_SIZE)

    defeat = pose == "defeat"
    holes = interior_hole_count(img)
    if not is_valid_sprite(img, defeat=defeat):
        print(f"  ⚠ {pose} 품질 경고 (holes={holes})")

    img.save(out_path, "PNG")
    if pose == "shoot":
        for name in (f"{prefix}_shoot_00.png", f"{prefix}_shoot_01.png"):
            img.save(assets_dir / name, "PNG")
    return out_path


def install_from_dir(char_id: str, raw_dir: Path) -> int:
    n = 0
    for pose in POSE_KEYS:
        candidates = [
            raw_dir / f"{pose}.png",
            raw_dir / f"{char_id}_{pose}.png",
            raw_dir / f"{char_id}_{pose}_raw.png",
        ]
        src = next((p for p in candidates if p.exists()), None)
        if not src:
            print(f"  [skip] {pose} — raw 없음")
            continue
        out = install_pose(char_id, pose, src)
        print(f"  → {out.relative_to(ROOT)}")
        n += 1
    return n


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("char_id", help="npc_04 …")
    parser.add_argument(
        "raw_dir",
        nargs="?",
        help="idle.png aim.png … 가 있는 폴더 (기본: output/raw/{char_id})",
    )
    parser.add_argument("--regen-ts", action="store_true")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir) if args.raw_dir else ROOT / "output" / "raw" / args.char_id
    if not raw_dir.exists():
        print(f"raw 폴더 없음: {raw_dir}")
        sys.exit(1)

    print(f"[{args.char_id}] raw 설치 — {raw_dir}")
    n = install_from_dir(args.char_id, raw_dir)
    if args.regen_ts and n:
        regenerate_sprite_assets_ts()
    print(f"설치: {n}/{len(POSE_KEYS)}")


if __name__ == "__main__":
    main()
