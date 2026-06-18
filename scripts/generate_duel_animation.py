#!/usr/bin/env python3
"""
sprite-gen + Pollinations 로 duel 4프레임( idle→aim→fire→recoil ) 생성.

1. tools/sprite-gen prepare_sprite_run → raw/duel.png 프롬프트·레이아웃
2. Pollinations → 가로 4칸 스트립 생성
3. extract_sprite_row_frames → 프레임 분리
4. assets/sprites/ 에 aim.png, shoot.png + shoot 시퀀스 등록

사용:
  python scripts/generate_duel_animation.py player_01
  python scripts/generate_duel_animation.py --all
  python scripts/generate_duel_animation.py --all --regen-ts
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from io import BytesIO
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from highnoon_sprite_generator import fit_center_sprite, remove_background  # noqa: E402

SG = ROOT / "tools" / "sprite-gen"
OUT_RUNS = ROOT / "output" / "sprite-gen"
ASSETS_NPC = ROOT / "assets" / "sprites" / "npc"
ASSETS_PLAYER = ROOT / "assets" / "sprites" / "player"
SPRITE_ASSETS_TS = ROOT / "constants" / "spriteAssets.ts"

HIGH_NOON_STYLE = (
    "pixel art western cowboy gunslinger game sprite, HIGH NOON style, "
    "detailed shading, magenta background FF00FF"
)

DUEL_REQUEST = {
    "states": {
        "duel": {
            "frames": 4,
            "fps": 10,
            "loop": False,
            "action": (
                "western duel shoot sequence left to right in 4 equal frames, "
                "three-quarter view character aiming diagonally toward upper-right opponent: "
                "(1) standing idle hands near holster body facing upper-right, "
                "(2) quick draw aiming revolver diagonally upper-right, "
                "(3) firing pistol diagonally upper-right with muzzle flash attached to gun, "
                "(4) recoil pose arm raised diagonally upper-right with smoke on gun, "
                "same character outfit and colors in every frame"
            ),
        }
    },
    "style": HIGH_NOON_STYLE,
    "cell": {"width": 256, "height": 256, "safe_margin": 20},
}

# 프레임 → 게임 pose 매핑
FRAME_EXPORT = [
    (0, None),  # idle — 기존 유지
    (1, "aim"),
    (2, "shoot"),
    (3, "shoot"),  # recoil도 shoot 애니메이션에 포함
]


def char_paths(char_id: str) -> tuple[Path, Path, Path]:
    """char_id: player_01 | npc_03"""
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
        raise ValueError(f"char_id 형식: player_01 또는 npc_03 ({char_id})")
    run_dir = OUT_RUNS / char_id
    return idle, assets_dir, prefix


DUEL_FRAME_PROMPTS = [
    "standing idle hands near holster three-quarter view facing upper-right",
    "quick draw aiming revolver diagonally upper-right toward opponent",
    "firing pistol diagonally upper-right with bright muzzle flash on gun",
    "recoil pose arm raised diagonally upper-right with smoke on gun",
]


def short_duel_prompt(char_id: str, frame_hint: str | None = None) -> str:
    base = (
        f"{HIGH_NOON_STYLE}, western gunslinger {char_id}, "
        f"full body front view, {frame_hint or 'duel pose'}"
    )
    return base


def prepare_run(char_id: str, idle_path: Path, run_dir: Path) -> None:
    run_dir.mkdir(parents=True, exist_ok=True)
    req_json = json.dumps(DUEL_REQUEST, ensure_ascii=False)
    subprocess.run(
        [
            sys.executable,
            str(SG / "scripts" / "prepare_sprite_run.py"),
            "--out-dir",
            str(run_dir),
            "--character-id",
            char_id,
            "--base-image",
            str(idle_path),
            "--request-json",
            req_json,
            "--style",
            HIGH_NOON_STYLE,
            "--cell-size",
            "256",
            "--force",
        ],
        check=True,
        cwd=str(SG / "scripts"),
    )


def pollinations_image(prompt: str, width: int, height: int, seed: int) -> Image.Image:
    short = prompt[:280]
    url = "https://image.pollinations.ai/prompt/" + requests.utils.quote(short)
    for attempt in range(5):
        resp = requests.get(
            url,
            params={"width": width, "height": height, "nologo": "true", "seed": seed},
            timeout=180,
        )
        if resp.status_code == 429:
            wait = 8 * (attempt + 1)
            print(f"      rate limit — {wait}s 대기...")
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return Image.open(BytesIO(resp.content)).convert("RGBA")
    raise RuntimeError("Pollinations rate limit — 잠시 후 다시 시도하세요")


def generate_duel_strip(char_id: str, seed: int) -> Image.Image:
    """4프레임 개별 생성 후 가로 스트립으로 합침 (sprite-gen extract 호환)."""
    cell = 256
    frames: list[Image.Image] = []
    for i, hint in enumerate(DUEL_FRAME_PROMPTS):
        prompt = short_duel_prompt(char_id, hint)
        print(f"    frame {i + 1}/4...")
        frame = pollinations_image(prompt, cell, cell, seed=seed + i)
        frame = fit_center_sprite(remove_background(frame))
        frames.append(frame)
        time.sleep(8)

    strip = Image.new("RGBA", (cell * 4, cell), (255, 0, 255, 255))
    for i, frame in enumerate(frames):
        strip.paste(frame, (i * cell, 0))
    return strip


def extract_frames(run_dir: Path) -> None:
    subprocess.run(
        [
            sys.executable,
            str(SG / "scripts" / "extract_sprite_row_frames.py"),
            "--run-dir",
            str(run_dir),
            "--states",
            "duel",
            "--allow-slot-fallback",
        ],
        check=True,
        cwd=str(SG / "scripts"),
    )


def export_to_assets(char_id: str, run_dir: Path) -> list[str]:
    _, assets_dir, prefix = char_paths(char_id)
    frames_dir = run_dir / "frames" / "duel"
    if not frames_dir.exists():
        raise FileNotFoundError(f"프레임 없음: {frames_dir}")

    exported: list[str] = []
    shoot_seq: list[Path] = []

    for frame_idx, pose in FRAME_EXPORT:
        src = frames_dir / f"frame-{frame_idx}.png"
        if not src.exists():
            print(f"  [건너뜀] {src.name}")
            continue
        img = Image.open(src).convert("RGBA")

        if pose is None:
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


def seed_for(char_id: str) -> int:
    if char_id.startswith("player_"):
        return 8000 + int(char_id.split("_")[1])
    return 9000 + int(char_id.split("_")[1])


def poses_from_idle_fallback(idle_path: Path, assets_dir: Path, prefix: str) -> None:
    """API 한도 초과 시 idle 기반 aim/shoot placeholder (게임 pose 전환용)."""
    from highnoon_sprite_generator import fit_center_sprite

    idle = fit_center_sprite(Image.open(idle_path).convert("RGBA"))
    cell = idle.size[0]

    def nudge(scale: float, dy: int) -> Image.Image:
        canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
        nw = int(cell * scale)
        nh = int(cell * scale)
        resized = idle.resize((nw, nh), Image.LANCZOS)
        ox = (cell - nw) // 2
        oy = cell - nh - int(cell * 0.06) + dy
        canvas.paste(resized, (ox, oy), resized)
        return canvas

    aim = nudge(1.03, -2)
    shoot = nudge(1.06, -4)
    aim.save(assets_dir / f"{prefix}_aim.png", "PNG")
    shoot.save(assets_dir / f"{prefix}_shoot.png", "PNG")
    shoot.save(assets_dir / f"{prefix}_shoot_00.png", "PNG")
    shoot.save(assets_dir / f"{prefix}_shoot_01.png", "PNG")
    print(f"  [fallback] idle → aim/shoot placeholder")


def generate_one(char_id: str) -> bool:
    print(f"\n{'=' * 40}\n[{char_id}] duel 애니메이션 생성")
    idle, _, _ = char_paths(char_id)
    if not idle.exists():
        print(f"  [스킵] idle 없음: {idle}")
        return False

    run_dir = OUT_RUNS / char_id
    try:
        prepare_run(char_id, idle, run_dir)
        print("  Pollinations 4-frame strip...")
        strip = generate_duel_strip(char_id, seed=seed_for(char_id))
    except Exception as e:
        print(f"  [Pollinations 실패] {e}")
        _, assets_dir, prefix = char_paths(char_id)
        poses_from_idle_fallback(idle, assets_dir, prefix)
        return True

    raw = run_dir / "raw" / "duel.png"
    raw.parent.mkdir(parents=True, exist_ok=True)
    strip.save(raw, "PNG")
    print(f"  raw 저장: {raw.relative_to(ROOT)}")

    print("  sprite-gen extract...")
    extract_frames(run_dir)
    export_to_assets(char_id, run_dir)
    return True


def all_char_ids() -> list[str]:
    ids: list[str] = []
    for p in sorted(ASSETS_PLAYER.glob("player_*_idle.png")):
        ids.append(f"player_{p.stem.split('_')[1]}")
    for p in sorted(ASSETS_NPC.glob("npc_*_idle.png")):
        ids.append(f"npc_{p.stem.split('_')[1]}")
    return ids


def regenerate_sprite_assets_ts() -> None:
    lines = [
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "import type { SpritePose } from '@/constants/sprites';",
        "",
        "type PoseMap = Partial<Record<SpritePose, ImageSourcePropType>>;",
        "type ShootSeq = ImageSourcePropType[];",
        "",
    ]

    def scan_dir(folder: Path, prefix: str, id_from_name):
        poses: dict[int, dict] = {}
        shoots: dict[int, list] = {}
        for f in sorted(folder.glob(f"{prefix}_*.png")):
            name = f.stem
            parts = name.split("_")
            if len(parts) < 3:
                continue
            cid = id_from_name(parts[1])
            rel = f"@/assets/sprites/{folder.name}/{f.name}"
            if parts[2] == "shoot" and len(parts) == 4 and parts[3].isdigit():
                shoots.setdefault(cid, []).append(f)
            elif parts[2] in ("idle", "aim", "shoot", "defeat"):
                pose = parts[2]
                poses.setdefault(cid, {})[pose] = f"require('{rel}')"
        return poses, shoots

    npc_poses, npc_shoots = scan_dir(ASSETS_NPC, "npc", int)
    pl_poses, pl_shoots = scan_dir(ASSETS_PLAYER, "player", int)

    def emit_map(name: str, data: dict) -> None:
        lines.append(f"const {name}: Partial<Record<number, PoseMap>> = {{")
        for k in sorted(data):
            lines.append(f"  {k}: {{")
            for pose, req in sorted(data[k].items()):
                lines.append(f"    {pose}: {req},")
            lines.append("  },")
        lines.append("};")
        lines.append("")

    emit_map("NPC_SPRITES", npc_poses)
    emit_map("PLAYER_SPRITES", pl_poses)

    def emit_shoot(name: str, data: dict) -> None:
        lines.append(f"const {name}: Partial<Record<number, ShootSeq>> = {{")
        for k in sorted(data):
            reqs = []
            for f in sorted(data[k]):
                rel = f"@/assets/sprites/{f.parent.name}/{f.name}"
                reqs.append(f"require('{rel}')")
            lines.append(f"  {k}: [{', '.join(reqs)}],")
        lines.append("};")
        lines.append("")

    emit_shoot("NPC_SHOOT_FRAMES", npc_shoots)
    emit_shoot("PLAYER_SHOOT_FRAMES", pl_shoots)

    lines.extend(
        [
            "function pickPose(map: Partial<Record<number, PoseMap>>, id: number, pose: SpritePose) {",
            "  const entry = map[id];",
            "  if (!entry) return undefined;",
            "  return entry[pose] ?? entry.idle;",
            "}",
            "",
            "export function getNpcSpriteSource(npcId: number, pose: SpritePose) {",
            "  return pickPose(NPC_SPRITES, npcId, pose);",
            "}",
            "",
            "export function getPlayerSpriteSource(characterId: number, pose: SpritePose) {",
            "  return pickPose(PLAYER_SPRITES, characterId, pose);",
            "}",
            "",
            "export function getNpcShootFrames(npcId: number): ShootSeq | undefined {",
            "  const seq = NPC_SHOOT_FRAMES[npcId];",
            "  return seq?.length ? seq : undefined;",
            "}",
            "",
            "export function getPlayerShootFrames(characterId: number): ShootSeq | undefined {",
            "  const seq = PLAYER_SHOOT_FRAMES[characterId];",
            "  return seq?.length ? seq : undefined;",
            "}",
            "",
        ]
    )

    SPRITE_ASSETS_TS.write_text("\n".join(lines), encoding="utf-8")
    print(f"\n갱신: {SPRITE_ASSETS_TS.relative_to(ROOT)}")


def main() -> None:
    if not SG.exists():
        sys.exit("tools/sprite-gen 없음 — git clone 필요")

    args = sys.argv[1:]
    regen_ts = "--regen-ts" in args
    args = [a for a in args if a != "--regen-ts"]

    if not args or args[0] == "--all":
        targets = all_char_ids()
        print(f"전체 {len(targets)}명 duel 애니메이션 생성")
    elif args[0] == "--regen-ts":
        regenerate_sprite_assets_ts()
        return
    else:
        targets = args

    ok = 0
    for char_id in targets:
        try:
            if generate_one(char_id):
                ok += 1
            time.sleep(4)
        except Exception as e:
            print(f"  [오류] {char_id}: {e}")

    print(f"\n완료: {ok}/{len(targets)}")
    if regen_ts or ok:
        regenerate_sprite_assets_ts()


if __name__ == "__main__":
    main()
