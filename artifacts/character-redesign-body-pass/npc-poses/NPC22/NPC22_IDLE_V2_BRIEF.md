# NPC22 IDLE V2 brief (2026-10-01): identity re-locked to the pose set (decision A)

The official NPC22 design is now the DRAW/FIRE/HIT/KNEEL/FALL/DOWN set. Those 6 poses are frozen.
The old idle (`../../intake/NPC22_PALE_RIDER.png`: warmer bone/tan, small bare horse skull at the shoulder) is retired and kept as history (`anchors.json → retired_idle`).

## Attach as references
`intake/NPC22_DRAW.png` and `intake/NPC22_FIRE.png`. Do not attach the retired idle.

## Prompt
```
Same exact character as the attached references (HIGH NOON Pale Rider), neutral IDLE pose.
Keep EXACTLY: the pale white / ash palette from hat to boots; the tall, thin body; the pale thorn-band hat with the
hanging cross charm; the faceless black void under the brim; long pale hair; the large cobweb-like pale cape;
the spectral pale HORSE HEAD with a flowing mane rising BEHIND the rider at the upper image left, positioned and
sized like the references (not a small skull on the shoulder); the small skull belt buckle; the EMPTY tube holster;
pale wrapped trousers and pale boots with star spurs; the same long-barrel revolver and body proportions.
Pose: neutral standing idle, tall and still, weight even, the single long-barrel revolver held LOW at the side,
pointing down. Not aiming, not drawing, not firing. Exactly one revolver in total.
Body as large as the references: hat top near y=100, boot soles near y=1230.
Single character only, one image, 1254x1254 transparent PNG, no background, no floor, no text, no sheet.
Transparent margin on all sides; the horse, cape, hat and gun must not touch the canvas edge.
DO NOT ADD: dark trousers or boots, exposed ribcage, a shoulder-mounted horse skull, blue ghost effects,
red accents, gold, lanterns, ravens, graveyard crosses, a second gun.
```

## After intake
Save it as `intake/NPC22_IDLE_V2.png` (PNG download, ~/Downloads/high-noon). Then:
1. Set the idle anchors in `anchors.json`: `chin` (bottom of the face void), `ground` (boot sole), `x` (skull-buckle centre), `rel` (downscale-only, from buckle/hat size vs the poses).
2. Run `build_npc_poses.py NPC22`. It re-normalizes all 7 poses and recomputes the common canvas.
3. Run the A–F review and give the final verdict. Update `REDESIGN_ART_META.NPC22` and the preview.
4. Re-derive the staged `npc/22/identity_poster.png` from the new normalized idle (uniform fit into 1254, no crop).
5. Re-derive the staged `hidden/pale_rider_locked_silhouette.png` (256², black, binary alpha) from the new idle.
