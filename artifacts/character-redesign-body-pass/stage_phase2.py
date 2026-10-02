"""PHASE 2 staging: derive staged runtime-shaped assets from the locked normalized masters.

Writes only NEW files under assets/images/characters/staged/redesign-v2/ and evidence under ./phase2/.
Never overwrites production files. No generative work: posters and the locked silhouette are
uniform downscales / alpha thresholds of the normalized masters.
"""
from pathlib import Path
import hashlib, json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
NORM = HERE / 'normalized'
EVID = HERE / 'phase2'
STAGE = ROOT / 'assets/images/characters/staged/redesign-v2'
PROD = ROOT / 'assets/images/characters/clarity'
FRAME = 1254
POSTER_MARGIN = 12
SIL_SIZE, SIL_MARGIN = 256, 2

CHARS = [
    # id, kind, number, normalized file, poster?
    ('P04', 'player', '04', 'P04_GHOST_GUNSLINGER', False),
    ('NPC09', 'npc', '09', 'NPC09_GOLDEN_SKULL', True),
    ('NPC15', 'npc', '15', 'NPC15_SHADOW_HUNTER', True),
    ('NPC18', 'npc', '18', 'NPC18_RED_EYE_ORACLE', True),
    ('NPC19', 'npc', '19', 'NPC19_VOID_WALKER', True),
    ('NPC20', 'npc', '20', 'NPC20_ECHO_PHANTOM', True),
    ('NPC22', 'npc', '22', 'NPC22_PALE_RIDER', True),
]


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def protected():
    files = sorted(PROD.glob('*/*/*.png')) + [ROOT / 'assets/images/hidden/pale_rider_locked_silhouette.png']
    return {str(p.relative_to(ROOT)): sha(p) for p in files}


def fit_square(img, size, margin, bottom_anchor=True):
    """Uniform downscale of the full alpha content into a size x size canvas (no crop)."""
    bb = img.getchannel('A').getbbox()
    content = img.crop(bb)  # trims fully transparent pixels only
    f = min((size - 2 * margin) / content.width, (size - 2 * margin) / content.height, 1.0)
    content = content.resize((max(1, round(content.width * f)), max(1, round(content.height * f))), Image.Resampling.LANCZOS)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    x = (size - content.width) // 2
    y = size - margin - content.height if bottom_anchor else (size - content.height) // 2
    out.alpha_composite(content, (x, y))
    return out, f


def main():
    before = protected()
    transforms = json.loads((NORM / 'transforms.json').read_text())['records']
    EVID.mkdir(exist_ok=True)
    manifest = {}
    for id_, kind, num, name, poster in CHARS:
        src = NORM / f'{name}_normalized.png'
        rec = transforms[id_]
        dest_dir = STAGE / kind / num
        dest_dir.mkdir(parents=True, exist_ok=True)
        idle = dest_dir / 'idle.png'
        img = Image.open(src).convert('RGBA')
        img.save(idle, optimize=True)
        entry = {
            'staged_master': str(idle.relative_to(ROOT)), 'staged_master_sha256': sha(idle),
            'source_normalized': str(src.relative_to(ROOT)), 'source_normalized_sha256': sha(src),
            'canvas_size': img.width, 'display_scale': round(img.width / FRAME, 4),
            'production_idle_unchanged_reference': f'assets/images/characters/clarity/{kind}/{num}/idle.png',
        }
        if poster:
            p_img, f = fit_square(img, FRAME, POSTER_MARGIN)
            p_path = dest_dir / 'identity_poster.png'
            p_img.save(p_path, optimize=True)
            entry.update({'staged_poster': str(p_path.relative_to(ROOT)), 'staged_poster_sha256': sha(p_path),
                          'poster_canvas': FRAME, 'poster_fit_scale_from_normalized': round(f, 4),
                          # normalized canvas px are production-frame px, so f == body size vs current poster
                          'poster_body_size_vs_current_poster': round(f, 4)})
        manifest[id_] = entry

    # NPC22 locked silhouette: alpha threshold of the normalized master, black, binary alpha (current spec)
    pale = Image.open(NORM / 'NPC22_PALE_RIDER_normalized.png').convert('RGBA')
    sil, f = fit_square(pale, SIL_SIZE, SIL_MARGIN)
    a = np.array(sil.getchannel('A'))
    binary = np.where(a >= 128, 255, 0).astype(np.uint8)
    sil = Image.new('RGBA', (SIL_SIZE, SIL_SIZE), (0, 0, 0, 0))
    sil.putalpha(Image.fromarray(binary))
    sil_path = STAGE / 'hidden' / 'pale_rider_locked_silhouette.png'
    sil_path.parent.mkdir(parents=True, exist_ok=True)
    sil.save(sil_path, optimize=True)
    manifest['NPC22_LOCKED_SILHOUETTE'] = {'staged': str(sil_path.relative_to(ROOT)), 'sha256': sha(sil_path),
                                           'size': SIL_SIZE, 'fit_scale': round(f, 5), 'alpha': 'binary 0/255', 'rgb': 'black'}

    # evidence: current vs staged posters and silhouette
    cell = 300
    sheet = Image.new('RGB', (cell * 6, cell * 2 + 40), (222, 222, 222))
    d = ImageDraw.Draw(sheet)
    for i, (id_, kind, num, name, poster) in enumerate([c for c in CHARS if c[4]]):
        cur = Image.open(PROD / kind / num / 'identity_poster.png').convert('RGBA').resize((cell - 20, cell - 20), Image.Resampling.LANCZOS)
        new = Image.open(STAGE / kind / num / 'identity_poster.png').convert('RGBA').resize((cell - 20, cell - 20), Image.Resampling.LANCZOS)
        d.text((i * cell + 8, 4), f'{id_} current / staged (body x{manifest[id_]["poster_body_size_vs_current_poster"]})', fill=(20, 20, 20))
        sheet.paste(cur, (i * cell + 10, 20), cur)
        sheet.paste(new, (i * cell + 10, cell + 30), new)
    sheet.save(EVID / 'posters_current_vs_staged.png')
    s = Image.new('RGB', (560, 300), (190, 170, 140))
    old = Image.open(ROOT / 'assets/images/hidden/pale_rider_locked_silhouette.png').convert('RGBA')
    s.paste(old, (10, 30), old)
    s.paste(sil, (290, 30), sil)
    ImageDraw.Draw(s).text((10, 8), 'current locked silhouette            staged (new NPC22)', fill=(20, 20, 20))
    s.save(EVID / 'pale_rider_locked_silhouette_current_vs_staged.png')

    after = protected()
    out = {'manifest': manifest, 'protected_files_checked': len(before), 'protected_unchanged': before == after}
    (EVID / 'staged_manifest.json').write_text(json.dumps(out, indent=2) + '\n')
    print(json.dumps({k: {kk: v for kk, v in e.items() if 'sha' not in kk} for k, e in manifest.items()}, indent=1))
    print('protected files', len(before), 'unchanged', before == after)


if __name__ == '__main__':
    main()
