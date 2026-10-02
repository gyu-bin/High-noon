"""Body Differentiation Pass review. Read-only for production; writes evidence to ./review/.

Characters are identified by exact filename only. Run after all 7 PNGs are in ./intake/:
    python artifacts/character-redesign-body-pass/review_body_pass.py
"""
from pathlib import Path
import hashlib, json, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
INTAKE = HERE / 'intake'
OUT = HERE / 'review'
PREV = ROOT / 'artifacts/character-redesign-batch-ab/candidates'

TARGETS = [
    # id, filename, production idle (reference only, never written), previous candidate upload
    ('P04', 'P04_GHOST_GUNSLINGER.png', 'player/04', 3),
    ('NPC15', 'NPC15_SHADOW_HUNTER.png', 'npc/15', 1),
    ('NPC19', 'NPC19_VOID_WALKER.png', 'npc/19', 2),
    ('NPC20', 'NPC20_ECHO_PHANTOM.png', 'npc/20', 4),
    ('NPC09', 'NPC09_GOLDEN_SKULL.png', 'npc/09', 5),
    ('NPC18', 'NPC18_RED_EYE_ORACLE.png', 'npc/18', 6),
    ('NPC22', 'NPC22_PALE_RIDER.png', 'npc/22', 7),
]
MIN_SIDE = 1254
SOLID = 235
DARK, LIGHT = (40, 40, 40), (222, 222, 222)


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def check_intake():
    expected = {f for _, f, _, _ in TARGETS}
    present = {p.name for p in INTAKE.glob('*.png')}
    missing = sorted(expected - present)
    unexpected = sorted(present - expected)
    if missing:
        sys.exit(f'STOP: missing exact filenames: {missing}\nunexpected PNGs (ignored, not mapped): {unexpected}')
    return unexpected


def body_extent(img):
    """Approximate hat top / lowest solid row / hat centre from the solid core."""
    a = np.array(img.getchannel('A'))
    solid = a > SOLID
    ys = np.where(solid.sum(1) > 30)[0]
    top, bottom = int(ys.min()), int(ys.max())
    cols = np.where(solid[top:top + 120].any(0))[0]
    return top, bottom, int((cols.min() + cols.max()) / 2)


def file_checks(path):
    raw = Image.open(path)
    img = raw.convert('RGBA')
    arr = np.array(img).astype(int)
    a, rgb = arr[..., 3], arr[..., :3]
    lum = rgb.mean(-1)
    w, h = img.size
    edge = np.array(img.getchannel('A').filter(ImageFilter.FIND_EDGES)) > 40
    fringe = edge & (a > 16)
    nf = max(int(fringe.sum()), 1)
    red = (rgb[..., 0] > rgb[..., 1] + 45) & (rgb[..., 0] > rgb[..., 2] + 45) & (rgb[..., 0] > 120)
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    margin = 8
    near = np.concatenate([a[:margin].ravel(), a[-margin:].ravel(), a[:, :margin].ravel(), a[:, -margin:].ravel()])
    gray = np.array(img.convert('L')).astype(float)
    lap = gray[1:-1, 1:-1] * 4 - gray[:-2, 1:-1] - gray[2:, 1:-1] - gray[1:-1, :-2] - gray[1:-1, 2:]
    mask = a[1:-1, 1:-1] > 200
    bbox = Image.fromarray((a > 24).astype(np.uint8) * 255).getbbox()
    corner_rgb = [int(v) for v in arr[2, 2]]
    r = {
        'format': raw.format, 'source_mode': raw.mode, 'canvas': [w, h],
        'resolution_ok': min(w, h) >= MIN_SIDE,
        'has_alpha_channel': raw.mode in ('RGBA', 'LA') or 'transparency' in raw.info,
        'alpha_zero_pct': round(float((a == 0).mean() * 100), 1),
        'alpha_max': int(a.max()),
        'true_alpha': bool((a == 0).mean() > 0.15 and a.max() >= 250),
        'corner_rgba': corner_rgb,
        'bbox_alpha_gt24': list(bbox) if bbox else None,
        'visible_height_fraction': round((bbox[3] - bbox[1]) / h, 3) if bbox else 0,
        'edge_touch_px': int((border > 24).sum()),
        'within_8px_of_edge_px': int((near > 24).sum()),
        'fringe_white_pct': round(float((fringe & (lum > 215)).sum() / nf * 100), 2),
        'fringe_black_matte_pct': round(float((fringe & (lum < 12) & (a < 200)).sum() / nf * 100), 2),
        'fringe_red_orange_pct': round(float((fringe & red).sum() / nf * 100), 2),
        'sharpness_laplacian_var': round(float(lap[mask].var()), 1) if mask.any() else 0.0,
    }
    r['flags'] = [k for k, bad in [
        ('NOT_PNG', r['format'] != 'PNG'),
        ('NO_ALPHA_CHANNEL', not r['has_alpha_channel']),
        ('NOT_TRUE_ALPHA', not r['true_alpha']),
        ('BELOW_1254', not r['resolution_ok']),
        ('CROPPED_AT_EDGE', r['edge_touch_px'] > 0),
        ('TIGHT_TO_EDGE', r['edge_touch_px'] == 0 and r['within_8px_of_edge_px'] > 0),
        ('WHITE_HALO_SUSPECT', r['fringe_white_pct'] > 3),
        ('BLACK_MATTE_SUSPECT', r['fringe_black_matte_pct'] > 3),
        # palette-driven red (NPC18 crimson, NPC09 gold) must be judged visually
        ('RED_ORANGE_RIM_SUSPECT', r['fringe_red_orange_pct'] > 5),
        ('SOFT_IMAGE_SUSPECT', r['sharpness_laplacian_var'] < 600),
    ] if bad]
    return r, img


