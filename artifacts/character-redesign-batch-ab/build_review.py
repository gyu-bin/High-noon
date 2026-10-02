"""Batch A+B identity-master candidate review. Read-only for production; writes evidence here."""
from pathlib import Path
import json, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
CAND = OUT / 'candidates'

# Mapping by visual feature (see report). The chat message listed uploads 1-4 as
# P04/NPC15/NPC19/NPC20, but the images themselves read as shadow/void/echo/echo.
TARGETS = [
    ('P04', '망령 사수', 'player/04', 3),
    ('NPC15', '그림자 사냥꾼', 'npc/15', 1),
    ('NPC19', '보이드 워커', 'npc/19', 2),
    ('NPC20', '에코 팬텀', 'npc/20', 4),
    ('NPC09', '황금 해골', 'npc/09', 5),
    ('NPC18', '레드 아이 오라클', 'npc/18', 6),
    ('NPC22', '창백한 기수', 'npc/22', 7),
]
STATED_ORDER = {1: 'P04', 2: 'NPC15', 3: 'NPC19', 4: 'NPC20', 5: 'NPC09', 6: 'NPC18', 7: 'NPC22'}
DARK, LIGHT = (40, 40, 40), (222, 222, 222)


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def body_extent(img):
    """Hat top / boot bottom from the solid core (alpha>220), ignoring thin wisps."""
    a = np.array(img.getchannel('A'))
    solid = a > 220
    rows = solid.sum(1)
    ys = np.where(rows > 30)[0]
    top = int(ys.min())
    # boot: lowest row whose solid run is boot-wide and sits near the body's centre column
    cols = np.where(solid[top:top + 120].any(0))[0]
    hat_cx = int((cols.min() + cols.max()) / 2)
    bottom = top
    for y in range(a.shape[0] - 1, top, -1):
        xs = np.where(solid[y])[0]
        if len(xs) >= 40 and abs(np.median(xs) - hat_cx) < 260:
            bottom = y
            break
    return top, bottom, hat_cx


def quality(img):
    arr = np.array(img).astype(int)
    a = arr[..., 3]
    rgb = arr[..., :3]
    lum = rgb.mean(-1)
    semi = (a > 16) & (a < 200)
    edge = np.array(img.getchannel('A').filter(ImageFilter.FIND_EDGES)) > 40
    fringe = edge & (a > 16)
    red = (rgb[..., 0] > rgb[..., 1] + 45) & (rgb[..., 0] > rgb[..., 2] + 45) & (rgb[..., 0] > 120)
    h, w = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    gray = np.array(img.convert('L')).astype(float)
    lap = gray[1:-1, 1:-1] * 4 - gray[:-2, 1:-1] - gray[2:, 1:-1] - gray[1:-1, :-2] - gray[1:-1, 2:]
    mask = a[1:-1, 1:-1] > 200
    return {
        'canvas': [w, h], 'mode': img.mode,
        'alpha_zero_pct': round(float((a == 0).mean() * 100), 1),
        'alpha_partial_pct': round(float(((a > 0) & (a < 255)).mean() * 100), 1),
        'true_alpha': bool((a == 0).mean() > 0.2),
        'bbox_alpha_gt24': list(Image.fromarray((a > 24).astype(np.uint8) * 255).getbbox()),
        'canvas_edge_pixels_alpha_gt24': int((border > 24).sum()),
        'fringe_white_pct': round(float((fringe & (lum > 215)).sum() / max(fringe.sum(), 1) * 100), 2),
        'fringe_black_matte_pct': round(float((fringe & (lum < 12) & (a < 200)).sum() / max(fringe.sum(), 1) * 100), 2),
        'semi_alpha_white_px': int((semi & (lum > 230)).sum()),
        'red_orange_fringe_pct': round(float((fringe & red).sum() / max(fringe.sum(), 1) * 100), 2),
        'sharpness_laplacian_var': round(float(lap[mask].var()), 1),
    }


def load(p):
    return Image.open(p).convert('RGBA')


