# Over-shoulder duel: art that code cannot fix (2026-10-06)

## 1. Player revolver arm: `assets/images/weapons/player_fp/player_fp_revolver_{idle,draw,fire}.png`
Problem: every file has a baked orange/red outline (extraction rim) around the arm and gun. It shows on every background.
Also, the `idle` art has the arm entering from the top, which cannot come from the player's shoulder. The portrait duel no longer uses it and reuses `draw` turned downward for READY.

Request (3 separate images, 512x512 or larger, transparent PNG, same framing as the current files):
```
First-person western revolver held in a brown leather-gloved hand, forearm in a dark brown leather sleeve.
The forearm enters from the BOTTOM-RIGHT corner of the image; the barrel points to the upper left.
Painterly realistic style matching HIGH NOON. Transparent background, true alpha.
NO outline, NO orange or red rim light, NO glow around the edges. Clean anti-aliased alpha edge only.
```
- `draw`: gun raised, aiming.
- `fire`: the same pose with slight recoil (barrel tipped up a few degrees). No muzzle flash (the game adds it).
- `idle` (optional): the same arm from the bottom-right, gun lowered, barrel pointing down-left.

## 2. NPC01 (먼지바람) draw pose: `assets/images/characters/clarity/npc/01/draw.png`
Problem: the body and face turn to image-right while the gun hand reaches image-left, so it reads as looking away from the player.

Request (attach `clarity/npc/01/idle.png` as the ONLY reference; 1254x1254 transparent PNG; same scale and ground line):
```
Same exact character as the reference (poncho with red stripes, bandana mask, hat, holster on his right hip).
DRAW pose facing the viewer: head and chest toward the camera, eyes on the viewer, right hand pulling the revolver
from the holster, left hand open at his side. Both feet planted, same stance width as the reference.
No background, no floor, no text, single figure.
```
