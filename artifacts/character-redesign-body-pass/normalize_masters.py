"""PHASE 1 normalization of the 7 locked identity masters. Writes only to ./normalized/.

Scale comes from manual rigid-body anchors (no alpha bbox). Allowed: uniform downscale, X/Y translation,
symmetric transparent canvas expansion. No upscale, crop, warp or repaint.

Frame convention: the production 1254x1254 canvas is the reference "frame". A normalized file is a square
canvas C = 1254 + 2*pad with the frame centered in it. Rendered with contentFit=contain in a square box,
the body matches production size only if the runtime box is multiplied by C/1254 (RUNTIME_BOX_SCALE).
"""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
INTAKE, OUT = HERE / 'intake', HERE / 'normalized'
FRAME, MARGIN = 1254, 8

# Manual anchors (source px) read from 50px-grid views. feet: (x, sole_y) or None when not physically present.
A = {
    'P04': dict(file='P04_GHOST_GUNSLINGER', prod='player/04', method='chin_to_ground',
        prod_a=dict(head_top=20, chin=200, sh_l=(386, 330), sh_r=(750, 330), belt=(650, 521), foot_l=(450, 1200), foot_r=(843, 1190), ground=1211),
        new_a=dict(head_top=20, chin=215, sh_l=(521, 343), sh_r=(936, 343), belt=(750, 507), foot_l=(579, 1240), foot_r=None, ground=1242),
        note='spectral right leg dissolves; ground = remaining physical (left) boot'),
    'NPC15': dict(file='NPC15_SHADOW_HUNTER', prod='npc/15', method='belt_to_ground',
        prod_a=dict(head_top=16, chin=230, sh_l=(393, 330), sh_r=(857, 330), belt=(620, 530), foot_l=(486, 1180), foot_r=(871, 1170), ground=1185),
        new_a=dict(head_top=57, chin=350, sh_l=(593, 429), sh_r=(964, 400), belt=(821, 571), foot_l=(736, 1240), foot_r=(907, 1229), ground=1246),
        note='hunched: legs (belt->ground) used so the crouch is not scaled away; shadow cloak excluded'),
    'NPC19': dict(file='NPC19_VOID_WALKER', prod='npc/19', method='chin_to_ground',
        prod_a=dict(head_top=14, chin=214, sh_l=(414, 343), sh_r=(843, 343), belt=(657, 521), foot_l=(440, 1205), foot_r=(840, 1200), ground=1211),
        new_a=dict(head_top=29, chin=243, sh_l=(664, 400), sh_r=(1007, 400), belt=(870, 536), foot_l=(650, 1240), foot_r=(1093, 1226), ground=1247),
        note='fragments excluded; black-hole head bottom used as chin'),
    'NPC20': dict(file='NPC20_ECHO_PHANTOM', prod='npc/20', method='chin_to_ground',
        prod_a=dict(head_top=11, chin=236, sh_l=(400, 357), sh_r=(843, 357), belt=(643, 507), foot_l=(430, 1205), foot_r=(830, 1205), ground=1214),
        new_a=dict(head_top=36, chin=300, sh_l=(764, 371), sh_r=(993, 400), belt=(864, 550), foot_l=(721, 1240), foot_r=None, ground=1240),
        note='main body only; echoes excluded; rear foot hidden by echo cloth'),
    'NPC09': dict(file='NPC09_GOLDEN_SKULL', prod='npc/09', method='chin_to_ground',
        prod_a=dict(head_top=14, chin=229, sh_l=(400, 307), sh_r=(829, 307), belt=(707, 507), foot_l=(480, 1215), foot_r=(860, 1210), ground=1221),
        new_a=dict(head_top=8, chin=207, sh_l=(579, 200), sh_r=(1036, 200), belt=(886, 464), foot_l=(686, 1243), foot_r=(1093, 1235), ground=1245),
        note='pauldron width kept as boss mass (not matched to production shoulder width)'),
    'NPC18': dict(file='NPC18_RED_EYE_ORACLE', prod='npc/18', method='chin_to_ground',
        prod_a=dict(head_top=11, chin=236, sh_l=(364, 300), sh_r=(857, 300), belt=(657, 536), foot_l=(460, 1200), foot_r=(850, 1195), ground=1207),
        new_a=dict(head_top=86, chin=264, sh_l=(693, 329), sh_r=(1021, 329), belt=(879, 521), foot_l=(650, 1236), foot_r=(1050, 1229), ground=1238),
        note='halo and raised gun excluded; hat crown used as head_top'),
    'NPC22': dict(file='NPC22_PALE_RIDER', prod='npc/22', method='chin_to_ground',
        prod_a=dict(head_top=14, chin=229, sh_l=(429, 271), sh_r=(800, 271), belt=(743, 486), foot_l=(480, 1225), foot_r=(880, 1215), ground=1231),
        new_a=dict(head_top=29, chin=250, sh_l=(664, 414), sh_r=(1021, 414), belt=(929, 521), foot_l=(693, 1240), foot_r=(1021, 1229), ground=1245),
        note='horse skull and trailing cape excluded'),
}
ORDER = list(A)


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def span(a, method):
    return a['ground'] - (a['chin'] if method == 'chin_to_ground' else a['belt'][1])


