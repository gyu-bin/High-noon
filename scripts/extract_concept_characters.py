#!/usr/bin/env python3
"""컨셉 시트(HIGH NOON: CHARACTERS)에서 고품질 idle 스프라이트 추출."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / "assets" / "reference" / "high_noon_characters_sheet.png"
OUT_NPC = ROOT / "assets" / "sprites" / "npc"
OUT_PLAYER = ROOT / "assets" / "sprites" / "player"
OUT_DIR = ROOT / "output" / "sprites"
TARGET = 256  # 앱에서 축소; 고해상도 원본 유지

# 시트 좌→우: P1, P4, #3, #22
SHEET_SLOTS: list[dict] = [
    {"col": 0, "assets_idle": "player_01_idle.png", "label": "player_p1"},
    {"col": 1, "assets_idle": "player_04_idle.png", "label": "player_p4"},
    {"col": 2, "assets_idle": "npc_03_idle.png", "label": "npc_03"},
    {"col": 3, "assets_idle": "npc_22_idle.png", "label": "npc_22"},
]

TITLE_BOTTOM_Y = 95
SHEET_BOTTOM_PAD = 8
LABEL_CUT_RATIO = 0.88  # 하단 캡션 제거


def trim_alpha(img: Image.Image, pad: int = 4) -> Image.Image:
    img = img.convert("RGBA")
    bbox = img.getbbox()
    if bbox is None:
        return img
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width, x1 + pad)
    y1 = min(img.height, y1 + pad)
    return img.crop((x0, y0, x1, y1))


def fit_center(img: Image.Image, size: int) -> Image.Image:
    img = trim_alpha(img)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    scale = min(size / img.width, size / img.height) * 0.92
    nw = max(1, int(img.width * scale))
    nh = max(1, int(img.height * scale))
    resized = img.resize((nw, nh), Image.LANCZOS)
    ox = (size - nw) // 2
    oy = size - nh - int(size * 0.06)  # 발 기준 정렬
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def extract_slot(sheet: Image.Image, col: int, cols: int = 4) -> Image.Image:
    w, h = sheet.size
    y0 = TITLE_BOTTOM_Y
    y1 = h - SHEET_BOTTOM_PAD
    label_cut = int((y1 - y0) * LABEL_CUT_RATIO)
    y1 = y0 + label_cut
    rw = w // cols
    x0 = col * rw
    x1 = (col + 1) * rw if col < cols - 1 else w
    return sheet.crop((x0, y0, x1, y1))


def save_idle(img: Image.Image, assets_idle: str, label: str) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_preview = OUT_DIR / f"{label}.png"
    img.save(out_preview, "PNG")
    print(f"  output: {out_preview.relative_to(ROOT)}")

    if assets_idle.startswith("npc_"):
        dest = OUT_NPC / assets_idle
    else:
        dest = OUT_PLAYER / assets_idle
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG")
    print(f"  assets: {dest.relative_to(ROOT)}")


def main() -> None:
    if not SHEET.exists():
        raise SystemExit(f"컨셉 시트 없음: {SHEET}")

    sheet = Image.open(SHEET).convert("RGBA")
    print(f"컨셉 시트 추출 ({sheet.width}x{sheet.height})")

    for slot in SHEET_SLOTS:
        raw = extract_slot(sheet, slot["col"])
        fitted = fit_center(raw, TARGET)
        print(f"\n[{slot['label']}]")
        save_idle(fitted, slot["assets_idle"], slot["label"])

    print("\n완료 — 4명 HQ 스프라이트 적용됨")


if __name__ == "__main__":
    main()
