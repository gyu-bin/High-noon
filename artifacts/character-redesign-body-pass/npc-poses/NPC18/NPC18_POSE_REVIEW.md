# PHASE 3B-3: NPC18 combat set review (2026-10-01)

## Inputs
- **Idle:** the locked master, unchanged.
- **Poses:** 6 lossless PNGs from ~/Downloads/high-noon, all single figures, each compared with the idle at intake (`candidates/REVIEW.md`).
  - FALL is 1388×1133 and DOWN is 1536×1024 (landscape singles).
  - DOWN matched its attachment with a full-image diff of 8.5; the alpha masks agree 100% and the opaque RGB diff is 2.9, so it is the same image.

## Normalization (`build_npc_poses.py NPC18`, chin_to_ground)
- **Scale:** body scale 0.9969 (= PHASE 1). Belt-medallion diameters ≈ the idle's → rel 1.0.
- **Canvas:** common **1742²**, displayScale **1.3892**, frameGroundY 1207. All 7 inside the canvas, minimum 9 px (DOWN robe), idle 25 px (the halo is now inside).
- **Metadata:** `REDESIGN_ART_META.NPC18.canvasSize` 1708 → 1742. The DEV preview has draw/fire/hit/down(KNEEL); combat_fall/combat_down are staged.
- **Production:** protected files unchanged.

| Check | Result |
| --- | --- |
| IDENTITY | PASS — spiked halo with cross pendants, red eye on the hat band, column of red eyes on the hood, eyes on the robes, talismans, red beads, red-eye belt medallion, empty tube holster, black/crimson robes in all 7 |
| WEAPON | PASS — 1 revolver in every pose (raised → aimed → held off-aim → pointed down → falling → on the ground); holster empty |
| GROUND / CANVAS / CLIPPING | PASS |
| CONTINUITY | PASS — IDLE (gun raised) → DRAW (lowering) → FIRE (aim left); IDLE→HIT→IDLE (gun kept in hand); HIT→KNEEL (≈200 px drop)→FALL→DOWN |
| SMALL SIZE (160–241, dark bg) | PASS — the halo silhouette and red eyes read at 160 |
| Minor | The 6 poses have a flatter, more cylindrical hat crown and a slightly heavier robe mass than the idle (consistent among themselves; same character at duel size). FIRE aims at shoulder height. The KNEEL halo is not tilted |

```
NPC18_COMBAT_SET=LOCK_READY
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO  DATABASE_CHANGED=NO  TYPECHECK=PASS
```
