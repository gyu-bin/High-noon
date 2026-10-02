"""Prepare source previews only. Production PNGs and application code are read-only."""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
targets = [
    ('P04', 'Phantom Sharpshooter', 'assets/images/characters/clarity/player/04/idle.png'),
    ('NPC15', 'Shadow Hunter', 'assets/images/characters/clarity/npc/15/idle.png'),
    ('NPC19', 'Void Walker', 'assets/images/characters/clarity/npc/19/idle.png'),
    ('NPC20', 'Echo Phantom', 'assets/images/characters/clarity/npc/20/idle.png'),
]
protected = [ROOT / p for _,_,p in targets]
protected += [ROOT / 'assets/images/combat/npc/01/fall.png', ROOT / 'assets/images/combat/npc/01/down.png',
              ROOT / 'assets/images/combat/weapons/ground-revolver.png']
before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in protected}
rows=[]
for id_, name, path in targets:
    source=ROOT/path
    with Image.open(source) as im:
        assert im.mode=='RGBA' and im.size==(1254,1254)
        rows.append({'id':id_,'english_name':name,'current_runtime_path':str(source),
                     'high_res_source_path':str(source),'source_resolution':list(im.size),
                     'source_sha256':before[str(source)],'pose':'idle',
                     'source_selection':'current active clarity runtime master; not legacy, poster, rejected or prototype'})
for light in [False,True]:
    bg='#dddddd' if light else '#282828'
    fg='#191919' if light else '#eeeeee'
    cell=450
    sheet=Image.new('RGB',(cell*4,500),bg)
    draw=ImageDraw.Draw(sheet)
    for i,(id_,name,path) in enumerate(targets):
        im=Image.open(ROOT/path).convert('RGBA')
        im.thumbnail((420,420),Image.Resampling.LANCZOS)
        draw.text((i*cell+15,12), id_+' / '+name,fill=fg)
        sheet.paste(im,(i*cell+(cell-im.width)//2,55),im)
    sheet.save(OUT / ('CURRENT_PRODUCTION_REFERENCE_'+('light' if light else 'dark')+'.png'))
assert all(hashlib.sha256(p.read_bytes()).hexdigest()==before[str(p)] for p in protected)
(OUT/'source_references.json').write_text(json.dumps({'status':'BRIEF_ONLY_NO_GENERATION',
    'branch':'dev-2.0','sources':rows,'protected_sha256':before,
    'production_assets_changed':False,'application_code_changed':False},indent=2)+'\n')
print('Four active 1254x1254 references verified. Protected masters unchanged.')