rows = []
for id_, ko, folder, up in TARGETS:
    prod_p = ROOT / 'assets/images/characters/clarity' / folder / 'idle.png'
    cand_p = CAND / f'upload_{up}.webp'
    prod, cand = load(prod_p), load(cand_p)
    pt, pb, pcx = body_extent(prod)
    ct, cb, ccx = body_extent(cand)
    scale = (pb - pt) / (cb - ct)
    q = quality(cand)
    bx = q['bbox_alpha_gt24']
    # placement on 1254 canvas: boot bottom -> production boot bottom, hat centre -> production hat centre
    s = min(scale, 1.0)
    dx, dy = pcx - ccx * s, pb - cb * s
    placed = [bx[0] * s + dx, bx[1] * s + dy, bx[2] * s + dx, bx[3] * s + dy]
    rows.append({
        'id': id_, 'ko_name': ko, 'upload_index': up, 'stated_order_label': STATED_ORDER[up],
        'candidate_path': str(cand_p.relative_to(ROOT)), 'candidate_sha256': sha(cand_p),
        'production_idle': str(prod_p.relative_to(ROOT)), 'production_sha256': sha(prod_p),
        'production_resolution': list(prod.size),
        'production_body': {'hat_top': pt, 'boot_bottom': pb, 'height': pb - pt, 'hat_cx': pcx},
        'candidate_body': {'hat_top': ct, 'boot_bottom': cb, 'height': cb - ct, 'hat_cx': ccx},
        'quality': q,
        'normalization': {
            'uniform_scale_to_match_body_height': round(scale, 4),
            'requires_upscale': scale > 1.0,
            'applied_scale_if_no_upscale': round(s, 4),
            'translate_xy': [round(dx, 1), round(dy, 1)],
            'placed_bbox_on_1254': [round(v) for v in placed],
            'clips_1254_canvas': placed[0] < 0 or placed[1] < 0 or placed[2] > 1254 or placed[3] > 1254,
        },
    })
(OUT / 'candidate_review.json').write_text(json.dumps(rows, indent=2, ensure_ascii=False) + '\n')


def fit(img, box, crop=True):
    if crop:
        img = img.crop(img.getchannel('A').point(lambda v: 255 if v > 24 else 0).getbbox())
    r = min(box[0] / img.width, box[1] / img.height)
    return img.resize((max(1, round(img.width * r)), max(1, round(img.height * r))), Image.Resampling.LANCZOS)


