#!/usr/bin/env python3
"""
gen_player_candidates.py 후보 중 포즈별 선택본을 후처리해 설치.
NPC 방식 — 포즈마다 개별 생성 아트 사용. dead 후보는 down 프레임이 된다.

  .venv/bin/python scripts/install_player_final.py idle=idle_2 aim=aim_0 shoot=shoot_1 defeat=defeat_0 dead=dead_2
  # 미러가 필요한 포즈는 이름 뒤에 ! : aim=aim_0!
  # 포즈 생략 시: aim/shoot/defeat 는 idle 기반 procedural, dead 는 defeat 회전 베이크
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from highnoon_sprite_generator import (  # noqa: E402
    SPRITE_SIZE,
    remove_sprite_background,
)
from scripts.duel_sprite_library import POSE_SPECS, render_pose  # noqa: E402
from scripts.make_down_sprites import bake_down  # noqa: E402
from scripts.regenerate_npc_sprites_magenta import (  # noqa: E402
    despeckle_alpha,
    normalize_sprite_bbox,
)

CAND = ROOT / "output" / "player_candidates"
PLAYER_DIR = ROOT / "assets" / "sprites" / "player"

LIMITS = {
    "idle": (0.62, 0.90),
    "aim": (0.74, 0.90),
    "shoot": (0.88, 0.90),
    "defeat": (0.92, 0.90),
    "dead": (0.95, 0.60),
}


def kill_bg_pockets(img: Image.Image) -> Image.Image:
    """엣지 플러드가 못 지운 폐쇄 배경 포켓(다리 사이 등)만 색 기준으로 제거."""
    rgba = np.array(img.convert("RGBA")).astype(int)
    corners = np.concatenate(
        [
            rgba[:12, :12, :3].reshape(-1, 3),
            rgba[:12, -12:, :3].reshape(-1, 3),
            rgba[-12:, :12, :3].reshape(-1, 3),
            rgba[-12:, -12:, :3].reshape(-1, 3),
        ]
    )
    bg = np.median(corners, axis=0)
    dist = np.abs(rgba[:, :, :3] - bg[None, None, :]).sum(axis=2)
    alpha = rgba[:, :, 3]
    rgba[:, :, 3] = np.where((dist <= 40) & (alpha > 0), 0, alpha)
    return Image.fromarray(rgba.astype(np.uint8), "RGBA")


def strip_ground_shadow(img: Image.Image, strong: bool = False) -> Image.Image:
    """알파 bbox 하단 밴드에서 그림자 잔여물 제거.

    soft: 마젠타 계열 + 저채도(회색/흰색)만.
    strong: 분홍 계열(그림자 진 배경)까지 — 부츠가 붉은 갈색이면 갉힐 수 있어 선택적.
    """
    a = np.array(img.convert("RGBA"))
    alpha = a[:, :, 3]
    ys, _ = np.where(alpha > 40)
    if len(ys) == 0:
        return img
    y0, y1 = int(ys.min()), int(ys.max())
    band_top = y1 - max(1, int((y1 - y0) * 0.12))
    r = a[:, :, 0].astype(int)
    g = a[:, :, 1].astype(int)
    b = a[:, :, 2].astype(int)
    magenta_like = (r > g + 22) & (b > g + 8)
    neutral = (np.abs(r - g) < 16) & (np.abs(g - b) < 16)
    kill_color = magenta_like | neutral
    if strong:
        pinkish = (r > g + 10) & (b >= g - 8)
        kill_color = kill_color | pinkish
    band = np.zeros_like(magenta_like)
    band[band_top:, :] = True
    kill = kill_color & band & (alpha > 0)
    a[:, :, 3] = np.where(kill, 0, alpha)
    return Image.fromarray(a, "RGBA")


def crisp_downscale(img: Image.Image, size: int) -> Image.Image:
    """큰 소스 → 2단계 축소(LANCZOS 중간 + NEAREST 마감)로 픽셀 엣지 유지."""
    trimmed = img
    bbox = trimmed.getbbox()
    if bbox:
        trimmed = trimmed.crop(bbox)
    scale = min(size / trimmed.width, size / trimmed.height) * 0.92
    mid_w = max(1, int(trimmed.width * scale * 2))
    mid_h = max(1, int(trimmed.height * scale * 2))
    mid = trimmed.resize((mid_w, mid_h), Image.LANCZOS)
    final = mid.resize((max(1, mid_w // 2), max(1, mid_h // 2)), Image.NEAREST)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = (size - final.width) // 2
    py = size - final.height - int(size * 0.04)
    canvas.paste(final, (px, py), final)
    return canvas


def remove_salt_noise(img: Image.Image, passes: int = 2) -> Image.Image:
    """고립된 알파 픽셀(그림자 찌꺼기 등) 제거 — 이웃 3개 미만이면 투명."""
    a = np.array(img.convert("RGBA"))
    for _ in range(passes):
        m = (a[:, :, 3] > 40).astype(int)
        padded = np.pad(m, 1)
        neighbors = (
            padded[:-2, :-2] + padded[:-2, 1:-1] + padded[:-2, 2:]
            + padded[1:-1, :-2] + padded[1:-1, 2:]
            + padded[2:, :-2] + padded[2:, 1:-1] + padded[2:, 2:]
        )
        kill = (m == 1) & (neighbors <= 2)
        a[:, :, 3] = np.where(kill, 0, a[:, :, 3])
    return Image.fromarray(a, "RGBA")


def alpha_bottom(img: Image.Image) -> int:
    ys, _ = np.where(np.array(img.convert("RGBA"))[:, :, 3] > 40)
    return int(ys.max()) if len(ys) else img.height - 1


def process(pose: str, cand_name: str, mirror: bool) -> Image.Image:
    strong = pose in ("idle", "dead")
    raw = Image.open(CAND / f"{cand_name}.png")
    cut = kill_bg_pockets(remove_sprite_background(raw))
    cut = despeckle_alpha(cut)  # 포켓 제거로 생긴 1-2px 의상 구멍 복원
    cut = strip_ground_shadow(cut, strong=strong)
    out = crisp_downscale(cut, SPRITE_SIZE)
    out = strip_ground_shadow(remove_salt_noise(out), strong=strong)
    out = remove_salt_noise(out)
    max_w, max_h = LIMITS[pose]
    out = normalize_sprite_bbox(out, max_w=max_w, max_h=max_h)
    if mirror:
        out = ImageOps.mirror(out)
    return out


def align_to_baseline(img: Image.Image, baseline: int) -> Image.Image:
    """알파 최하단을 idle 발 기준선에 맞춤 (dead 프레임 접지)."""
    canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dy = baseline - alpha_bottom(img)
    canvas.paste(img, (0, dy), img)
    return canvas


def kick_frame(base: Image.Image, rot: float, dx: int, dy: int) -> Image.Image:
    """발사 반동 프레임 — 패딩 캔버스에서 회전해 머리/모자 클리핑 방지."""
    size = base.width
    pad = 40
    big = Image.new("RGBA", (size + pad * 2, size + pad * 2), (0, 0, 0, 0))
    big.paste(base, (pad + dx, pad + dy), base)
    rotated = big.rotate(rot, resample=Image.BICUBIC, expand=False)
    return rotated.crop((pad, pad, pad + size, pad + size))


def main() -> None:
    picks: dict[str, tuple[str, bool]] = {}
    for arg in sys.argv[1:]:
        pose, cand = arg.split("=", 1)
        mirror = cand.endswith("!")
        picks[pose] = (cand.rstrip("!"), mirror)

    if "idle" not in picks:
        print("idle=<후보명> 은 필수")
        sys.exit(1)

    idle = process("idle", *picks["idle"])
    idle_path = PLAYER_DIR / "player_01_idle.png"
    idle.save(idle_path, "PNG")
    baseline = alpha_bottom(idle)
    print(f"→ player_01_idle.png  ({picks['idle'][0]}, baseline y={baseline})")

    # aim 아트가 있으면 shoot/defeat 파생의 베이스로 사용 (총 뽑은 상태 유지)
    if "aim" in picks:
        aim = process("aim", *picks["aim"])
        aim_src = picks["aim"][0]
    else:
        aim = despeckle_alpha(render_pose(idle, POSE_SPECS["aim"]))
        aim_src = "procedural(idle)"
    aim.save(PLAYER_DIR / "player_01_aim.png", "PNG")
    print(f"→ player_01_aim.png  ({aim_src})")
    derived_base = aim if "aim" in picks else idle

    if "shoot" in picks:
        shoot = process("shoot", *picks["shoot"])
        shoot_src = picks["shoot"][0]
    else:
        shoot = kick_frame(derived_base, rot=2.5, dx=1, dy=-2)
        shoot_src = "kick(aim)" if "aim" in picks else "kick(idle)"
    shoot.save(PLAYER_DIR / "player_01_shoot.png", "PNG")
    shoot.save(PLAYER_DIR / "player_01_shoot_00.png", "PNG")
    kick_frame(shoot, rot=2.5, dx=2, dy=-3).save(
        PLAYER_DIR / "player_01_shoot_01.png", "PNG"
    )
    print(f"→ player_01_shoot{{,_00,_01}}.png  ({shoot_src})")

    if "defeat" in picks:
        defeat = process("defeat", *picks["defeat"])
        defeat_src = picks["defeat"][0]
    else:
        defeat = despeckle_alpha(render_pose(derived_base, POSE_SPECS["defeat"]))
        defeat = remove_salt_noise(strip_ground_shadow(defeat), passes=3)
        defeat_src = "procedural"
    defeat.save(PLAYER_DIR / "player_01_defeat.png", "PNG")
    print(f"→ player_01_defeat.png  ({defeat_src})")

    if "dead" in picks:
        dead = process("dead", *picks["dead"])
        dead = align_to_baseline(dead, baseline)
        dead.save(PLAYER_DIR / "player_01_down.png", "PNG")
        print(f"→ player_01_down.png  ({picks['dead'][0]}, 접지 y={baseline})")
    else:
        info = bake_down(
            PLAYER_DIR / "player_01_defeat.png",
            idle_path,
            PLAYER_DIR / "player_01_down.png",
        )
        print(f"→ player_01_down.png  (defeat 회전 베이크: {info})")


if __name__ == "__main__":
    main()
