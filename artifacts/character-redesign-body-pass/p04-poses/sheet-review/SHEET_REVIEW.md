# P04 pose sheet review (2026-10-01): not intaken

Input: one attachment `P04_pose_sheet_attachment.webp`, 1125×1001 lossy WebP, 2×2 sheet (DRAW / FIRE / HIT / KNEEL).
No matching lossless PNG was found in ~/Downloads.

## Blocking: resolution
Each pose cell is ≈562×500, with a figure ≈490 px tall. The locked idle source figure is 1242 px tall.
Matching the body scale would need ≈2.5× **upscale**, which is forbidden.
The brief also requires separate 1254² lossless PNGs per pose, so none was normalized or staged.

## Identity / pose notes (to fix in the regeneration)
| Pose | Read | Issue |
| --- | --- | --- |
| DRAW | dual revolvers raised, hat/void face/coat match | Arms spread in opposite directions (one gun up-left, one right); should rise together toward image-left aim |
| FIRE | dual fire, controlled stance | **Guns fire in opposite directions** (left and right); a duel has one opponent → both aimed image-left. Large baked blue muzzle blasts; brief asked for none/tiny (the runtime adds a flash) |
| HIT | recoil, guns still held, debris | Acceptable direction; both guns flung outward |
| KNEEL | one knee down, guns lowered, clearly different from HIT | Good pose read |
| All | — | **Spectral leg lost:** the locked idle's right leg dissolves into mist below the knee, but all 4 poses have two solid boots. Mist/cape volume is wider than the idle. Weapon count 2, holsters empty: OK |

Production/staging untouched; nothing written to `assets/`.
