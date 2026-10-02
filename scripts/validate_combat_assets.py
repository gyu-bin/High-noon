#!/usr/bin/env python3
"""Acceptance check for new combat art (FALL / DOWN poses, gun-only revolver).

  python3 scripts/validate_combat_assets.py npc 1 path/to/fall.png path/to/down.png
  python3 scripts/validate_combat_assets.py revolver path/to/ground_revolver.png

Checks what can be measured objectively. Identity (face, hat, bandana, poncho,
boots, weapon, palette, proportions) still needs a human side-by-side review
of the contact sheet.
"""
import sys
from PIL import Image

CANVAS = (1254, 1254)
REF_DIR = 'assets/images/characters/clarity/npc/{:02d}/'


def alpha_bbox(im, thr=24):
    return im.getchannel('A').point(lambda a: 255 if a > thr else 0).getbbox()


def interior_holes(im):
    """Share of see-through pixels inside the silhouette (row span between the
    outermost opaque pixels). A matte keyed off a brown background punches
    holes through dark coat / trouser / hat areas."""
    a = im.getchannel('A')
    w, h = im.size
    px = a.load()
    inside = holes = 0
    for y in range(0, h, 3):
        xs = [x for x in range(0, w, 3) if px[x, y] > 200]
        if len(xs) < 4:
            continue
        for x in range(xs[0], xs[-1] + 1, 3):
            inside += 1
            if px[x, y] < 128:
                holes += 1
    return holes / max(1, inside)


def sharpness(im):
    """Mean absolute Laplacian over opaque pixels (upscaled art is soft)."""
    from PIL import ImageFilter
    g = im.convert('L').filter(ImageFilter.FIND_EDGES)
    a = im.getchannel('A')
    gp, ap = g.load(), a.load()
    w, h = im.size
    tot = n = 0
    for y in range(2, h - 2, 2):
        for x in range(2, w - 2, 2):
            if ap[x, y] > 250 and min(ap[x + 2, y], ap[x - 2, y], ap[x, y + 2], ap[x, y - 2]) > 250:
                tot += gp[x, y]
                n += 1
    return tot / max(1, n)


def common(im, name, errors):
    if im.mode != 'RGBA':
        errors.append(f'{name}: not RGBA (true alpha required)')
        return False
    a = im.getchannel('A')
    lo, hi = a.getextrema()
    if lo > 0:
        errors.append(f'{name}: no fully transparent pixels (background baked in)')
    w, h = im.size
    # Checkerboard / background contamination: the canvas border must be transparent.
    border = [a.getpixel((x, y)) for x in range(0, w, 7) for y in (0, h - 1)] + \
             [a.getpixel((x, y)) for y in range(0, h, 7) for x in (0, w - 1)]
    if max(border) > 8:
        errors.append(f'{name}: opaque pixels on the canvas border (crop / background contamination)')
    # Red / orange rim: semi-transparent edge pixels much warmer than the opaque interior.
    px = im.load()
    edge, inner = [], []
    for y in range(0, h, 3):
        for x in range(0, w, 3):
            r, g, b, al = px[x, y]
            if 20 < al < 200:
                edge.append((r, g, b))
            elif al > 250:
                inner.append((r, g, b))
    def warmth(c):
        return sum(r - (g + b) / 2 for r, g, b in c) / max(1, len(c))
    # Outline ring: visible pixels with a transparent pixel 2 px away (halos are often opaque).
    ring = []
    for y in range(2, h - 2, 2):
        for x in range(2, w - 2, 2):
            r, g, b, al = px[x, y]
            if al > 40 and min(px[x + 2, y][3], px[x - 2, y][3], px[x, y + 2][3], px[x, y - 2][3]) < 10:
                ring.append((r, g, b))
    orange = sum(1 for r, g, b in ring if r > 150 and b < 90 and r - b > 110 and r > g * 1.4)
    if ring and orange / len(ring) > 0.12:
        errors.append(f'{name}: {orange / len(ring):.0%} of the outline is saturated red/orange (rim / halo)')
    if edge and inner and warmth(edge) - warmth(inner) > 38:
        errors.append(f'{name}: warm fringe on alpha edge (red/orange rim / halo) '
                      f'edge {warmth(edge):.0f} vs body {warmth(inner):.0f}')
    return True


