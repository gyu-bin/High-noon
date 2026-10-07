# P01 over-shoulder candidates: sheets 1–4 (2026-10-06) — not intaken

All four are multi-pose sheets (PNG copies in ~/Downloads `…09_17_29-1 / 42-2 / 47-3 / 56-4.png`).
Sheets 1–2 are 1774×887 (3 panels ≈590×887 each). Sheets 3–4 are 1024×1536 with 3 poses and text labels.
None is a single 1024×1536 pose, so nothing was copied to `intake/` and no code was changed.

## Against the P01 identity (`clarity/player/01/idle.png`)
| Element | Production idle | Candidates |
| --- | --- | --- |
| Red cloth | small neckerchief tied at the throat | large tattered red shawl/cape over the shoulder (all 4 sheets) |
| Hat band | plain leather band with a buckle | studded band with round conchos |
| Coat | smooth brown duster with lapels | rougher, heavily textured coat; cross-body strap added (sheets 1, 3, 4) |
| Belt | bullet belt with square buckle | bullet belt ✓; sheet 4 adds a round medallion |
| Weapon | 1 revolver | sheets 1, 2, 4 show a gun in the hand AND a gun in the holster |

## Per sheet
| Sheet | Composition | Verdict |
| --- | --- | --- |
| 1 | Right-bottom rear 3/4, cropped ✓ | FIRE arm rises far too much (points steeply up). Holster still holds a gun while one is in hand |
| 2 | Side/profile view, full figure, not right-bottom | Not over-shoulder. Rejected |
| 3 | Right-bottom rear 3/4 ✓; READY low gun, AIM level, FIRE moderate rise | **Best composition.** Holster empty when the gun is drawn ✓. Has text labels; FIRE is on a differently sized panel |
| 4 | Full-length small figures, labels | Too small, FIRE points steeply up, gun in holster and hand. Rejected |

## Checks
```
IDENTITY_MATCH=FAIL (red shawl, studded hat band, strap, coat texture)
BODY_SCALE_MATCH=not measurable (sheets)
HAT_POSITION_MATCH=not measurable (sheets)
SHOULDER_LINE_MATCH=not measurable (sheets)
READY_TO_AIM_CONTINUITY=PASS in sheet 3 (visual)
AIM_TO_FIRE_CONTINUITY=PARTIAL in sheet 3; FAIL in sheets 1 and 4 (arm rises too far)
MUZZLE_DIRECTION=AIM points level-left; the opponent is up-left/centre, so the barrel should angle up about 25–35°
ALPHA_CLEAN=true alpha present; edges not inspected at full size
ORANGE_RIM=NONE
```
Result: STOP, no integration.
