#!/usr/bin/env python3
"""App Store 스크린샷 — 상단 큰 멘트 + 아래 잘리지 않은 게임 화면.

출력 크기 (App Store Connect가 받는 값만):
  6.7"  1284×2778
  6.5"  1242×2688
"""
import os
import shutil
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "marketing/app-store-screenshots/raw")
SHOT_ROOT = os.path.join(ROOT, "marketing/app-store-screenshots")
OUT = os.path.join(SHOT_ROOT, "marketing")
PLAY = os.path.join(ROOT, "marketing/play-store/phone-screenshots")
HERO_BG = os.path.join(ROOT, "assets/images/image/title_hero_menu.png")

# App Store Connect — 6.7" Display (iPhone 14/15 Pro Max 슬롯)
REF_W, REF_H = 1320, 2868  # 레이아웃을 짠 기준 (iPhone 17 Pro Max raw)
W, H = 1284, 2778
W65, H65 = 1242, 2688
STATUS = 198  # Dynamic Island + 상태바. 게임 화면에서만 자름 (raw 픽셀).
RYE = os.path.join(ROOT, "node_modules/@expo-google-fonts/rye/400Regular/Rye_400Regular.ttf")
KR = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
EN = "/System/Library/Fonts/HelveticaNeue.ttc"
JA_BOLD = "/System/Library/Fonts/ヒラギノ角ゴシック W8.ttc"
JA_MED = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"

GOLD = (240, 186, 74)
CREAM = (255, 244, 220)
RED = (220, 48, 36)
SAND = (232, 196, 140)
INK = (12, 6, 4)


def sx(v):
    return max(1, int(round(v * W / REF_W)))


def sy(v):
    return max(1, int(round(v * H / REF_H)))


def ss(v):
    return max(1, int(round(v * (W / REF_W + H / REF_H) / 2)))


def kr(size, weight="bold"):
    idx = {"bold": 6, "semibold": 4, "regular": 0}[weight]
    return ImageFont.truetype(KR, size, index=idx)


def en(size, weight="bold"):
    idx = 1 if weight == "bold" else 10  # Helvetica Neue Bold / Medium
    return ImageFont.truetype(EN, size, index=idx)


def ja(size, weight="bold"):
    path = JA_BOLD if weight == "bold" else JA_MED
    return ImageFont.truetype(path, size, index=0)


def ui_font(lang, size, weight="bold"):
    if lang == "en":
        return en(size, weight)
    if lang == "ja":
        return ja(size, weight)
    return kr(size, weight)


def rye(size):
    return ImageFont.truetype(RYE, size)


def cover_fit(img, w, h, y_bias=0.0):
    r = max(w / img.width, h / img.height)
    im = img.resize((int(img.width * r + 0.5), int(img.height * r + 0.5)), Image.LANCZOS)
    x = (im.width - w) // 2
    room = max(0, im.height - h)
    y = max(0, min(room, int(room * (0.5 + y_bias))))
    return im.crop((x, y, x + w, y + h))


def rounded(img, radius):
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, img.width - 1, img.height - 1], radius=radius, fill=255
    )
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def raw_dir(lang):
    if lang == "ko":
        return RAW
    return os.path.join(os.path.dirname(RAW), f"raw-{lang}")


def open_raw(name, lang="ko"):
    """로케일별 실기기 캡처. 번역은 앱 i18n으로 찍은 raw-{lang}을 쓴다."""
    return Image.open(os.path.join(raw_dir(lang), name)).convert("RGB")


# 상태바는 자르되, 헤더색을 위로 늘려 뒤로 버튼이 테두리에 붙지 않게.
HEADER_EXTEND = 64
BOTTOM_PAD = 16
CARD_WIDTH = 0.96  # 캔버스 대비 게임 카드 너비. 전체가 보이게 contain.

# 선택 화면 하단의 빈 땅만. 결투는 0 (캐릭터 보존). 뱃지·카드는 자르지 않음.
BOTTOM_TRIM = {
    "01-menu.png": 480,
    "02-npc-select.png": 40,
    "07-character-select.png": 400,
}


