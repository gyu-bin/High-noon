#!/usr/bin/env python3
"""
sprite-gen + duel_sprite_library 로 duel 포즈 생성.

기본(--backend auto|library): scripts/duel_sprite_library.py — idle → aim/shoot
선택(--backend pollinations): Pollinations AI 4프레임

사용:
  python scripts/generate_duel_animation.py npc_04
  python scripts/generate_duel_animation.py npc_04 --backend pollinations
  python scripts/duel_sprite_library.py npc_04
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from io import BytesIO
from pathlib import Path

import numpy as np
import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from highnoon_sprite_generator import (  # noqa: E402
    NPC_DATA,
    PLAYER_DATA,
    fit_center_sprite,
    load_env_file,
    remove_background,
)

load_env_file(ROOT / ".env")

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
    "quick draw both hands gripping revolver aiming diagonally upper-right, gun in RIGHT half of frame",
    (
        "firing revolver arm fully extended toward upper-right, bright orange muzzle flash "
        "on RIGHT side of image, dynamic shoot pose NOT neutral standing"
    ),
    (
        "recoil after shot arm raised upper-right with gray smoke on gun, "
        "muzzle on RIGHT side, dynamic pose NOT neutral standing"
    ),
]

DEFEAT_HINT = (
    "lying horizontally flat on back on ground knocked out defeated, "
    "full body parallel to ground, arms spread wide, eyes closed, "
    "NOT standing upright"
)

REFERENCE_SKIP = {"npc_01", "player_01"}

# idle 스프라이트 실제 외형 (NPC_DATA와 다를 수 있음)
IDLE_OUTFIT_OVERRIDES: dict[str, str] = {
    "npc_02": (
        "wide black cowboy hat, deep red maroon poncho draped over shoulders, "
        "dark brown tunic with gold buttons, large gold belt buckle, "
        "purple magenta gauntlets and tall boots, dark charcoal pants, "
        "silver revolver holster"
    ),
    "npc_03": (
        "tan skin stern face visible under hat brim, wide dark brown cowboy hat "
        "with black crow feather in hat band, long dark brown western duster coat "
        "with bright gold yellow trim on collar lapels and coat edges, "
        "dark charcoal vest with gold buttons over black shirt, black neck bandana, "
        "black leather gloves, brown gun belt with large gold rectangular buckle, "
        "dark trousers, brown leather cowboy boots, black crow feather ornament on shoulder, "
        "boss gunslinger menacing sharp eyes"
    ),
    "npc_04": (
        "orange brown cowboy hat, sandy tan fur-trimmed coat, narrow amber eyes, "
        "desert fox motif belt, agile gunslinger, tan and orange outfit"
    ),
    "npc_05": (
        "dark gray cowboy hat, silver metal half-mask on jaw, gray armored military coat, "
        "charcoal pants, iron plates on shoulders, expressionless gunslinger"
    ),
    "npc_06": (
        "female bounty hunter, dark navy cowboy hat, ice-blue eyes, sleek black leather duster, "
        "dual holsters, calm cold expression, charcoal outfit"
    ),
    "npc_07": (
        "brown cowboy hat with small green cactus pin, green-accent brown vest, "
        "cactus spike pattern on tan shirt, brown pants, desert gunslinger"
    ),
    "npc_08": (
        "golden brown cowboy hat, ornate gold trim red-brown coat, dual silver holsters, "
        "confident gunslinger, gold decorations, tan pants"
    ),
    "npc_09": (
        "dark cowboy hat with gold skull emblem, dark brown coat with gold skull chest badge, "
        "golden revolver holster, boss gunslinger gold and charcoal outfit"
    ),
    "npc_10": (
        "dark gray hat with eagle emblem, heavy charcoal shoulder armor plates, "
        "sheriff star badge, eagle wing decoration, platinum gray armored gunslinger"
    ),
    "npc_11": (
        "black wide-brim hat, massive bulky all-black iron armor body, "
        "steam-punk iron plating, intimidating large silhouette, silent gunslinger"
    ),
    "npc_12": (
        "pitch black hat, full black iron armor boss, silver trim on armor edges, "
        "most imposing heavy platinum gunslinger, dark silhouette"
    ),
    "npc_13": (
        "female gunslinger, red bandana headband, crimson red shirt and vest, "
        "black pants, mirrored glass belt buckle, agile duelist"
    ),
    "npc_14": (
        "female gunslinger, red cowboy hat, crimson outfit with yellow lightning bolt motif, "
        "electric blue accents, dynamic energy duelist"
    ),
    "npc_15": (
        "female boss, dark red wide hat, long dark crimson duster coat, "
        "shadow pattern black trim, shadow hunter gunslinger"
    ),
    "npc_16": (
        "female gunslinger, dark red hat, crimson coat with toxic green vial accents, "
        "poison green trim, sinister expression, venom theme"
    ),
    "npc_17": (
        "female boss Dryden, black hat, very dark crimson long coat, "
        "charcoal outfit, night-themed gunslinger charms on belt"
    ),
    "npc_18": (
        "female boss, dark crimson long coat, glowing supernatural red eyes, "
        "darkest red outfit, red-eye gunslinger"
    ),
    "npc_19": (
        "purple hooded void gunslinger, purple and black mystical outfit, "
        "otherworldly purple aura, void theme"
    ),
    "npc_20": (
        "black outfit gunslinger, ghostly cyan echo aura around body, "
        "cyan afterimage effect, echo theme dark figure"
    ),
    "npc_21": (
        "all black undertaker gunslinger boss, skull emblem on black hat, "
        "orange-red accent trim on coat, ominous legend gunslinger"
    ),
    "npc_22": (
        "large black wide-brim hat with skull, purple-black long supernatural coat, "
        "glowing cyan eyes, cyan mystical flame on hands, hidden boss Pale Rider"
    ),
}


def uses_outfit_lock(char_id: str) -> bool:
    if not char_id.startswith("npc_"):
        return False
    return int(char_id.split("_")[1]) >= 3


def character_desc(char_id: str) -> str:
    if char_id in IDLE_OUTFIT_OVERRIDES:
        return IDLE_OUTFIT_OVERRIDES[char_id]
    if char_id.startswith("npc_"):
        nid = int(char_id.split("_")[1])
        for npc in NPC_DATA:
            if npc["id"] == nid:
                return npc["desc"]
    if char_id.startswith("player_"):
        num = int(char_id.split("_")[1])
        pid = f"p{num}"
        for player in PLAYER_DATA:
            if player["id"] == pid:
                return player["desc"]
    return "western gunslinger cowboy"


def short_duel_prompt(char_id: str, frame_hint: str | None = None) -> str:
    desc = character_desc(char_id)
    hint = frame_hint or "duel pose"
    lock = (
        "EXACT same character as idle reference, identical outfit colors and accessories, "
        if uses_outfit_lock(char_id)
        else ""
    )
    return (
        f"{HIGH_NOON_STYLE}, {desc}, "
        f"{lock}"
        f"full body three-quarter view facing upper-right, {hint}, "
        "same character outfit colors, pixel art game sprite"
    )


def defeat_prompt(char_id: str) -> str:
    desc = character_desc(char_id)
    return (
        f"{HIGH_NOON_STYLE}, {desc}, {DEFEAT_HINT}, "
        "full body horizontal side view on ground, pixel art game sprite"
    )


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
    short = prompt[:400]
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


def generate_duel_from_library(char_id: str, *, include_reference: bool = False) -> bool:
    """scripts/duel_sprite_library — idle 기반 aim/shoot procedural 포즈."""
    from scripts.duel_sprite_library import export_character

    skip_reference = char_id in REFERENCE_SKIP and not include_reference
    print("  duel_sprite_library (idle → aim/shoot)…")
    return export_character(char_id, skip_reference=skip_reference)


def normalize_duel_aim_right(img: Image.Image) -> Image.Image:
    """먼지바람 기준 — 밝은(머즐) 픽셀이 왼쪽에 몰리면 좌우 반전."""
    a = np.array(img.convert("RGBA"))
    w = img.width
    alpha = a[:, :, 3] > 40
    bright = alpha & (a[:, :, :3].max(axis=2) > 175)
    if bright.sum() < 80:
        return img
    bl = int(bright[:, : w // 2].sum())
    br = int(bright[:, w // 2 :].sum())
    if bl > br * 1.35 and br < bl:
        return ImageOps.mirror(img)
    return img


def content_bbox_metrics(img: Image.Image) -> tuple[float, float, float]:
    """cy (0=top), width ratio, height ratio"""
    a = np.array(img.convert("RGBA"))
    mask = a[:, :, 3] > 32
    if not mask.any():
        return 0.5, 0.5, 1.0
    ys, xs = np.where(mask)
    h = (ys.max() - ys.min() + 1) / img.height
    w = (xs.max() - xs.min() + 1) / img.width
    cy = float(ys.mean()) / img.height
    return cy, w, h


def is_valid_shoot_pose(img: Image.Image, idle: Image.Image) -> bool:
    ic = content_bbox_metrics(idle)
    sc = content_bbox_metrics(img)
    return sc[1] > ic[1] * 1.06 or sc[0] < ic[0] - 0.03


def is_valid_defeat_pose(img: Image.Image, idle: Image.Image) -> bool:
    ic = content_bbox_metrics(idle)
    dc = content_bbox_metrics(img)
    # 쓰러짐: 가로로 넓거나(누움) 실루엣 높이가 확 줄어듦
    if dc[1] > dc[2] * 1.12:
        return True
    if dc[2] < ic[2] * 0.72 and dc[0] > ic[0] + 0.06:
        return True
    return False


def generate_pose_frame(
    char_id: str,
    hint: str,
    seed: int,
    *,
    idle: Image.Image | None = None,
    validate: str | None = None,
    max_tries: int = 4,
    defeat: bool = False,
) -> Image.Image:
    cell = 256
    best: Image.Image | None = None
    for attempt in range(max_tries):
        prompt = defeat_prompt(char_id) if defeat else short_duel_prompt(char_id, hint)
        frame = fit_center_sprite(remove_background(pollinations_image(prompt, cell, cell, seed=seed + attempt)))
        if idle is None or validate is None:
            return frame
        ok = is_valid_shoot_pose(frame, idle) if validate == "shoot" else is_valid_defeat_pose(frame, idle)
        if ok:
            if attempt:
                print(f"      ✓ {validate} 포즈 {attempt + 1}회차")
            return frame
        best = frame
        print(f"      ↻ {validate} 포즈 재시도 ({attempt + 1}/{max_tries})")
        time.sleep(4)
    return best if best is not None else frame


def generate_duel_strip_per_frame(char_id: str, seed: int) -> Image.Image:
    """프레임별 생성 폴백 — 동일 캐릭터 보장이 약함."""
    cell = 256
    idle_path, _, _ = char_paths(char_id)
    idle_ref = fit_center_sprite(Image.open(idle_path).convert("RGBA"))
    frames: list[Image.Image] = []
    for i, hint in enumerate(DUEL_FRAME_PROMPTS):
        print(f"    frame {i + 1}/4...")
        validate = None
        if i >= 2:
            validate = "shoot"
        frame = generate_pose_frame(
            char_id,
            hint,
            seed + i * 10,
            idle=idle_ref,
            validate=validate,
        )
        frames.append(frame)
        time.sleep(6)

    strip = Image.new("RGBA", (cell * 4, cell), (255, 0, 255, 255))
    for i, frame in enumerate(frames):
        strip.paste(frame, (i * cell, 0))
    return strip


def strip_has_pose_variety(strip: Image.Image, cell: int = 256) -> bool:
    """4칸 스트립이 서로 다른 실루엣인지 간단 검사."""
    metrics: list[tuple[float, float]] = []
    for i in range(4):
        frame = strip.crop((i * cell, 0, (i + 1) * cell, cell))
        cy, w, _h = content_bbox_metrics(frame)
        metrics.append((w, cy))
    if metrics[1][0] <= metrics[0][0] * 1.02 and metrics[2][0] <= metrics[0][0] * 1.02:
        return False
    if abs(metrics[1][1] - metrics[0][1]) < 0.01 and abs(metrics[2][1] - metrics[0][1]) < 0.01:
        return False
    return True


def generate_duel_strip(
    char_id: str,
    seed: int,
    *,
    backend: str = "auto",
) -> Image.Image:
    """4프레임 duel 스트립 (Pollinations 전용)."""
    if backend == "pollinations":
        return generate_duel_strip_per_frame(char_id, seed)
    if backend == "pollinations-strip":
        return generate_duel_strip_pollinations_strip(char_id, seed)
    return generate_duel_strip_pollinations_strip(char_id, seed)


def generate_duel_strip_pollinations_strip(char_id: str, seed: int) -> Image.Image:
    """Pollinations 가로 스트립 단일 생성."""
    cell = 256
    desc = character_desc(char_id)
    action = DUEL_REQUEST["states"]["duel"]["action"]
    prompt = (
        f"{HIGH_NOON_STYLE}, {desc}, "
        "one horizontal sprite strip exactly 4 equal frames left to right, "
        f"magenta background FF00FF, {action}, "
        "same character outfit colors in every frame, pixel art game sprite"
    )

    for attempt in range(4):
        print(f"    Pollinations strip ({attempt + 1}/4)...")
        try:
            raw = pollinations_image(prompt, cell * 4, cell, seed=seed + attempt * 137)
            strip = remove_background(raw)
            if strip.height != cell:
                strip = strip.resize(
                    (int(strip.width * (cell / strip.height)), cell),
                    Image.LANCZOS,
                )
            if strip.width != cell * 4:
                strip = strip.resize((cell * 4, cell), Image.LANCZOS)
            if not strip_has_pose_variety(strip, cell):
                print("      ↻ 포즈 변화 부족 — 재시도")
                time.sleep(6)
                continue
            return strip
        except Exception as exc:
            print(f"      ↻ {exc}")
            time.sleep(8)

    print("    [fallback] frame-by-frame 생성")
    return generate_duel_strip_per_frame(char_id, seed)


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
        if pose in ("aim", "shoot"):
            img = normalize_duel_aim_right(img)
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


def procedural_defeat_from_idle(idle: Image.Image, cell: int = 256) -> Image.Image:
    """idle → 누운 실루엣 (Pollinations defeat 실패 시 폴백)."""
    from highnoon_sprite_generator import trim_alpha

    base = trim_alpha(idle.convert("RGBA"))
    if base.width == 0 or base.height == 0:
        return fit_center_sprite(idle, cell)

    laid = base.rotate(-90, resample=Image.BICUBIC, expand=True)
    laid = trim_alpha(laid)
    canvas = Image.new("RGBA", (cell, cell), (0, 0, 0, 0))
    target_w = int(cell * 0.9)
    scale = target_w / max(laid.width, 1)
    nw = max(1, int(laid.width * scale))
    nh = max(1, int(laid.height * scale))
    laid = laid.resize((nw, nh), Image.LANCZOS)
    ox = (cell - nw) // 2 - int(cell * 0.02)
    oy = cell - nh - int(cell * 0.06)
    canvas.paste(laid, (ox, oy), laid)
    return fit_center_sprite(canvas, cell)


def export_defeat(char_id: str, img: Image.Image) -> Path:
    _, assets_dir, prefix = char_paths(char_id)
    dest = assets_dir / f"{prefix}_defeat.png"
    img.save(dest, "PNG")
    print(f"  → {dest.relative_to(ROOT)}")
    return dest


def generate_defeat_pose(char_id: str, seed: int) -> Image.Image:
    print("  Pollinations defeat pose...")
    idle_path, _, _ = char_paths(char_id)
    idle_ref = fit_center_sprite(Image.open(idle_path).convert("RGBA"))
    return generate_pose_frame(
        char_id,
        DEFEAT_HINT,
        seed + 40,
        idle=idle_ref,
        validate="defeat",
        max_tries=5,
        defeat=True,
    )


def generate_one(
    char_id: str,
    *,
    with_defeat: bool = True,
    with_duel: bool = True,
    backend: str = "auto",
    allow_idle_fallback: bool = True,
    include_reference: bool = False,
) -> bool:
    print(f"\n{'=' * 40}\n[{char_id}] duel 애니메이션 생성")
    idle, _, _ = char_paths(char_id)
    if not idle.exists():
        print(f"  [스킵] idle 없음: {idle}")
        return False

    seed = seed_for(char_id)
    ok = False

    if with_duel:
        if backend in ("library", "auto"):
            ok = generate_duel_from_library(char_id, include_reference=include_reference)
        elif backend in ("pollinations", "pollinations-strip"):
            run_dir = OUT_RUNS / char_id
            try:
                prepare_run(char_id, idle, run_dir)
                print("  duel 4-frame strip (Pollinations)…")
                strip = generate_duel_strip(char_id, seed=seed, backend=backend)
            except Exception as e:
                print(f"  [strip 실패] {e}")
                try:
                    print("  Pollinations frame-by-frame 재시도...")
                    strip = generate_duel_strip_per_frame(char_id, seed)
                except Exception as e2:
                    print(f"  [frame-by-frame 실패] {e2}")
                    if not allow_idle_fallback or char_id in REFERENCE_SKIP:
                        return ok
                    _, assets_dir, prefix = char_paths(char_id)
                    poses_from_idle_fallback(idle, assets_dir, prefix)
                    return True
            else:
                raw = run_dir / "raw" / "duel.png"
                raw.parent.mkdir(parents=True, exist_ok=True)
                strip.save(raw, "PNG")
                print(f"  raw 저장: {raw.relative_to(ROOT)}")

                print("  sprite-gen extract...")
                extract_frames(run_dir)
                export_to_assets(char_id, run_dir)
                ok = True

    if with_defeat and char_id not in REFERENCE_SKIP:
        try:
            defeat = generate_defeat_pose(char_id, seed)
            export_defeat(char_id, defeat)
            ok = True
            time.sleep(4)
        except Exception as e:
            print(f"  [defeat 실패] {e}")

    return ok


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

    parser = argparse.ArgumentParser()
    parser.add_argument("targets", nargs="*", help="npc_02 또는 player_02 (비우면 npc_02+ 전체)")
    parser.add_argument("--all", action="store_true", help="player 포함 전체 idle 캐릭터")
    parser.add_argument("--regen-ts", action="store_true")
    parser.add_argument("--include-reference", action="store_true", help="npc_01/player_01 포함")
    parser.add_argument("--defeat-only", action="store_true")
    parser.add_argument("--duel-only", action="store_true")
    parser.add_argument(
        "--npc-range",
        metavar="FROM-TO",
        help="npc_03-22 형식으로 범위 지정 (예: 3-22)",
    )
    parser.add_argument(
        "--backend",
        choices=["auto", "library", "pollinations", "pollinations-strip"],
        default="auto",
        help="auto/library=duel_sprite_library, pollinations=AI 생성",
    )
    parser.add_argument(
        "--no-fallback",
        action="store_true",
        help="실패 시 idle placeholder 생성 안 함",
    )
    args = parser.parse_args()

    if args.regen_ts and not args.targets and not args.all and not args.npc_range:
        regenerate_sprite_assets_ts()
        return

    if args.npc_range:
        lo_s, hi_s = args.npc_range.split("-", 1)
        lo, hi = int(lo_s), int(hi_s)
        targets = [f"npc_{i:02d}" for i in range(lo, hi + 1)]
        print(f"NPC {lo}~{hi} ({len(targets)}명) 결투 포즈 생성")
    elif args.all or (not args.targets and not args.regen_ts):
        targets = all_char_ids()
        if not args.include_reference:
            targets = [t for t in targets if t not in REFERENCE_SKIP]
        if not args.all:
            targets = [t for t in targets if t.startswith("npc_")]
        label = "전체" if args.all else "NPC"
        print(f"{label} {len(targets)}명 결투 포즈 생성 (duel_sprite_library)")
    elif args.regen_ts and not args.targets:
        regenerate_sprite_assets_ts()
        return
    else:
        targets = args.targets

    with_defeat = not args.duel_only
    with_duel = not args.defeat_only

    ok = 0
    for char_id in targets:
        if not args.include_reference and char_id in REFERENCE_SKIP:
            print(f"  [스킵] 기준 캐릭터 {char_id}")
            continue
        try:
            if generate_one(
                char_id,
                with_defeat=with_defeat,
                with_duel=with_duel,
                backend=args.backend,
                allow_idle_fallback=not args.no_fallback,
                include_reference=args.include_reference,
            ):
                ok += 1
            time.sleep(4)
        except Exception as e:
            print(f"  [오류] {char_id}: {e}")

    print(f"\n완료: {ok}/{len(targets)}")
    if args.regen_ts or ok:
        regenerate_sprite_assets_ts()


if __name__ == "__main__":
    main()
