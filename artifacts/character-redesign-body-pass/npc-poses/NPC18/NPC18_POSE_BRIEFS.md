# PHASE 3B-3: NPC18 Red Eye Oracle combat pose briefs

2026-10-01 · `dev-2.0` · preparation only. No generation, no live mapping change.

## 1. Runtime states (verified in code)
Same NPC duel path as NPC09/NPC15: `NpcFirstPersonDuelArena` → `npcRenderPose` → `CLARITY_NPCS[18]` / `NPC_COMBAT_POSES[18]`.

| Runtime | Slot | Timing |
| --- | --- | --- |
| idle | clarity `idle` | default, RECOVER (survive: hit 0 → stagger 180 → recover 440 ms) |
| aim | clarity `draw` | before BANG |
| shoot | clarity `fire` | runtime muzzle flash at the left of the NPC box, hip–chest height → aim **image-left** |
| hit / stagger | clarity `hit` | non-final and final start |
| kneel | clarity `down` (KNEEL art) | final 420 ms |
| fall / down | `NPC_COMBAT_POSES[18]` | final 720 / 1000 ms (register at integration) |

The ability `screenShakeHeavy` is a camera/screen effect; no character art is needed.

```
NPC18_RUNTIME_STATES=idle, draw, fire, hit(+stagger), kneel(clarity down), fall*, down*
POSES_TO_GENERATE=DRAW, FIRE, HIT, KNEEL, FALL, DOWN (6; IDLE = locked master)
```

## 2. Reference and weapon lock
- **REFERENCE_IDLE** = `artifacts/character-redesign-body-pass/intake/NPC18_RED_EYE_ORACLE.png`. It is the only attachment, in a **new chat per pose**.
- **WEAPON_CONFIG** = **1 revolver total**, held in the hand. The idle raises it upward; the cylindrical holster on the belt stays **empty**. Never a second gun, never a gun in the holster.

| Pose | Weapon |
| --- | --- |
| DRAW | the raised gun swings down from vertical toward image-left aim (mid-motion) |
| FIRE | aimed image-left at hip–chest height, arm extended |
| HIT | still held, knocked off-aim |
| KNEEL | lowered, barrel toward the ground |
| FALL | slipping from the hand, visible |
| DOWN | lying on the ground beside the hand |

## 3. Identity checklist (compare every pose to the idle)
- **Head and halo:** wide-brim hat with a red eye on the crown band. Behind the head, a spiked golden-bronze **halo ring** with cross/talisman pendants.
- **Face and eyes:** a hood/scarf instead of a face, with **multiple glowing red eyes** on the face, scarf, hood and robes.
- **Robes and talismans:** long layered black + dark-crimson ritual robes with ragged hems; parchment talisman strips with red sigils; red bead strings; cross pendants on chains.
- **Belt and boots:** a belt with a central red-eye medallion and an empty cylindrical holster; the same boots and spurs.
- **Silhouette:** tall, narrow. ORACLE first, gunslinger second.
- **Forbidden:** skulls (NPC09), gold skull/ribcage, stars/purple void (NPC19), afterimages (NPC20), blue glow (P04), a 2nd gun, blood.

## 4. Common prompt header (attach only the idle; new chat per pose)
```
Use the attached NPC18_RED_EYE_ORACLE image as the ONLY visual reference. Create ONLY the [POSE] pose of this exact character.
IDENTITY MUST REMAIN IDENTICAL: the same wide-brim hat with the red eye on its band, the same spiked bronze halo ring
with hanging cross pendants behind the head, the hooded faceless head with multiple glowing red eyes on face, scarf,
hood and robes, the same long layered black and dark-crimson ritual robes with ragged hems, the same parchment
talisman strips with red sigils, red bead strings and chained cross pendants, the same belt with the red-eye medallion,
the same boots and spurs, the tall narrow body proportions and the same revolver design.
WEAPON: exactly ONE revolver in total, held in the hand. The holster stays EMPTY. Never a second gun.
OUTPUT: one character, one pose, no sheet, no labels, no text. Transparent background, native 1254x1254 PNG, true alpha,
full body, transparent margin on all sides; the halo, robes and gun must not touch the canvas edge.
Same body scale as the reference: hat crown near y=90, boot soles near y=1240 when standing.
DO NOT ADD: skulls, gold ribcage, stars or purple cosmic effects, afterimage duplicates, blue glow, blood, large muzzle flash.
```

## 5. POSE sections
| File | POSE |
| --- | --- |
| `NPC18_DRAW.png` | The raised revolver swinging down from vertical toward image left, elbow bent, mid-motion; the other hand still raised in a ritual gesture; halo and robes steady. Not fully extended. |
| `NPC18_FIRE.png` | The revolver arm extended toward image left at hip-to-chest height, controlled recoil; the eyes flare brighter red; robes and talismans ripple slightly. Only a tiny muzzle spark. |
| `NPC18_HIT.png` | Struck but standing: rocks back, head and halo tilt away, talismans and robes whip outward, revolver still held but off-aim, both feet down. Must be able to recover to idle. |
| `NPC18_KNEEL.png` | Final defeat begins: sinks to one knee, robes pooling, head bowed, the halo tilting and dimming, revolver lowered with the barrel toward the ground. Clearly lower than HIT. Same body scale; do not enlarge. |
| `NPC18_FALL.png` | Toppling sideways from the kneel, torso tipping, the halo slipping askew, revolver slipping from the hand, talismans trailing. Not yet lying flat. Same body scale. |
| `NPC18_DOWN.png` | Lying flat, robes spread, the halo lying on the ground behind the head (dim), eyes faint, revolver on the ground beside the hand. Same body scale. |

## 6. Intake, anchors, review
- **INTAKE:** `npc-poses/NPC18/intake/` with the exact names above (native PNG download; ChatGPT exports are found in `~/Downloads/high-noon/`).
- **ANCHORS:** `anchors.json`. The idle values come from PHASE 1 (chin 264, ground 1238, belt x 879; halo and raised gun excluded). Per pose, fill `x` (red-eye medallion centre, or pelvis for FALL/DOWN) and `rel` (downscale-only).
- **REVIEW_SCRIPT:** `build_npc_poses.py NPC18` (default chin_to_ground). Dry run with the idle in all slots: body scale 0.9969 (= PHASE 1), canvas 1710², all ≥ 9 px margin, protected files unchanged. The idle source's halo tip touches the top edge by 3 px (known from the body pass; it is inside the canvas after normalization).
