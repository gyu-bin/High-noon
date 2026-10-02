"""Approved deterministic upscale: preserve originals, no sharpening or distortion."""
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = root / 'artifacts/duel-background-candidates-20261001'
destination = root / 'assets/images/backgrounds'
destination.mkdir(parents=True, exist_ok=True)
for name in ('duel_twilight_town.png', 'duel_dusty_canyon.png', 'duel_moonlit_frontier.png'):
    image = Image.open(source / name).convert('RGB')
    # Cover by uniform scale, then centre crop the <1px aspect mismatch.
    result = ImageOps.fit(image, (1920, 1080), method=Image.Resampling.LANCZOS,
                          centering=(0.5, 0.5))
    result.save(destination / name)
    print(name, image.size, '->', result.size, result.mode)
