"""PHASE 3A: normalize + review P04 combat poses against the locked idle.

Inputs (exact names) in ./intake/: P04_DRAW.png, P04_FIRE.png, P04_HIT.png, P04_KNEEL.png
Writes staged runtime files (new paths only) and evidence in ./review/. Never touches production.
"""
from pathlib import Path
import hashlib, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
# P04_POSE_SELFTEST_DIR redirects intake/review/staged output (used to dry-run the pipeline)
TEST = os.environ.get('P04_POSE_SELFTEST_DIR')
INTAKE, OUT = (Path(TEST) / 'intake', Path(TEST) / 'review') if TEST else (HERE / 'intake', HERE / 'review')
BODY = ROOT / 'artifacts/character-redesign-body-pass'
IDLE_SRC = BODY / 'intake/P04_GHOST_GUNSLINGER.png'
STAGE_IDLE = ROOT / 'assets/images/characters/staged/redesign-v2/player/04'
STAGE = Path(TEST) / 'staged' if TEST else STAGE_IDLE
PROD = ROOT / 'assets/images/characters/clarity'
FRAME = 1254
# runtime slot <- intake file
POSES = [('draw', 'P04_DRAW.png'), ('fire', 'P04_FIRE.png'), ('hit', 'P04_HIT.png'), ('down', 'P04_KNEEL.png')]
SOLID = 235
HAT_TOL = 0.03
# Auto hat measurement breaks when a raised gun sits above/next to the hat (DRAW/HIT),
# so scale/x come from manual anchors: optional downscale-only factor and belt-buckle x (source px).
MANUAL = {
    'idle': {'buckle_x': 777},  # belt-buckle centre read from 25px grid,
    'draw': {'buckle_x': 703, 'scale': 1.0},
    'fire': {'buckle_x': 875, 'scale': 1.0},
    'hit': {'buckle_x': 717, 'scale': 1.0},
    'down': {'buckle_x': 636, 'scale': 1.0},
}


def rel(p):
    return str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p)


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def protected():
    files = sorted(PROD.glob('*/*/*.png')) + [ROOT / 'assets/images/hidden/pale_rider_locked_silhouette.png']
    return {str(p.relative_to(ROOT)): sha(p) for p in files}


def measure(img):
    """Approximate rigid anchors from the solid core: hat top, hat brim width, ground, body centre x."""
    a = np.array(img.getchannel('A')) > SOLID
    rows = np.where(a.sum(1) > 30)[0]
    top = int(rows.min())
    band = a[top:top + 90]
    cols = np.where(band.any(0))[0]
    cx = int(np.median(cols))
    brim = 0
    for r in band:
        xs = np.where(r)[0]
        if len(xs):
            # widest contiguous run containing the column nearest cx
            runs = np.split(xs, np.where(np.diff(xs) > 1)[0] + 1)
            run = min(runs, key=lambda q: min(abs(q[0] - cx), abs(q[-1] - cx)) if not (q[0] <= cx <= q[-1]) else 0)
            brim = max(brim, int(run[-1] - run[0] + 1))
    ground = int(rows.max())
    return {'hat_top': top, 'hat_brim_w': brim, 'ground': ground, 'cx': cx}


def checks(path, img):
    a = np.array(img.getchannel('A'))
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    rgb = np.array(img)[..., :3].astype(int)
    edge = (a > 16) & (a < 230)
    red = (rgb[..., 0] > rgb[..., 1] + 45) & (rgb[..., 0] > rgb[..., 2] + 45) & (rgb[..., 0] > 120)
    raw = Image.open(path)
    return {'format': raw.format, 'mode': raw.mode, 'size': list(raw.size),
            'true_alpha': bool((a == 0).mean() > 0.15 and a.max() >= 250),
            'edge_touch_px': int((border > 24).sum()),
            'red_orange_edge_pct': round(float((edge & red).sum() / max(edge.sum(), 1) * 100), 2)}


