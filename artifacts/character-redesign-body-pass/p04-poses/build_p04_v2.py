"""PHASE 3A-B: P04 v2 identity (pose-set look). Normalizes IDLE_V2 + DRAW/FIRE/HIT/KNEEL onto ONE
common canvas sized from the union of all five placed bounds (no crop, no upscale).

Inputs (exact names) in ./intake/: P04_IDLE_V2.png, P04_DRAW.png, P04_FIRE.png, P04_HIT.png, P04_KNEEL.png
Writes staged files (new paths only) + evidence in ./review-v2/. Production is hash-checked, never written.
"""
from pathlib import Path
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
TEST = os.environ.get('P04_V2_SELFTEST_DIR')
INTAKE = Path(TEST) / 'intake' if TEST else HERE / 'intake'
OUT = Path(TEST) / 'review' if TEST else HERE / 'review-v2'
STAGE = Path(TEST) / 'staged' if TEST else ROOT / 'assets/images/characters/staged/redesign-v2/player/04'
PROD = ROOT / 'assets/images/characters/clarity'
FRAME, MARGIN = 1254, 8

# Production P04 idle anchors (PHASE 1, production frame px): chin→ground span and belt-centre x.
PROD_CHIN, PROD_GROUND, PROD_BELT_X = 200, 1211, 650

# runtime slot, intake file. Manual source anchors (px in each 1254 source), read from a 25 px grid:
#   ground = boot-sole y of the grounded foot, buckle_x = compass-medallion centre x.
#   IDLE also needs chin (bottom of the void face) — it alone sets the body scale for all five.
#   rel = source pixel scale relative to the 4 poses (downscale-only), read from figure height and
#   compass-medallion diameter; IDLE_V2 was exported on a larger 1145x1374 canvas (≈1.10x the poses).
POSES = [
    ('idle', 'P04_IDLE_V2.png', {'ground': 1350, 'buckle_x': 633, 'chin': 255, 'rel': 0.909}),
    ('draw', 'P04_DRAW.png', {'ground': None, 'buckle_x': 703, 'rel': 1.0}),
    ('fire', 'P04_FIRE.png', {'ground': None, 'buckle_x': 875, 'rel': 1.0}),
    ('hit', 'P04_HIT.png', {'ground': None, 'buckle_x': 717, 'rel': 1.0}),
    # KNEEL: the generator filled the frame with the kneeling body (medallion ≈85 vs ≈70 px)
    ('down', 'P04_KNEEL.png', {'ground': None, 'buckle_x': 636, 'rel': 0.83}),
]


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def protected():
    files = sorted(PROD.glob('*/*/*.png')) + [ROOT / 'assets/images/hidden/pale_rider_locked_silhouette.png']
    return {str(p.relative_to(ROOT)): sha(p) for p in files}


def lowest_solid(img):
    a = np.array(img.getchannel('A')) > 235
    return int(np.where(a.sum(1) > 30)[0].max())


def checks(path, img):
    a = np.array(img.getchannel('A'))
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    raw = Image.open(path)
    return {'format': raw.format, 'mode': raw.mode, 'size': list(raw.size),
            'true_alpha': bool((a == 0).mean() > 0.15 and a.max() >= 250), 'edge_touch_px': int((border > 24).sum())}


