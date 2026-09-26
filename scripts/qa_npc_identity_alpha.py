#!/usr/bin/env python3
"""Audit selection masters; optionally write conservative alpha-only derivatives.

Requires Pillow and NumPy. Never overwrites a master, player, or duel pose.
No generation, color replacement, blur, resampling or alpha thresholding.
The 3x3 mask closing is only a recovery gate; it is NOT applied to the art.
"""
from __future__ import annotations
import argparse
from collections import Counter, deque
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]


def components(mask, diagonal=False):
    h, w = mask.shape
    seen = np.zeros_like(mask)
    result = []
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]
    if diagonal:
        directions += [(-1, -1), (-1, 1), (1, -1), (1, 1)]
    for y, x in zip(*np.where(mask)):
        if seen[y, x]:
            continue
        queue = deque([(int(y), int(x))])
        seen[y, x] = True
        points = []
        while queue:
            yy, xx = queue.popleft()
            points.append((yy, xx))
            for dy, dx in directions:
                ny, nx = yy + dy, xx + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        result.append(np.array(points))
    return sorted(result, key=len, reverse=True)


def touches_border(points, shape):
    h, w = shape
    return bool(np.any((points[:, 0] == 0) | (points[:, 0] == h - 1) |
                       (points[:, 1] == 0) | (points[:, 1] == w - 1)))


def recover(source):
    """Recover retained dark RGB only inside a tightly supported silhouette.

    Deliberately leaves ambiguous/all-black negative spaces, external islands,
    original translucent pixels, original rim lights and all visible RGB alone.
    """
    alpha = source[:, :, 3]
    solid = alpha > 0
    closed = np.array(Image.fromarray((solid * 255).astype('uint8'))
                      .filter(ImageFilter.MaxFilter(3))
                      .filter(ImageFilter.MinFilter(3))) > 0
    restored = np.zeros_like(solid)
    for support in (solid, closed):
        for points in components(~support):
            if touches_border(points, alpha.shape):
                continue
            rgb = source[points[:, 0], points[:, 1], :3]
            # Strong surviving-color evidence distinguishes keyed shadows from gaps.
            if np.mean(rgb.max(1) > 0) >= 0.65 and rgb.max() <= 96:
                restored[points[:, 0], points[:, 1]] = True
    maximum = source[:, :, :3].max(2)
    restored |= closed & ~solid & (maximum > 0) & (maximum <= 96)
    restored &= alpha == 0
    result = source.copy()
    result[restored, 3] = 255
    result[result[:, :, 3] == 0, :3] = 0
    assert np.array_equal(result[solid], source[solid]), 'Visible pixels changed'
    assert np.array_equal(result[restored, :3], source[restored, :3]), 'Recovered RGB changed'
    assert Image.fromarray(result[:, :, 3]).getbbox() == Image.fromarray(alpha).getbbox()
    return result, restored


def audit(path, topology=True):
    image = Image.open(path)
    a = np.array(image.convert('RGBA'))
    alpha = a[:, :, 3]
    transparent = alpha == 0
    rgb = a[:, :, :3]
    values = Counter(map(tuple, rgb[transparent].tolist()))
    record = dict(path=str(path.relative_to(ROOT)), sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                  dimensions=list(image.size), mode=image.mode, alpha_min=int(alpha.min()),
                  alpha_max=int(alpha.max()), fully_transparent=int(transparent.sum()),
                  semitransparent=int(((alpha > 0) & (alpha < 255)).sum()),
                  transparent_nonzero_rgb=int((transparent & np.any(rgb != 0, axis=2)).sum()),
                  transparent_rgb_top=[dict(rgb=list(color), count=count) for color, count in values.most_common(8)],
                  low_alpha_warm_pixels=int(((alpha > 0) & (alpha < 64) &
                                             (rgb[:, :, 0].astype(int) > rgb[:, :, 1].astype(int) + 35)).sum()))
    if topology:
        holes = [c for c in components(transparent) if not touches_border(c, alpha.shape)]
        islands = components(alpha > 0, diagonal=True)
        record.update(enclosed_zero_alpha_regions=len(holes), enclosed_zero_alpha_pixels=sum(map(len, holes)),
                      isolated_1_2px_regions=sum(len(c) <= 2 for c in islands[1:]),
                      island_policy='Preserved: opacity/color alone cannot prove detached pixels are garbage.')
    return record, a


