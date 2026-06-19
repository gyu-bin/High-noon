#!/usr/bin/env python3
"""
idle PNG → aim/shoot procedural 포즈 (lib/duelSprite/poseSpecs.ts 와 동일 스펙).

게임 런타임 애니메이션은 lib/duelSprite (useDuelSpriteMotion) 가 담당하고,
이 스크립트는 에셋 PNG를 idle 기준으로 맞출 때 씁니다.

  .venv/bin/python scripts/duel_sprite_library.py npc_02
  .venv/bin/python scripts/duel_sprite_library.py --regen-ts
  .venv/bin/python scripts/generate_duel_animation.py npc_04   # 기본: library
"""

from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from highnoon_sprite_generator import fit_center_sprite  # noqa: E402

ASSETS_NPC = ROOT / "assets" / "sprites" / "npc"
ASSETS_PLAYER = ROOT / "assets" / "sprites" / "player"
SPRITE_ASSETS_TS = ROOT / "constants" / "spriteAssets.ts"
CELL = 256
REFERENCE_SKIP = {"npc_01", "player_01"}


@dataclass(frozen=True)
class PoseSpec:
    scale: float
    dy: int
    dx: int
    rotate: float


# lib/duelSprite/poseSpecs.ts 와 동일
POSE_SPECS: dict[str, PoseSpec] = {
    "aim": PoseSpec(scale=1.03, dy=-2, dx=0, rotate=2.0),
    "shoot": PoseSpec(scale=1.06, dy=-4, dx=0, rotate=4.0),
    "shoot_00": PoseSpec(scale=1.05, dy=-3, dx=0, rotate=3.0),
    "shoot_01": PoseSpec(scale=1.08, dy=-6, dx=2, rotate=6.0),
    "defeat": PoseSpec(scale=0.98, dy=18, dx=-4, rotate=-12.0),
}


def char_paths(char_id: str) -> tuple[Path, Path, str]:
    if char_id.startswith("player_"):
        num = char_id.split("_", 1)[1]
        idle = ASSETS_PLAYER / f"player_{num}_idle.png"
        return idle, ASSETS_PLAYER, f"player_{num}"
    if char_id.startswith("npc_"):
        num = char_id.split("_", 1)[1]
        idle = ASSETS_NPC / f"npc_{num}_idle.png"
        return idle, ASSETS_NPC, f"npc_{num}"
    raise ValueError(char_id)


def render_pose(idle: Image.Image, spec: PoseSpec) -> Image.Image:
    idle = fit_center_sprite(idle.convert("RGBA"), CELL)
    canvas = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    nw = max(1, int(CELL * spec.scale))
    nh = max(1, int(CELL * spec.scale))
    resized = idle.resize((nw, nh), Image.LANCZOS)
    if spec.rotate:
        resized = resized.rotate(spec.rotate, resample=Image.BICUBIC, expand=True)
    ox = (CELL - resized.width) // 2 + spec.dx
    oy = CELL - resized.height - int(CELL * 0.06) + spec.dy
    canvas.paste(resized, (ox, oy), resized)
    return fit_center_sprite(canvas, CELL)


def export_character(char_id: str, *, skip_reference: bool = True) -> bool:
    idle_path, assets_dir, prefix = char_paths(char_id)
    if not idle_path.exists():
        print(f"  [스킵] idle 없음: {idle_path}")
        return False

    if skip_reference and char_id in REFERENCE_SKIP:
        print(f"  [스킵] 기준 캐릭터 {char_id} — 에셋 유지")
        return False

    idle = Image.open(idle_path).convert("RGBA")
    written: list[str] = []

    for pose_name, spec in POSE_SPECS.items():
        out = assets_dir / f"{prefix}_{pose_name}.png"
        img = render_pose(idle, spec)
        img.save(out, "PNG")
        written.append(out.name)

    shoot_main = render_pose(idle, POSE_SPECS["shoot"])
    shoot_main.save(assets_dir / f"{prefix}_shoot.png", "PNG")
    written.append(f"{prefix}_shoot.png")

    print(f"  [{char_id}] {len(written)}개 갱신")
    return True


def all_char_ids() -> list[str]:
    ids: list[str] = []
    for p in sorted(ASSETS_PLAYER.glob("player_*_idle.png")):
        ids.append(f"player_{p.stem.split('_')[1]}")
    for p in sorted(ASSETS_NPC.glob("npc_*_idle.png")):
        ids.append(f"npc_{p.stem.split('_')[1]}")
    return ids


def regenerate_sprite_assets_ts() -> None:
    from generate_duel_animation import regenerate_sprite_assets_ts as regen

    regen()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("targets", nargs="*", help="npc_05 또는 player_02 (비우면 전체)")
    parser.add_argument("--regen-ts", action="store_true")
    parser.add_argument("--include-reference", action="store_true")
    args = parser.parse_args()

    if args.regen_ts and not args.targets:
        regenerate_sprite_assets_ts()
        return

    targets = args.targets or all_char_ids()
    ok = 0
    for char_id in targets:
        if export_character(char_id, skip_reference=not args.include_reference):
            ok += 1

    print(f"\n완료: {ok}/{len(targets)}")
    if ok or args.regen_ts:
        regenerate_sprite_assets_ts()


if __name__ == "__main__":
    main()