def fit(img, box, crop=True):
    if crop:
        bb = img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox()
        img = img.crop(bb) if bb else img
    k = min(box[0] / img.width, box[1] / img.height)
    return img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.Resampling.LANCZOS)


def square(img):
    """Game renders a square canvas; pad non-square candidates (never scale up)."""
    s = max(img.size)
    c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(img, ((s - img.width) // 2, s - img.height))
    return c


def panel(cells, cols, cw, ch, bg, name, label_h=26):
    rows = (len(cells) + cols - 1) // cols
    fg = (20, 20, 20) if bg == LIGHT else (235, 235, 235)
    c = Image.new('RGB', (cols * cw, rows * (ch + label_h)), bg)
    d = ImageDraw.Draw(c)
    for i, (label, img) in enumerate(cells):
        x, y = (i % cols) * cw, (i // cols) * (ch + label_h)
        d.text((x + 8, y + 7), label, fill=fg)
        c.paste(img, (x + (cw - img.width) // 2, y + label_h + ch - img.height), img)
    c.save(OUT / name)
    return name


def silhouette(img, thr):
    s = Image.new('RGBA', img.size, (15, 15, 15, 255))
    s.putalpha(img.getchannel('A').point(lambda v: 255 if v > thr else 0))
    return s


def toned_down(img):
    """Approximate 'effects reduced': fade partial-alpha effects, dim saturated glow, desaturate."""
    arr = np.array(img).astype(float)
    rgb, a = arr[..., :3], arr[..., 3]
    mx, mn = rgb.max(-1), rgb.min(-1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    glow = (sat > 0.35) & (mx > 150)
    a = np.where(a < SOLID, a * 0.2, a)
    a = np.where(glow, a * 0.35, a)
    gray = rgb.mean(-1, keepdims=True)
    rgb = gray + (rgb - gray) * 0.3
    return Image.fromarray(np.dstack([rgb, a]).clip(0, 255).astype(np.uint8), 'RGBA')


def core_mask(img, height=900, size=(900, 960)):
    top, bottom, cx = body_extent(img)
    k = height / max(bottom - top, 1)
    im = img.resize((round(img.width * k), round(img.height * k)), Image.Resampling.LANCZOS)
    a = np.array(im.getchannel('A')) > SOLID
    m = np.zeros(size[::-1], bool)
    ys, xs = np.nonzero(a)
    ys, xs = ys + 30 - round(top * k), xs + size[0] // 2 - round(cx * k)
    ok = (ys >= 0) & (ys < size[1]) & (xs >= 0) & (xs < size[0])
    m[ys[ok], xs[ok]] = True
    return m


def iou(a, b):
    return round(float((a & b).sum() / max((a | b).sum(), 1)), 3)


def main():
    unexpected = check_intake()
    OUT.mkdir(exist_ok=True)
    prod_before = {f: sha(ROOT / 'assets/images/characters/clarity' / f / 'idle.png') for _, _, f, _ in TARGETS}

    rows, imgs = [], {}
    for id_, fname, folder, prev in TARGETS:
        p = INTAKE / fname
        checks, img = file_checks(p)
        imgs[id_] = img
        rows.append({'id': id_, 'file': str(p.relative_to(ROOT)), 'sha256': sha(p),
                     'body_extent_approx': dict(zip(('hat_top', 'lowest_solid', 'hat_cx'), body_extent(img))),
                     **checks})
    ids = [r['id'] for r in rows]

    sheets = []
    for bg, tag in [(DARK, 'dark'), (LIGHT, 'light')]:
        sheets.append(panel([(i, fit(imgs[i], (300, 440))) for i in ids], 7, 320, 450, bg, f'A_lineup_{tag}.png'))
        sheets.append(panel([(i, fit(square(imgs[i]), (256, 256), crop=False)) for i in ids], 7, 270, 260, bg, f'C_select256_{tag}.png'))
        cells = [(f'{i} {s}px', fit(square(imgs[i]), (s, s), crop=False)) for s in (241, 200, 160) for i in ids]
        sheets.append(panel(cells, 7, 255, 245, bg, f'D_duel_160_200_241_{tag}.png'))
        sheets.append(panel([(f'{i} toned', fit(toned_down(imgs[i]), (300, 440))) for i in ids]
                            + [(f'{i} toned 200px', fit(square(toned_down(imgs[i])), (200, 200), crop=False)) for i in ids],
                            7, 320, 450, bg, f'F_effects_toned_down_{tag}.png'))
    cells = [(f'{i} alpha>24', fit(silhouette(imgs[i], 24), (300, 420))) for i in ids]
    cells += [(f'{i} solid>{SOLID}', fit(silhouette(imgs[i], SOLID), (300, 420))) for i in ids]
    cells += [(f'{i} toned', fit(silhouette(toned_down(imgs[i]), 120), (300, 420))) for i in ids]
    sheets.append(panel(cells, 7, 320, 430, LIGHT, 'B_silhouette.png'))

    # E. body-template overlap: solid cores aligned by body height
    masks = {i: core_mask(imgs[i]) for i in ids}
    pair = {f'{a}~{b}': iou(masks[a], masks[b]) for n, a in enumerate(ids) for b in ids[n + 1:]}
    vs_prev = {}
    for id_, _, _, up in TARGETS:
        pp = PREV / f'upload_{up}.webp'
        if pp.exists():
            vs_prev[id_] = iou(masks[id_], core_mask(Image.open(pp).convert('RGBA')))
    colors = [(230, 60, 60), (60, 160, 230), (140, 90, 220), (60, 200, 120), (230, 170, 40), (220, 60, 170), (110, 110, 110)]
    count = np.sum([masks[i] for i in ids], 0)
    vis = np.repeat((255 - count / len(ids) * 200)[..., None], 3, -1)
    for i, col in zip(ids, colors):
        m = masks[i].astype(np.uint8) * 255
        edge = (m > 0) & (np.array(Image.fromarray(m).filter(ImageFilter.MinFilter(5))) == 0)
        vis[edge] = col
    e = Image.fromarray(vis.astype(np.uint8))
    d = ImageDraw.Draw(e)
    for n, (i, col) in enumerate(zip(ids, colors)):
        d.text((10, 10 + n * 14), i, fill=col)
    e.save(OUT / 'E_body_overlap.png')
    sheets.append('E_body_overlap.png')
    vals = list(pair.values())
    overlap = {'pairwise_core_iou': pair, 'mean': round(float(np.mean(vals)), 3), 'max': max(vals),
               'max_pair': max(pair, key=pair.get), 'previous_batch_range': [0.541, 0.742],
               'same_id_vs_previous_candidate_iou': vs_prev,
               'note': 'Lower = more distinct bodies. IoU is a support metric; the visual read decides.'}
    (OUT / 'body_overlap_iou.json').write_text(json.dumps(overlap, indent=2) + '\n')

    prod_after = {f: sha(ROOT / 'assets/images/characters/clarity' / f / 'idle.png') for f in prod_before}
    summary = {'files': rows, 'unexpected_pngs_ignored': unexpected, 'sheets': sheets,
               'production_unchanged': prod_before == prod_after}
    (OUT / 'file_checks.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False) + '\n')
    for r in rows:
        print(r['id'], r['canvas'], r['format'], 'flags=', r['flags'] or 'none')
    print('core IoU mean', overlap['mean'], 'max', overlap['max'], overlap['max_pair'])
    print('production_unchanged', summary['production_unchanged'])


if __name__ == '__main__':
    main()
