# PHASE 3B-1: NPC09 combat set review (2026-10-01)

## Intake
- **WebP → PNG:** the human-approved WebPs (DRAW 2 / HIT / KNEEL / FALL / DOWN) were converted to PNG, a format change only. No resize or repaint.
- **FIRE:** the intaken lossless PNG, unchanged.
- **Anchors** (`anchors.json`):
  - skull-buckle x per pose;
  - ground = lowest solid row;
  - rel = 1.0 for all poses. Their buckle plates are 45–60 px vs the idle's 65 px, so nothing is larger than the idle and upscale is forbidden.

## Normalization (`build_npc_poses.py NPC09`)
- **Body scale:** 0.9557 (same as PHASE 1).
- **Common canvas:** 1550². displayScale 1.236, frameGroundY 1221.
- **Margin:** every pose ≥ 39 px inside the canvas. Protected production files are unchanged.
- **Staged output:** `staged/redesign-v2/npc/09/{idle,draw,fire,hit,down,combat_fall,combat_down}.png`. They are not registered for preview yet.

## Checks
| Check | Result |
| --- | --- |
| WEAPON | PASS. 2 revolvers in every pose (held → slipping → on the ground); holsters empty |
| GROUND | PASS. Standing feet, the kneel knee and the lying body all on the frame ground line |
| CANVAS / CLIPPING | PASS on the staged canvas. FALL source cape touches the source edge (10 px, cut at generation, minor) |
| POSE CONTINUITY (6 poses among themselves) | PASS. DRAW (mid-raise) → FIRE (aim) reads as one motion; HIT recoil → KNEEL (guns lowered) → FALL (guns flying) → DOWN (lying, guns on ground) |
| KNEEL height | MINOR. The kneeling figure is only ≈6% shorter than standing (tall upright kneel), so the drop at stage 420 ms is small |
| **IDENTITY vs locked IDLE** | **FAIL (style drift).** All elements are present (hat badge, hair, skull, ribcage, spiked skull pauldrons, filigree cape, skull buckle, tube holsters, knee skulls), but the 6 poses share a different rendering: saturated copper-orange vs the idle's dark worn gold; chunkier proportions with a bigger hat/head; lace-filigree cape edges vs the idle's ragged gold-dusted cape. IDLE→DRAW and HIT→IDLE visibly change character at 160–241 px (`review/A_idle_draw_fire.png`, `F_dark_background.png`) |

```
NPC09_COMBAT_SET=NOT_LOCK_READY (IDLE ↔ pose-set style mismatch; the 6 poses are consistent with each other)
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO  DATABASE_CHANGED=NO
```

## Options (human decision)
- **A. Re-lock the NPC09 identity to the pose set** (same as P04 decision B). Generate one `NPC09_IDLE_V2.png` in the pose-set style: copper filigree, both guns held low, empty holsters, same body scale. Then re-run with that as the idle. The 6 poses stay.
- **B. Keep the locked idle** and regenerate all 6 poses with idle-only references. Three FIRE attempts already drifted, so this is likely costly.

---
# Re-review with IDLE_V2 (2026-10-01): decision A applied
- **New idle:** `intake/NPC09_IDLE_V2.png`, from ~/Downloads `…02_10_33.png` (lossless 1254² RGBA; same image as the attachment, diff 1.9). The old idle is retired (`anchors.json` → `retired_idle`).
- **IDLE_V2 anchors:** chin 215, boot sole 1195, buckle x 568, buckle plate ≈48 px (same as the poses) → rel 1.0.
- **Re-normalization:**
  - body scale 1.0 (wanted ×1.012, clamped: ≈1% smaller than the production NPC09, negligible);
  - common canvas **1548²**, displayScale **1.2344**, frameGroundY 1221;
  - all 7 poses inside the canvas (min margin 8 px for the idle hair, 31 px for DOWN);
  - protected files unchanged.
- **Metadata:** `REDESIGN_ART_META.NPC09.canvasSize` stays 1548. The DEV preview now has draw/fire/hit/down(KNEEL); combat_fall/combat_down are staged on the same canvas.

| Check | Result |
| --- | --- |
| IDENTITY (idle ↔ 6 poses) | PASS: same copper/worn-gold palette, body thickness, hat + single skull badge, pale hair, ribcage, spiked skull pauldrons, skull buckle + bullet belt, lace cloak edging, knee skulls, spurs, revolvers |
| WEAPON | PASS: 2 in every pose; IDLE holds both low, holsters empty |
| GROUND | PASS: one ground line (A/B/C sheets) |
| CANVAS / CLIPPING | PASS. FALL source cape edge cut 10 px at generation (minor) |
| CONTINUITY | PASS: IDLE→DRAW→FIRE, IDLE→HIT→IDLE, HIT→KNEEL→FALL→DOWN |
| SMALL SIZE (160–241, dark bg) | PASS: golden skull, gold ribs and spiked pauldrons read at 160 |
| Notes | KNEEL is a tall upright kneel (≈6% drop). IDLE head/hat reads slightly smaller than in the action poses. Both minor |

```
NPC09_COMBAT_SET=LOCK_READY
LIVE_MAPPING_CHANGED=NO  PRODUCTION_CHANGED=NO (7/7 + all clarity/combat PNGs)  DATABASE_CHANGED=NO  TYPECHECK=PASS
```
