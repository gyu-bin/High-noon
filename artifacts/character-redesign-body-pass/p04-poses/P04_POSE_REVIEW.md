# PHASE 3A: P04 combat pose review (2026-10-01)

## Inputs (all lossless 1254² RGBA PNG, originals kept in intake/)
| Slot | File | Source |
| --- | --- | --- |
| draw | P04_DRAW.png | …11_02_20.png |
| fire | P04_FIRE.png | …10_23_04.png |
| hit | P04_HIT.png | …12_15_19-4.png |
| down (KNEEL) | P04_KNEEL.png | …12_19_26.png |

`build_p04_poses.py` ran with manual belt-buckle anchors and no scale correction (0.9844, the idle transform, for all poses).
The staged files were written to `assets/images/characters/staged/redesign-v2/player/04/{draw,fire,hit,down}.png`. They are **not** registered in `REDESIGN_STAGED_SOURCES` (evidence only).
Production unchanged.

## Result: NOT LOCK_READY — identity drift vs the locked idle
The 4 poses are consistent **with each other**, but the set has drifted from the locked IDLE (`intake/P04_GHOST_GUNSLINGER.png`):

| Element | Locked IDLE | Pose set |
| --- | --- | --- |
| Belt | bullet loops, square buckles, cross pendant | big compass medallion, tube holsters, chains with star pendants |
| Spectral palette | pale icy blue-white, wispy | saturated electric blue, dense curled mist |
| Coat | lean tattered duster, ragged wisps | bulky layered spiky-leaf cape |
| Silhouette | narrow, lean | wide, heavy |
| Hat | tall tilted crown, ragged brim | cylindrical crown with spike, wide flat brim |

In-game, IDLE→DRAW would visibly swap the costume. See `review/A_idle_draw_fire.png`.

**Reviewer error:** the drift began with FIRE candidate 1. I checked the hat, face and leg, but compared the belt and cape against the pose candidates instead of against the idle. It was carried forward from there.

## Other findings
- **FIRE clipped:** aligning the belt shifts the gun barrels past the 1446 canvas edge. This needs a wider canvas or a smaller horizontal shift.
- **Weapons:** 2 guns in every pose, holsters empty ✓.
- **Ground:** feet sit on one line in every pose (ground_dy ≤ 1 px) ✓.
- **Spectral leg:** the image-right leg dissolves in all poses ✓.

```
DRAW/FIRE/HIT/KNEEL: IDENTITY_MATCH=FAIL (vs idle), WEAPON_COUNT=2, CANVAS_MATCH=PASS (FIRE clipped), GROUND=PASS
P04_POSE_IDENTITY=FAIL
WEAPON_CONTINUITY=PASS
CANVAS_CONTINUITY=FAIL (FIRE barrel clipped)
GROUND_CONTINUITY=PASS
DRAW_FIRE_CONTINUITY=FAIL (costume change at IDLE→DRAW)
HIT_RECOVERY_CONTINUITY=FAIL (HIT→IDLE costume change)
KNEEL_FALL_DOWN_CONTINUITY=N/A (player has no FALL/DOWN slot)
P04_COMBAT_SET=NOT_LOCK_READY
```

## Options (human decision)
- **A. Keep the locked IDLE and regenerate the 4 poses** with the IDLE PNG as the *only* reference. Do not attach FIRE. Add to the prompt: "bullet-loop gun belt with square buckles, no compass medallion, no tube holsters; pale icy wispy mist; lean tattered duster".
- **B. Re-lock P04 to the pose-set look:** regenerate IDLE in the pose-set style. This overrides the "do not regenerate IDLE" rule, and P04 normalization/staging must be redone. The 4 poses are already mutually consistent.
