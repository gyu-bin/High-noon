#!/usr/bin/env python3
"""
npc_XX_defeat.png(휘청 포즈) → npc_XX_down.png(바닥에 완전히 누운 포즈) 베이크.

몸의 주축(PCA)을 수평으로 회전시키고, idle 스프라이트의 발 기준선(alpha 최하단)에
맞춰 바닥에 눕힌다. 결투 쓰러짐 연출의 마지막 프레임으로 사용.

  .venv/bin/python scripts/make_down_sprites.py            # npc 전체
  .venv/bin/python scripts/make_down_sprites.py 1 2 3      # 특정 id만
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
NPC_DIR = ROOT / "assets" / "sprites" / "npc"
PLAYER_DIR = ROOT / "assets" / "sprites" / "player"
CANVAS = 256
ALPHA_THRESHOLD = 40
# 완전 수평(0°)보다 살짝 기울여 자연스러운 널브러짐
RESIDUAL_TILT_DEG = 6.0
SIDE_MARGIN = 6

# 원본 defeat 아트가 이미 누워있는 경우 등 수동 각도 지정
ROTATE_OVERRIDES: dict[int, float] = {
    20: 0.0,  # 영혼이 빠져나가는 누운 아트 — 회전 불필요
}


def alpha_mask(img: Image.Image) -> np.ndarray:
    return np.array(img.convert("RGBA"))[:, :, 3] > ALPHA_THRESHOLD


def flattest_rotation_deg(img: Image.Image) -> float:
    """회전 후 세로 높이가 최소가 되는 CCW 각도 탐색 — 몸이 바닥에 눕는 각도."""
    alpha = img.convert("RGBA").split()[3].resize((96, 96), Image.BILINEAR)
    best_deg, best_h = 0.0, float("inf")
    deg = 0.0
    while deg <= 96.0:
        rot = alpha.rotate(deg, expand=True, resample=Image.BILINEAR)
        m = np.array(rot) > ALPHA_THRESHOLD
        ys, _ = np.where(m)
        h = int(ys.max() - ys.min()) if len(ys) else 0
        if h < best_h:
            best_h, best_deg = h, deg
        deg += 2.0
    return best_deg


def alpha_bottom(img: Image.Image) -> int:
    ys, _ = np.where(alpha_mask(img))
    return int(ys.max()) if len(ys) else img.height - 1


def bake_down(defeat_path: Path, idle_path: Path, out_path: Path) -> str:
    defeat = Image.open(defeat_path).convert("RGBA")
    idle = Image.open(idle_path).convert("RGBA")

    npc_id = int(defeat_path.stem.split("_")[1])
    if npc_id in ROTATE_OVERRIDES:
        rotate_deg = ROTATE_OVERRIDES[npc_id]
        flat = rotate_deg
    else:
        flat = flattest_rotation_deg(defeat)
        # 망토 등으로 폭이 넓어 탐색이 실패(저각)하면 표준 낙법 각도로
        if flat < 50.0:
            flat = 80.0
        # 완전 수평 직전에서 멈춰 살짝 널브러진 느낌
        rotate_deg = max(0.0, flat - RESIDUAL_TILT_DEG)

    # CCW(머리가 왼쪽으로) — 에셋 공간에서 뒤로 넘어지는 방향.
    rotated = defeat.rotate(rotate_deg, expand=True, resample=Image.BICUBIC)

    bbox = rotated.getbbox()
    body = rotated.crop(bbox) if bbox else rotated

    # 캔버스보다 넓으면 축소
    max_w = CANVAS - SIDE_MARGIN * 2
    if body.width > max_w:
        scale = max_w / body.width
        body = body.resize(
            (max_w, max(1, round(body.height * scale))), Image.LANCZOS
        )

    baseline = alpha_bottom(idle)
    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    px = (CANVAS - body.width) // 2
    py = min(CANVAS - body.height, baseline - alpha_bottom(body.crop((0, 0, body.width, body.height))) + 0)
    # body 자체 기준으로 다시 계산: body alpha 최하단이 baseline에 오도록
    body_bottom = alpha_bottom(body)
    py = baseline - body_bottom
    py = max(0, min(CANVAS - body.height, py))
    canvas.paste(body, (px, py), body)
    canvas.save(out_path)
    return f"flat {flat:5.1f}° → rotate {rotate_deg:5.1f}°, baseline y={baseline}"


def main() -> None:
    args = sys.argv[1:]
    if args and args[0] == "player":
        pid = args[1] if len(args) > 1 else "01"
        defeat_path = PLAYER_DIR / f"player_{pid}_defeat.png"
        idle_path = PLAYER_DIR / f"player_{pid}_idle.png"
        out_path = PLAYER_DIR / f"player_{pid}_down.png"
        info = bake_down(defeat_path, idle_path, out_path)
        print(f"player_{pid}_down.png  {info}")
        return

    ids = [int(a) for a in args] or list(range(1, 23))
    for i in ids:
        nid = f"{i:02d}"
        defeat_path = NPC_DIR / f"npc_{nid}_defeat.png"
        idle_path = NPC_DIR / f"npc_{nid}_idle.png"
        out_path = NPC_DIR / f"npc_{nid}_down.png"
        if not defeat_path.exists() or not idle_path.exists():
            print(f"npc_{nid}: 원본 없음 — 스킵")
            continue
        info = bake_down(defeat_path, idle_path, out_path)
        print(f"npc_{nid}_down.png  {info}")


if __name__ == "__main__":
    main()
