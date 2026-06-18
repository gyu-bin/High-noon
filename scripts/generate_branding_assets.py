#!/usr/bin/env python3
"""High Noon — 게임 에셋 기반 앱 아이콘·스플래시 생성."""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "branding"
IMG = ROOT / "assets" / "images" / "image"
SPRITES = ROOT / "assets" / "sprites" / "player"
FONT_RYE = ROOT / "node_modules/@expo-google-fonts/rye/400Regular/Rye_400Regular.ttf"

TITLE_HERO = IMG / "title_hero_menu.png"
REVOLVER = IMG / "Gemini_Generated_Image_lmu1xplmu1xplmu1.png"
PLAYER_IDLE = SPRITES / "player_01_idle.png"
PLAYER_AIM = SPRITES / "player_01_aim.png"

INK = (24, 18, 12)
PAPER = (250, 244, 234)
PAPER_SHADOW = (170, 162, 150)
HAT_FILL = (255, 252, 245)
HAT_BAND = (212, 160, 23)
BROWN_DEEP = (26, 14, 8)
BROWN_WARM = (72, 44, 24)
GOLD = (232, 197, 71)
OCHRE = (212, 160, 23)
CREAM = (240, 230, 210)
SAND = (212, 170, 112)


def cover_crop(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    iw, ih = img.size
    scale = max(target_w / iw, target_h / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - target_w) // 2
    top = (nh - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def center_square_crop(img: Image.Image, size: int) -> Image.Image:
    iw, ih = img.size
    side = min(iw, ih, size)
    left = (iw - side) // 2
    top = (ih - side) // 2
    cropped = img.crop((left, top, left + side, top + side))
    if cropped.size[0] != size:
        return cropped.resize((size, size), Image.Resampling.LANCZOS)
    return cropped


def apply_western_overlays(img: Image.Image) -> Image.Image:
    """WesternHomeBackground 과 동일한 분위기 — 태양 글로우 + 비네팅."""
    w, h = img.size
    base = img.convert("RGBA")

    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    cx, cy = w // 2, int(h * 0.34)
    rx, ry = int(w * 0.4), int(h * 0.21)
    gdraw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(255, 180, 60, 38))
    gdraw.ellipse((cx - rx * 0.7, cy - ry * 0.7, cx + rx * 0.7, cy + ry * 0.7), fill=(255, 140, 40, 18))
    base = Image.alpha_composite(base, glow)

    vignette = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    vdraw = ImageDraw.Draw(vignette)
    # 상단 살짝, 하단 진하게 (westernBackground.ts)
    for y in range(h):
        t = y / max(h - 1, 1)
        if t < 0.32:
            a = int(97 * (1 - t / 0.32))
        elif t < 0.58:
            a = int(15 * (1 - abs(t - 0.45) / 0.13))
        else:
            a = int(15 + 194 * ((t - 0.58) / 0.42))
        vdraw.line([(0, y), (w, y)], fill=(6, 3, 1, min(210, a)))
    base = Image.alpha_composite(base, vignette)
    return base


def draw_title_text(img: Image.Image, *, show_subtitle: bool) -> Image.Image:
    w, h = img.size
    out = img.convert("RGBA")
    draw = ImageDraw.Draw(out)
    title_size = int(w * 0.115)
    font = ImageFont.truetype(str(FONT_RYE), title_size)

    title = "HIGH NOON"
    title_y = int(h * 0.46)
    shadow = Image.new("RGBA", out.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.text((w // 2 + 4, title_y + 4), title, font=font, fill=(0, 0, 0, 170), anchor="mm")
    out = Image.alpha_composite(out, shadow)
    draw = ImageDraw.Draw(out)
    draw.text((w // 2, title_y), title, font=font, fill=GOLD, anchor="mm")

    if show_subtitle:
        sub_size = int(w * 0.042)
        sub_font = _korean_font(sub_size)
        sub_y = title_y + int(title_size * 0.95)
        draw.text((w // 2, sub_y), "탭하여 시작", font=sub_font, fill=(*CREAM, 230), anchor="mm")

    return out


def _korean_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        Path("/System/Library/Fonts/AppleSDGothicNeo.ttc"),
        Path("/System/Library/Fonts/Supplemental/AppleGothic.ttf"),
    ):
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def key_black_to_alpha(img: Image.Image, threshold: int = 40) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r < threshold and g < threshold and b < threshold:
                px[x, y] = (0, 0, 0, 0)
    return img


def remove_near_color_bg(img: Image.Image, bg: tuple[int, int, int], tolerance: int = 28) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if abs(r - bg[0]) <= tolerance and abs(g - bg[1]) <= tolerance and abs(b - bg[2]) <= tolerance:
                px[x, y] = (r, g, b, 0)
    return img


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def radial_background(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    px = img.load()
    cx = cy = size / 2
    max_r = size * 0.72
    for y in range(size):
        for x in range(size):
            t = min(1.0, math.hypot(x - cx, y - cy) / max_r)
            r = lerp(BROWN_WARM[0], BROWN_DEEP[0], t**1.35)
            g = lerp(BROWN_WARM[1], BROWN_DEEP[1], t**1.35)
            b = lerp(BROWN_WARM[2], BROWN_DEEP[2], t**1.35)
            px[x, y] = (r, g, b)
    return img


def draw_sun_burst(canvas: Image.Image, cx: int, cy: int, radius: int) -> Image.Image:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(255, 190, 80, 95))
    draw.ellipse(
        (cx - int(radius * 0.72), cy - int(radius * 0.72), cx + int(radius * 0.72), cy + int(radius * 0.72)),
        fill=(255, 220, 120, 70),
    )
    for i in range(14):
        angle = (2 * math.pi * i) / 14
        x1 = cx + int(radius * 0.55 * math.cos(angle))
        y1 = cy - int(radius * 0.55 * math.sin(angle))
        x2 = cx + int(radius * 1.05 * math.cos(angle))
        y2 = cy - int(radius * 1.05 * math.sin(angle))
        draw.line((x1, y1, x2, y2), fill=(255, 230, 180, 45), width=max(2, radius // 80))
    blurred = layer.filter(ImageFilter.GaussianBlur(radius // 18))
    return Image.alpha_composite(canvas, blurred)


def key_white_fringe(img: Image.Image, threshold: int = 242) -> Image.Image:
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
    return img


def extract_revolver(size: int) -> Image.Image:
    gun_size = int(size * 0.86)
    gun = Image.open(REVOLVER).convert("RGBA").resize((gun_size, gun_size), Image.Resampling.LANCZOS)
    gun = key_white_fringe(gun)
    gun = ImageEnhance.Color(gun).enhance(1.14)
    gun = ImageEnhance.Contrast(gun).enhance(1.08)
    gun = ImageEnhance.Brightness(gun).enhance(1.04)
    return gun


def drop_shadow(gun: Image.Image, offset: tuple[int, int], blur: int, alpha: int) -> Image.Image:
    w, h = gun.size
    pad = blur * 3
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    ox, oy = pad + offset[0], pad + offset[1]
    alpha_mask = gun.split()[3].point(lambda v: int(v * alpha / 255))
    shadow = Image.new("RGBA", gun.size, (0, 0, 0, 255))
    shadow.putalpha(alpha_mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.alpha_composite(shadow, (ox, oy))
    canvas.alpha_composite(gun, (pad, pad))
    return canvas


def scale_pixel_sprite(img: Image.Image, target_h: int) -> Image.Image:
    """정수 배율 리사이즈 — 도트 스프라이트 선명도 유지."""
    int_scale = max(1, round(target_h / img.size[1]))
    nw, nh = img.size[0] * int_scale, img.size[1] * int_scale
    return img.resize((nw, nh), Image.Resampling.NEAREST)


def load_pixel_sprite(path: Path, target_h: int) -> Image.Image:
    sprite = key_black_to_alpha(Image.open(path))
    bbox = sprite.getbbox()
    if bbox:
        sprite = sprite.crop(bbox)
    return scale_pixel_sprite(sprite, target_h)


def icon_background_from_hero(size: int) -> Image.Image:
    """타이틀 화면과 같은 노을 마을 배경."""
    hero = center_square_crop(Image.open(TITLE_HERO).convert("RGB"), size)
    hero = hero.filter(ImageFilter.GaussianBlur(1.2))
    hero = ImageEnhance.Brightness(hero).enhance(0.7)
    hero = ImageEnhance.Contrast(hero).enhance(1.1)
    hero = ImageEnhance.Color(hero).enhance(1.12)
    base = hero.convert("RGBA")

    cx, cy = size // 2, int(size * 0.38)
    base = draw_sun_burst(base, cx, cy, int(size * 0.36))

    vignette = Image.new("L", (size, size), 0)
    vdraw = ImageDraw.Draw(vignette)
    vdraw.ellipse((-int(size * 0.02), -int(size * 0.02), int(size * 1.02), int(size * 1.02)), fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(int(size * 0.055)))
    dark = Image.new("RGBA", (size, size), (18, 8, 4, 255))
    edge = vignette.point(lambda v: 255 - v)
    base = Image.composite(base, dark, edge.point(lambda v: int(v * 0.65)))
    return base


def place_pixel_hero(base: Image.Image, sprite: Image.Image, *, bottom_pad: float = 0.05, x_shift: float = 0.0) -> Image.Image:
    size = base.size[0]
    blur = max(10, size // 64)
    shadow_w = int(sprite.size[0] * 0.55)
    shadow_h = max(8, int(sprite.size[1] * 0.06))
    foot_x = (size - sprite.size[0]) // 2 + int(size * x_shift) + sprite.size[0] // 2
    foot_y = size - int(size * bottom_pad)
    shadow_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow_layer)
    sdraw.ellipse(
        (foot_x - shadow_w // 2, foot_y - shadow_h // 2, foot_x + shadow_w // 2, foot_y + shadow_h // 2),
        fill=(0, 0, 0, 120),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur // 2))
    base = Image.alpha_composite(base, shadow_layer)

    sprite_layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    sx = (size - sprite.size[0]) // 2 + int(size * x_shift)
    sy = foot_y - sprite.size[1]
    sprite_layer.alpha_composite(sprite, (sx, sy))
    return Image.alpha_composite(base, sprite_layer)


def _stroke_ellipse(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], fill: tuple[int, ...], outline: tuple[int, ...], width: int) -> None:
    draw.ellipse(box, fill=outline)
    x0, y0, x1, y1 = box
    inset = width
    draw.ellipse((x0 + inset, y0 + inset, x1 - inset, y1 - inset), fill=fill)


def _stroke_round_rect(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    radius: int,
    fill: tuple[int, ...],
    outline: tuple[int, ...],
    width: int,
) -> None:
    draw.rounded_rectangle(box, radius=radius, fill=outline)
    x0, y0, x1, y1 = box
    inset = width
    draw.rounded_rectangle(
        (x0 + inset, y0 + inset, x1 - inset, y1 - inset),
        radius=max(1, radius - width),
        fill=fill,
    )


def draw_doodle_drop_shadow(canvas: Image.Image, cx: int, cy: int, w: int, h: int) -> Image.Image:
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse((cx - w // 2 + 18, cy - h // 2 + 24, cx + w // 2 + 18, cy + h // 2 + 24), fill=(*PAPER_SHADOW, 185))
    layer = layer.filter(ImageFilter.GaussianBlur(max(8, w // 28)))
    return Image.alpha_composite(canvas, layer)


def draw_doodle_western_mark(canvas: Image.Image, size: int) -> Image.Image:
    """미니멀 두들 — 크림 배경 + 게임 리볼버 (한눈에 인식)."""
    gun_size = int(size * 0.56)
    revolver = key_white_fringe(
        Image.open(REVOLVER).convert("RGBA").resize((gun_size, gun_size), Image.Resampling.LANCZOS)
    )
    cx, cy = size // 2, size // 2 + int(size * 0.02)
    out = draw_doodle_drop_shadow(canvas, cx, cy, int(gun_size * 0.92), int(gun_size * 0.5))

    gx = (size - gun_size) // 2
    gy = (size - gun_size) // 2 + int(size * 0.02)
    out.alpha_composite(revolver, (gx, gy))
    return out


def make_doodle_icon_canvas(size: int) -> Image.Image:
    base = Image.new("RGBA", (size, size), (*PAPER, 255))
    return draw_doodle_western_mark(base, size)


def make_icon(size: int = 1024) -> Image.Image:
    """미니멀 두들 — 크림 배경 + 리볼버."""
    return make_doodle_icon_canvas(size).convert("RGB")


def make_adaptive_foreground(size: int = 1024) -> Image.Image:
    """Android — 리볼버 + 투명 배경."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    return draw_doodle_western_mark(canvas, size)


def make_splash(width: int = 1284, height: int = 2778) -> Image.Image:
    """타이틀 화면 구성 — title_hero + 웨스턴 오버레이 + HIGH NOON."""
    hero = Image.open(TITLE_HERO).convert("RGB")
    splash = cover_crop(hero, width, height)
    splash = apply_western_overlays(splash)
    splash = draw_title_text(splash, show_subtitle=True)
    return splash.convert("RGB")


def make_favicon(size: int = 48) -> Image.Image:
    return make_icon(512).resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    for path in (TITLE_HERO, REVOLVER, FONT_RYE):
        if not path.exists():
            raise SystemExit(f"Missing asset: {path}")

    OUT.mkdir(parents=True, exist_ok=True)
    assets = {
        "icon.png": make_icon(1024),
        "adaptive-icon.png": make_adaptive_foreground(1024),
        "splash.png": make_splash(1284, 2778),
        "favicon.png": make_favicon(48),
    }
    for name, img in assets.items():
        path = OUT / name
        img.save(path, optimize=True)
        print(f"wrote {path} ({img.size[0]}x{img.size[1]})")


if __name__ == "__main__":
    main()
