#!/usr/bin/env python3
"""Inventory/audit character PNGs; repair only reviewed opaque, keyed-alpha damage.

Default is read-only. --apply uses the already approved recovery algorithm, with
an explicit reviewed path list and byte-exact backups before canonical updates.
Special/spectral characters and previously approved NPC identities cannot be
written by this tool. Runtime code, registries and visible artwork RGB are untouched.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import qa_npc_identity_alpha as approved

ROOT = Path(__file__).resolve().parents[1]
POSES = ('idle', 'draw', 'fire', 'hit', 'down')
SPECIAL_NPCS = {15, 19, 20, 22}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fast_components(mask, diagonal=False):
    """Run-length connected components, equivalent to the approved flood fill."""
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    parent = [0]
    def root(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i
    previous = []
    for y in range(h):
        padded = np.pad(mask[y].astype(np.int8), (1, 1))
        delta = np.diff(padded)
        starts, ends = np.flatnonzero(delta == 1), np.flatnonzero(delta == -1)
        current = []
        cursor = 0
        for start, end in zip(starts, ends):
            start, end = int(start), int(end)
            index = len(parent); parent.append(index)
            while cursor < len(previous) and previous[cursor][1] < start + (not diagonal):
                cursor += 1
            j = cursor
            while j < len(previous) and previous[j][0] < end + diagonal:
                other = root(previous[j][2]); here = root(index)
                if other != here: parent[here] = other
                j += 1
            labels[y, start:end] = index
            current.append((start, end, index))
        previous = current
    roots = np.array([root(i) for i in range(len(parent))], dtype=np.int32)
    locations = np.flatnonzero(mask)
    if not len(locations): return []
    tags = roots[labels.ravel()[locations]]
    order = np.argsort(tags, kind='stable')
    locations, tags = locations[order], tags[order]
    boundaries = np.flatnonzero(np.diff(tags)) + 1
    return sorted([np.column_stack(np.divmod(part, w)) for part in np.split(locations, boundaries)],
                  key=len, reverse=True)


def inventory():
    items = []
    for kind, ids in [('player', range(1, 5)), ('npc', range(1, 23))]:
        for i in ids:
            special = (kind == 'player' and i == 4) or (kind == 'npc' and i in SPECIAL_NPCS)
            folder = ROOT / f'assets/images/characters/{"player" if kind == "player" else "enemy"}/{i:02}'
            for pose in ('identity', *POSES):
                path = folder / f'{pose}.png'
                if kind == 'npc' and i == 22: path = ROOT / f'assets/images/hidden/pale_rider_{pose}.png'
                previous = kind == 'npc' and pose == 'identity' and i != 1
                if previous: path = path.with_name(path.stem + '_clean.png')
                items.append(dict(path=str(path.relative_to(ROOT)), kind=kind, id=i, pose=pose,
                                  category=f'{kind}_{"identity" if pose == "identity" else "poses"}',
                                  family='canonical256', special=special, previous_approved=previous))
    registry = (ROOT / 'constants/clarityCharacterAssets.ts').read_text()
    blocks = [('player', registry.split('export const CLARITY_PLAYERS')[1].split('export const CLARITY_NPCS')[0]),
              ('npc', registry.split('export const CLARITY_NPCS')[1])]
    for kind, block in blocks:
        for match in re.finditer(r'(\d+):\s*\{([^}]+)\}', block):
            i = int(match[1])
            for pose, path in re.findall(r"(idle|draw|fire|hit|down): require\('@/([^']+)'\)", match[2]):
                items.append(dict(path=path, kind=kind, id=i, pose=pose, category=f'{kind}_poses',
                                  family='active_clarity', special=(kind == 'player' and i == 4) or
                                  (kind == 'npc' and i in SPECIAL_NPCS), previous_approved=False))
    for pose in POSES[:3]:
        items.append(dict(path=f'assets/images/weapons/player_fp/player_fp_revolver_{pose}.png', kind='weapon',
                          id=1, pose=pose, category='first_person', family='canonical_weapon', special=False, previous_approved=False))
    items += [dict(path='assets/images/weapons/cinematic/revolver-ready.png', kind='weapon', id=1, pose='ready',
                   category='first_person', family='active_weapon', special=False, previous_approved=False),
              dict(path='assets/images/hidden/pale_rider_locked_silhouette.png', kind='npc', id=22, pose='locked_silhouette',
                   category='hidden_silhouette', family='canonical256', special=True, previous_approved=False)]
    assert len(items) == len({i['path'] for i in items})
    for family in ('canonical256', 'active_clarity'):
        poses = [i for i in items if i['family'] == family and i['pose'] in POSES]
        assert len(poses) == 130, (family, len(poses))
        assert len({(i['kind'], i['id'], i['pose']) for i in poses}) == 130
    identities = {(i['kind'], i['id']): i['path'] for i in items if i['pose'] == 'identity'}
    for item in items:
        assert (ROOT / item['path']).exists(), item['path']
        item['material_reference'] = identities.get((item['kind'], item['id']))
        item['reference_use'] = 'Visual material/alpha comparison only; never copy silhouette.'
    return items


def weapon_recover(source):
    """RGB-evidence repair with a closure at the known sleeve/canvas crop.

    A sleeve intentionally exits the canvas, so some damaged internal shadows
    touch the border. The closure is only a detection gate between existing
    foreground intersections; retained dark RGB is still required for repair.
    """
    _, restored = approved.recover(source)
    alpha = source[:, :, 3]
    solid = alpha > 0
    support = solid.copy()
    cap = np.zeros_like(solid)
    for axis, index in [(0, 0), (0, -1), (1, 0), (1, -1)]:
        edge = solid[index, :] if axis == 0 else solid[:, index]
        positions = np.flatnonzero(edge)
        if len(positions) < 2:
            continue
        if axis == 0:
            cap[index, positions[0]:positions[-1] + 1] = True
        else:
            cap[positions[0]:positions[-1] + 1, index] = True
    support |= cap
    closed = np.array(Image.fromarray((support * 255).astype('uint8'))
                      .filter(ImageFilter.MaxFilter(3))
                      .filter(ImageFilter.MinFilter(3))) > 0
    for mask in (support, closed):
        for region in fast_components(~mask):
            if approved.touches_border(region, alpha.shape):
                continue
            rgb = source[region[:, 0], region[:, 1], :3]
            if np.mean(rgb.max(1) > 0) >= .65 and rgb.max() <= 96:
                restored[region[:, 0], region[:, 1]] = True
    maximum = source[:, :, :3].max(2)
    restored |= cap & ~solid & (maximum > 0) & (maximum <= 96)
    restored &= ~solid
    result = source.copy()
    result[restored, 3] = 255
    result[result[:, :, 3] == 0, :3] = 0
    assert np.array_equal(source[solid], result[solid])
    return result, restored


def inspect(item):
    path = ROOT / item['path']; image = Image.open(path)
    array = np.array(image.convert('RGBA')); alpha = array[:, :, 3]; rgb = array[:, :, :3]
    holes = [c for c in fast_components(alpha == 0) if not approved.touches_border(c, alpha.shape)]
    islands = fast_components(alpha > 0, diagonal=True)
    binary = not np.any((alpha > 0) & (alpha < 255))
    evidence = 0
    material_evidence = 0
    for region in holes:
        values = rgb[region[:, 0], region[:, 1]]
        if np.mean(values.max(1) > 0) >= .65 and values.max() <= 96:
            evidence += len(region)
            # Values <=12 in the high-resolution pipeline are near-zero residue, not evidence of missing material.
            if values.max() > 12: material_evidence += len(region)
    # No recovery proposal is calculated for already-approved identity derivatives.
    if item['previous_approved']:
        repaired, restored = array, np.zeros(alpha.shape, bool)
    elif item['family'] in ('canonical256', 'canonical_weapon'):
        repaired, restored = weapon_recover(array) if item['family'] == 'canonical_weapon' else approved.recover(array)
    else:
        repaired, restored = array, np.zeros(alpha.shape, bool)
    count = int(restored.sum())
    if item['previous_approved']:
        status, reason = 'PASS', 'Previously human-approved NPC repair preserved byte-for-byte; not reprocessed.'
    elif item['special']:
        status, reason = 'HUMAN_REVIEW_REQUIRED', 'Protected spectral/void character: detector cannot distinguish intended negative space.'
    elif count >= 32 and binary and item['family'] in ('canonical256', 'canonical_weapon'):
        status, reason = 'HUMAN_REVIEW_REQUIRED', 'Opaque keyed-shadow repair candidate; requires reviewed-path allowlist before write.'
    elif count or material_evidence >= 32:
        status, reason = 'HUMAN_REVIEW_REQUIRED', 'Ambiguous alpha evidence; no automatic write.'
    else:
        status, reason = 'PASS', 'No matching keyed-shadow corruption detected; retain alpha, including antialias/translucency.'
    transparent = alpha == 0
    low = (alpha > 0) & (alpha < 64)
    # Measure neighboring visible boundary pixels; do not classify rim light as corruption.
    solid = alpha > 0
    padded = np.pad(solid, 1)
    interior = padded[1:-1, :-2] & padded[1:-1, 2:] & padded[:-2, 1:-1] & padded[2:, 1:-1]
    edge = solid & ~interior
    row = dict(item, status=status, reason=reason, sha256_before=sha(path), dimensions=list(image.size), mode=image.mode,
               alpha_min=int(alpha.min()), alpha_max=int(alpha.max()), fully_transparent=int(transparent.sum()),
               semitransparent=int(((alpha > 0) & (alpha < 255)).sum()), enclosed_hole_regions=len(holes),
               enclosed_hole_pixels=sum(map(len, holes)), retained_dark_rgb_hole_pixels=evidence, material_signal_hole_pixels=material_evidence,
               disconnected_opaque_1_2px_regions=sum(len(c) <= 2 for c in islands[1:]),
               transparent_nonzero_rgb=int((transparent & np.any(rgb != 0, axis=2)).sum()),
               transparent_rgb_peak=int(rgb[transparent].max()) if transparent.any() else 0,
               transparent_neutral_white_rgb_pixels=int((transparent & (rgb.min(2) >= 200)).sum()),
               low_alpha_edge_pixels=int((low & edge).sum()), low_alpha_internal_pixels=int((low & ~edge).sum()),
               candidate_recovery_pixels=count, binary_alpha=bool(binary),
               edge_pixels=int(edge.sum()), alpha_bbox=image.getchannel('A').getbbox() if image.mode == 'RGBA' else None)
    assert image.mode == 'RGBA', path
    return row, array, repaired


def make_review_sheet(items, arrays, output, label):
    cell = 192
    board = Image.new('RGB', (cell * 5, len(items) * (cell + 28)), '#b79262')
    d = ImageDraw.Draw(board)
    for row, item in enumerate(items):
        for col, (caption, array, bg) in enumerate([
            ('original dark', arrays[item['path']][0], '#17120f'),
            ('original paper', arrays[item['path']][0], '#b79262'),
            ('UNCHANGED / review' if item['special'] else 'proposal paper', arrays[item['path']][1], '#b79262'),
            ('UNCHANGED / review' if item['special'] else 'proposal dark', arrays[item['path']][1], '#17120f'),
            ('stored RGB', arrays[item['path']][0], None)]):
            pic = Image.fromarray(array)
            if bg:
                base = Image.new('RGBA', pic.size, bg); base.alpha_composite(pic); pic = base
            else: pic = pic.convert('RGB')
            board.paste(pic.resize((cell, cell), Image.Resampling.NEAREST), (col * cell, row * (cell + 28) + 28))
            d.text((col * cell + 4, row * (cell + 28) + 5), f'{label} {item["pose"]} / {caption}', fill='#24140c')
    board.save(output)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT / 'output/alpha-repair-pass')
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--reviewed-paths', type=Path)
    parser.add_argument('--backup-root', type=Path, default=ROOT / 'artifacts/alpha-repair-v1/originals')
    args = parser.parse_args(); args.output.mkdir(parents=True, exist_ok=True)
    approved.components = fast_components
    reviewed = json.loads(args.reviewed_paths.read_text()) if args.reviewed_paths else {}
    allowed = set(reviewed)
    items = inventory()
    assert allowed <= {i['path'] for i in items}, 'Unknown reviewed path'
    for item in items:
        if item['path'] in allowed:
            assert not item['special'] and not item['previous_approved'], 'Protected source in allowlist'
            assert isinstance(reviewed, dict) and sha(ROOT / item['path']) == reviewed[item['path']], 'Review hash mismatch'
    if args.apply and not allowed: raise SystemExit('--apply requires a visually reviewed allowlist')
    records = []; groups = {}; arrays = {}
    for index, item in enumerate(items):
        row, source, candidate = inspect(item)
        if args.apply and item['path'] in allowed:
            assert not item['special'] and not item['previous_approved'], 'Protected source'
            assert item['family'] in ('canonical256', 'canonical_weapon'), 'Unreviewed pipeline'
            assert row['candidate_recovery_pixels'] >= 32 and row['binary_alpha']
            path = ROOT / item['path']; backup = args.backup_root / item['path']
            if backup.exists():
                if sha(backup) != sha(path): raise SystemExit(f'Refusing to overwrite an existing original backup: {path}')
            else:
                backup.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(path, backup)
            assert sha(backup) == row['sha256_before']
            temporary = args.output / 'verified-repair.tmp.png'
            Image.fromarray(candidate).save(temporary)
            written = np.array(Image.open(temporary)); visible = source[:, :, 3] > 0
            restored = (~visible) & (written[:, :, 3] > 0)
            assert np.array_equal(source[visible], written[visible])
            assert np.array_equal(source[restored, :3], written[restored, :3])
            assert Image.fromarray(written[:, :, 3]).getbbox() == row['alpha_bbox']
            temporary.replace(path)
            row.update(status='REPAIRED', reason='Human-approved conservative method; path visually reviewed, backed up, alpha-only recovery.',
                       backup=str(backup.relative_to(ROOT)), sha256_after=sha(path),
                       original_visible_rgba_changes=0, restored_rgb_changes=0, original_backed_up=True,
                       method='conservative-cropped-sleeve' if item['family'] == 'canonical_weapon' else 'conservative-approved')
        else:
            assert sha(ROOT / item['path']) == row['sha256_before']
        records.append(row)
        if item['family'] in ('canonical256', 'canonical_weapon'):
            # Spectral candidates are NOT presented as an accepted AFTER.
            arrays[item['path']] = (source, source if item['special'] else candidate)
            key = (item['kind'], item['id']); groups.setdefault(key, []).append(item)
        print(f'{index + 1}/291 {row["status"]} {item["path"]} candidates={row["candidate_recovery_pixels"]}', flush=True)
        (args.output / 'audit.json').write_text(json.dumps(records, indent=2))
    for (kind, number), items in groups.items():
        make_review_sheet(items, arrays, args.output / f'review-{kind}-{number:02}.png', f'{kind}{number:02}')
    summary = dict(TOTAL_ASSETS_AUDITED=len(records), ALPHA_PASS=sum(r['status'] == 'PASS' for r in records),
                   ALPHA_REPAIRED=sum(r['status'] == 'REPAIRED' for r in records),
                   HUMAN_REVIEW_REQUIRED=sum(r['status'] == 'HUMAN_REVIEW_REQUIRED' for r in records),
                   canonical_pose_count=130, active_pose_count=130)
    (args.output / 'summary.json').write_text(json.dumps(summary, indent=2)); print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()
