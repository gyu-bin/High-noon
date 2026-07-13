#!/usr/bin/env python3
"""App Store 마케팅 스크린샷 생성 — 히어로 커버 + 캡션 입힌 게임 화면.
출력: marketing/app-store-screenshots/marketing/ (1284x2778, 6.7")
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "marketing/app-store-screenshots/raw")
OUT = os.path.join(ROOT, "marketing/app-store-screenshots/marketing")
HERO_BG = os.path.join(ROOT, "assets/images/image/title_hero_menu.png")
os.makedirs(OUT, exist_ok=True)

W, H = 1284, 2778

RYE = "/Users/mungyubin/Desktop/Coding/High-noon/node_modules/@expo-google-fonts/rye/400Regular/Rye_400Regular.ttf"
KR = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

# 팔레트 (게임 노을 테마)
GOLD = (240, 186, 74)
CREAM = (247, 236, 210)
DEEP = (18, 9, 5)
RED = (210, 64, 42)
SAND = (214, 176, 128)


def kr(size, weight="bold"):
    idx = {"bold": 6, "semibold": 4, "regular": 0}[weight]
    return ImageFont.truetype(KR, size, index=idx)


def rye(size):
    return ImageFont.truetype(RYE, size)


def sunset_gradient(w, h, top=(28, 14, 30), mid=(150, 52, 24), bot=(232, 150, 46)):
    """세로 노을 그라디언트."""
    base = Image.new("RGB", (1, h))
    px = base.load()
    for y in range(h):
        t = y / (h - 1)
        if t < 0.5:
            k = t / 0.5
            c = tuple(int(top[i] + (mid[i] - top[i]) * k) for i in range(3))
        else:
            k = (t - 0.5) / 0.5
            c = tuple(int(mid[i] + (bot[i] - mid[i]) * k) for i in range(3))
        px[0, y] = c
    return base.resize((w, h))


def cover_fit(img, w, h):
    r = max(w / img.width, h / img.height)
    im = img.resize((int(img.width * r), int(img.height * r)), Image.LANCZOS)
    x = (im.width - w) // 2
    y = (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, img.width, img.height], radius=radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def paste_card(canvas, shot, x, y, cw, radius=54, border=4):
    """게임 스크린샷을 라운드 카드 + 그림자 + 골드 테두리로 배치."""
    r = cw / shot.width
    ch = int(shot.height * r)
    im = shot.resize((cw, ch), Image.LANCZOS)
    card = rounded(im, radius)
    # 그림자
    sh = Image.new("RGBA", (cw + 120, ch + 120), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.rounded_rectangle([60, 72, 60 + cw, 72 + ch], radius=radius, fill=(0, 0, 0, 165))
    sh = sh.filter(ImageFilter.GaussianBlur(34))
    canvas.alpha_composite(sh, (x - 60, y - 60))
    # 골드 테두리
    bd = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    bdd = ImageDraw.Draw(bd)
    bdd.rounded_rectangle([1, 1, cw - 2, ch - 2], radius=radius, outline=GOLD, width=border)
    canvas.alpha_composite(card, (x, y))
    canvas.alpha_composite(bd, (x, y))
    return ch


def text_shadow(draw, xy, txt, font, fill, anchor="mm", off=4, blur_col=(0, 0, 0)):
    x, y = xy
    draw.text((x + off, y + off), txt, font=font, fill=(0, 0, 0), anchor=anchor)
    draw.text((x, y), txt, font=font, fill=fill, anchor=anchor)


def tracked(draw, cx, y, txt, font, fill, spacing, anchor_mid=True, shadow=6):
    """자간 넓힌 중앙 텍스트."""
    widths = [draw.textlength(ch, font=font) for ch in txt]
    total = sum(widths) + spacing * (len(txt) - 1)
    x = cx - total / 2 if anchor_mid else cx
    for ch, w in zip(txt, widths):
        draw.text((x + shadow, y + shadow), ch, font=font, fill=(0, 0, 0), anchor="lm")
        draw.text((x, y), ch, font=font, fill=fill, anchor="lm")
        x += w + spacing


# ─────────────────────────────────────────────────────────
# 1) 히어로 커버
def build_hero():
    canvas = sunset_gradient(W, H, top=(26, 12, 30), mid=(150, 55, 26), bot=(214, 138, 44)).convert("RGBA")
    # 마을 배경 — 화면 하단 절반 이상을 채우도록 크게 (여백 최소화)
    bg = Image.open(HERO_BG).convert("RGB")
    town_h = 1560
    town = cover_fit(bg, W, town_h)
    town_top = H - town_h
    # 마을 상단을 그라디언트로 부드럽게 페이드인
    fade = Image.new("L", (1, town_h), 0)
    fp = fade.load()
    for y in range(town_h):
        fp[0, y] = min(255, int(255 * (y / 360))) if y < 360 else 255
    town = town.convert("RGBA")
    town.putalpha(fade.resize((W, town_h)))
    canvas.alpha_composite(town, (0, town_top))
    # 상단 어둡게 (타이틀 가독성)
    top_dim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(top_dim)
    for y in range(int(H * 0.46)):
        a = int(160 * (1 - y / (H * 0.46)))
        td.line([(0, y), (W, y)], fill=(10, 5, 12, a))
    canvas.alpha_composite(top_dim)

    d = ImageDraw.Draw(canvas)
    # 타이틀
    tracked(d, W // 2, 660, "HIGH NOON", rye(154), GOLD, spacing=10, shadow=8)
    # 구분선
    d.line([(W // 2 - 300, 800), (W // 2 + 300, 800)], fill=(240, 186, 74, 230), width=3)
    # 한글 태그라인
    tracked(d, W // 2, 900, "정오의 반응속도 결투", kr(74, "bold"), CREAM, spacing=6, shadow=5)
    # 서브 카피
    text_shadow(d, (W // 2, 1024), '"뱅!" 신호에 먼저 쏘는 자가 산다', kr(46, "semibold"), SAND, off=3)

    canvas.convert("RGB").save(os.path.join(OUT, "01-hero.png"), quality=95)
    print("saved 01-hero.png")


# ─────────────────────────────────────────────────────────
# 2) 캡션 + 게임 화면
def build_caption(idx, raw_name, head_lines, sub, accent=GOLD):
    canvas = sunset_gradient(W, H, top=(22, 11, 26), mid=(120, 46, 24), bot=(196, 120, 40)).convert("RGBA")
    # 상단 비네트
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for y in range(520):
        a = int(120 * (1 - y / 520))
        vd.line([(0, y), (W, y)], fill=(8, 4, 10, a))
    canvas.alpha_composite(vig)

    d = ImageDraw.Draw(canvas)
    # 헤드라인 (1~2줄)
    y = 180
    for line in head_lines:
        tracked(d, W // 2, y, line, kr(78, "bold"), CREAM, spacing=2, shadow=5)
        y += 104
    # 골드 언더라인
    d.line([(W // 2 - 90, y + 6), (W // 2 + 90, y + 6)], fill=accent + (255,), width=5)
    y += 58
    # 서브 카피
    text_shadow(d, (W // 2, y), sub, kr(42, "semibold"), accent, off=3)

    # 게임 스크린샷 카드
    shot = Image.open(os.path.join(RAW, raw_name)).convert("RGB")
    cw = 1010
    top = 560
    bottom_margin = 70
    # 카드 높이 계산해 세로 넘치면 축소
    ch = int(shot.height * (cw / shot.width))
    if top + ch + bottom_margin > H:
        avail = H - top - bottom_margin
        cw = int(shot.width * (avail / shot.height))
    x = (W - cw) // 2
    paste_card(canvas, shot, x, top, cw)

    name = f"{idx:02d}-{raw_name.split('-', 1)[1]}"
    canvas.convert("RGB").save(os.path.join(OUT, name), quality=95)
    print("saved", name)


build_hero()
build_caption(2, "04-duel-bang.png", ["0.001초의 승부"], "신호가 뜨는 순간, 먼저 쏴라", accent=RED)
build_caption(3, "02-npc-select.png", ["22명의 무법자를", "차례로 꺾어라"], "한 명을 이겨야 다음이 열린다")
build_caption(4, "07-character-select.png", ["네 명의 총잡이,", "저마다의 필살기"], "라스트 스탠드 · 헤드샷 · 한 번 더")
build_caption(5, "09-local-duel.png", ["친구와 즉석", "1:1 대결"], "폰 하나로, 그 자리에서 승부")
build_caption(6, "05-round-win.png", ["먼저 뽑는 자가", "살아남는다"], "정오의 거리로 나서라", accent=GOLD)
print("done")
