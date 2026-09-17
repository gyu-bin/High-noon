"""Read-only audit of the 130-pose clarity replacement; never edits PNGs."""
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'assets/images/characters/clarity/manifest.json'


def main():
    manifest = json.loads(MANIFEST.read_text())
    rows = manifest['assets']
    assert len(rows) == 130
    assert len({(r['kind'], r['id'], r['pose']) for r in rows}) == 130
    accepted = 0
    candidates = 0
    issues = []
    registered = set(re.findall(r"require\('@/([^']+)'\)", (ROOT / 'constants/clarityCharacterAssets.ts').read_text()))
    expected = {(kind, ident, pose) for kind, count in [('player', 4), ('npc', 22)]
                for ident in range(1, count + 1) for pose in ['idle', 'draw', 'fire', 'hit', 'down']}
    assert {(r['kind'], r['id'], r['pose']) for r in rows} == expected
    for path in registered:
        row = next((r for r in rows if r['path'] == path), None)
        if row is None or row['status'] != 'visual_qa_passed':
            issues.append(f'Unreviewed runtime registration: {path}')
    for kind, count in [('player', 4), ('npc', 22)]:
        for ident in range(1, count + 1):
            used = [r for r in rows if r['kind'] == kind and r['id'] == ident and r['path'] in registered]
            if used and len(used) != 5:
                issues.append(f'Incomplete runtime pose set: {kind} {ident}')
    for row in rows:
        path = ROOT / row['path']
        reviewed = row['status'] == 'visual_qa_passed'
        if not path.is_file():
            if reviewed:
                issues.append(f'Missing accepted asset: {path}')
            continue
        with Image.open(path) as im:
            if im.format != 'PNG' or im.mode != 'RGBA':
                issues.append(f'Not RGBA PNG: {path}')
                continue
            if im.width != im.height or im.width < 1024:
                issues.append(f'Unexpected master size {im.size}: {path}')
            alpha = im.getchannel('A')
            if alpha.getextrema() != (0, 255):
                issues.append(f'Missing transparency/opaque body: {path}')
            # Allow one alpha quantization step (1/255), not visible background content.
            if any(alpha.getpixel(p) > 1 for p in [(0, 0), (im.width - 1, 0), (0, im.height - 1), (im.width - 1, im.height - 1)]):
                issues.append(f'Nontransparent corner: {path}')
        accepted += int(reviewed)
        candidates += int(not reviewed)
    print(f'VISUALLY_REVIEWED={accepted}/130')
    print(f'UNREVIEWED_FILES={candidates}')
    print(f'REGISTERED_POSES={len(registered)}')
    print(f'REMAINING_POSES={130 - accepted}')
    print('RUNTIME_QA=' + manifest['runtimeQA'])
    for issue in issues:
        print('FAIL: ' + issue)
    if issues:
        raise SystemExit(1)
    print('File checks passed. This does not replace visual/gameplay QA.')


if __name__ == '__main__':
    main()