def main():
    missing = [f for _, f, _ in POSES if not (INTAKE / f).exists()]
    if missing:
        sys.exit(f'STOP: missing exact filenames in {INTAKE}: {missing}')
    idle_anchor = POSES[0][2]
    if idle_anchor['chin'] is None or idle_anchor['buckle_x'] is None:
        sys.exit('STOP: set the manual IDLE anchors (chin, buckle_x) in POSES first')
    before = protected()
    OUT.mkdir(parents=True, exist_ok=True)
    STAGE.mkdir(parents=True, exist_ok=True)

    srcs = {slot: Image.open(INTAKE / f).convert('RGBA') for slot, f, _ in POSES}
    anchors = {slot: dict(m, ground=m['ground'] if m['ground'] is not None else lowest_solid(srcs[slot])) for slot, _, m in POSES}
    ia = anchors['idle']
    wanted = (PROD_GROUND - PROD_CHIN) / ((ia['ground'] - ia['chin']) * ia['rel'])
    s = min(wanted, 1.0)  # one body scale for all five; never upscale

    # placement in production-frame coordinates (may be negative / beyond 1254 before padding)
    placed = {}
    for slot, img in srcs.items():
        a = anchors[slot]
        sp = s * min(a['rel'], 1.0)
        dx = PROD_BELT_X - a['buckle_x'] * sp
        dy = PROD_GROUND - a['ground'] * sp
        bb = img.getchannel('A').getbbox()
        placed[slot] = (dx, dy, [bb[0] * sp + dx, bb[1] * sp + dy, bb[2] * sp + dx, bb[3] * sp + dy], sp)
    u = [min(p[2][0] for p in placed.values()), min(p[2][1] for p in placed.values()),
         max(p[2][2] for p in placed.values()), max(p[2][3] for p in placed.values())]
    need = max(0, -u[0], -u[1], u[2] - FRAME, u[3] - FRAME)
    pad = int(np.ceil(need)) + MARGIN
    C = FRAME + 2 * pad

    rec, staged = {}, {}
    for slot, f, _ in POSES:
        img = srcs[slot]
        dx, dy, _, sp = placed[slot]
        im = img.resize((round(img.width * sp), round(img.height * sp)), Image.Resampling.LANCZOS) if sp < 1 else img
        canvas = Image.new('RGBA', (C, C), (0, 0, 0, 0))
        canvas.alpha_composite(im, (round(dx + pad), round(dy + pad)))
        out = STAGE / f'{slot}.png'
        canvas.save(out, optimize=True)
        staged[slot] = canvas
        ob = canvas.getchannel('A').getbbox()
        rec[slot] = {'source': f, 'source_sha256': sha(INTAKE / f), 'checks': checks(INTAKE / f, img),
                     'anchors_source': anchors[slot], 'uniform_scale': round(placed[slot][3], 4),
                     'translate_canvas': [round(dx + pad), round(dy + pad)],
                     'output_bbox': list(ob), 'edge_margin_min': min(ob[0], ob[1], C - ob[2], C - ob[3]),
                     'staged_sha256': sha(out)}

    meta = {'canvasSize': C, 'frameGroundY': PROD_GROUND, 'displayScale': round(C / FRAME, 4),
            'pad_each_side': pad, 'uniform_scale': round(s, 4), 'uniform_scale_wanted': round(wanted, 4),
            'union_bounds_in_frame': [round(v) for v in u]}

    # continuity (staged canvases): ground row and buckle x after transform must coincide
    table = []
    for a_, b_ in [('idle', 'draw'), ('draw', 'fire'), ('fire', 'hit'), ('hit', 'idle'), ('hit', 'down')]:
        ga = PROD_GROUND + pad
        table.append({'transition': f'{a_}->{b_}',
                      'ground_dy': round((anchors[b_]['ground'] * placed[b_][3] + placed[b_][1]) - (anchors[a_]['ground'] * placed[a_][3] + placed[a_][1]), 1),
                      'buckle_dx': round((anchors[b_]['buckle_x'] * placed[b_][3] + placed[b_][0]) - (anchors[a_]['buckle_x'] * placed[a_][3] + placed[a_][0]), 1),
                      'ground_canvas_y': ga})

    k_box = 360

    def strip(seq, name, sil=False, bg=(40, 40, 40)):
        c = Image.new('RGB', (k_box * len(seq), k_box + 26), bg)
        d = ImageDraw.Draw(c)
        gy = round((PROD_GROUND + pad) * k_box / C)
        for i, slot in enumerate(seq):
            im = staged[slot].resize((k_box, k_box), Image.Resampling.LANCZOS)
            if sil:
                t = Image.new('RGBA', im.size, (235, 235, 235, 255)); t.putalpha(im.getchannel('A').point(lambda v: 255 if v > 24 else 0)); im = t
            c.paste(im, (i * k_box, 26), im)
            d.text((i * k_box + 6, 6), slot.upper() + (' (KNEEL)' if slot == 'down' else ''), fill=(235, 235, 235))
            d.line([(i * k_box, 26 + gy), ((i + 1) * k_box, 26 + gy)], fill=(255, 60, 60))
            d.rectangle([i * k_box, 26, (i + 1) * k_box - 1, 26 + k_box - 1], outline=(90, 90, 90))
        c.save(OUT / name)
        return name

    sheets = [strip(['idle', 'draw', 'fire'], 'A_idle_draw_fire.png'), strip(['fire', 'hit'], 'B1_fire_hit.png'),
              strip(['idle', 'hit', 'idle'], 'B2_idle_hit_recover.png'), strip(['hit', 'down'], 'C_hit_kneel.png'),
              strip(['idle', 'draw', 'fire', 'hit', 'down'], 'D_silhouettes.png', sil=True)]
    order = ['idle', 'draw', 'fire', 'hit', 'down']
    for name, bg in [('E_duel_sizes.png', (222, 222, 222)), ('F_dark_background.png', (12, 6, 24))]:
        rows = []
        for z in (241, 200, 160):
            r = round(z * C / FRAME)  # compensated: frame box z, art drawn at displayScale
            rows.append((z, r))
        c = Image.new('RGB', (len(order) * 340, sum(r + 24 for _, r in rows)), bg)
        d = ImageDraw.Draw(c)
        y = 0
        for z, r in rows:
            for i, slot in enumerate(order):
                im = staged[slot].resize((r, r), Image.Resampling.LANCZOS)
                c.paste(im, (i * 340 + (340 - r) // 2, y + 24), im)
                d.text((i * 340 + 6, y + 6), f'{slot} {z}px', fill=(128, 128, 128))
            y += r + 24
        c.save(OUT / name)
        sheets.append(name)

    after = protected()
    result = {'metadata': meta, 'records': rec, 'continuity': table, 'sheets': sheets,
              'production_unchanged': before == after}
    (OUT / 'p04_v2.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(meta))
    for k, v in rec.items():
        print(k, v['checks'], 'margin', v['edge_margin_min'])
    for t in table:
        print(t)
    print('production_unchanged', before == after)


if __name__ == '__main__':
    main()
