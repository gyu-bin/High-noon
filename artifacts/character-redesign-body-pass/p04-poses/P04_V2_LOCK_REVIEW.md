# PHASE 3A-B: P04 v2 combat set review (2026-10-01)

Decision B applied: the P04 identity is re-locked to the pose-set design. The old locked idle is retired (kept on disk).
- **New IDLE source:** `intake/P04_IDLE_V2.png`, from ~/Downloads `…12_25_41.png`. It is lossless 1145×1374 RGBA (same image as the attachment; diff 3.0 = WebP loss).
- **Poses:** DRAW/FIRE/HIT/KNEEL are unchanged inputs.

## Normalization (`build_p04_v2.py`, review in `review-v2/`)
- **Body scale:** set by IDLE chin→ground against the production P04 span. Wanted ×1.016, clamped to 1.0 (no upscale).
- **Per-source scale** (downscale only), read by hand from figure height and compass-medallion diameter:
  - IDLE_V2: 0.909 (it was exported on a larger 1145×1374 canvas, ≈1.10× the poses);
  - KNEEL: 0.83 (the generator filled the frame with the kneeling body);
  - DRAW/FIRE/HIT: 1.0.
- **Alignment:** ground and compass-medallion x are aligned to the production frame (ground y 1211, belt x 650).
- **Common canvas:** **1720²** for all five, sized from the union bounds. displayScale **1.3716**, frameGroundY **1211** (canvas y 1444).
  - Every pose fits inside, and the FIRE barrel is no longer clipped (min margin 8 px).
- **Metadata:** `REDESIGN_ART_META.P04` = canvasSize 1720, frameGroundY 1211. The 5 staged poses are registered for the DEV preview only.

## Checks
| Check | Result |
| --- | --- |
| IDENTITY_MATCH | PASS — same hat (cylindrical, spike, star band), void face, scarf, skull pins, jagged cloak, compass belt, tube holsters, image-right mist leg |
| WEAPON_CONTINUITY | PASS — 2 revolvers in every pose, holsters empty |
| HAT_MATCH | PASS (FIRE hat slightly smaller/narrower brim) |
| BELT_MATCH | PASS |
| CLOAK_MATCH | PASS |
| SPECTRAL_COLOR_MATCH | **PARTIAL** — FIRE mist is paler grey-blue with crack lines; the other four are saturated electric blue. Visible at 160–241 px, but FIRE is on screen ≈120–250 ms |
| GROUND_CONTINUITY | PASS (0 px across all transitions) |
| CANVAS_CONTINUITY | PASS (one 1720² canvas, one scale) |
| NO_CLIPPING | PASS in the staged canvases. The IDLE_V2 *source* hat-spike tip touches its top edge (2 px) and mist touches the right edge (6 px): cut at generation, negligible |

```
P04_COMBAT_SET=LOCK_READY (note: FIRE mist tone variance; regenerating FIRE would be the only fix and is out of scope)
LIVE_MAPPING_CHANGED=NO  PRODUCTION_ASSETS_CHANGED=NO (7/7)  DATABASE_CHANGED=NO
TYPECHECK=PASS  LINT=PASS  TESTS=3/3 runnable PASS  IOS_BUNDLE=PASS  ANDROID_BUNDLE=PASS (staged excluded)
```

## PHASE 3B plan (not started)
Lessons from P04, applied to NPC09/15/18/19/20/22:
1. **Generate the full pose set first, from the locked idle only.** Never chain references pose-to-pose; that is how P04 drifted.
2. **One image per request**, native PNG download. No sheets.
3. **Prompt requirements:** "body as large as the reference: hat top ≈ y20, boot ≈ y1240", plus an explicit weapon count per pose.
4. **Review identity against the idle** on belt, cloak, palette and hat, not only on face and weapons.
5. **Measure scale by hand** (medallion/hat/height). Auto hat-width measurement fails with raised arms. Kneeling bodies need a per-source scale.
6. **One common canvas per character** from the union bounds; register it in `REDESIGN_ART_META`.
7. **Runtime slots:** NPCs use idle/draw/fire/hit/down (KNEEL) plus `NPC_COMBAT_POSES` fall/down. Confirm per NPC before generating.
