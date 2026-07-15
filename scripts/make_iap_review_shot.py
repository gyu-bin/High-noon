#!/usr/bin/env python3
"""App Store Connect IAP 심사용 스크린샷 생성.
기존 메뉴 캡처에 실제 앱 스타일의 '광고 제거' 카드를 합성.
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "marketing/app-store-screenshots/raw/01-menu.png")
OUT_DIR = os.path.join(ROOT, "marketing/app-store-screenshots/iap")
os.makedirs(OUT_DIR, exist_ok=True)

KR = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

def kr(size, weight="bold"):
    idx = {"bold": 6, "semibold": 4, "regular": 0, "black": 6}[weight]
    return ImageFont.truetype(KR, size, index=idx)

OCHRE = (212, 160, 23)
GOLD = (232, 197, 71)
CREAM = (240, 230, 210)
SAND = (212, 170, 112)
DARK_BROWN = (44, 26, 14)
RUST_RED = (220, 38, 38)

PANEL_BG = (28, 16, 8, 245)          # META_PANEL_BG approx
PANEL_BORDER = (140, 100, 60, 190)   # META_PANEL_BORDER approx

def rounded_rect(draw, box, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)

def text_shadow(draw, xy, text, font, fill, off=2, anchor="mm"):
    x, y = xy
    draw.text((x + off, y + off), text, font=font, fill=(0, 0, 0), anchor=anchor)
    draw.text((x, y), text, font=font, fill=fill, anchor=anchor)


def build():
    base = Image.open(SRC).convert("RGBA")
    W, H = base.size  # 1320 x 2868 (raw iPhone 14 Pro portrait)

    canvas = base.copy()
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    # 카드 위치 — 기존 "진행 — 해금 NPC" 카드 아래 자연스레 이어붙임
    card_pad_x = 60
    card_x0 = card_pad_x
    card_x1 = W - card_pad_x
    card_y0 = 2020   # 진행 카드 아래 배경 영역
    card_h = 480
    card_y1 = card_y0 + card_h
    card_radius = 32

    # 카드 배경
    rounded_rect(d, (card_x0, card_y0, card_x1, card_y1), card_radius,
                 fill=PANEL_BG, outline=PANEL_BORDER, width=3)

    pad = 44
    title_y = card_y0 + pad + 4

    # 타이틀
    text_shadow(d, (card_x0 + pad, title_y), "광고 제거",
                kr(52, "black"), GOLD, off=3, anchor="lm")

    # 설명
    desc_y = title_y + 78
    text_shadow(d, (card_x0 + pad, desc_y),
                "매치 사이 전면 광고를 제거합니다.",
                kr(36, "regular"), CREAM, off=2, anchor="lm")
    text_shadow(d, (card_x0 + pad, desc_y + 56),
                "1회 결제 · 영구 소유.",
                kr(36, "regular"), CREAM, off=2, anchor="lm")

    # 구매 버튼
    btn_y0 = desc_y + 118
    btn_y1 = btn_y0 + 130
    btn_x0 = card_x0 + pad
    btn_x1 = card_x1 - pad
    rounded_rect(d, (btn_x0, btn_y0, btn_x1, btn_y1), 26,
                 fill=RUST_RED + (255,),
                 outline=(245, 230, 200, 130), width=3)
    text_shadow(d, ((btn_x0 + btn_x1) // 2, (btn_y0 + btn_y1) // 2 + 4),
                "구매하기 · ₩3,900",
                kr(46, "black"), CREAM, off=3, anchor="mm")

    # 구매 복원 (밑줄)
    restore_y = btn_y1 + 46
    restore_cx = W // 2
    restore_txt = "구매 복원"
    f_restore = kr(30, "bold")
    text_shadow(d, (restore_cx, restore_y), restore_txt, f_restore,
                SAND + (0,) if False else SAND, off=2, anchor="mm")
    # underline
    tw = d.textlength(restore_txt, font=f_restore)
    ul_y = restore_y + 22
    d.line([(restore_cx - tw / 2, ul_y), (restore_cx + tw / 2, ul_y)],
           fill=SAND, width=2)

    # 살짝 그림자를 카드 아래에 추가해서 떠 있는 느낌
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    rounded_rect(sd, (card_x0 - 4, card_y0 + 20, card_x1 + 4, card_y1 + 30),
                 card_radius, fill=(0, 0, 0, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))

    canvas = Image.alpha_composite(canvas, shadow)
    canvas = Image.alpha_composite(canvas, overlay)

    out_path = os.path.join(OUT_DIR, "iap-review-remove-ads.png")
    canvas.convert("RGB").save(out_path, quality=95)
    print(f"saved {out_path}")
    print(f"  size: {W}x{H}")


if __name__ == "__main__":
    build()