def transform(id_):
    c = A[id_]
    p, n = c['prod_a'], c['new_a']
    wanted = span(p, c['method']) / span(n, c['method'])
    s = min(wanted, 1.0)
    # align ground and belt-centre x to the production frame
    dx = p['belt'][0] - s * n['belt'][0]
    dy = p['ground'] - s * n['ground']
    return wanted, s, dx, dy


def tp(pt, s, dx, dy, pad=0):
    return (pt[0] * s + dx + pad, pt[1] * s + dy + pad)


def build():
    OUT.mkdir(exist_ok=True)
    prod_hash_before = {k: sha(ROOT / 'assets/images/characters/clarity' / A[k]['prod'] / 'idle.png') for k in ORDER}
    rec = {}
    for id_ in ORDER:
        c = A[id_]
        src = Image.open(INTAKE / f"{c['file']}.png").convert('RGBA')
        wanted, s, dx, dy = transform(id_)
        im = src.resize((round(src.width * s), round(src.height * s)), Image.Resampling.LANCZOS) if s < 1 else src
        bb = im.getchannel('A').point(lambda v: 255 if v > 0 else 0).getbbox()
        x0, y0 = bb[0] + dx, bb[1] + dy
        x1, y1 = bb[2] + dx, bb[3] + dy
        need = max(0, -x0, -y0, x1 - FRAME, y1 - FRAME)
        pad = int(need + MARGIN) if need > 0 else 0
        C = FRAME + 2 * pad
        canvas = Image.new('RGBA', (C, C), (0, 0, 0, 0))
        ox, oy = round(dx + pad), round(dy + pad)
        canvas.alpha_composite(im, (ox, oy))
        out = OUT / f"{c['file']}_normalized.png"
        canvas.save(out, optimize=True)
        a = canvas.getchannel('A')
        ob = a.point(lambda v: 255 if v > 0 else 0).getbbox()
        rec[id_] = {
            'source': str((INTAKE / f"{c['file']}.png").relative_to(ROOT)), 'source_sha256': sha(INTAKE / f"{c['file']}.png"),
            'output': str(out.relative_to(ROOT)), 'output_sha256': sha(out),
            'reference_production_asset': f"assets/images/characters/clarity/{c['prod']}/idle.png",
            'scale_method': c['method'], 'anchor_note': c['note'],
            'source_size': list(src.size), 'output_size': [C, C],
            'uniform_scale_wanted': round(wanted, 4), 'uniform_scale': round(s, 4), 'upscale_clamped': wanted > 1,
            'translate_x_in_frame': ox - pad, 'translate_y_in_frame': oy - pad,
            'translate_x_in_canvas': ox, 'translate_y_in_canvas': oy,
            'canvas_expanded': pad > 0, 'pad_each_side': pad, 'frame_offset_in_canvas': [pad, pad],
            'runtime_box_scale_to_keep_body_size': round(C / FRAME, 4),
            'ground_y_in_frame': A[id_]['prod_a']['ground'], 'ground_y_in_canvas': A[id_]['prod_a']['ground'] + pad,
            'output_alpha_bbox': list(ob), 'output_edge_margin_min': min(ob[0], ob[1], C - ob[2], C - ob[3]),
            'prod_anchors': c['prod_a'], 'new_anchors_source': c['new_a'],
            'new_anchors_in_frame': {k: (tp(v, s, ox - pad, oy - pad) if isinstance(v, tuple) else
                                         (v * s + oy - pad if isinstance(v, (int, float)) else None))
                                     for k, v in c['new_a'].items()},
        }
    prod_hash_after = {k: sha(ROOT / 'assets/images/characters/clarity' / A[k]['prod'] / 'idle.png') for k in ORDER}
    (OUT / 'transforms.json').write_text(json.dumps({'frame': FRAME, 'records': rec,
        'production_unchanged': prod_hash_before == prod_hash_after}, indent=2, ensure_ascii=False) + '\n')
    return rec, prod_hash_before == prod_hash_after


# ---------- review sheets ----------
DARK, LIGHT = (40, 40, 40), (222, 222, 222)


def frame_view(id_, rec, box, normalized=True):
    """Render so the production frame maps to box x box (runtime-compensated view)."""
    if not normalized:
        im = Image.open(ROOT / f"assets/images/characters/clarity/{A[id_]['prod']}/idle.png").convert('RGBA')
        return im.resize((box, box), Image.Resampling.LANCZOS), 0
    r = rec[id_]
    im = Image.open(ROOT / r['output']).convert('RGBA')
    k = box / FRAME
    size = round(r['output_size'][0] * k)
    return im.resize((size, size), Image.Resampling.LANCZOS), round(r['pad_each_side'] * k)


