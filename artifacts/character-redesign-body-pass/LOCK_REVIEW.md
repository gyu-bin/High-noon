# HIGH NOON — Identity Master lock review (round 3, NPC19 final)

2026-10-01 · `dev-2.0` · review only. Round 2 NPC19, the round 2 review outputs and the round 2 report are kept in `intake-backup/round2/`.

## Intake
- The attachment was WebP. The same image exists as a lossless PNG export, `~/Downloads/ChatGPT 이미지 2026년 10월 1일 오전 09_07_44.png` (1254² RGBA). Mean pixel diff vs the attachment is 4.0, i.e. compression only. That PNG was copied into `intake/` under its export name and as `NPC19_VOID_WALKER.png`.
- The other 6 intake SHA-256 hashes are identical before and after (6/6). Production idle SHA-256 is identical before and after (7/7).
- `review_body_pass.py` was run unmodified. A–F were regenerated.

## NPC19
```
DECISION=APPROVE_WITH_NORMALIZATION
FILE_QUALITY=good (sharpness 3037)
PNG_ALPHA=PASS (PNG, RGBA, 44.7% alpha=0, max 255; white 1.0%, black 0.01%, red/orange 0%)
CROP=PASS — no edge contact; gun barrel, boots and fragments are all inside the canvas
UPPER_MARGIN=12px (hat ornament spike); hat crown fully inside
BOTTOM_MARGIN=6px (boots)
BODY_DIFFERENTIATION=good — revolver held low at the side, opposite forearm and hand disconnected by void, asymmetric stance, broken coat panels
SILHOUETTE=low-gun, left-trailing cloak, floating fragments on both sides; no raised arm, no open-palm pose, not frontal
FANTASY_READ=VOID — black-hole face, starfield inside torso, legs and cloak, real broken sections, fragments
160PX_READABILITY=PASS — black-hole face and violet starfield read at 160
WEAPON_COUNT=1 (in hand; thigh holster is an empty capped tube)
NORMALIZATION_REQUIRED=YES (same as the other 6)
REVISION_GOAL_MET=YES — low gun, no NPC18 pose, no NPC09 frontal boss pose, top margin restored
MAIN_RISK=core outline IoU stays high, because all 7 share the left-trailing cloak mass. The pose separation is visual, not reflected in IoU
```

## Comparisons (aligned solid-core IoU)
| Pair | Round 2 | Round 3 |
| --- | --- | --- |
| NPC19~NPC18 | 0.694 | **0.719** |
| NPC19~NPC09 | 0.727 | **0.682** |
| NPC19~NPC22 | 0.674 | **0.725** (highest pair in the set) |
| NPC19 vs previous NPC19 (script: batch A+B candidate) | 0.579 | 0.604 |
| NPC19 vs round 1 / round 2 file (raw canvas) | — | 0.547 / 0.694 |

Read: IoU against NPC18 and NPC22 went **up**, not down. Visually, the arm/gun pose is now clearly different from NPC18 (low gun vs raised gun with halo). The cores still overlap because the cloak trailing to the lower left dominates the solid mass for NPC19, NPC18 and NPC22. NPC19 vs NPC22 is separated by value (void black/violet vs ash white) and by the fragments vs the horse skull.

```
POSE_DUPLICATION_WITH_NPC18=NO (resolved visually; core IoU 0.719)
POSE_DUPLICATION_WITH_NPC09=NO (NPC09 frontal, wide planted, two guns; core IoU 0.682)
```

## All 7
```
P04=APPROVE_WITH_NORMALIZATION
NPC15=APPROVE_WITH_NORMALIZATION
NPC19=APPROVE_WITH_NORMALIZATION
NPC20=APPROVE_WITH_NORMALIZATION
NPC09=APPROVE_WITH_NORMALIZATION
NPC18=APPROVE_WITH_NORMALIZATION
NPC22=APPROVE_WITH_NORMALIZATION

APPROVED=—
APPROVE_WITH_NORMALIZATION=P04, NPC15, NPC19, NPC20, NPC09, NPC18, NPC22
NEEDS_MINOR_REVISION=—
REJECTED=—

IDENTITY_MASTER_STATUS=LOCK_READY (7/7)

BODY_TEMPLATE_DUPLICATION=REDUCED_NOT_ELIMINATED (accepted) — quilt material, hat mold, belt/capped-tube holster/spur hardware and left-trailing cloaks shared; core IoU mean 0.643
TOO_SIMILAR_PAIRS (outline only)=NPC19~NPC22 0.725, NPC19~NPC18 0.719, NPC18~NPC22 0.711, NPC15~NPC22 0.706 — all separated by color/value and pose at 160–256px
WEAPON_COUNT_VIOLATIONS=NONE (P04 2, NPC15 2, NPC19 1, NPC20 2, NPC09 2, NPC18 1, NPC22 1)
OPEN_CROP_NOTES=NPC18 halo tip 3px top, NPC09 cape tip 8px right (minor, effect-only)

PRODUCTION_HASH_CHECK=7/7 SAME
OTHER_6_INTAKE_HASH_CHECK=6/6 SAME
PRODUCTION_CHANGED=NO
CODE_CHANGED=NO
DATABASE_CHANGED=NO
```

## Next-step plan (not started)
- **PHASE 1 Normalization:** mark hat top, belt, and boot sole manually per character (the automatic estimates fail with floor-length cloaks). Uniform downscale + X/Y translation only, no upscale or warp. The decision needed is between margin and body size (the cloaks fill the canvas) vs a wider runtime canvas. Output goes to artifacts and is overlay-checked against production idle.
- **PHASE 2 Production IDLE / poster integration:** replace `clarity/*/idle.png` and the NPC `identity_poster.png` after approval. Record the old hashes for rollback. P04 is a player character, so its select surface is checked too.
- **PHASE 3 NPC Select + Duel visual QA:** in the simulator, dark and light, at device sizes. Watch NPC15 on dark backgrounds.
- **PHASE 4 Combat poses** DRAW/FIRE/HIT/KNEEL/FALL/DOWN: lock each weapon configuration (above) and the empty-holster rule. Keep the identity marks (void face, horse skull, eyes, halo, echoes) in every pose.
- **PHASE 5 Runtime supernatural VFX:** supplement only (NPC20 echo, NPC18 eye pulse, NPC19 particles, NPC15 edge smoke, NPC09 embers, P04 mist, NPC22 ash). The baked identity stays.

STOP.
