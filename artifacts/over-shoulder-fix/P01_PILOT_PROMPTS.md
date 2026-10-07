# P01 over-shoulder pilot: prompts (2026-10-06)

Source of truth: `OVER_SHOULDER_STAGE_BRIEF.md`. P01 only. One image per request, new chat per image.
Attach ONLY `assets/images/characters/clarity/player/01/idle.png`.
Download each result as PNG and save to `artifacts/over-shoulder-fix/intake/` with the exact filename.

## Common block (paste first in every request)
```
Use the attached image as the ONLY identity reference: HIGH NOON "Nameless Gunslinger".
Keep EXACTLY the same hat, brown long leather coat, red bandana, leather and stitching detail, body proportions,
revolver design, and the same painterly western realism. No new ornaments, no new gun, no costume changes.
Not pixel art.

Over-the-shoulder duel view. Camera behind and slightly above the character's right shoulder, rear three-quarter view.
Canvas 1024x1536. The character is in the RIGHT-BOTTOM foreground: hat top near y=400, the body runs off the
bottom and right edges of the canvas. An unseen opponent stands toward the LEFT-UP / CENTER-UP of the canvas.
The character's head and shoulders are turned toward that opponent.
The gun arm is the character's own arm, continuous from the shoulder (shoulder, elbow, wrist all coherent).

Transparent background with true alpha. Single figure. No background, no floor shadow, no text, no UI,
no hard outline, no orange or red rim light, no glow on the edges, no muzzle flash, no smoke, no projectile.
```

## P01_READY.png
```
READY pose: relaxed but tense pre-draw stance. The revolver hand stays LOW, below the waist, near the holster.
The weapon is not aiming yet. Head turned toward the opponent, shoulders oriented toward the opponent.
```

## P01_AIM.png
```
AIM pose: revolver drawn, gun arm extended toward the opponent, muzzle pointing toward the LEFT-UP / CENTER
opponent lane. The torso reacts naturally to the extended arm. Steady, no recoil.
Keep exactly the same body scale, hat position, shoulder line, crop and camera as a neutral standing pose in this view.
```

## P01_FIRE.png
```
FIRE pose: the same base pose as the aiming pose at the instant of firing. Controlled recoil: the muzzle rises
only slightly and the shoulder absorbs the kick. Everything else stays where it was in the aiming pose.
Keep exactly the same body scale, hat position, shoulder line, crop and camera.
```

## Tip for continuity
Generate READY first. For AIM and FIRE, the idle remains the only identity reference, but state the measured hat
position and shoulder line from the accepted READY in the prompt (I will measure and give you the numbers), so the
three frames line up without chaining images.
