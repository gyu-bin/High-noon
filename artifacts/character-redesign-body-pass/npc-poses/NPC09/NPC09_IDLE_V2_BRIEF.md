# NPC09 IDLE V2 brief (2026-10-01): identity re-locked to the pose set (decision A)

The official NPC09 design is now the DRAW/FIRE/HIT/KNEEL/FALL/DOWN set. Those 6 are frozen.
The old idle (`../../intake/NPC09_GOLDEN_SKULL.png`: dark worn gold, lean body, ragged gold-dusted cape) is retired and kept as history.
Only `NPC09_IDLE_V2.png` is to be generated.

## Attach as references
`intake/NPC09_FIRE.png` and `intake/NPC09_DRAW.png`. Do not attach the retired idle.

## Prompt
```
Same exact character as the attached references (HIGH NOON Golden Skull), neutral IDLE pose.
Keep EXACTLY: copper-orange / worn gold palette, the same body thickness and proportions,
the same cowboy hat (size, shape, single gold skull badge), pale long hair, golden skull face with dark
eye sockets, gold ribcage armour, spiked skull pauldrons, skull belt buckle with bullet belt,
lace-pattern cloak edging, knee skull armour, the same boots and spurs, the same two ornate revolvers.
Pose: neutral standing idle, wide grounded stance, weight even, both revolvers held LOW beside the body,
pointing down. Not aiming, not drawing, not firing. Both holster tubes visibly EMPTY. Two revolvers total.
Body as large as the references: hat top near y=40, boot soles near y=1240.
Single character only, one image, 1254x1254 transparent PNG, no background, no floor, no text, no sheet.
```

## After intake
Save it as `intake/NPC09_IDLE_V2.png` (download the PNG) and set the idle anchors in `anchors.json`:
- `chin`: bottom of the skull jaw;
- `ground`: boot sole;
- `x`: skull-buckle centre;
- `rel`: source scale vs the poses, from the buckle-plate width (poses ≈50–60 px).

Then run `build_npc_poses.py NPC09`. Body scale is set from the new idle's chin→ground vs production, and the common canvas is recomputed from all 7 poses. The run produces review sheets A–F and the final verdict.
