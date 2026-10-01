# PHASE 3B-4: NPC19 combat set review (2026-10-01)

## Inputs
- **Idle:** the locked master (round 3), unchanged.
- **Poses:** 6 lossless PNGs from ~/Downloads/high-noon, all single figures, each compared with the idle at intake (`candidates/REVIEW.md`). FALL is 1460×1077 and DOWN 1536×1024 (landscape singles).

## Normalization (`build_npc_poses.py NPC19`, chin_to_ground)
- **Body scale:** 0.993 (= PHASE 1).
- **x anchor:** the compass-medallion centre for all poses (idle 935, re-read; PHASE 1's 870 was the belt centre).
- **rel:** 1.0 everywhere. The black hole and hat badge in the poses are ≤ the idle's.
- **Common canvas:** 1786², displayScale 1.4242, frameGroundY 1211. All 7 inside the canvas, minimum 9 px (idle cloak).
- Staged files written. **`REDESIGN_ART_META` and the preview are not updated yet** (pending the decision below). Protected files unchanged.

| Check | Result |
| --- | --- |
| WEAPON | PASS — 1 revolver in every pose (low → rising → aimed → gripped off-aim → pointed down → falling → on the ground); holster empty |
| GROUND / CANVAS / CLIPPING | PASS |
| POSE CONTINUITY (6 poses among themselves) | PASS — DRAW→FIRE; HIT keeps the gun; HIT→KNEEL (clear drop) →FALL→DOWN, with fragments accumulating |
| IDENTITY ELEMENTS | PASS — compass-badge hat, black-hole face, starfield through broken sections, floating fragments, tube holster, compass belt in all 7 |
| **STYLE vs locked IDLE** | **PARTIAL (visible drift)** — the idle has a lighter blue-grey cloak, bright violet/blue cosmic light and a huge cloak flaring image-left. The 6 poses have a darker brown-grey duster, muted violet and a much smaller cloak. At 160–241 px on dark (`F_dark_background.png`), IDLE→DRAW / HIT→IDLE shows a palette and silhouette jump. Same character, but less severe than NPC09 |

```
NPC19_COMBAT_SET=NOT_LOCK_READY (pending decision: idle ↔ pose-set style drift)
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO  DATABASE_CHANGED=NO
```

## Options
- **A (recommended; same as P04/NPC09):** adopt the pose-set style. Generate one `NPC19_IDLE_V2.png` with DRAW + FIRE as references (brown-grey duster, muted violet, the same cloak size, gun held low, empty holster, the floating forearm), then re-normalize. The canvas will also shrink, because the idle's huge cloak sets the current 1786.
- **B:** accept as is. The identity marks are all consistent, and the jump is mainly palette brightness and cloak size.

---
# Re-review with IDLE_V2 (2026-10-01): decision A applied
- **New idle:** `intake/NPC19_IDLE_V2.png` = ~/Downloads/high-noon `…06_57_29.png` (1223×1286 lossless; opaque diff 2.4, alpha agree 100%).
  - The old idle is retired (`anchors.json → retired_idle`).
  - IDLE_V2 anchors: chin 250, boot sole 1250, compass-medallion x 700. Black hole ≈60 px vs the poses' 65–70 → rel 1.0.
- **Re-normalization:**
  - Body scale 0.997 (wanted = applied, no clamp).
  - Common canvas **1682²** (was 1786 with the old oversized cloak), displayScale **1.3413**, frameGroundY 1211.
  - All 7 inside the canvas (minimum 9 px, the FIRE muzzle spark).
  - `REDESIGN_ART_META.NPC19.canvasSize` 1654 → 1682. The DEV preview has draw/fire/hit/down(KNEEL).
  - Protected files unchanged.

| Check | Result |
| --- | --- |
| IDENTITY (idle ↔ 6 poses) | PASS — the same brown-grey quilted duster and cloak size, restrained violet, black-hole face, compass hat, starfield through broken sections, fragments, compass belt + shoulder badge, empty tube holster, detached image-right forearm |
| WEAPON | PASS — 1 revolver in every pose; IDLE holds it low; holster empty |
| GROUND / CANVAS / CLIPPING | PASS |
| CONTINUITY | PASS — IDLE→DRAW→FIRE, IDLE→HIT→IDLE, HIT→KNEEL→FALL→DOWN; no palette or silhouette jump at 160–241 on dark |
| Minor | IDLE is frontal and symmetric (the other poses are 3/4); the IDLE hat badge has no top spike (same as the poses) |

```
NPC19_COMBAT_SET=LOCK_READY
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO  DATABASE_CHANGED=NO  TYPECHECK=PASS
```
