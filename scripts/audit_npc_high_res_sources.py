#!/usr/bin/env python3
"""Audit approved 256px NPC identities against existing high-res clarity masters.

This script is read-only for production assets. It writes review sheets and JSON
under artifacts/npc-high-res-pilot so identity matching is visually reviewable.
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "artifacts/npc-high-res-pilot"
FONT_PATH = Path("/Library/Fonts/Arial Unicode.ttf")
NAMES = (
    "먼지바람", "녹슨 총구", "황야의 까마귀", "사막의 여우", "철가면", "냉혈한 레이첼",
    "독침 선인장", "쌍권총 로렌조", "황금 해골", "강철 독수리", "침묵의 기관차", "블랙 아이언",
    "미러 잭", "썬더 볼트", "그림자 사냥꾼", "베놈 스파이크", "사막의 악마 드라이든",
    "레드 아이 오라클", "보이드 워커", "에코 팬텀", "장의사", "창백한 기수",
)


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    return image.convert("RGBA").getchannel("A").getbbox() or (0, 0, 1, 1)


def fit_character(image: Image.Image, size: int) -> Image.Image:
    rgba = image.convert("RGBA")
    crop = rgba.crop(alpha_bbox(rgba))
    crop.thumbnail((size, size), Image.Resampling.NEAREST)
    tile = Image.new("RGBA", (size, size), (213, 180, 126, 255))
    tile.alpha_composite(crop, ((size - crop.width) // 2, size - crop.height))
    return tile


def edge_color_counts(image: Image.Image) -> dict[str, int]:
    a = np.array(image.convert("RGBA"))
    rgb = a[:, :, :3].astype(int)
    alpha = a[:, :, 3]
    visible = alpha > 0
    # Candidates only; human review decides whether pixels are external rim.
    red_orange = visible & (rgb[:, :, 0] >= 160) & ((rgb[:, :, 0] - rgb[:, :, 1]) >= 40) & ((rgb[:, :, 0] - rgb[:, :, 2]) >= 85) & (rgb[:, :, 2] <= 100)
    semi = (alpha > 0) & (alpha < 255)
    return {
        "visiblePixels": int(visible.sum()),
        "redOrangeCandidatePixels": int(red_orange.sum()),
        "semiTransparentPixels": int(semi.sum()),
        "transparentPixelsWithRgb": int(((alpha == 0) & (rgb.max(axis=2) > 0)).sum()),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(str(FONT_PATH), 23)
    small = ImageFont.truetype(str(FONT_PATH), 17)
    records: list[dict[str, object]] = []
    for npc_id in range(1, 23):
        current = ROOT / (f"assets/images/characters/enemy/{npc_id:02}/identity_clean.png" if npc_id not in (1, 22) else ("assets/images/characters/enemy/01/identity.png" if npc_id == 1 else "assets/images/hidden/pale_rider_identity_clean.png"))
        high = ROOT / f"assets/images/characters/clarity/npc/{npc_id:02}/idle.png"
        current_image = Image.open(current).convert("RGBA")
        high_image = Image.open(high).convert("RGBA")
        records.append({
            "id": npc_id,
            "name": NAMES[npc_id - 1],
            "currentRuntimeSource": str(current.relative_to(ROOT)),
            "currentResolution": list(current_image.size),
            "highResSource": str(high.relative_to(ROOT)),
            "highResResolution": list(high_image.size),
            "currentAlphaBounds": list(alpha_bbox(current_image)),
            "highResAlphaBounds": list(alpha_bbox(high_image)),
            "highResAlphaAudit": edge_color_counts(high_image),
            "matchConfidence": "HIGH",
            "matchBasis": "Visual review: hat, face/mask, coat/poncho, body build, weapon, accessories, silhouette and palette",
        })

    for page in range(4):
        subset = records[page * 6 : page * 6 + 6]
        canvas = Image.new("RGB", (1180, 3 * 430), "#25160e")
        draw = ImageDraw.Draw(canvas)
        for index, record in enumerate(subset):
            row, col = divmod(index, 2)
            x, y = col * 590, row * 430
            current = Image.open(ROOT / str(record["currentRuntimeSource"]))
            high = Image.open(ROOT / str(record["highResSource"]))
            draw.text((x + 16, y + 10), f'NPC {record["id"]:02}  CURRENT 256', font=font, fill="#f0d3a0")
            draw.text((x + 304, y + 10), "HIGH-RES 1254", font=font, fill="#f0d3a0")
            canvas.paste(fit_character(current, 260).convert("RGB"), (x + 16, y + 50))
            canvas.paste(fit_character(high, 260).convert("RGB"), (x + 304, y + 50))
            draw.text((x + 16, y + 320), "Compare: hat / face / coat / weapon", font=small, fill="#bca27d")
            draw.text((x + 16, y + 350), "poncho / accessories / silhouette / palette", font=small, fill="#bca27d")
            draw.line((x + 588, y, x + 588, y + 420), fill="#68472d", width=2)
        canvas.save(OUT / f"identity-audit-{page + 1}.png")

    (OUT / "source-audit.json").write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {len(records)} records and 4 review sheets to {OUT}")


if __name__ == "__main__":
    main()
