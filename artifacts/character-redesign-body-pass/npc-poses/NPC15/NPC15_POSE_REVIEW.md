# PHASE 3B-2: NPC15 combat set review (2026-10-01)

## Inputs
- **Idle:** the locked master, unchanged.
- **Poses:** 6 lossless PNGs from ~/Downloads/high-noon, all single figures, each compared directly with the idle at intake (`candidates/REVIEW.md`). DOWN is a 1536×1024 landscape single; the script handles non-square sources.

## Normalization (`build_npc_poses.py NPC15`, belt_to_ground)
- **Body scale:** 0.9704 (= PHASE 1). Pose rel = 1.0, since the standing poses are as tall as the idle.
- **Common canvas:** **1624²**, displayScale **1.2951**, frameGroundY 1185.
- **Margins:** all 7 inside the canvas, minimum 8 px (idle smoke) and 9 px (FIRE muzzle smoke).
- **Metadata:** `REDESIGN_ART_META.NPC15.canvasSize` 1622 → 1624. The DEV preview has draw/fire/hit/down(KNEEL). combat_fall/combat_down are staged.
- **Production:** protected files unchanged.

| Check | Result |
| --- | --- |
| IDENTITY | PASS — the same flat-crown drooping torn hat, void face with pale eyes, skull+key pendant, image-left smoke mass, soot palette, straps and spurs in all 7 |
| WEAPON | PASS — 1 in hand + 1 holstered in every pose. FALL/DOWN: the hand gun falls to or lies on the ground |
| GROUND | PASS — one ground line |
| CANVAS / CLIPPING | PASS |
| CONTINUITY | PASS — IDLE→DRAW→FIRE (gun low → hand on holster → aimed left); IDLE→HIT→IDLE; HIT→KNEEL (clear drop) →FALL→DOWN |
| SMALL SIZE (160–241) | PASS on light. On dark the poses are low-contrast (known NPC15 trait); the pale eyes and copper hardware carry the read |
| Minor | The idle's smoke is wispier and shows more of the body; the 6 poses have a denser smoke mass. Same character, slightly different density. FIRE aims at shoulder height (the runtime flash may sit low). FALL tips toward image-left |

```
NPC15_COMBAT_SET=LOCK_READY
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO  DATABASE_CHANGED=NO  TYPECHECK=PASS
```