def prepare_game(img, bottom_trim=0):
    """상태바 제거 + 하단 빈 공간 + 헤더색 상단 여백."""
    shot = img.crop((0, STATUS, img.width, img.height - bottom_trim))
    top_fill = shot.getpixel((shot.width // 2, 4))
    bot_fill = shot.getpixel((shot.width // 2, shot.height - 4))
    extra_bot = BOTTOM_PAD
    out = Image.new("RGB", (shot.width, HEADER_EXTEND + shot.height + extra_bot), top_fill)
    ImageDraw.Draw(out).rectangle(
        [0, HEADER_EXTEND + shot.height, shot.width, out.height],
        fill=bot_fill,
    )
    out.paste(shot, (0, HEADER_EXTEND))
    return out


def contain(img, max_w, max_h):
    """화면 전체가 보이도록 축소. cover(크롭) 금지."""
    r = min(max_w / img.width, max_h / img.height)
    nw, nh = max(1, int(img.width * r)), max(1, int(img.height * r))
    return img.resize((nw, nh), Image.LANCZOS)


def branded_bg():
    """노을 마을을 배경으로만 깔고, 카피·카드가 뜨게 어둡게."""
    town = cover_fit(Image.open(HERO_BG).convert("RGB"), W, H, y_bias=-0.12).convert("RGBA")
    dim = Image.new("RGBA", (W, H), (10, 5, 8, 118))
    town = Image.alpha_composite(town, dim)
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    px = vig.load()
    top_h = int(H * 0.42)
    for y in range(top_h):
        a = int(150 * (1 - y / max(1, top_h - 1)) ** 1.25)
        for x in range(W):
            px[x, y] = (8, 4, 6, a)
    return Image.alpha_composite(town, vig)


def outlined(draw, xy, txt, font, fill, outline=INK, width=5, anchor="mm"):
    x, y = xy
    r2 = width * width
    for dx in range(-width, width + 1):
        for dy in range(-width, width + 1):
            if dx * dx + dy * dy > r2 or (dx == 0 and dy == 0):
                continue
            draw.text((x + dx, y + dy), txt, font=font, fill=outline, anchor=anchor)
    draw.text((x, y), txt, font=font, fill=fill, anchor=anchor)


def tracked(draw, cx, y, txt, font, fill, spacing=0, width=5):
    widths = [draw.textlength(ch, font=font) for ch in txt]
    total = sum(widths) + spacing * max(0, len(txt) - 1)
    x = cx - total / 2.0
    for ch, cw in zip(txt, widths):
        outlined(draw, (x, y), ch, font, fill, width=width, anchor="lm")
        x += cw + spacing


def paste_card(canvas, shot, x, y, radius=24, border=4):
    cw, ch = shot.size
    card = rounded(shot, radius)
    shadow = Image.new("RGBA", (cw + 140, ch + 140), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([70, 82, 70 + cw, 82 + ch], radius=radius, fill=(0, 0, 0, 170))
    shadow = shadow.filter(ImageFilter.GaussianBlur(32))
    canvas.alpha_composite(shadow, (x - 70, y - 70))
    canvas.alpha_composite(card, (x, y))
    bd = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    ImageDraw.Draw(bd).rounded_rectangle(
        [1, 1, cw - 2, ch - 2], radius=radius, outline=GOLD + (255,), width=border
    )
    canvas.alpha_composite(bd, (x, y))


def draw_copy(canvas, lines, sub, accent=GOLD, hero=False, lang="ko"):
    """큰 카피 블록. 반환값 = 카드가 시작해도 되는 y."""
    d = ImageDraw.Draw(canvas)
    cx = W // 2
    max_w = W - sx(100)

    def fit(txt, start, weight="bold"):
        size = start
        floor = ss(42)
        while size >= floor:
            f = ui_font(lang, size, weight)
            if d.textlength(txt, font=f) <= max_w:
                return f, size
            size -= 2
        return ui_font(lang, floor, weight), floor

    spacing = 0 if lang == "ja" else (1 if lang == "ko" else 0)
    if hero:
        tracked(d, cx, sy(176), "HIGH NOON", rye(ss(108)), GOLD, spacing=12, width=7)
        d.line([(cx - sx(260), sy(286)), (cx + sx(260), sy(286))], fill=GOLD + (255,), width=3)
        hf, _ = fit(lines[0], ss(60))
        tracked(d, cx, sy(372), lines[0], hf, CREAM, spacing=spacing, width=5)
        sf, _ = fit(sub, ss(36), "semibold")
        outlined(d, (cx, sy(462)), sub, sf, SAND, width=4)
        return sy(508)
    tracked(d, cx, sy(118), "HIGH NOON", rye(ss(36)), GOLD, spacing=12, width=3)
    y = sy(220)
    start = ss(74) if lang == "en" else (ss(78) if len(lines) > 1 else ss(88))
    gap = sy(96)
    for i, line in enumerate(lines):
        hf, _ = fit(line, start)
        tracked(d, cx, y + i * gap, line, hf, CREAM, spacing=spacing, width=7)
    y = y + gap * (len(lines) - 1) + sy(64)
    d.line([(cx - sx(64), y), (cx + sx(64), y)], fill=accent + (255,), width=4)
    sf, _ = fit(sub, ss(34), "semibold")
    outlined(d, (cx, y + sy(44)), sub, sf, accent, width=4)
    return y + sy(92)


def place_game(canvas, raw_name, card_top, bottom_trim=0, lang="ko"):
    img = prepare_game(open_raw(raw_name, lang), bottom_trim=bottom_trim)
    shot = contain(img, int(W * CARD_WIDTH), H - card_top - sy(28))
    x = (W - shot.width) // 2
    paste_card(canvas, shot, x, card_top)
    return shot.size


def lang_dirs(lang):
    """(6.7 폴더들, 6.5 폴더들). 6.7이 업로드 본문."""
    if lang == "ko":
        d67 = [OUT, os.path.join(SHOT_ROOT, "6.7-portrait"), PLAY]
        d65 = [os.path.join(SHOT_ROOT, "6.5-portrait")]
    else:
        d67 = [
            os.path.join(SHOT_ROOT, lang),
            os.path.join(SHOT_ROOT, f"6.7-portrait-{lang}"),
            os.path.join(os.path.dirname(PLAY), f"phone-screenshots-{lang}"),
        ]
        d65 = [os.path.join(SHOT_ROOT, f"6.5-portrait-{lang}")]
    return d67, d65


def save(canvas, name, lang="ko"):
    rgb = canvas.convert("RGB")
    if rgb.size != (W, H):
        raise RuntimeError(f"{name} size {rgb.size}, expected {W}x{H}")
    d67, d65 = lang_dirs(lang)
    for d in d67:
        os.makedirs(d, exist_ok=True)
        rgb.save(os.path.join(d, name), "PNG", optimize=True)
    small = rgb.resize((W65, H65), Image.LANCZOS)
    for d in d65:
        os.makedirs(d, exist_ok=True)
        small.save(os.path.join(d, name), "PNG", optimize=True)
    print("saved", lang, name, f"{rgb.width}x{rgb.height} + {W65}x{H65}")


SHOTS = [
    dict(raw="00-title.png", out="01-splash.png", splash=True),
    dict(raw="01-menu.png", out="02-hero.png", accent=GOLD, hero=True),
    dict(raw="04-duel-bang.png", out="03-duel-bang.png", accent=RED),
    dict(raw="02-npc-select.png", out="04-npc-select.png", accent=GOLD),
    dict(raw="07-character-select.png", out="05-character-select.png", accent=GOLD),
    dict(raw="09-local-duel.png", out="06-local-duel.png", accent=GOLD),
    dict(raw="03-duel-steady.png", out="07-standoff.png", accent=GOLD),
]

COPY = {
    "ko": [
        (["정오의 결투"], "탭하여 시작"),
        (["정오의 반응속도 결투"], '"뱅!" 신호에 먼저 쏘는 자가 산다'),
        (["0.001초의 승부"], "신호가 뜨는 순간, 먼저 쏴라"),
        (["22명의 무법자를", "차례로 꺾어라"], "한 명을 이겨야 다음이 열린다"),
        (["네 명의 총잡이,", "저마다의 필살기"], "라스트 스탠드 · 헤드샷 · 한 번 더"),
        (["친구와 즉석", "1:1 대결"], "폰 하나로, 그 자리에서 승부"),
        (["먼저 뽑는 자가", "살아남는다"], "정오의 거리로 나서라"),
    ],
    "en": [
        (["The High Noon Duel"], "Tap to Start"),
        (["The Noon Reaction Duel"], 'First to fire on "BANG!" lives'),
        (["0.001s Showdown"], "The instant it flashes, shoot"),
        (["Beat 22 outlaws", "one by one"], "Win one to unlock the next"),
        (["Four gunslingers,", "each with a finisher"], "Last Stand · Headshot · One More"),
        (["Instant 1v1", "with a friend"], "One phone. Right here."),
        (["The faster draw", "survives"], "Step onto High Noon street"),
    ],
    "ja": [
        (["正午の決闘"], "タップしてスタート"),
        (["正午の反応速度デュエル"], "「バン!」で先に撃った者が生き残る"),
        (["0.001秒の勝負"], "合図の瞬間、先に撃て"),
        (["22人の無法者を", "順に倒せ"], "1人倒せば次が開く"),
        (["4人のガンマン、", "それぞれの必殺技"], "ラストスタンド · ヘッドショット · もう一度"),
        (["友達と即席", "1対1"], "スマホ1台で、その場で勝負"),
        (["先に抜いた者が", "生き残る"], "正午の通りへ出ろ"),
    ],
}


TAP_HINT = {
    "ko": "탭하여 시작",
    "en": "Tap to Start",
    "ja": "タップしてスタート",
}


def shot_splash(lang):
    """앱 스플래시(타이틀 히어로) + HIGH NOON / 탭하여 시작. 상태바 없음."""
    canvas = cover_fit(Image.open(HERO_BG).convert("RGB"), W, H, y_bias=-0.08).convert("RGBA")
    d = ImageDraw.Draw(canvas)
    cx = W // 2
    title_y = int(H * 0.46)
    tracked(d, cx, title_y, "HIGH NOON", rye(ss(52)), GOLD, spacing=10, width=6)
    hint = TAP_HINT[lang]
    hf = ui_font(lang, ss(22), "semibold")
    outlined(d, (cx, title_y + sy(72)), hint, hf, SAND, width=3)
    save(canvas, "01-splash.png", lang=lang)


def shot(raw_name, out_name, lines, sub, accent=GOLD, hero=False, lang="ko"):
    canvas = branded_bg()
    top = draw_copy(canvas, lines, sub, accent=accent, hero=hero, lang=lang)
    place_game(canvas, raw_name, top, bottom_trim=BOTTOM_TRIM.get(raw_name, 0), lang=lang)
    save(canvas, out_name, lang=lang)


def raw_ready(lang):
    return os.path.isfile(os.path.join(raw_dir(lang), "01-menu.png"))


def wipe_generated():
    """원본 raw는 남기고, 업로드용 생성본만 비운다."""
    victims = [
        OUT,
        os.path.join(SHOT_ROOT, "en"),
        os.path.join(SHOT_ROOT, "ja"),
        os.path.join(SHOT_ROOT, "6.7-portrait"),
        os.path.join(SHOT_ROOT, "6.7-landscape"),
        os.path.join(SHOT_ROOT, "6.5-portrait"),
        os.path.join(SHOT_ROOT, "6.5-landscape"),
        os.path.join(SHOT_ROOT, "6.7-portrait-en"),
        os.path.join(SHOT_ROOT, "6.7-portrait-ja"),
        os.path.join(SHOT_ROOT, "6.5-portrait-en"),
        os.path.join(SHOT_ROOT, "6.5-portrait-ja"),
        PLAY,
        os.path.join(os.path.dirname(PLAY), "phone-screenshots-en"),
        os.path.join(os.path.dirname(PLAY), "phone-screenshots-ja"),
    ]
    for d in victims:
        if os.path.isdir(d):
            shutil.rmtree(d)
            print("wiped", d)


langs = tuple(a for a in sys.argv[1:] if a in ("ko", "en", "ja")) or ("ko", "en", "ja")
if "--no-wipe" not in sys.argv:
    wipe_generated()
for lang in langs:
    if not raw_ready(lang):
        print("skip", lang, "(no raw captures)")
        continue
    copies = COPY[lang]
    for spec, (lines, sub) in zip(SHOTS, copies):
        if spec.get("splash"):
            shot_splash(lang)
            continue
        shot(
            spec["raw"], spec["out"], lines, sub,
            accent=spec.get("accent", GOLD), hero=spec.get("hero", False), lang=lang,
        )
print("done")
