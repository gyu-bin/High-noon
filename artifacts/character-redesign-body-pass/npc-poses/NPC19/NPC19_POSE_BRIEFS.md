# PHASE 3B-4: NPC19 Void Walker combat pose briefs

2026-10-01 · `dev-2.0` · preparation only. No generation, no live mapping change.

## 1. Runtime states (verified in code)
NPC19 uses the same NPC duel path as NPC09/15/18: `NpcFirstPersonDuelArena` → `npcRenderPose` → `CLARITY_NPCS[19]` / `NPC_COMBAT_POSES[19]`.

| Runtime | Slot | Timing |
| --- | --- | --- |
| idle | clarity `idle` | default, RECOVER (survive: hit 0 → stagger 180 → recover 440 ms) |
| aim | clarity `draw` | before BANG |
| shoot | clarity `fire` | runtime muzzle flash at the left of the NPC box, hip–chest height → aim **image-left** |
| hit / stagger | clarity `hit` | non-final + final start |
| kneel | clarity `down` (KNEEL art) | final 420 ms |
| fall / down | `NPC_COMBAT_POSES[19]` | final 720 / 1000 ms (register at integration) |

The ability `invertedSignals` only changes signal logic/text. No character art is needed.

```
NPC19_RUNTIME_STATES=idle, draw, fire, hit(+stagger), kneel(clarity down), fall*, down*
POSES_TO_GENERATE=DRAW, FIRE, HIT, KNEEL, FALL, DOWN (6; IDLE = locked master)
```

## 2. Reference and weapon lock
- **REFERENCE_IDLE:** `artifacts/character-redesign-body-pass/intake/NPC19_VOID_WALKER.png`. This is the round-3 lock, the same file PHASE 1 normalized. Attach only this file, in a new chat per pose.
- **WEAPON_CONFIG:** **1 revolver total**, held low in the image-left hand. The tall tube holster on the hip stays **empty**. The other forearm/hand is disconnected by void and floats with a gap.

| Pose | Weapon |
| --- | --- |
| DRAW | the low gun rising toward image-left, elbow bent, mid-motion |
| FIRE | aimed image-left at hip–chest height |
| HIT | still held, knocked off-aim |
| KNEEL | lowered, barrel to the ground |
| FALL | slipping from the hand, visible |
| DOWN | on the ground beside the hand |

## 3. Identity checklist (compare every pose to the idle)
- **Head and hat:** a black-hole void face (dark sphere with violet rim light) under a wide torn-brim hat with a compass/star badge on the band.
- **Body:** starfield/nebula visible inside the torso, legs and cloak (deep purple/violet, small stars). Real broken/missing body sections. The disconnected floating forearm on the image-right side.
- **Fragments:** dark angular rock fragments floating around the body.
- **Costume:** grey-black quilted tattered duster with a large ragged cloak trailing to image-left; compass-medallion belt; tall empty tube holster; strapped boots with spurs.
- **Palette:** charcoal/grey with **restrained** violet. Not a glowing purple character.
- **Forbidden:** red eyes or halo (NPC18), blue/white spectral mist (P04), afterimage duplicates (NPC20), golden skulls or ribs (NPC09), black smoke tendrils (NPC15), a 2nd gun, blood.

## 4. Common prompt header (attach only the idle; new chat per pose)
```
Use the attached NPC19_VOID_WALKER image as the ONLY visual reference. Create ONLY the [POSE] pose of this exact character.
IDENTITY MUST REMAIN IDENTICAL: the same black-hole void face under the same wide torn-brim hat with the compass/star badge,
the same starfield and deep violet nebula visible through the broken, missing sections of the torso, legs and cloak,
the same disconnected floating forearm with a void gap, the same dark angular rock fragments floating around the body,
the same grey-black quilted tattered duster and long ragged cloak, the same compass-medallion belt and tall empty tube
holster, the same strapped boots and spurs, the same body proportions and the same revolver design.
Palette: charcoal and grey with RESTRAINED violet/purple cosmic accents only.
WEAPON: exactly ONE revolver in total, held in the hand. The holster stays EMPTY. Never a second gun.
OUTPUT: one character, one pose, no sheet, no labels, no text. Transparent background, native 1254x1254 PNG, true alpha,
full body, transparent margin on all sides; the hat, cloak, fragments and gun must not touch the canvas edge.
Same body scale as the reference: hat top near y=30, boot soles near y=1240 when standing.
DO NOT ADD: red eyes, halo, blue/white ghost glow, afterimage duplicates, golden skulls, black smoke tendrils,
a bright all-purple glow, blood, large muzzle flash.
```

## 5. POSE sections
| File | POSE |
| --- | --- |
| `NPC19_DRAW.png` | The low revolver rising toward image left, elbow bent, mid-motion, not fully extended; the floating forearm drifts; fragments shift slightly. |
| `NPC19_FIRE.png` | The revolver arm extended toward image left at hip-to-chest height, controlled recoil; the void face pulses faintly; fragments jolt outward a little. Only a tiny muzzle spark. |
| `NPC19_HIT.png` | Struck but standing: rocks back, the body cracks open wider for a moment (more starfield visible), fragments burst outward, the revolver still GRIPPED but off-aim, both feet down. Must be able to recover to idle. |
| `NPC19_KNEEL.png` | Final defeat begins: sinks to one knee, body folding forward, clearly lower than HIT; the void face dims; fragments sinking; the revolver held but pointed at the ground. Same body scale; do not enlarge. |
| `NPC19_FALL.png` | Toppling sideways/backward from the kneel, torso tipping; the body breaking apart further, fragments scattering; the revolver slipping from the hand (visible). Not yet flat. Same body scale. |
| `NPC19_DOWN.png` | Lying flat; the broken body partly dissolving into a scatter of dark fragments and faint starfield; the hat beside the head; the revolver on the ground beside the hand. Same body scale. |

## 6. Intake, anchors, review
- **INTAKE:** `npc-poses/NPC19/intake/` with the exact names above (native PNG; exports land in `~/Downloads/high-noon/`).
- **ANCHORS:** `anchors.json`, with idle values from PHASE 1 (chin 243 = bottom of the black hole, ground 1247, belt x 870; fragments excluded). Per pose, fill `x` (compass-medallion centre, or pelvis for FALL/DOWN) and `rel` (downscale-only).
- **REVIEW_SCRIPT:** `build_npc_poses.py NPC19` (chin_to_ground). Dry run (idle copied into all 6 slots): body scale 0.993 (= PHASE 1), canvas 1658², all ≥ 9 px margin, protected files unchanged.
