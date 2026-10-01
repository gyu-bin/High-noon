# NPC01 final integration — approved asset record

Branch: dev-2.0. Human approval received on 2026-09-30: DOWN candidate 03 and
the existing normalized Ground Revolver. No regeneration or redesign.

## Locked registration

- `NPC01_FALL_normalized.png` → `assets/images/combat/npc/01/fall.png`
- `NPC01_DOWN_normalized.png` → `assets/images/combat/npc/01/down.png`
- `PLAYER_GROUND_REVOLVER_normalized.png` → `assets/images/combat/weapons/ground-revolver.png`

Each production asset is a byte-identical copy of its approved normalized output.
All original candidates and weapons remain preserved. Review preparation now
refuses to overwrite normalized outputs after registration.

FALL SHA-256: `da77baf2d85c37ddf948ea7b7df8197df6de7747e3f2abee2b403d3910532056`.
DOWN SHA-256: `aae30f8fc1df930bd41dd34469814872907c01ff6ef69e406d820a90265bf00a`.
Ground SHA-256: `a9890ecafcb4e55559020ea212878368f6df100e83bcbe8e606d51ac82965778`.

## Existing normalization, unchanged after approval

DOWN: 1254×1254 RGBA/true alpha. Downscale to 1129×1129 (0.900319),
integer translation (75,342), alpha bbox (102,769,1176,1211). No rotation,
warping, sharpening, upscaling or colour change. Existing NPC validator PASS.

Ground Revolver: 1254×1254 RGBA/true alpha. Downscale to 1031×1031
(0.822169), integer translation (112,95), alpha bbox (133,466,1133,838).
Visible weapon width 1000px. No hand, arm, glove, floor or baked shadow.

The existing revolver row-span validator still reports FAIL (34% transparent
share). Its geometry heuristic includes exterior space beneath the angled
barrel/grip. Connectivity inspection found only trigger-guard openings.
This is a human-approved manual exception, NOT an automated PASS. Neither alpha
nor validator was modified.

## Integrated checkpoint

NPC01_FALL=LOCKED_UNCHANGED
NPC01_DOWN=HUMAN_APPROVED_CANDIDATE_03
GROUND_REVOLVER=HUMAN_APPROVED_NORMALIZED
ASSET_INTEGRATION=REGISTERED
FINAL_NPC_SCALE=1.30
FINAL_NPC_Y=0.76_HEIGHT_FOOT_ANCHOR
NPC_BATCH_EXPANDED=NO
PRODUCTION_ORIGINALS_OVERWRITTEN=NO

See `../combat-v3-simulator/REPORT.md` for Simulator evidence and verification
limitations. NPC02–22 and Player01–04 FALL/DOWN production was not started.
