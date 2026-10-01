# PHASE 3B-2: NPC15 Shadow Hunter combat pose briefs

2026-10-01 · `dev-2.0` · preparation only. No generation, no live mapping change.

## 1. Runtime states (verified in code)
Same NPC duel path as NPC09: `NpcFirstPersonDuelArena` → `npcRenderPose` → `CLARITY_NPCS[15]` / `NPC_COMBAT_POSES[15]`.

| Runtime | Slot | Timing |
| --- | --- | --- |
| idle | clarity `idle` | default, RECOVER (survive: hit 0 → stagger 180 → recover 440 ms) |
| aim | clarity `draw` | before BANG |
| shoot | clarity `fire` | runtime muzzle flash at the left of the NPC box, hip–chest height → aim **image-left** |
| hit / stagger | clarity `hit` | non-final and final start |
| kneel | clarity `down` (KNEEL art) | final 420 ms |
| fall / down | `NPC_COMBAT_POSES[15]` | final 720 / 1000 ms (register at integration, otherwise KNEEL is held) |

NPC15's ability `blindBang` only changes the signal board text (`DuelSignalBoard` `bangBlind`). There is no extra character art.

```
NPC15_RUNTIME_STATES=idle, draw, fire, hit(+stagger), kneel(clarity down), fall*, down*
POSES_TO_GENERATE=DRAW, FIRE, HIT, KNEEL, FALL, DOWN (6; IDLE = locked master)
```

## 2. Reference and weapon lock
- **REFERENCE_IDLE** = `artifacts/character-redesign-body-pass/intake/NPC15_SHADOW_HUNTER.png`. It is the only image attached for every request, in a **new chat per pose** (no other pose results in context). The old `clarity/npc/15/*` (brown poncho hunter) is timing reference only.
- **WEAPON_CONFIG** = 1 revolver in the hand + 1 holstered (locked in the body pass). Total 2 in every pose.

| Pose | Weapons |
| --- | --- |
| DRAW | in-hand gun rising toward image-left; the holstered gun stays holstered |
| FIRE | 1 gun aimed image-left at hip–chest height; 1 still holstered |
| HIT | in-hand gun off-aim but held; holstered gun stays |
| KNEEL | in-hand gun lowered to the ground; holstered gun stays |
| FALL | in-hand gun slipping away; holstered gun stays on the hip |
| DOWN | in-hand gun on the ground; holstered gun on the hip |

Never two guns in hand, never an empty holster.

## 3. Identity checklist (compare every pose to the idle)
- **Hat and face:** wide soft drooping-brim hat; face almost completely black with two tiny pale eye points.
- **Silhouette:** hunched, stalking, forward-leaning posture with a low centre of mass; narrow lower body.
- **Cloak and shadow:** oversized **asymmetric** black cloak; one side of the body dissolving into living black smoke tendrils.
- **Belt, materials, palette:** the same belt/holster; matte suede and soot cloth; near-black achromatic palette.
- **Forbidden:** blue/white spectral glow (P04), stars/violet/void holes (NPC19), duplicated afterimages (NPC20), coloured eye glow, new ornaments, a 3rd gun, blood.

## 4. Common prompt header (paste before every pose; attach only the idle)
```
Use the attached image as the ONLY identity reference: HIGH NOON "Shadow Hunter".
Keep EXACTLY: the wide soft drooping-brim hat, the almost completely black face with two tiny pale eye points,
the hunched stalking posture and narrow lower body, the oversized asymmetric black cloak, one side of the body
dissolving into living black smoke tendrils, the same belt and holster, matte suede/soot materials, the
near-black achromatic palette and the same body proportions and scale.
Weapons: exactly ONE revolver in the hand and ONE revolver in the holster. Two in total, never two in hands.
Single figure, ONE pose only (no sheet, no labels, no text). Native 1254x1254 transparent PNG, no background,
no floor, no cast shadow. Same camera and scale as the reference: hat top near y=60, boot soles near y=1240.
Leave transparent margin on all sides; smoke must not touch the canvas edge.
No blue or white glow, no stars or purple, no afterimage duplicates, no blood.
```

## 5. Per-pose prompts
| File | Prompt |
| --- | --- |
| `NPC15_DRAW.png` | Still hunched, the hand bringing the revolver up from low toward image left, elbow bent, mid-motion. Not fully extended. The holstered revolver stays in its holster. |
| `NPC15_FIRE.png` | Hunched firing stance, the revolver arm extended toward image left at hip-to-chest height, small controlled recoil; shadow tendrils whip back. Only a tiny muzzle spark. The second revolver stays holstered. |
| `NPC15_HIT.png` | Struck but standing: jolts upright and back from the hunch, head snapping away, shadow cloak flaring, revolver still held but off-aim, both feet on the ground. Must be able to recover to idle. |
| `NPC15_KNEEL.png` | Final defeat begins: collapses to one knee, body folding forward and lower than the hunch, revolver hand dropping to the ground, shadow smoke thinning. Clearly lower than HIT. Same body scale. |
| `NPC15_FALL.png` | Toppling sideways from the kneel, torso tipping toward the ground, revolver slipping from the hand, cloak and smoke trailing the motion. Not yet lying flat. Same body scale. |
| `NPC15_DOWN.png` | Lying defeated on the ground, cloak spread like a dark pool, smoke dissipating, hat still readable, revolver on the ground beside the hand, second revolver still holstered. Same body scale. |

## 6. Intake, anchors, review
- **Intake:** `npc-poses/NPC15/intake/` with the exact names above, native PNG via the download button. Sheets, labels and WebP re-encodes are rejected.
- **ANCHORS_READY:** `anchors.json`. The idle anchors are the PHASE 1 manual values (chin 350, belt y 571, ground 1246, belt x 821). For each pose, fill `x` (buckle centre, or pelvis for FALL/DOWN) and `rel` (source scale vs the idle, downscale-only, from the hat brim/buckle). `ground` can stay null (auto lowest solid row).
- **REVIEW_SCRIPT_READY:** `build_npc_poses.py NPC15`. This round added `scale_method: belt_to_ground`, the same hunch-preserving method as PHASE 1. Dry run (idle in every slot): body scale 0.9704 (= PHASE 1), canvas 1624², every pose ≥ 8 px margin, protected files unchanged. NPC09 runs are unaffected (default chin_to_ground).