def panel(cells, cols, cw, ch, bg, name, label_h=30):
    n = len(cells)
    rws = (n + cols - 1) // cols
    fg = (20, 20, 20) if bg == LIGHT else (235, 235, 235)
    c = Image.new('RGB', (cols * cw, rws * (ch + label_h)), bg)
    d = ImageDraw.Draw(c)
    for i, (label, img) in enumerate(cells):
        x, y = (i % cols) * cw, (i // cols) * (ch + label_h)
        d.text((x + 8, y + 8), label, fill=fg)
        if img is not None:
            c.paste(img, (x + (cw - img.width) // 2, y + label_h + ch - img.height), img)
    c.save(OUT / name)
    return name


sheets = []
cands = {r['id']: load(ROOT / r['candidate_path']) for r in rows}
prods = {r['id']: load(ROOT / r['production_idle']) for r in rows}
for bg, tag in [(DARK, 'dark'), (LIGHT, 'light')]:
    # A. current vs new, on original canvas (no crop) so scale difference is visible
    cells = []
    for r in rows:
        cells.append((f"{r['id']} CURRENT idle 1254", fit(prods[r['id']], (300, 300), crop=False)))
        cells.append((f"{r['id']} NEW upload#{r['upload_index']} {r['quality']['canvas'][0]}x{r['quality']['canvas'][1]}", fit(cands[r['id']], (300, 300), crop=False)))
    sheets.append(panel(cells, 4, 330, 310, bg, f'A_current_vs_new_{tag}.png'))
    # B. new lineup (cropped to alpha bbox, same height)
    sheets.append(panel([(f"{r['id']} {r['ko_name']}", fit(cands[r['id']], (300, 420))) for r in rows], 7, 320, 430, bg, f'B_new_lineup_{tag}.png'))
    # D/E. small sizes on original canvas (game renders the square canvas)
    sheets.append(panel([(r['id'], fit(cands[r['id']], (256, 256), crop=False)) for r in rows], 7, 270, 260, bg, f'D_small_npc_select256_{tag}.png', 22))
    sheets.append(panel([(r['id'], fit(cands[r['id']], (241, 241), crop=False)) for r in rows], 7, 255, 245, bg, f'E_small_duel241_{tag}.png', 22))
    sheets.append(panel([(r['id'], fit(cands[r['id']], (160, 160), crop=False)) for r in rows], 7, 170, 165, bg, f'E_small_stress160_{tag}.png', 22))


def silhouette(img, thr):
    a = img.getchannel('A').point(lambda v: 255 if v > thr else 0)
    s = Image.new('RGBA', img.size, (15, 15, 15, 255))
    s.putalpha(a)
    return s


# C. silhouettes: every alpha (effects included) and solid core only (alpha>235)
cells = [(f"{r['id']} all alpha>24", fit(silhouette(cands[r['id']], 24), (300, 400))) for r in rows]
cells += [(f"{r['id']} solid core >235", fit(silhouette(cands[r['id']], 235), (300, 400))) for r in rows]
sheets.append(panel(cells, 7, 320, 410, LIGHT, 'C_new_silhouette.png'))

# C2. body-core overlay: align hat-top/boot to one height; overlap = shared template
H = 900
over = np.zeros((H + 60, 900, 3), float)
colors = [(230, 60, 60), (60, 160, 230), (140, 90, 220), (60, 200, 120), (230, 170, 40), (220, 60, 170), (120, 120, 120)]
overlay_cells = []
acc = []
for (r, col) in zip(rows, colors):
    img = cands[r['id']]
    b = r['candidate_body']
    k = H / b['height']
    im = img.resize((round(img.width * k), round(img.height * k)), Image.Resampling.LANCZOS)
    a = (np.array(im.getchannel('A')) > 235).astype(float)
    ox = 450 - round(b['hat_cx'] * k)
    oy = 30 - round(b['hat_top'] * k)
    m = np.zeros((H + 60, 900))
    ys, xs = np.nonzero(a)
    ys2, xs2 = ys + oy, xs + ox
    ok = (ys2 >= 0) & (ys2 < H + 60) & (xs2 >= 0) & (xs2 < 900)
    m[ys2[ok], xs2[ok]] = 1
    acc.append(m)
stack = np.stack(acc)
count = stack.sum(0)
vis = np.full((H + 60, 900, 3), 250.0)
for m, col in zip(acc, colors):
    edge = m - np.array(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) / 255
    vis[edge > 0.5] = col
heat = Image.fromarray((255 - np.clip(count / len(rows), 0, 1) * 200).astype(np.uint8))
overlay = Image.merge('RGB', [heat] * 3)
ov = np.array(overlay).astype(float)
edge_any = (vis != 250).any(-1)
ov[edge_any] = vis[edge_any]
Image.fromarray(ov.astype(np.uint8)).save(OUT / 'C_body_core_overlay.png')
sheets.append('C_body_core_overlay.png')
# pairwise IoU of solid cores after body alignment
ids = [r['id'] for r in rows]
iou = {f'{ids[i]}~{ids[j]}': round(float((stack[i] * stack[j]).sum() / np.maximum(stack[i], stack[j]).sum()), 3)
       for i in range(len(ids)) for j in range(i + 1, len(ids))}
(OUT / 'silhouette_core_iou.json').write_text(json.dumps(iou, indent=2) + '\n')
print(json.dumps({'sheets': sheets, 'iou_core': iou}, indent=1))
for r in rows:
    print(r['id'], 'up', r['upload_index'], r['candidate_body'], r['production_body'], r['normalization'], r['quality'])
