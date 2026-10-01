"""Comparison of actual Simulator captures; no synthetic gameplay compositing."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / 'artifacts/duel-background-validation'
targets = ['P04','NPC09','NPC15','NPC18','NPC19','NPC20','NPC22']
backgrounds = ['twilight','canyon','moonlit']
cell_w, cell_h = 260, 600
sheet = Image.new('RGB', (cell_w * 7, cell_h * 3), '#15110e')
draw = ImageDraw.Draw(sheet)
for row, bg in enumerate(backgrounds):
    for col, target in enumerate(targets):
        source = out / 'captures' / f'{bg}-{target}.png'
        im = Image.open(source).convert('RGB')
        im.thumbnail((250, 555), Image.Resampling.LANCZOS)
        x, y = col * cell_w, row * cell_h
        draw.text((x + 8, y + 7), f'{bg.upper()} / {target}', fill='#f0d4aa')
        sheet.paste(im, (x + (cell_w-im.width)//2, y + 30))
sheet.save(out / 'ALL_21_SIMULATOR_COMPARISON.png')
# Larger dark/pale/ghost checks, each remains an actual full-frame screenshot.
detail = Image.new('RGB', (400*3, 920*3), '#15110e')
d = ImageDraw.Draw(detail)
for row, bg in enumerate(backgrounds):
    for col, target in enumerate(['P04','NPC15','NPC22']):
        im = Image.open(out / 'captures' / f'{bg}-{target}.png').convert('RGB')
        im.thumbnail((390, 875), Image.Resampling.LANCZOS)
        x,y=col*400,row*920
        d.text((x+8,y+8),f'{bg.upper()} / {target}',fill='#f0d4aa')
        detail.paste(im,(x+(400-im.width)//2,y+30))
detail.save(out/'GHOST_DARK_PALE_DETAIL.png')
print('21 actual Simulator frames assembled')
