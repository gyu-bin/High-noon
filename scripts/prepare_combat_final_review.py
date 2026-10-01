"""Preserve delivered art and prepare visual review; never registers production assets.

DOWN candidate 03 normalization is a proposal pending human identity/continuity review.
Only uniform downscale and integer translation are applied to separate outputs.
"""
from pathlib import Path
import hashlib
import json
import shutil

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/combat-pose-review'
CANVAS = 1254


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def preserve(source, destination):
    if destination.exists():
        if digest(source) != digest(destination):
            raise RuntimeError(f'Refusing to overwrite {destination}')
    else:
        shutil.copyfile(source, destination)


def normalized(source, destination, size, xy):
    image = Image.open(source).convert('RGBA')
    # Premultiplication avoids a dark edge during the authorized downscale.
    scaled = image.convert('RGBa').resize((size, size), Image.Resampling.LANCZOS).convert('RGBA')
    result = Image.new('RGBA', (CANVAS, CANVAS))
    result.alpha_composite(scaled, xy)
    result.save(destination)
    return result


def sheet(entries, filename, columns, cell=500):
    rows = (len(entries) + columns - 1) // columns
    result = Image.new('RGB', (columns * cell, rows * (cell + 42)), '#302b27')
    draw = ImageDraw.Draw(result)
    for i, (label, path) in enumerate(entries):
        x, y = (i % columns) * cell, (i // columns) * (cell + 42)
        draw.text((x + 14, y + 12), label, fill='#f3ddba')
        image = Image.open(path).convert('RGBA')
        image.thumbnail((cell, cell), Image.Resampling.LANCZOS)
        result.paste(image, (x, y + 42), image)
    result.save(OUT / filename)


def main():
    approval = OUT / 'final_integration_review.json'
    if approval.exists() and json.loads(approval.read_text()).get('production_registered'):
        raise RuntimeError('Human-approved assets are locked; review preparation must not overwrite them')
    paths = sorted(Path('/Users/mungyubin/Downloads').glob('*08_11*.png'))
    if len(paths) != 4:
        raise RuntimeError(f'Expected four delivered candidates, found {len(paths)}')
    locked = OUT / 'NPC01_FALL_normalized.png'
    locked_hash = digest(locked)
    candidates = []
    for i, source in enumerate(paths, 1):
        destination = OUT / f'NPC01_DOWN_candidate_{i:02d}_generated.png'
        preserve(source, destination)
        candidates.append(destination)
    selected = candidates[2]
    preserve(selected, OUT / 'NPC01_DOWN_generated.png')
    down_path = OUT / 'NPC01_DOWN_normalized.png'
    down = normalized(selected, down_path, 1129, (75, 342))
    gun = OUT / 'PLAYER_GROUND_REVOLVER.png'
    preserve(gun, OUT / 'PLAYER_GROUND_REVOLVER_generated.png')
    gun_path = OUT / 'PLAYER_GROUND_REVOLVER_normalized.png'
    gun_normalized = normalized(gun, gun_path, 1031, (112, 95))
    ref = ROOT / 'assets/images/characters/clarity/npc/01'
    sheet([(f'Candidate {i + 1} / original', path) for i, path in enumerate(candidates)],
          'NPC01_DOWN_candidates.png', 2)
    sheet([('IDLE / production', ref / 'idle.png'), ('HIT / production', ref / 'hit.png'),
           ('KNEEL / production', ref / 'down.png'), ('FALL / LOCKED', locked),
           ('DOWN / proposed candidate 03', down_path)], 'NPC01_final_contact_sheet.png', 5)
    sheet([('READY / production', ROOT / 'assets/images/weapons/cinematic/revolver-ready.png'),
           ('GROUND / uniform downscale', gun_path)], 'REVOLVER_identity_contact_sheet.png', 2)
    fall = Image.open(locked).convert('RGBA')
    overlay = Image.new('RGBA', (CANVAS, CANVAS), '#302b27')
    for frame in (fall, down):
        layer = frame.copy()
        layer.putalpha(layer.getchannel('A').point(lambda a: round(a * .5)))
        overlay.alpha_composite(layer)
    overlay.save(OUT / 'NPC01_FALL_DOWN_overlay.png')
    assert digest(locked) == locked_hash, 'Locked FALL changed'
    bbox = down.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    gun_bbox = gun_normalized.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    record = {
        'status': 'REVIEW_ONLY_PENDING_HUMAN_APPROVAL',
        'fall_sha256': locked_hash,
        'fall_unchanged': True,
        'down_source_candidate': 3,
        'down_scale': 1129 / CANVAS,
        'down_translation': [75, 342],
        'down_bbox': bbox,
        'down_scale_basis': 'Provisional visual hat/belt comparison; human continuity review required',
        'ground_revolver_scale': 1031 / CANVAS,
        'ground_revolver_translation': [112, 95],
        'ground_revolver_bbox': gun_bbox,
        'ground_revolver_width': gun_bbox[2] - gun_bbox[0],
        'operations': 'Uniform downscale, integer translation; originals preserved',
        'source_hashes': {p.name: digest(p) for p in candidates + [gun]},
        'production_registered': False,
    }
    (OUT / 'final_integration_review.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps(record, indent=2))


if __name__ == '__main__':
    main()