def check_npc(npc_id, fall_path, down_path):
    errors, notes = [], []
    ref_dir = REF_DIR.format(npc_id)
    kneel = Image.open(ref_dir + 'down.png').convert('RGBA')
    idle = Image.open(ref_dir + 'idle.png').convert('RGBA')
    kb, ib = alpha_bbox(kneel), alpha_bbox(idle)
    for path, name in ((fall_path, 'FALL'), (down_path, 'DOWN')):
        im = Image.open(path)
        if im.size != CANVAS:
            errors.append(f'{name}: canvas {im.size}, expected {CANVAS}')
            continue
        if not common(im, name, errors):
            continue
        im = im.convert('RGBA')
        hole = interior_holes(im)
        ref_hole = interior_holes(kneel)
        if hole > max(0.24, ref_hole * 2):  # production frames: 7-22% (legit gaps between limbs)
            errors.append(f'{name}: {hole:.0%} see-through pixels inside the body (kneel {ref_hole:.0%}) — matte/key damage')
        sh, ref_sh = sharpness(im), sharpness(kneel)
        notes.append(f'{name}: sharpness {sh:.1f} vs kneel {ref_sh:.1f}')
        if sh < ref_sh * 0.6:
            errors.append(f'{name}: detail {sh:.1f} far below the production frames ({ref_sh:.1f}) — upscaled / soft source')
        bb = alpha_bbox(im)
        w, h = bb[2] - bb[0], bb[3] - bb[1]
        notes.append(f'{name}: bbox {bb} ({w}x{h}), ground {bb[3]} vs kneel {kb[3]} / idle {ib[3]}')
        if abs(bb[3] - kb[3]) > 24:
            errors.append(f'{name}: ground contact y={bb[3]} off the pose baseline ({kb[3]}±24)')
        if name == 'DOWN':
            if w < h * 1.4:
                errors.append(f'DOWN: silhouette {w}x{h} is not lying down (width must be ≥1.4× height)')
            if h > (kb[3] - kb[1]) * 0.75:
                errors.append('DOWN: as tall as the kneel — reads as KNEEL, not DOWN')
        else:
            kh = kb[3] - kb[1]
            if not (h < kh * 0.98 and h > kh * 0.35):
                errors.append(f'FALL: height {h} must sit between DOWN and KNEEL ({kh})')
    return errors, notes


def check_revolver(path):
    errors, notes = [], []
    im = Image.open(path)
    common(im.convert('RGBA') if im.mode != 'RGBA' else im, 'GROUND_REVOLVER', errors)
    im = im.convert('RGBA')
    bb = alpha_bbox(im)
    notes.append(f'GROUND_REVOLVER: canvas {im.size}, bbox {bb}')
    hole = interior_holes(im)
    if hole > 0.12:
        errors.append(f'GROUND_REVOLVER: {hole:.0%} see-through pixels inside the gun — matte/key damage')
    ref = Image.open('assets/images/weapons/cinematic/revolver-ready.png').convert('RGBA')
    sh, ref_sh = sharpness(im), sharpness(ref)
    notes.append(f'GROUND_REVOLVER: sharpness {sh:.1f} vs ready revolver {ref_sh:.1f}')
    if sh < ref_sh * 0.6:
        errors.append(f'GROUND_REVOLVER: detail {sh:.1f} far below revolver-ready ({ref_sh:.1f}) — upscaled / soft source')
    # A hand/glove shows up as a large dark-brown leather mass; the gun is mostly metal grey/wood.
    px = im.load()
    leather = total = 0
    for y in range(bb[1], bb[3], 3):
        for x in range(bb[0], bb[2], 3):
            r, g, b, a = px[x, y]
            if a > 200:
                total += 1
                if r > g > b and r - b > 25 and r < 120:
                    leather += 1
    share = leather / max(1, total)
    notes.append(f'GROUND_REVOLVER: dark-leather share {share:.0%}')
    if share > 0.2:
        # Colour alone cannot tell a wooden grip from a glove (the approved
        # concept grip scores 31%), so this is a prompt for the human review,
        # not a failure.
        notes.append('GROUND_REVOLVER: WARN brown area > 20% — confirm by eye it is the grip, not a hand/glove')
    return errors, notes


if __name__ == '__main__':
    kind = sys.argv[1] if len(sys.argv) > 1 else ''
    if kind == 'npc' and len(sys.argv) == 5:
        errs, notes = check_npc(int(sys.argv[2]), sys.argv[3], sys.argv[4])
    elif kind == 'revolver' and len(sys.argv) == 3:
        errs, notes = check_revolver(sys.argv[2])
    else:
        print(__doc__)
        sys.exit(2)
    for n in notes:
        print('  ' + n)
    for e in errs:
        print('FAIL ' + e)
    print('PASS' if not errs else f'{len(errs)} problem(s)')
    sys.exit(1 if errs else 0)
