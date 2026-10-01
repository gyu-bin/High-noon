"""Read-only production audit. All writes are derived evidence in this folder."""
from pathlib import Path
import re, json, hashlib, math
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
POSES = ['idle', 'draw', 'fire', 'hit', 'down']


def mapping(filename, symbol):
    source = (ROOT / filename).read_text()
    body = source.split('export const ' + symbol, 1)[1].split('};', 1)[0]
    result = {}
    if symbol.startswith('CLARITY'):
        for id_, block in re.findall(r'(\d+):\s*\{(.*?)\}', body, re.S):
            result[int(id_)] = {pose: path.replace('@/', '') for pose, path in
                               re.findall(r"(idle|draw|fire|hit|down): require\('([^']+)'\)", block)}
    else:
        result = {int(id_): path.replace('@/', '') for id_, path in
                  re.findall(r"(\d+): require\('([^']+)'\)", body)}
    return result


entries = []
for kind, prefix in [('player', 'P'), ('npc', 'N')]:
    poses = mapping('constants/clarityCharacterAssets.ts', 'CLARITY_' + kind.upper() + 'S')
    posters = mapping('constants/posterCharacterAssets.ts', 'POSTER_' + kind.upper() + '_IDENTITIES')
    for id_ in sorted(poses):
        entries.append({'id': f'{prefix}{id_:02}', 'kind': kind, 'number': id_,
                        'poses': poses[id_], 'poster': posters[id_]})


def metrics(path):
    image = Image.open(ROOT / path).convert('RGBA')
    a = image.getchannel('A')
    bbox = a.point(lambda v: 255 if v > 24 else 0).getbbox()
    hist = a.histogram()
    edge = list(a.crop((0, 0, image.width, 1)).getdata()) + list(a.crop((0, image.height - 1, image.width, image.height)).getdata())
    edge += list(a.crop((0, 0, 1, image.height)).getdata()) + list(a.crop((image.width - 1, 0, image.width, image.height)).getdata())
    return {'path': path, 'sha256': hashlib.sha256((ROOT / path).read_bytes()).hexdigest(),
            'dimensions': list(image.size), 'source_mode': Image.open(ROOT / path).mode,
            'bbox_alpha_gt24': bbox, 'visible_height_fraction': (bbox[3]-bbox[1])/image.height,
            'transparent_pixels': hist[0], 'partial_alpha_pixels': sum(hist[1:255]),
            'canvas_edge_alpha_gt24': sum(v > 24 for v in edge)}


files = {path: metrics(path) for e in entries for path in list(e['poses'].values()) + [e['poster']]}
(OUT / 'production_inventory.json').write_text(json.dumps({'entries': entries, 'files': files}, indent=2) + '\n')


def sheet(name, selected, light=False, silhouette=False, source='idle', cell=280, target=220, columns=6, normalize=True):
    bg = '#dedede' if light else '#282828'
    fg = '#191919' if light else '#ededed'
    rows = math.ceil(len(selected)/columns)
    canvas = Image.new('RGB', (columns * cell, rows * (cell + 28)), bg)
    draw = ImageDraw.Draw(canvas)
    for i, e in enumerate(selected):
        path = e['poster'] if source == 'poster' or source == 'select' and e['kind'] == 'npc' else e['poses']['idle' if source == 'select' else source]
        image = Image.open(ROOT / path).convert('RGBA')
        bbox = files[path]['bbox_alpha_gt24']
        if normalize:
            image = image.crop(bbox)
            ratio = min(target/image.height, (cell-16)/image.width)
            image = image.resize((round(image.width*ratio), round(image.height*ratio)), Image.Resampling.LANCZOS)
        else:
            image.thumbnail((target, target), Image.Resampling.LANCZOS)
        if silhouette:
            alpha = image.getchannel('A').point(lambda v: 255 if v > 24 else 0)
            image = Image.new('RGBA', image.size, fg)
            image.putalpha(alpha)
        x, y = (i % columns) * cell, (i // columns) * (cell+28)
        draw.text((x+12, y+8), e['id'] + ' / ' + source + (' / silhouette' if silhouette else ''), fill=fg)
        canvas.paste(image, (x+(cell-image.width)//2, y+cell-image.height), image)
    canvas.save(OUT / (name + ('-light' if light else '-dark') + '.png'))


players = entries[:4]
npcs = entries[4:]
special = [e for e in entries if e['id']=='P04' or e['kind']=='npc' and (e['number'] in [3,6,9,12] or e['number']>=13)]
for light in [False, True]:
    sheet('A-players', players, light, columns=4, cell=400, target=340)
    sheet('B-npc01-11', npcs[:11], light, cell=340, target=280)
    sheet('C-npc12-22', npcs[11:], light, cell=340, target=280)
    sheet('D-boss-special-supernatural', special, light, cell=340, target=280)
    sheet('E-full26-silhouettes', entries, light, silhouette=True, columns=7)
    sheet('select-thumbnails', entries, light, source='select', target=256, cell=280, columns=7, normalize=False)
    sheet('duel-approx241', entries, light, target=241, cell=270, columns=7, normalize=False)
    sheet('duel-thumbnails', entries, light, target=160, cell=190, columns=7, normalize=False)
    sheet('players-original-canvas', players, light, target=340, cell=400, columns=4, normalize=False)
for e in entries:
    # Five currently registered combat poses on original equal canvases.
    sheet('poses-' + e['id'], [e]*5, cell=320, target=280, columns=5, normalize=False)
    # Overwrite derived pose evidence with each distinct pose (never source files).
    canvas = Image.new('RGB', (1600, 348), '#282828')
    draw = ImageDraw.Draw(canvas)
    for i, pose in enumerate(POSES):
        image = Image.open(ROOT / e['poses'][pose]).convert('RGBA')
        image.thumbnail((280,280), Image.Resampling.LANCZOS)
        draw.text((320*i+12,8), e['id'] + ' / ' + pose, fill='#ededed')
        canvas.paste(image, (320*i+(320-image.width)//2,48), image)
    canvas.save(OUT / ('poses-' + e['id'] + '-dark.png'))
print(json.dumps({'characters':len(entries),'production_files':len(files),'dimensions':sorted(set(tuple(f['dimensions']) for f in files.values())),
                 'edge_touch_files':[p for p,f in files.items() if f['canvas_edge_alpha_gt24']]}))
