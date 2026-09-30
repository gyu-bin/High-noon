# Combat pose assets — representative prototype (NPC 01 먼지바람 + player revolver)

Approved flow: NPC final defeat HIT → STAGGER → KNEEL → FALL → DOWN; player death IMPACT → LOSE GRIP → COLLAPSE → GROUND POV → DEFEAT. No blood.
Only these three new files are needed now. Do not batch the other 21 NPCs.

| Stage | Source |
|---|---|
| IDLE | `clarity/npc/01/idle.png` (existing) |
| HIT, STAGGER | `clarity/npc/01/hit.png` (existing, stagger = motion) |
| KNEEL | `clarity/npc/01/down.png` (existing — this frame is a kneel) |
| **FALL** | **new** `clarity/npc/01/fall.png` |
| **DOWN** | **new** `clarity/npc/01/down_prone.png` |
| **GROUND REVOLVER** | **new** `weapons/cinematic/revolver-ground.png` |

## Identity lock (FALL, DOWN)
Same character as `idle.png`, pose only changes: face hidden under the same hat, same dark bandana, tan poncho with the two red diagonal stripes and torn hem, cream sleeves, brown gloves, tooled holster belt, torn-knee trousers, brown boots, silver revolver. Same palette, rendering style, lighting direction and body proportions. Reference the five existing clarity frames directly.

## Poses
- **FALL** — one knee already buckled (continues from the kneel), weight dropping toward the ground, upper body folding forward/sideways, one hand reaching for the ground allowed, gun arm gone limp, poncho hanging with gravity. Not a rotated kneel or standing frame.
- **DOWN** — lying on the ground, torso in contact with the dirt, limbs heavy, hat natural (on the head or just fallen beside it), revolver loose in the hand or next to it. The silhouette alone must read as "down".

## Canvas / alpha (all three)
- 1254 × 1254 PNG, RGBA, true transparency. No baked background, no checkerboard.
- No red/orange rim or halo on the outline, no dark fringe.
- Nothing cropped (hat, boots, barrel inside the canvas, transparent border).
- FALL / DOWN: ground contact on the same baseline as the kneel frame (lowest opaque pixel at y ≈ 1212 ± 24); same apparent scale as the other frames.

## Ground revolver
The same revolver as `weapons/cinematic/revolver-ready.png` (barrel, cylinder, hammer, wooden grip), **no hand or glove**, lying on the dirt seen from a low camera (slight foreshortening), matte — no new design, no extra shine. Shadow may be baked softly under it but no ground texture.

## Acceptance
```
python3 scripts/validate_combat_assets.py npc 1 <fall.png> <down_prone.png>
python3 scripts/validate_combat_assets.py revolver <revolver-ground.png>
```
Then a human side-by-side identity review on the contact sheet. Only after both pass: register in `constants/combatPoses.ts` (NPC 01 only) and run Simulator QA.
