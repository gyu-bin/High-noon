#!/usr/bin/env python3
"""
Cursor 이미지 → sprite-gen extract → aim/shoot PNG 파이프라인.

Pollinations 대신 Cursor GenerateImage로 만든 프레임(또는 가로 스트립)을
sprite-gen 후처리에 넣어 게임 에셋으로 내보냅니다.

사용:
  # 1) prepare만 (prompts/duel.txt 확인용)
  python scripts/cursor_duel_pipeline.py player_01 --prepare-only

  # 2) Cursor가 만든 4프레임 PNG → extract → assets
  python scripts/cursor_duel_pipeline.py player_01 \\
    --frames ~/.cursor/.../cursor_player_01_duel_f0.png \\
              ~/.cursor/.../cursor_player_01_duel_f1.png \\
              ~/.cursor/.../cursor_player_01_duel_f2.png \\
              ~/.cursor/.../cursor_player_01_duel_f3.png

  # 3) 이미 합친 가로 스트립(raw/duel.png)만 extract
  python scripts/cursor_duel_pipeline.py player_01 --strip output/sprite-gen/player_01/raw/duel.png
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from highnoon_sprite_generator import chroma_to_alpha, fit_center_sprite, remove_background  # noqa: E402

SG = ROOT / "tools" / "sprite-gen"
OUT_RUNS = ROOT / "output" / "sprite-gen"
ASSETS_NPC = ROOT / "assets" / "sprites" / "npc"
ASSETS_PLAYER = ROOT / "assets" / "sprites" / "player"
SPRITE_ASSETS_TS = ROOT / "constants" / "spriteAssets.ts"

HIGH_NOON_STYLE = (
    "pixel art western cowboy gunslinger game sprite, HIGH NOON style, "
    "detailed shading, magenta background FF00FF"
)

DUEL_DIAGONAL_ACTION = (
    "western duel shoot sequence left to right in 4 equal frames, "
    "three-quarter view character aiming diagonally toward upper-right opponent: "
    "(1) standing idle hands near holster body facing upper-right, "
    "(2) quick draw aiming revolver diagonally upper-right, "
    "(3) firing pistol diagonally upper-right with muzzle flash attached to gun, "
    "(4) recoil pose arm raised diagonally upper-right with smoke on gun, "
    "same character outfit and colors in every frame"
)

DUEL_REQUEST = {
    "states": {
        "duel": {
            "frames": 4,
            "fps": 10,
            "loop": False,
            "action": DUEL_DIAGONAL_ACTION,
        }
    },
    "style": HIGH_NOON_STYLE,
    "cell": {"width": 256, "height": 256, "safe_margin": 20},
}

FRAME_EXPORT = [
    (0, None),
    (1, "aim"),
    (2, "shoot"),
    (3, "shoot"),
]


def char_paths(char_id: str) -> tuple[Path, Path, Path]:
    if char_id.startswith("player_"):
        num = char_id.split("_", 1)[1]
        idle = ASSETS_PLAYER / f"player_{num}_idle.png"
        assets_dir = ASSETS_PLAYER
        prefix = f"player_{num}"
    elif char_id.startswith("npc_"):
        num = char_id.split("_", 1)[1]
        idle = ASSETS_NPC / f"npc_{num}_idle.png"
        assets_dir = ASSETS_NPC
        prefix = f"npc_{num}"
    else:
        raise ValueError(f"char_id: player_01 | npc_03 ({char_id})")
    run_dir = OUT_RUNS / char_id
    return idle, assets_dir, prefix


def prepare_run(char_id: str, idle_path: Path, run_dir: Path) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            sys.executable,
            str(SG / "scripts" / "prepare_sprite_run.py"),
            "--out-dir",
            str(run_dir.resolve()),
            "--character-id",
            char_id,
            "--base-image",
            str(idle_path.resolve()),
            "--request-json",
            json.dumps(DUEL_REQUEST, ensure_ascii=False),
            "--style",
            HIGH_NOON_STYLE,
            "--cell-size",
            "256",
            "--force",
        ],
        check=True,
    )


def build_strip_from_frames(frame_paths: list[Path], cell: int = 256) -> Image.Image:
    if len(frame_paths) != 4:
        raise ValueError("duel 상태는 4프레임이 필요합니다")
    strip = Image.new("RGBA", (cell * 4, cell), (255, 0, 255, 255))
    for i, path in enumerate(frame_paths):
        img = fit_center_sprite(remove_background(Image.open(path).convert("RGBA")), cell)
        strip.paste(img, (i * cell, 0), img)
    return strip


def extract_frames(run_dir: Path) -> None:
    subprocess.run(
        [
            sys.executable,
            str(SG / "scripts" / "extract_sprite_row_frames.py"),
            "--run-dir",
            str(run_dir.resolve()),
            "--states",
            "duel",
            "--allow-slot-fallback",
        ],
        check=True,
    )


def clean_frame(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    keyed = chroma_to_alpha(img, (255, 0, 255), 96)
    w, h = keyed.size
    px = keyed.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    opaque = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 32)
    if all(c[3] < 48 for c in corners) and opaque > 500:
        return fit_center_sprite(keyed, 256)
    out = fit_center_sprite(remove_background(img), 256)
    o2 = sum(1 for y in range(out.size[1]) for x in range(out.size[0]) if out.getpixel((x, y))[3] > 32)
    if o2 < 500:
        raise RuntimeError(f"배경 제거 후 캐릭터가 사라짐 ({o2}px) — 원본 확인")
    return out


def export_to_assets(char_id: str, run_dir: Path, update_idle: bool = True) -> list[str]:
    _, assets_dir, prefix = char_paths(char_id)
    frames_dir = run_dir / "frames" / "duel"
    if not frames_dir.exists():
        raise FileNotFoundError(f"프레임 없음: {frames_dir}")

    exported: list[str] = []
    shoot_seq: list[Path] = []

    for frame_idx, pose in FRAME_EXPORT:
        src = frames_dir / f"frame-{frame_idx}.png"
        if not src.exists():
            continue
        img = clean_frame(Image.open(src))

        if pose is None:
            if update_idle:
                dest = assets_dir / f"{prefix}_idle.png"
                img.save(dest, "PNG")
                exported.append(dest.name)
                print(f"  → {dest.relative_to(ROOT)} (idle)")
            continue

        if pose == "shoot":
            seq_name = f"{prefix}_shoot_{len(shoot_seq):02d}.png"
            seq_path = assets_dir / seq_name
            img.save(seq_path, "PNG")
            shoot_seq.append(seq_path)
            exported.append(seq_name)
            if len(shoot_seq) == 1:
                main = assets_dir / f"{prefix}_shoot.png"
                img.save(main, "PNG")
                exported.append(main.name)
        else:
            dest = assets_dir / f"{prefix}_{pose}.png"
            img.save(dest, "PNG")
            exported.append(dest.name)
            print(f"  → {dest.relative_to(ROOT)}")

    for p in shoot_seq:
        print(f"  → {p.relative_to(ROOT)}")
    return exported


def regenerate_sprite_assets_ts() -> None:
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "generate_duel_animation",
        ROOT / "scripts" / "generate_duel_animation.py",
    )
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(mod)
    mod.regenerate_sprite_assets_ts()


def main() -> None:
    parser = argparse.ArgumentParser(description="Cursor → sprite-gen duel 파이프라인")
    parser.add_argument("char_id", help="player_01 | npc_03")
    parser.add_argument("--prepare-only", action="store_true", help="prepare만 실행")
    parser.add_argument("--frames", nargs=4, metavar="PNG", help="Cursor 4프레임 경로")
    parser.add_argument("--strip", type=Path, help="가로 스트립 PNG (raw/duel.png)")
    parser.add_argument("--regen-ts", action="store_true", help="spriteAssets.ts 재생성")
    args = parser.parse_args()

    if not SG.exists():
        sys.exit("tools/sprite-gen 없음")

    char_id = args.char_id
    idle, _, _ = char_paths(char_id)
    if not idle.exists():
        sys.exit(f"idle 없음: {idle}")

    run_dir = OUT_RUNS / char_id
    print(f"[{char_id}] prepare...")
    prepare_run(char_id, idle, run_dir)
    print(f"  prompt: {run_dir / 'prompts' / 'duel.txt'}")

    if args.prepare_only:
        return

    if args.frames:
        frame_paths = [Path(p).expanduser().resolve() for p in args.frames]
        for p in frame_paths:
            if not p.exists():
                sys.exit(f"프레임 없음: {p}")
        print("[strip] Cursor 4프레임 합치기...")
        strip = build_strip_from_frames(frame_paths)
    elif args.strip:
        strip = Image.open(args.strip).convert("RGBA")
    else:
        sys.exit("--frames 4개 또는 --strip 필요")

    raw = run_dir / "raw" / "duel.png"
    raw.parent.mkdir(parents=True, exist_ok=True)
    strip.save(raw, "PNG")
    print(f"  raw: {raw.relative_to(ROOT)}")

    print("[extract] sprite-gen...")
    extract_frames(run_dir)

    print("[export] assets/sprites/...")
    export_to_assets(char_id, run_dir)

    if args.regen_ts:
        regenerate_sprite_assets_ts()

    print("\n완료 — Expo에서 player pose 전환(aim/shoot) 확인하세요.")


if __name__ == "__main__":
    main()
