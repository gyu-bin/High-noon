"""output/enemy_raw의 마젠타 배경 NPC 디자인 → 투명 PNG 256px로 후처리.

사용법: .venv-tools/bin/python scripts/postprocess_enemy_designs.py
결과: assets/images/characters/enemy/ (22번은 assets/images/hidden/)
"""

from pathlib import Path

import numpy as np
from PIL import Image

RAW_DIR = Path("output/enemy_raw")
ENEMY_DIR = Path("assets/images/characters/enemy")
HIDDEN_DIR = Path("assets/images/hidden")
SIZE = 256

ENEMY_DIR.mkdir(parents=True, exist_ok=True)
HIDDEN_DIR.mkdir(parents=True, exist_ok=True)


def key_magenta(img: Image.Image) -> Image.Image:
    """전역 마젠타 키잉 + 외곽 프린지 제거.

    캐릭터 보라(#A855F7 등)는 r-g가 낮아 보존되고,
    배경 마젠타(FF00FF 계열)만 r-g/b-g 동시 초과로 제거된다.
    """
    a = np.array(img.convert("RGBA"), dtype=np.int16)
    r, g, b, alpha = a[..., 0], a[..., 1], a[..., 2], a[..., 3]

    hard = (r - g > 110) & (b - g > 110) & (r > 140) & (b > 140)
    alpha[hard] = 0

    # 투명 픽셀과 맞닿은 연한 마젠타 프린지 3패스 제거
    soft = (r - g > 55) & (b - g > 55) & (r > 110)
    for _ in range(3):
        transparent = alpha == 0
        near = np.zeros_like(transparent)
        near[1:, :] |= transparent[:-1, :]
        near[:-1, :] |= transparent[1:, :]
        near[:, 1:] |= transparent[:, :-1]
        near[:, :-1] |= transparent[:, 1:]
        fringe = soft & near & (alpha > 0)
        if not fringe.any():
            break
        alpha[fringe] = 0

    a[..., 3] = alpha
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def trim_alpha(img: Image.Image, pad: int = 6) -> Image.Image:
    bbox = img.getbbox()
    if bbox is None:
        return img
    x0, y0, x1, y1 = bbox
    return img.crop((
        max(0, x0 - pad), max(0, y0 - pad),
        min(img.width, x1 + pad), min(img.height, y1 + pad),
    ))


def to_square(img: Image.Image, size: int) -> Image.Image:
    side = max(img.width, img.height)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas.resize((size, size), Image.LANCZOS)


for src in sorted(RAW_DIR.glob("enemy_*.png")):
    img = Image.open(src).convert("RGBA")
    img = key_magenta(img)
    img = trim_alpha(img)
    img = to_square(img, SIZE)
    dest_dir = HIDDEN_DIR if src.stem.startswith("enemy_22") else ENEMY_DIR
    dest = dest_dir / src.name
    img.save(dest)
    print(f"{src.name} -> {dest}")

print("done")
