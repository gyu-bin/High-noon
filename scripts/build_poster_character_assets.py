#!/usr/bin/env python3
"""Build ONLY Wanted identity derivatives using the approved C edge treatment.

Original cinematic files and their alpha are immutable. Preview is the default;
--write promotes the 26 reviewed derivatives and their separate poster manifest.
NPC 512px rasters use exact 2x pixel replication; Player keeps native 1254px.
No AI upscaling or filtering is used.
Requires Pillow and NumPy.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / 'output/poster-production'
QA = ROOT / 'artifacts/poster-production-lock'
MANIFEST = ROOT / 'assets/images/characters/poster-manifest.json'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sources():
    for kind, count in [('npc', 22), ('player', 4)]:
        for i in range(1, count + 1):
            if kind == 'player':
                clarity_id = '02-v2' if i == 2 else f'{i:02}'
                source = ROOT / f'assets/images/characters/clarity/player/{clarity_id}/idle.png'
                target = source.with_name('identity_poster.png')
                cinematic = source
            elif kind == 'npc' and i == 22:
                source = ROOT / 'assets/images/hidden/pale_rider_identity_clean.png'
                target = source.with_name('pale_rider_identity_poster.png')
                cinematic = source.with_name('pale_rider_identity.png')
            else:
                folder = ROOT / f'assets/images/characters/{"enemy" if kind == "npc" else kind}/{i:02}'
                source = folder / ('identity_clean.png' if kind == 'npc' and i != 1 else 'identity.png')
                target = folder / 'identity_poster.png'
                cinematic = folder / 'identity.png'
            yield kind, i, source, target, cinematic


def exterior_distance(a, max_distance=8):
    # Analyze support only: no morphology or filtering is applied to artwork.
    # High-res masters have legitimate antialiased alpha; >=128 locates the body
    # without letting a near-invisible alpha speck hide the actual light edge.
    solid = a[:, :, 3] >= (128 if a.shape[0] > 256 else 1)
    padded = np.pad(solid.astype('uint8') * 255, 1)
    flood = Image.fromarray(padded).copy()
    ImageDraw.floodfill(flood, (0, 0), 128)
    outside = np.array(flood)[1:-1, 1:-1] == 128
    distance = np.full(solid.shape, 999, dtype=np.int16)
    distance[outside] = 0
    reached = outside.copy()
    for step in range(1, max_distance + 1):
        p = np.pad(reached, 1)
        expanded = np.zeros_like(reached)
        for yy in range(3):
            for xx in range(3):
                expanded |= p[yy:yy + solid.shape[0], xx:xx + solid.shape[1]]
        distance[expanded & ~reached] = step
        reached = expanded
    return distance


def remove_rim(source, kind, identity):
    """Approved C: saturated exterior rim -> nearby original dark material RGB.

    No alpha writes, no all-image color key, no low-saturation/white/blue keying,
    no blur or sharpening. Intentional negative space/translucency is preserved.
    """
    a = source
    rgb = a[:, :, :3].astype(int)
    r, g, b = rgb.transpose(2, 0, 1)
    scale = a.shape[0] / 256
    band = round(3 * scale)
    radius = round(6 * scale)
    support_alpha = 128 if scale > 1 else 255
    d = exterior_distance(a, max_distance=max(band + 1, 8))
    mask = (a[:, :, 3] > 0) & (d <= band) & (r >= 160) & (r - g >= 40) & (r - b >= 85) & (b <= 100)
    # Preserve the real face/neck and bandana region of active Player identities.
    if kind == 'player':
        mask[round(a.shape[0] * .13):round(a.shape[0] * .30), round(a.shape[1] * .43):round(a.shape[1] * .66)] = False
    output = a.copy()
    selected = np.zeros(mask.shape, bool)
    h, w = mask.shape
    donors = (a[:, :, 3] >= support_alpha) & ~mask & (d >= round(2 * scale)) & (r <= 115) & (rgb.max(2) <= 125)
    for y, x in np.argwhere(mask):
        # First preserve the approved six-pixel donor choice. A slightly wider
        # search handles isolated rim tips where the initial preview left residue.
        found = False
        for reach in (radius, radius * 3):
            ys, xs = np.where(donors[max(0, y - reach):min(h, y + reach + 1), max(0, x - reach):min(w, x + reach + 1)])
            ys += max(0, y - reach)
            xs += max(0, x - reach)
            if not len(ys):
                continue
            cost = (ys - y) ** 2 + (xs - x) ** 2 + np.maximum(0, band - d[ys, xs]) * 2
            idx = np.argmin(cost)
            if cost[idx] <= reach ** 2:
                found = True
                break
        if not found:
            continue
        output[y, x, :3] = a[ys[idx], xs[idx], :3]
        selected[y, x] = True
    # RGB hidden below zero alpha cannot appear as a baked checkerboard/matte.
    # Leave alpha and every originally visible unselected RGBA value identical.
    output[output[:, :, 3] == 0, :3] = 0
    visible = a[:, :, 3] > 0
    assert np.array_equal(output[:, :, 3], a[:, :, 3])
    assert np.array_equal(output[visible & ~selected], a[visible & ~selected])
    assert np.array_equal(output[visible & (d > band)], a[visible & (d > band)])
    assert np.array_equal(output[visible & (rgb.max(2) < 160)], a[visible & (rgb.max(2) < 160)])
    return output, selected, int((mask & ~selected).sum())


def composite(a, color):
    img = Image.new('RGBA', (a.shape[1], a.shape[0]), color)
    img.alpha_composite(Image.fromarray(a))
    return img.convert('RGB').resize((256, 256), Image.Resampling.NEAREST)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    QA.mkdir(parents=True, exist_ok=True)
    records = []
    previews = []
    baseline = {str(p): sha(p) for _, _, p, _, _ in sources()}
    for kind, i, source, target, cinematic in sources():
        a = np.array(Image.open(source).convert('RGBA'))
        out, selected, residual = remove_rim(a, kind, i)
        # NPC: exact pixel replication for a 512 physical-pixel native display.
        # Player: retain the active 1254px identity at its native dimensions.
        raster = np.repeat(np.repeat(out, 2, axis=0), 2, axis=1) if kind == 'npc' else out
        check = raster[::2, ::2] if kind == 'npc' else raster
        assert np.array_equal(check, out)
        assert np.array_equal(check[:, :, 3], a[:, :, 3])
        working = WORK / f'{kind}-{i:02}-poster.png'
        Image.fromarray(raster).save(working)
        Image.fromarray((selected * 255).astype('uint8')).save(WORK / f'{kind}-{i:02}-mask.png')
        if args.write:
            assert target.stem.endswith('_poster') and target != source and target != cinematic
            target.write_bytes(working.read_bytes())
        clarity_id = '02-v2' if kind == 'player' and i == 2 else f'{i:02}'
        records.append(dict(kind=kind, id=i,
            identity=dict(cinematic=str(cinematic.relative_to(ROOT)), approvedAlpha=str(source.relative_to(ROOT)), poster=str(target.relative_to(ROOT))),
            duelPoseDirectory=f'assets/images/characters/clarity/{kind}/{clarity_id}',
            sourceSha256=sha(source), posterSha256=sha(working), sourceDimensions=list(a.shape[:2][::-1]), posterDimensions=list(raster.shape[:2][::-1]),
            edgeTreatment='C_removed_100_percent', rimPixelsReplaced=int(selected.sum()), unresolvedCandidatePixels=residual,
            alphaChangedPixels=0, unselectedVisiblePixelChanges=0, originalDarkPixelChanges=0,
            alphaPolicy='Preserve approved alpha, including intentional spectral negative space',
            rasterMethod='exact_2x_nearest_pixel_replication' if kind == 'npc' else 'native_source_pixels_unchanged_size', usage=['wanted', 'npc-select' if kind == 'npc' else 'ranking', 'poster-profile', 'friend-challenge-poster', 'share-poster'],
            forbiddenUsage=['duel-idle', 'duel-draw', 'duel-fire', 'duel-hit', 'duel-down']))
        previews.append((kind, i, a, out))
        print(f'{kind} {i:02}: {selected.sum()} rim pixels; unresolved {residual}', flush=True)
    assert all(sha(Path(p)) == h for p, h in baseline.items()), 'Original changed'
    manifest = dict(version=1, status='pending_device_qa', approvedTreatment='C — RIM LIGHT REMOVED',
        notes='Poster-only mappings. Existing cinematic and clarity manifests/imports stay authoritative for Duel.',
        npcCount=22, playerCount=4, assets=records)
    (WORK / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    if args.write:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    # Whole-body before/after inspection in manageable full-resolution sheets.
    for kind in ('npc', 'player'):
        subset = [p for p in previews if p[0] == kind]
        for start in range(0, len(subset), 6):
            batch = subset[start:start + 6]
            for color, tag in [('#c8a572', 'parchment'), ('#1a1410', 'dark')]:
                board = Image.new('RGB', (1536, 2 * 288), color)
                draw = ImageDraw.Draw(board)
                for j, (_, i, a, out) in enumerate(batch):
                    xx = j % 3 * 512
                    yy = j // 3 * 288
                    for k, arr in enumerate((a, out)):
                        board.paste(composite(arr, color), (xx + k * 256, yy + 28))
                        draw.text((xx + k * 256 + 8, yy + 8), f'{kind.upper()} {i:02} {"ORIGINAL" if k == 0 else "CLEAN POSTER"}', fill='#f0daba' if tag == 'dark' else '#291a10')
                board.save(QA / f'{kind}-{start + 1:02}-{tag}.png')


if __name__ == '__main__':
    main()
