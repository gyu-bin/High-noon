"""Compose evidence from native Simulator captures; never edits production art."""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / 'artifacts/combat-v3-simulator'


def sheet(name, frames, width=280):
    opened = [(label, Image.open(OUT / filename).convert('RGB')) for label, filename in frames]
    height = round(opened[0][1].height * width / opened[0][1].width)
    canvas = Image.new('RGB', (width * len(frames), height + 38), '#170e09')
    draw = ImageDraw.Draw(canvas)
    for i, (label, image) in enumerate(opened):
        draw.text((i * width + 12, 12), label, fill='#ffe6bd')
        canvas.paste(image.resize((width, height), Image.Resampling.LANCZOS), (i * width, 38))
    canvas.save(OUT / name)


sheet('scale-comparison.png', [(s + 'x', 'scale-' + s + '.png') for s in ['1.2', '1.25', '1.3']], 360)
sheet('npc-final-sequence.png', [(s, f'npc-final-{t}.png') for s, t in
                                [('HIT', 0), ('STAGGER', 200), ('KNEEL', 500), ('FALL', 800), ('DOWN', 1100)]])
sheet('player-final-sequence.png', [(s, f'player-final-{t}.png') for s, t in
                                   [('IMPACT', 0), ('LOSE GRIP', 200), ('COLLAPSE', 500), ('GROUND POV', 1100), ('DEFEAT', 1600)]])
sheet('six-scenarios.png', [(s, s + '-' + str(t) + '.png') for s, t in
                          [('npc-nonfinal', 600), ('npc-final', 1100), ('player-nonfinal', 500),
                           ('player-final', 1600), ('ranked-nonfinal', 600), ('ranked-final', 1100)]], 240)
