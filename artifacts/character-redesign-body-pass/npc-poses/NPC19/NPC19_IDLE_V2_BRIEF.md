# NPC19 IDLE V2 brief (2026-10-01): identity re-locked to the pose set (decision A)

The official NPC19 design is now the DRAW/FIRE/HIT/KNEEL/FALL/DOWN set; those 6 are frozen. The old idle (`../../intake/NPC19_VOID_WALKER.png`: light blue-grey cloak, bright violet/blue light, oversized cloak) is retired and kept as history in `anchors.json → retired_idle`.

## Attach as references
`intake/NPC19_DRAW.png` and `intake/NPC19_FIRE.png`. Do not attach the retired idle.

## Prompt
```
Same exact character as the attached references (HIGH NOON Void Walker), neutral IDLE pose.
Keep EXACTLY: the black-hole void face with a faint violet rim, the same torn wide-brim hat with the compass-star badge,
the same brown-grey / charcoal quilted tattered duster with the SAME cloak size as the references (not larger),
the starfield and restrained deep-violet nebula visible through the broken, missing body sections,
the dark angular rock fragments floating around the body, the image-right forearm floating detached with a visible
void gap, the compass-medallion belt, the empty tall tube holster, the strapped boots and spurs, the same body
proportions and the same revolver design.
Pose: neutral standing idle, weight even, the single revolver held LOW at the side in the image-left hand, pointing
down. Not aiming, not drawing, not firing. The holster stays EMPTY. Exactly one revolver in total.
Body as large as the references: hat top near y=20, boot soles near y=1240.
Single character only, one image, 1254x1254 transparent PNG, no background, no floor, no text, no sheet.
Transparent margin on all sides.
DO NOT ADD: blue spectral glow, bright blue-grey cloak, an oversized flaring cloak, red eyes, halo, afterimages,
golden skulls, black smoke tendrils, a second gun.
```

## After intake
Save it as `intake/NPC19_IDLE_V2.png` (PNG download, from ~/Downloads/high-noon). Then set the idle anchors in `anchors.json`:
- `chin`: bottom of the black hole
- `ground`: boot sole
- `x`: compass-medallion centre
- `rel`: from the black-hole and badge size vs the poses (downscale-only)

Then run `build_npc_poses.py NPC19`. It re-normalizes all 7 poses and recomputes the common canvas, which should shrink from 1786 once the oversized cloak is gone. That run gives the A–F review and the final verdict, and updates `REDESIGN_ART_META.NPC19`.
