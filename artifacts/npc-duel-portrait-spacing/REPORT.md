# NPC Duel — portrait spacing pass

`dev-2.0`, 2026-10-12. No commit or push. Previous uncommitted face-off work was preserved.

The portrait layout now tries outward X movement first, constrained by the complete idle/draw/fire silhouettes. The four required pairs already reached their safe horizontal boundaries at the previous scale, so X-only movement could not create more space. After an actual 5% comparison, the final portrait fallback uses exactly 92% of the previous fitted pair size and places both silhouettes toward their safe edges. Landscape returns the previous calculation unchanged. GroundY, assets, signals, HUD, muzzle logic, backgrounds, and combat were not changed in this pass.

Spacing improves within the requested 8% limit, with no observed clipping or overlaps. The strict 35–40% central opening target remains unmet: READY openings are 22.8–29.0% of the viewport; long FIRE silhouettes leave 14.4–24.7%. It would be misleading to mark the complete visual target PASS.

```text
PORTRAIT_PLAYER_CENTER_X=P01/NPC01 frame center 22.72%W; character-specific safe positions listed below
PORTRAIT_NPC_CENTER_X=P01/NPC01 frame center 77.20%W; character-specific safe positions listed below
PORTRAIT_SCALE_CHANGE=-8% of the existing fitted paired size for the four required pairs; portrait only

READY_SPACING=IMPROVED — clear openings 22.82–29.03%W; strict 35–40% target unmet
STEADY_SPACING=IMPROVED — clear openings 20.86–25.65%W; strict 35–40% target unmet
BANG_SPACING=IMPROVED — clear openings 14.37–24.68%W; strict 35–40% target unmet

GROUND_LINE=PASS_UNCHANGED — shared groundY; capture viewport ground 655.5pt at 402×874
CHARACTER_CLIPPING=NONE_OBSERVED — four pairs, all captured poses
SIGNAL_OVERLAP=NONE_OBSERVED — one active cue; heads/guns clear
HUD_OVERLAP=NONE_OBSERVED — previous HUD retained
MUZZLE_ALIGNMENT=PASS_UNCHANGED — anchor/flip/VFX code unchanged; native player/NPC shot recordings checked

P01_NPC01=PASS_SAFETY_AND_IMPROVEMENT — full visual target remains unmet
P02_NPC09=PASS_SAFETY_AND_IMPROVEMENT — full visual target remains unmet
P03_NPC15=PASS_SAFETY_AND_IMPROVEMENT — full visual target remains unmet
P04_NPC22=PASS_SAFETY_AND_IMPROVEMENT — full visual target remains unmet

TYPECHECK=PASS
LINT=PASS
TESTS=PASS — 10 regression files, including 8 NPC face-off checks

VISUAL_RESULT=NEEDS_ADJUSTMENT — strict 35–40% opening exceeds what the current silhouettes can provide within the 8% shrink cap
```

## Measured comparison

At iPhone 17 capture viewport 402 × 874pt, 16pt horizontal safe margins. Openings include the complete opaque artwork, including arms, guns, capes, and horses. Production gameplay uses 12pt side padding; the same relative algorithm applies there. The measurements are layout/source-alpha bounds, accompanied by actual native screenshots below.

| Pair | Fitted size before → after | READY gap | STEADY gap | BANG gap |
| --- | --- | --- | --- | --- |
| P01 / NPC01 | 249.24 → 229.30pt | 16.80 → 22.82%W | 14.67 → 20.86%W | 18.83 → 24.68%W |
| P02 / NPC09 | 176.23 → 162.13pt | 22.54 → 28.10%W | 17.51 → 23.47%W | 8.77 → 15.43%W |
| P03 / NPC15 | 181.90 → 167.34pt | 23.55 → 29.03%W | 19.87 → 25.65%W | 9.74 → 16.32%W |
| P04 / NPC22 | 152.99 → 140.75pt | 20.69 → 26.40%W | 18.29 → 24.19%W | 7.61 → 14.37%W |

