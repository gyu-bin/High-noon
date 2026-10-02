"""PHASE 3B: normalize + review one NPC's combat pose set against its LOCKED identity idle.

    python3 artifacts/character-redesign-body-pass/npc-poses/build_npc_poses.py NPC09

Per character folder <ID>/ holds intake/ (exact filenames) and anchors.json (manual anchors, source px):
  idle  = the locked identity source (artifacts/character-redesign-body-pass/intake/...), never regenerated
  every pose: ground (boot sole / lowest body row; null = auto lowest solid row), x (belt buckle centre for
  standing poses, pelvis centre for fall/down), rel (source pixel scale vs the idle, downscale-only)
Body scale for the whole set = production chin→ground span / idle chin→ground span (never upscaled).
One common square canvas sized from the union of all placed poses (no crop). Production is never written.
"""
from pathlib import Path
import hashlib, json, sys
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
BODY = ROOT / 'artifacts/character-redesign-body-pass'
PROD = ROOT / 'assets/images/characters/clarity'
FRAME, MARGIN = 1254, 8


def rel(p):
    return str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p)


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def protected():
    files = sorted(PROD.glob('*/*/*.png')) + sorted((ROOT / 'assets/images/combat').rglob('*.png'))
    files.append(ROOT / 'assets/images/hidden/pale_rider_locked_silhouette.png')
    return {str(p.relative_to(ROOT)): sha(p) for p in files}


def lowest_solid(img):
    a = np.array(img.getchannel('A')) > 235
    return int(np.where(a.sum(1) > 30)[0].max())


