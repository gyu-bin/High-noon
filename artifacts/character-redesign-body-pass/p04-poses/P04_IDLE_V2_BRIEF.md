# P04 IDLE V2 brief (2026-10-01): identity re-locked to the pose set (decision B)

The official P04 design is now the DRAW/FIRE/HIT/KNEEL set. Only `P04_IDLE_V2.png` is to be generated. The 4 poses are frozen.
The old locked idle (`../intake/P04_GHOST_GUNSLINGER.png`: ammo belt, square buckle, cross pendant, thin pale mist, dry duster) is retired. It is kept on disk as history.

## Attach as references (both)
`intake/P04_FIRE.png` and `intake/P04_HIT.png` (same costume; HIT shows the neutral standing posture).

## Prompt
```
Same exact character as the attached references (HIGH NOON Ghost Gunslinger), neutral IDLE pose.
Keep EXACTLY: cylindrical hat with a small top spike and star rosettes on the band, wide flat jagged brim;
hollow void face with electric-blue cracks; wrapped scarf; skull shoulder pins; layered jagged leaf-like cloak;
compass-medallion belt with chains and star pendants; cylindrical EMPTY holster tubes on both hips;
diamond-quilt materials; saturated electric-blue curled spectral mist; image-right leg dissolving into
blue mist below the knee (no boot on that leg); the same two ornate revolvers.
Pose: standing neutral, weight even, both revolvers held LOW at the sides, both clearly visible, pointing down.
Same body proportions and scale as the references: hat top near y=20, boot sole near y=1240.
Single figure, 1254x1254 transparent PNG, no background, no floor, no text. Two revolvers total.
```

## After it arrives
1. Save it as `intake/P04_IDLE_V2.png`. Use the ChatGPT PNG download, 1254².
2. Read the manual IDLE anchors from the 25 px grid: `chin` (bottom of the void face), `buckle_x` (compass-medallion centre). Write them into `POSES` in `build_p04_v2.py`.
3. Run `build_p04_v2.py`. It:
   - applies one body scale to all 5 poses, set by IDLE chin→ground vs the production P04 span (never upscaled);
   - aligns every pose's ground and belt to the production frame;
   - sizes one common canvas from the union of all 5 placed bounds, which fixes the FIRE barrel clip;
   - writes the staged files plus `review-v2/` A–F and the continuity table.
4. Update `REDESIGN_ART_META.P04` (canvasSize/frameGroundY) and register the 5 staged poses for the DEV preview.

Dry run (FIRE standing in as IDLE): common canvas 1720², displayScale 1.372, all 5 inside with ≥8 px margin, ground and buckle continuity 0 px.
Scale note: if the generated body is smaller than production, the clamp keeps it at 1.0 and P04 renders slightly smaller (the dry run wanted ×1.058). Asking for "hat top near y=20, boot near y=1240" avoids this.
