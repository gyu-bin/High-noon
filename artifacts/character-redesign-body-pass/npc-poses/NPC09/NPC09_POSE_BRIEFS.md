# PHASE 3B-1: NPC09 Golden Skull combat pose briefs

2026-10-01 · `dev-2.0` · preparation only. No generation, no live mapping change.

## 1. Runtime states (verified in code)
NPC duel body: `NpcFirstPersonDuelArena` → `npcRenderPose` → `getV3NpcPose` (`CLARITY_NPCS[9]`) or `NPC_COMBAT_POSES[9]`.

| Runtime | File slot | When |
| --- | --- | --- |
| idle | clarity `idle` | default, RECOVER |
| aim | clarity `draw` | before BANG |
| shoot | clarity `fire` | fire; runtime muzzle flash box at left −10%…40%, top 32%…66% of the NPC box → gun aims **image-left at hip–chest height** |
| defeat hit / stagger | clarity `hit` | non-final: `NPC_SURVIVE_TIMELINE` hit 0 → stagger 180 → recover 440 ms (back to idle) |
| kneel | clarity `down` (= KNEEL art) | final: `NPC_DEFEAT_TIMELINE` hit 0 → stagger 200 → **kneel 420** |
| fall | `NPC_COMBAT_POSES[9].fall` | final: **fall 720** (only if registered; otherwise KNEEL is held) |
| down | `NPC_COMBAT_POSES[9].down` | final: **down 1000** (only if registered) |

Local duel (`LocalDuelSkinSprite`) uses the same 5 clarity slots. READY/STEADY/BANG have no character art.

```
NPC09_RUNTIME_STATES=idle, draw, fire, hit(+stagger), kneel(clarity down), fall*, down* (*NPC_COMBAT_POSES; register at integration)
POSES_TO_GENERATE=DRAW, FIRE, HIT, KNEEL, FALL, DOWN (6) — IDLE is the locked master, not regenerated
```

## 2. Reference and weapon lock
- **REFERENCE_IDLE** = `artifacts/character-redesign-body-pass/intake/NPC09_GOLDEN_SKULL.png` (locked 1254² source). It is the **only** image attached for every request; never attach another pose.
  The old `clarity/npc/09/*` poses are timing references only (a different, retired design).
- **WEAPON_CONFIG** = 2 revolvers, both **in hand**, both holsters **empty**. Total 2 in every pose.

| Pose | Weapons |
| --- | --- |
| DRAW | 2 in hand, rising from the low idle toward image-left |
| FIRE | 2 in hand, aimed image-left at hip–chest height |
| HIT | 2 in hand, off-aim, still held |
| KNEEL | 2 in hand, lowered, one may touch the ground |
| FALL | 1–2 slipping from the hands; both visible |
| DOWN | 2 visible on or near the ground next to the body |

## 3. Locked identity checklist (compare every pose to the idle)
- **Head and armour:** wide stiff-brim hat with gold band; golden skull head; heavy skull pauldrons on broad shoulders; gold ribcage armour.
- **Belt and cape:** the same belt/buckle and skull ornaments; short heavy cape (not floating).
- **Palette and silhouette:** black + worn gold; heavy, grounded proportions.
- **Forbidden:** blue/spectral mist, red eyes, robes, halos, new ornaments, a third gun, blood, gore.

## 4. Common prompt header (paste before every pose)
```
Use the attached image as the ONLY identity reference: HIGH NOON "Golden Skull" boss gunslinger.
Keep EXACTLY: wide stiff-brim hat with gold band, golden skull head, skull pauldrons, gold ribcage armour,
the same belt, buckle and ornaments, the short heavy cape, black + worn gold palette, the same two revolvers,
the same heavy body proportions. Holsters stay EMPTY. Two revolvers in total, never more.
Single figure, ONE pose only (no sheet, no multiple figures). Native 1254x1254 transparent PNG,
no background, no floor, no shadow, no text. Same camera and scale as the reference: a standing body has
hat top near y=20 and boot soles near y=1240. No blood, no gore, no spectral blue, no red eyes.
```

## 5. Per-pose prompts
| File | Prompt |
| --- | --- |
| `NPC09_DRAW.png` | Raising both revolvers from the low idle toward image left, mid-motion, torso upright, heavy grounded stance. Not an exaggerated action pose. |
| `NPC09_FIRE.png` | Firing both revolvers toward image left at hip-to-chest height, arms forward, controlled heavy recoil, feet planted. Only a tiny muzzle spark (the game adds the flash). |
| `NPC09_HIT.png` | Struck but standing: torso rocks back, one pauldron twists back, skull turned slightly away, both revolvers still held but off-aim, both feet on the ground. Must be able to recover to idle. |
| `NPC09_KNEEL.png` | Final defeat begins: drops to one knee, upper body sagging forward, both revolvers lowered, one touching the ground. Clearly different from HIT. Same body scale (do not enlarge the kneeling figure). |
| `NPC09_FALL.png` | Collapsing sideways from the kneel toward the ground, centre of mass low, torso tipping, revolvers slipping from the hands, cape following the motion. Not yet lying flat. Same body scale. |
| `NPC09_DOWN.png` | Lying defeated on the ground on his side/back, hat and golden skull still readable, cape spread, both revolvers on the ground beside him. No standing or kneeling ambiguity. Same body scale. |

## 6. Intake and review
- **Intake:** separate PNGs in `npc-poses/NPC09/intake/` with the exact names above. Sheets and multi-pose images are rejected.
- **Anchors:** after intake, fill `anchors.json` by hand from a 25 px grid, per pose:
  - `x`: belt-buckle centre (pelvis centre for FALL/DOWN);
  - `ground`: boot sole or lowest body row; `null` = automatic;
  - `rel`: source scale vs the idle, downscale-only. Measured from the skull/buckle size. Kneeling/lying figures enlarged by the generator get rel < 1.
- **Run** `python3 artifacts/character-redesign-body-pass/npc-poses/build_npc_poses.py NPC09`:
  - one body scale (idle chin→ground vs production);
  - one common canvas from the union bounds;
  - staged files written to `staged/redesign-v2/npc/09/{idle,draw,fire,hit,down,combat_fall,combat_down}.png`;
  - review sheets A (idle→draw→fire), B (hit recover), C (hit→kneel→fall→down), D (silhouettes), E (duel sizes), F (dark background);
  - all clarity and combat production PNGs hash-checked before and after.
- **Note:** the run re-stages `idle.png` on the new common canvas. `REDESIGN_ART_META.NPC09.canvasSize` must then be updated to the reported value.

Dry run (idle copied into all 6 slots): canvas 1550² (PHASE 1 gave 1548² for the idle alone), body scale 0.9557 (same as PHASE 1), every pose ≥ 8 px margin, protected files unchanged.