def raw_contain(path, box):
    im = Image.open(path).convert('RGBA')
    return im.resize((box, box), Image.Resampling.LANCZOS)


def sheet(cells, cols, cw, ch, bg, name, label_h=24):
    rows = (len(cells) + cols - 1) // cols
    fg = (20, 20, 20) if bg == LIGHT else (235, 235, 235)
    c = Image.new('RGBA', (cols * cw, rows * (ch + label_h)), bg + (255,))
    d = ImageDraw.Draw(c)
    for i, (label, img, off, lines) in enumerate(cells):
        x, y = (i % cols) * cw, (i // cols) * (ch + label_h)
        d.text((x + 6, y + 6), label, fill=fg)
        # frame (img minus pad) sits bottom-centre in the cell; pad overflow is clipped by the cell
        box = img.width - 2 * off
        fx, fy = (cw - box) // 2, ch - box
        cell = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
        cell.paste(img, (fx - off, fy - off), img)
        c.alpha_composite(cell, (x, y + label_h))
        for (yy, col) in lines or []:
            d.line([(x, y + label_h + fy + yy), (x + cw, y + label_h + fy + yy)], fill=col, width=1)
    c.convert('RGB').save(OUT / name)
    return name


def sheets(rec):
    names = []
    for bg, tag in [(DARK, 'dark'), (LIGHT, 'light')]:
        cells = []
        for id_ in ORDER:
            p, _ = frame_view(id_, rec, 300, normalized=False)
            n, off = frame_view(id_, rec, 300)
            cells += [(f'{id_} CURRENT production', p, 0, None), (f'{id_} NORMALIZED (box x{rec[id_]["runtime_box_scale_to_keep_body_size"]})', n, off, None)]
        names.append(sheet(cells, 4, 360, 330, bg, f'A_current_vs_normalized_{tag}.png'))
        names.append(sheet([(id_, *frame_view(id_, rec, 300), None) for id_ in ORDER], 7, 340, 330, bg, f'B_normalized_lineup_{tag}.png'))
        # C/D: compensated (runtime box scaled) and raw contain (no runtime change)
        names.append(sheet([(f'{id_} 256 comp', *frame_view(id_, rec, 256), None) for id_ in ORDER]
                           + [(f'{id_} 256 raw', raw_contain(ROOT / rec[id_]['output'], 256), 0, None) for id_ in ORDER],
                           7, 300, 290, bg, f'C_select256_{tag}.png'))
        cells = [(f'{id_} {s}px comp', *frame_view(id_, rec, s), None) for s in (241, 200, 160) for id_ in ORDER]
        cells += [(f'{id_} 160 raw', raw_contain(ROOT / rec[id_]['output'], 160), 0, None) for id_ in ORDER]
        names.append(sheet(cells, 7, 290, 275, bg, f'D_duel_241_200_160_{tag}.png'))
    # E: alignment guide — production ghost + normalized, lines at production head/chin/belt/ground (frame scale 0.45)
    k = 0.45
    cells = []
    for id_ in ORDER:
        p, _ = frame_view(id_, rec, round(FRAME * k), normalized=False)
        p.putalpha(p.getchannel('A').point(lambda v: v * 0.35))
        n, off = frame_view(id_, rec, round(FRAME * k))
        comp = Image.new('RGBA', n.size, (0, 0, 0, 0))
        comp.alpha_composite(n)
        comp.alpha_composite(p, (off, off))
        pa = A[id_]['prod_a']
        lines = [(round(pa['head_top'] * k), (0, 140, 255)), (round(pa['chin'] * k), (0, 200, 120)),
                 (round(pa['belt'][1] * k), (255, 170, 0)), (round(pa['ground'] * k), (255, 40, 40))]
        cells.append((f'{id_} blue=head green=chin orange=belt red=ground (prod)', comp, off, lines))
    names.append(sheet(cells, 4, 640, 600, LIGHT, 'E_alignment_guide.png'))
    # F: before (raw intake on its own canvas) vs after (normalized, frame view)
    cells = []
    for id_ in ORDER:
        before = Image.open(INTAKE / f"{A[id_]['file']}.png").convert('RGBA').resize((300, 300), Image.Resampling.LANCZOS)
        cells += [(f'{id_} BEFORE (intake)', before, 0, None), (f'{id_} AFTER (frame view)', *frame_view(id_, rec, 300), None)]
    names.append(sheet(cells, 4, 360, 330, DARK, 'F_before_after.png'))
    return names


if __name__ == '__main__':
    rec, unchanged = build()
    names = sheets(rec)
    for k, r in rec.items():
        print(k, 'scale', r['uniform_scale'], '(wanted', r['uniform_scale_wanted'], ') t', r['translate_x_in_frame'], r['translate_y_in_frame'],
              'canvas', r['output_size'], 'pad', r['pad_each_side'], 'box x', r['runtime_box_scale_to_keep_body_size'], 'margin', r['output_edge_margin_min'])
    print('sheets', names)
    print('production_unchanged', unchanged)