The 22–25% / 75–78% nominal center target fits the pilot. Other expanded and offset production canvases require different frame positions to keep their complete FIRE artwork on screen. A frame center is not the center of the visible body. The artwork is neither recentered nor regenerated.

| Pair | Player frame center | NPC frame center | READY visible artwork centers, Player / NPC |
| --- | --- | --- | --- |
| P01 / NPC01 | 22.72%W | 77.20%W | 24.06% / 75.47% |
| P02 / NPC09 | 17.94%W | 71.74%W | 18.74% / 76.72% |
| P03 / NPC15 | 16.23%W | 69.96%W | 17.03% / 76.24% |
| P04 / NPC22 | 21.60%W | 80.55%W | 20.73% / 78.84% |

Exact values: [layout metrics](layout-metrics.json).

## Native runtime evidence

iPhone 17, iOS 27 simulator `66B81EA7-8132-4677-A443-2C5F96FB06ED`, Expo Go SDK54 native development runtime. Background music and effects were switched OFF in this simulator's app settings and both switch values verified as 0: [mute evidence](sound-off.png). No audio source code or host-wide volume setting changed.

- BEFORE: 12 screenshots, four pairs × READY/STEADY/BANG, taken before changing the layout.
- 5% trial: four screenshots plus [comparison](trial-5-comparison.jpg), used before choosing the permitted 8% maximum.
- AFTER: 32 screenshots, four pairs × READY/STEADY/BANG/HIT/RECOVER/FALL/DOWN/PLAYER-DOWN, using the final 8% layout. Production renderer and source assets are used by the development capture route; these fixed-frame captures inject pose props.
- [Actual 1× P01/NPC01 engine round](after/P01-NPC01-live-round.mp4): native gameplay start, READY → STEADY → BANG, NPC shot, player hit/recover, hearts 3 → 2, timeout-loss overlay. The 58.44s original recording includes the waiting screen and result hold; the combat was not sped up. This run does not verify successful player-shot timing. [Action frames](after/live-action-contact.jpg).
- [Player shot/muzzle replay](after/P01-NPC01-player-shot-runtime.mp4) and [P04/NPC22 final defeat replay](after/P04-NPC22-final-runtime.mp4): native presentation replays at their existing timers, not live engine outcome tests. Relative muzzle placement and the horse/cape defeat silhouette remain intact.

| Pair | BEFORE / AFTER comparison | All AFTER poses |
| --- | --- | --- |
| P01 / NPC01 | [View](P01-NPC01-comparison.jpg) | [View](P01-NPC01-all-poses.jpg) |
| P02 / NPC09 | [View](P02-NPC09-comparison.jpg) | [View](P02-NPC09-all-poses.jpg) |
| P03 / NPC15 | [View](P03-NPC15-comparison.jpg) | [View](P03-NPC15-all-poses.jpg) |
| P04 / NPC22 | [View](P04-NPC22-comparison.jpg) | [View](P04-NPC22-all-poses.jpg) |

## Validation and scope

[Typecheck](typecheck.log), [lint](lint.log), and [tests](tests.log) all completed with exit code 0. `git diff --check` passed. Eight layout checks include portrait gap improvement, the 8% cap, measured pose containment, and previous landscape coordinates. Independent reviewer comparison of 440 pair/dimension cases confirmed that disabled portrait tuning produces exactly the previous output. Code review found no actionable implementation defect or scope violation.

Only the portrait layout helper, its portrait-only renderer flag, two behavior regression checks, and QA artifacts were added/updated in this follow-up. The renderer's groundY expression and all muzzle/VFX code are identical to the start of this pass. Combat timing, hit logic, hearts, abilities, Supabase, character assets, background selection, NPC Select, Result, Local Duel, and Home code remain unchanged by this follow-up. Previous face-off edits remain uncommitted.

Bundles were not rerun for this arithmetic-only change with no import changes. The prior iOS/Android export PASS remains historical evidence; it is not claimed as a fresh export of this spacing revision.

Stopped without commit or push. The simulator app remains muted.