def preview(a, color='#b79262'):
    base = Image.new('RGBA', (a.shape[1], a.shape[0]), color)
    base.alpha_composite(Image.fromarray(a))
    return base.convert('RGB')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--qa-dir', type=Path, required=True)
    parser.add_argument('--write-clean', action='store_true')
    args = parser.parse_args()
    args.qa_dir.mkdir(parents=True, exist_ok=True)
    records = []
    board = Image.new('RGB', (6 * 256, 4 * 280), '#b79262')
    draw = ImageDraw.Draw(board)
    for i in range(1, 23):
        relative = f'assets/images/characters/enemy/{i:02}/identity.png' if i < 22 else 'assets/images/hidden/pale_rider_identity.png'
        path = ROOT / relative
        row, source = audit(path)
        cleaned, mask = recover(source)
        count = int(mask.sum())
        row.update(id=i, group='npc_identity', restored_shadow_pixels=count,
                   visible_pixel_changes=0, recovered_rgb_changes=0, source_unchanged=True)
        # NPC01 has a different checkerboard key and no dark-hole damage: leave it alone.
        if count:
            target = path.with_name(path.stem + '_clean.png')
            row['derivative'] = str(target.relative_to(ROOT))
            if args.write_clean:
                Image.fromarray(cleaned).save(target)
        records.append(row)
        x, y = (i - 1) % 6 * 256, (i - 1) // 6 * 280
        board.paste(preview(cleaned if count else source), (x, y + 24))
        draw.text((x + 6, y + 5), f'NPC {i:02} / restored {count}', fill='#24140c')
        if i in (1, 2, 4, 6, 13, 18, 22):
            sheet = Image.new('RGB', (1024, 286), '#b79262')
            d = ImageDraw.Draw(sheet)
            columns = [('Original / parchment', preview(source)), ('Original / gray', preview(source, '#777777')),
                       ('Stored RGB (alpha ignored)', Image.fromarray(source).convert('RGB')),
                       ('Recovered / parchment', preview(cleaned if count else source))]
            for col, (label, pic) in enumerate(columns):
                sheet.paste(pic, (col * 256, 30)); d.text((col * 256 + 4, 7), label, fill='#24140c')
            sheet.save(args.qa_dir / f'source-1to1-{i:02}.png')
            # Pixel-exact enlargement, not smoothing or new artwork.
            crops = [('hat', (90, 0, 180, 55)), ('shoulder', (65, 45, 175, 110)),
                     ('coat', (65, 105, 190, 195)), ('boots', (70, 195, 215, 256))]
            detail = Image.new('RGB', (800, 4 * 310), '#b79262'); dd = ImageDraw.Draw(detail)
            for r, (label, box) in enumerate(crops):
                for c, array in enumerate((source, cleaned if count else source)):
                    crop = preview(array).crop(box); crop = crop.resize((crop.width * 3, crop.height * 3), Image.Resampling.NEAREST)
                    detail.paste(crop, (c * 400, r * 310 + 24))
                    dd.text((c * 400 + 5, r * 310 + 5), label + (' BEFORE' if c == 0 else ' AFTER'), fill='#24140c')
            detail.save(args.qa_dir / f'edge-crops-{i:02}.png')
        print(f'NPC {i:02}: {count} recovered shadow pixels', flush=True)
    board.save(args.qa_dir / 'all22-clean-review.png')
    # Read-only audits of the requested player masters and one character's pose sets.
    paths = [ROOT / f'assets/images/characters/player/{i:02}/identity.png' for i in range(1, 5)]
    paths += [ROOT / f'assets/images/characters/enemy/06/{pose}.png' for pose in ('idle', 'draw', 'fire', 'hit', 'down')]
    paths += [ROOT / f'assets/images/characters/clarity/npc/06/{pose}.png' for pose in ('idle', 'draw', 'fire', 'hit', 'down')]
    for path in paths:
        row, source = audit(path, topology=True)
        row.update(group='read_only', source_unchanged=True)
        if source.shape[:2] == (256, 256):
            _, mask = recover(source)
            row['candidate_shadow_recovery_pixels'] = int(mask.sum())
        records.append(row)
        print('Read-only:', row['path'], flush=True)
    (args.qa_dir / 'audit.json').write_text(json.dumps(records, indent=2))


if __name__ == '__main__':
    main()