def main(cid):
    cdir = HERE / cid
    cfg = json.loads((cdir / 'anchors.json').read_text())
    intake, out = cdir / 'intake', cdir / 'review'
    stage = ROOT / cfg['stage_dir']
    poses = cfg['poses']  # ordered: slot -> {file, ground, x, rel, [chin]}
    files = {slot: (BODY / p['file'] if slot == 'idle' else intake / p['file']) for slot, p in poses.items()}
    missing = [str(f.name) for f in files.values() if not f.exists()]
    if missing:
        sys.exit(f'STOP: missing exact filenames: {missing}')
    unset = [s for s, p in poses.items() if p.get('x') is None or p.get('rel') is None]
    need = 'belt_y' if cfg.get('scale_method') == 'belt_to_ground' else 'chin'
    if poses['idle'].get(need) is None:
        unset.append('idle.' + need)
    if unset:
        sys.exit(f'STOP: set manual anchors (x, rel) in anchors.json for: {unset}')
    before = protected()
    out.mkdir(parents=True, exist_ok=True)
    stage.mkdir(parents=True, exist_ok=True)

    tr = json.loads((BODY / 'normalized/transforms.json').read_text())['records'][cfg['transforms_key']]
    pa = tr['prod_anchors']
    srcs = {s: Image.open(f).convert('RGBA') for s, f in files.items()}
    # optional lossless horizontal mirror (e.g. a locked idle that faces the wrong way); anchors are given post-mirror
    for s, p in poses.items():
        if p.get('mirror'):
            srcs[s] = srcs[s].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    anc = {s: dict(p, ground=p['ground'] if p.get('ground') is not None else lowest_solid(srcs[s])) for s, p in poses.items()}
    ia = anc['idle']
    # chin_to_ground (default) or belt_to_ground (hunched bodies, e.g. NPC15): same method as PHASE 1
    if cfg.get('scale_method') == 'belt_to_ground':
        wanted = (pa['ground'] - pa['belt'][1]) / ((ia['ground'] - ia['belt_y']) * ia['rel'])
    else:
        wanted = (pa['ground'] - pa['chin']) / ((ia['ground'] - ia['chin']) * ia['rel'])
    s0 = min(wanted, 1.0)

    placed = {}
    for slot, img in srcs.items():
        a = anc[slot]
        sp = s0 * min(a['rel'], 1.0)
        dx, dy = pa['belt'][0] - a['x'] * sp, pa['ground'] - a['ground'] * sp
        bb = img.getchannel('A').getbbox()
        placed[slot] = (dx, dy, sp, [bb[0] * sp + dx, bb[1] * sp + dy, bb[2] * sp + dx, bb[3] * sp + dy])
    u = [min(p[3][0] for p in placed.values()), min(p[3][1] for p in placed.values()),
         max(p[3][2] for p in placed.values()), max(p[3][3] for p in placed.values())]
    pad = int(np.ceil(max(0, -u[0], -u[1], u[2] - FRAME, u[3] - FRAME))) + MARGIN
    C = FRAME + 2 * pad

    staged, rec = {}, {}
    for slot, img in srcs.items():
        dx, dy, sp, _ = placed[slot]
        im = img.resize((round(img.width * sp), round(img.height * sp)), Image.Resampling.LANCZOS) if sp < 1 else img
        canvas = Image.new('RGBA', (C, C), (0, 0, 0, 0))
        canvas.alpha_composite(im, (round(dx + pad), round(dy + pad)))
        dest = stage / f"{cfg['stage_names'][slot]}.png"
        canvas.save(dest, optimize=True)
        staged[slot] = canvas
        ob = canvas.getchannel('A').getbbox()
        a = np.array(img.getchannel('A'))
        border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
        raw = Image.open(files[slot])
        rec[slot] = {'source': rel(files[slot]), 'source_sha256': sha(files[slot]),
                     'format': raw.format, 'mode': raw.mode, 'size': list(raw.size),
                     'true_alpha': bool((a == 0).mean() > 0.15 and a.max() >= 250),
                     'source_edge_touch_px': int((border > 24).sum()), 'anchors': anc[slot],
                     'scale': round(sp, 4), 'staged': rel(dest),
                     'canvas_margin_min': min(ob[0], ob[1], C - ob[2], C - ob[3])}
    meta = {'canvasSize': C, 'frameGroundY': pa['ground'], 'displayScale': round(C / FRAME, 4),
            'pad_each_side': pad, 'body_scale': round(s0, 4), 'body_scale_wanted': round(wanted, 4)}

    order = list(poses)
    box = 330

    def strip(seq, name, sil=False, bg=(40, 40, 40)):
        c = Image.new('RGB', (box * len(seq), box + 26), bg)
        d = ImageDraw.Draw(c)
        gy = round((pa['ground'] + pad) * box / C)
        for i, slot in enumerate(seq):
            im = staged[slot].resize((box, box), Image.Resampling.LANCZOS)
            if sil:
                t = Image.new('RGBA', im.size, (235, 235, 235, 255)); t.putalpha(im.getchannel('A').point(lambda v: 255 if v > 24 else 0)); im = t
            c.paste(im, (i * box, 26), im)
            d.text((i * box + 6, 6), slot.upper(), fill=(235, 235, 235))
            d.line([(i * box, 26 + gy), ((i + 1) * box, 26 + gy)], fill=(255, 60, 60))
            d.rectangle([i * box, 26, (i + 1) * box - 1, 26 + box - 1], outline=(90, 90, 90))
        c.save(out / name)
        return name

    sheets = [strip(['idle', 'draw', 'fire'], 'A_idle_draw_fire.png'), strip(['idle', 'hit', 'idle'], 'B_idle_hit_recover.png'),
              strip([s for s in ['hit', 'kneel', 'fall', 'down'] if s in staged], 'C_defeat_sequence.png'),
              strip(order, 'D_silhouettes.png', sil=True)]
    for name, bg in [('E_duel_sizes.png', (222, 222, 222)), ('F_dark_background.png', (12, 6, 24))]:
        rows = [(z, round(z * C / FRAME)) for z in (241, 200, 160)]
        c = Image.new('RGB', (len(order) * 320, sum(r + 24 for _, r in rows)), bg)
        d = ImageDraw.Draw(c)
        y = 0
        for z, r in rows:
            for i, slot in enumerate(order):
                im = staged[slot].resize((r, r), Image.Resampling.LANCZOS)
                c.paste(im, (i * 320 + (320 - r) // 2, y + 24), im)
                d.text((i * 320 + 6, y + 6), f'{slot} {z}px', fill=(128, 128, 128))
            y += r + 24
        c.save(out / name)
        sheets.append(name)

    after = protected()
    (out / 'result.json').write_text(json.dumps({'metadata': meta, 'records': rec, 'sheets': sheets,
                                                 'protected_unchanged': before == after}, indent=2) + '\n')
    print(json.dumps(meta))
    for k, v in rec.items():
        print(k, v['size'], v['format'], 'alpha', v['true_alpha'], 'edge', v['source_edge_touch_px'], 'scale', v['scale'], 'margin', v['canvas_margin_min'])
    print('protected_unchanged', before == after)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else sys.exit('usage: build_npc_poses.py <ID>'))