def main():
    missing = [f for _, f in POSES if not (INTAKE / f).exists()]
    if missing:
        sys.exit(f'STOP: missing exact filenames in {INTAKE}: {missing}')
    before = protected()
    OUT.mkdir(exist_ok=True)
    tr = json.loads((BODY / 'normalized/transforms.json').read_text())['records']['P04']
    s0, C, pad = tr['uniform_scale'], tr['output_size'][0], tr['pad_each_side']
    ox, oy = tr['translate_x_in_canvas'], tr['translate_y_in_canvas']
    idle = Image.open(IDLE_SRC).convert('RGBA')
    ref = measure(idle)
    rec = {'idle': {'source': str(IDLE_SRC.relative_to(ROOT)), 'anchors_source': ref, 'scale': s0}}
    STAGE.mkdir(parents=True, exist_ok=True)
    staged = {'idle': Image.open(STAGE_IDLE / 'idle.png').convert('RGBA')}
    for slot, fname in POSES:
        src_p = INTAKE / fname
        img = Image.open(src_p).convert('RGBA')
        q = checks(src_p, img)
        m = measure(img)
        ratio = ref['hat_brim_w'] / max(m['hat_brim_w'], 1)
        # downscale-only correction when the generator drifted in scale; never upscale
        corr = min(MANUAL[slot]['scale'], 1.0)
        s = s0 * corr
        im = img.resize((round(img.width * s), round(img.height * s)), Image.Resampling.LANCZOS)
        # same idle translation, then re-seat on the idle ground line and body centre
        bx = MANUAL[slot]['buckle_x']
        dx = ox + ((MANUAL['idle']['buckle_x'] - bx * corr) * s0 if bx is not None else 0)
        dy = oy + (ref['ground'] - m['ground'] * corr) * s0
        canvas = Image.new('RGBA', (C, C), (0, 0, 0, 0))
        canvas.alpha_composite(im, (round(dx), round(dy))) if dx >= 0 and dy >= 0 else canvas.paste(im, (round(dx), round(dy)), im)
        bb = canvas.getchannel('A').getbbox()
        out = STAGE / f'{slot}.png'
        canvas.save(out, optimize=True)
        staged[slot] = canvas
        rec[slot] = {'source': rel(src_p), 'source_sha256': sha(src_p), 'checks': q,
                     'anchors_source': m, 'hat_ratio_vs_idle': round(ratio, 4), 'scale_correction': round(corr, 4),
                     'uniform_scale': round(s, 4), 'translate_canvas': [round(dx), round(dy)], 'canvas': [C, C],
                     'frame_ground_y': tr['ground_y_in_frame'], 'clipped_at_canvas_edge': bool(bb and (bb[0] == 0 or bb[1] == 0 or bb[2] == C or bb[3] == C)),
                     'staged': rel(out), 'staged_sha256': sha(out)}

    # continuity table measured on the staged canvases
    cont = {k: measure(v) for k, v in staged.items()}
    pairs = [('idle', 'draw'), ('draw', 'fire'), ('fire', 'idle'), ('idle', 'hit'), ('hit', 'idle'), ('hit', 'down')]
    table = [{'transition': f'{a}->{b}', 'hat_top_dy': cont[b]['hat_top'] - cont[a]['hat_top'],
              'hat_brim_ratio': round(cont[b]['hat_brim_w'] / max(cont[a]['hat_brim_w'], 1), 3),
              'ground_dy': cont[b]['ground'] - cont[a]['ground'], 'centre_dx': cont[b]['cx'] - cont[a]['cx']} for a, b in pairs]

    def strip(seq, name, bg=(40, 40, 40), box=360, sil=False):
        c = Image.new('RGB', (box * len(seq), box + 26), bg)
        d = ImageDraw.Draw(c)
        k = box / C
        gy = round((pad + tr['ground_y_in_frame']) * k)
        for i, slot in enumerate(seq):
            im = staged[slot].resize((box, box), Image.Resampling.LANCZOS)
            if sil:
                s_ = Image.new('RGBA', im.size, (235, 235, 235, 255)); s_.putalpha(im.getchannel('A').point(lambda v: 255 if v > 24 else 0)); im = s_
            c.paste(im, (i * box, 26), im)
            d.text((i * box + 6, 6), slot.upper() + (' (KNEEL art)' if slot == 'down' else ''), fill=(235, 235, 235))
            d.line([(i * box, 26 + gy), ((i + 1) * box, 26 + gy)], fill=(255, 60, 60))
        c.save(OUT / name)
        return name

    sheets = [strip(['idle', 'draw', 'fire'], 'A_idle_draw_fire.png'), strip(['idle', 'hit', 'idle'], 'B_idle_hit_recover.png'),
              strip(['hit', 'down'], 'C_hit_kneel.png'), strip(['idle', 'draw', 'fire', 'hit', 'down'], 'D_silhouettes.png', sil=True)]
    # E: duel sizes, compensated (frame box = s px, art drawn at C/1254 * s)
    order = ['idle', 'draw', 'fire', 'hit', 'down']
    for name, bg in [('E_duel_sizes.png', (222, 222, 222)), ('F_dark_background.png', (12, 6, 24))]:
        sizes = (241, 200, 160)
        c = Image.new('RGB', (len(order) * 300, sum(round(z * C / FRAME) + 24 for z in sizes)), bg)
        d = ImageDraw.Draw(c)
        y = 0
        for z in sizes:
            r = round(z * C / FRAME)
            for i, slot in enumerate(order):
                im = staged[slot].resize((r, r), Image.Resampling.LANCZOS)
                c.paste(im, (i * 300 + (300 - r) // 2, y + 24), im)
                d.text((i * 300 + 6, y + 6), f'{slot} {z}px', fill=(128, 128, 128))
            y += r + 24
        c.save(OUT / name)
        sheets.append(name)

    after = protected()
    out = {'records': rec, 'continuity': table, 'sheets': sheets, 'production_unchanged': before == after}
    (OUT / 'p04_poses.json').write_text(json.dumps(out, indent=2) + '\n')
    for k, v in rec.items():
        if k != 'idle':
            print(k, v['checks'], 'hat_ratio', v['hat_ratio_vs_idle'], 'scale', v['uniform_scale'], 'clipped', v['clipped_at_canvas_edge'])
    for t in table:
        print(t)
    print('production_unchanged', before == after)


if __name__ == '__main__':
    main()
