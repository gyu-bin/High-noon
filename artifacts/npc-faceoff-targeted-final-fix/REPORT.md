# HIGH NOON — FACE-OFF TARGETED FINAL FIX

Branch: `dev-2.0`. Final verification: 2026-10-13. No commit or push performed; HEAD remains `259583f3eec7b242c8cb47fe500ce9e44816cac7`.

```text
STEADY_POSE_STRATEGY=EXISTING_CLEAN_FIRE_HOLD + TARGETED_DRAW

P02_FIRE=PASS
P03_FIRE=PASS
NPC15_DRAW=PASS
NPC19_DRAW=PASS_WITH_ACCEPTABLE_FEATURELESS_FACE_LIMITATION
NPC22_DRAW=PASS_WITH_ACCEPTABLE_FEATURELESS_FACE_LIMITATION

NEW_ASSET_COUNT=5

P01=PASS_UNCHANGED
P02=PASS
P03=PASS
P04=ACCEPTABLE_UNCHANGED

NPC15=PASS
NPC19=ACCEPTABLE
NPC22=ACCEPTABLE

FACE_EACH_OTHER=PASS_WITH_ACCEPTABLE_EXISTING_FACE_LIMITATIONS
STEADY_AIM=PASS
BANG_AIM=PASS

NPC_ACTUAL_DEFEAT_QA=PASS_ACTUAL_ENGINE_WITH_DEV_AUTOMATED_INPUT

LAYOUT_CHANGED=NO
COMBAT_LOGIC_CHANGED=NO
SUPABASE_CHANGED=NO

TYPECHECK=PASS
LINT=PASS
TESTS=10/10_REGRESSION_FILES_PASS; 19/19_FACEOFF_CHECKS_PASS
IOS_BUNDLE=PASS
ANDROID_BUNDLE=PASS

VISUAL_STATUS=PASS_WITH_ACCEPTABLE_LIMITATIONS
COMMIT_READY=YES
```

## Production integration

Exactly five generated poses are integrated, with no other generated production images:

| Target | NPC-exclusive production path | Selection |
|---|---|---|
| P02_FIRE | `assets/images/characters/clarity/player/02-v2/fire-faceoff.png` | Player FIRE / clean STEADY hold |
| P03_FIRE | `assets/images/characters/clarity/player/03/fire-faceoff.png` | Player FIRE / clean STEADY hold |
| NPC15_DRAW | `assets/images/characters/clarity/npc/15-v2/draw-faceoff.png` | NPC aim / STEADY only |
| NPC19_DRAW | `assets/images/characters/clarity/npc/19-v2/draw-faceoff.png` | NPC aim / STEADY only |
| NPC22_DRAW | `assets/images/characters/clarity/npc/22-v2/draw-faceoff.png` | NPC aim / STEADY only |

All five shared original FIRE/DRAW files were restored byte-for-byte. The new references exist only in `faceoffStandingArt`; global CLARITY registries remain unchanged. This avoids changing Local/Ranked art and their existing muzzle attachments. NPC READY uses its original DRAW, and actual NPC FIRE retains its original asset.

The 15 ordinary NPCs use their existing clean FIRE for STEADY; NPC09/NPC18 retain their existing FIRE holds. NPC15/19/22 use the three approved new DRAW images; NPC20 retains its clean existing DRAW. P01/NPC01 retain their approved coherent faceoff cutouts. Held frames activate no muzzle flash, smoke, or recoil; actual shot flags still control the existing effects.

Identity references, exact prompts, original output paths and hashes are recorded in [generation-prompts.json](generation-prompts.json) and [integration.json](integration.json). NPC generation used only each current production idle identity. Original rollback copies remain locally available and unstaged.

## Canvas and layout continuity

Runtime portrait scale remains the previous faceoff scale × 0.92. Outward offsets remain approximately 2.5% each side. Player LEFT, NPC RIGHT, shared ground, HUD, background and all layout/bounds constants remain unchanged.

Expanded NPC canvases were uniformly normalized to their existing idle body height and sole line. Final sole differences are at most one source pixel. Additional containment uses only source-canvas horizontal alignment: P02 −33px, NPC19 −7px, NPC22 −28px. P03 required horizontal resampling to 1192/1254 of its generated width and a −23px canvas translation; vertical size, crown and sole are unchanged. There is no additional runtime character scaling, rotation or facing hack.

P02 and P03 NPC-only muzzle attachment points follow the corrected barrel tips: `(37,199)/1254` and `(14,216)/1254`. Shared Local/Ranked anchors remain unchanged.

Actual PNG alpha bounds are tested against the frozen renderer math across 704 viewport/inset/player/NPC combinations. Independent artist verification also checked 264 iPhone portrait standing-pose combinations. No clipping or overlap; minimum outer guard approximately 2pt. See [locked-boundary-acceptance.md](locked-boundary-acceptance.md).

## Actual iPhone 17 portrait / 1× evidence

Native device: iPhone 17, iOS 27.0, 402×874 points / 1206×2622 capture. Production controller and engine were used; no static fixture or replay was counted as actual-play evidence.

| Pair | Actual coverage | Assessment |
|---|---|---|
| P01 / NPC01 | READY, STEADY, actual shots, three real wins, final defeat and actual Result | PASS; unchanged art |
| P02 / NPC09 | READY, clean STEADY, actual Player FIRE; final contained version won 138.8ms vs 290ms | PASS |
| P03 / NPC15 | READY, new STEADY DRAW, actual Player FIRE; final contained version won 137.5ms vs 215ms | PASS; boots visibly within native border |
| P03 / NPC18 | READY, STEADY, actual Player FIRE, existing red-eye effects | PASS; NPC art unchanged |
| P03 / NPC19 | READY, void-shrouded aim, actual Player FIRE; final version won 127.3ms vs 185ms | ACCEPTABLE; featureless face, body/barrel inward |
| P04 / NPC20 | READY, clean STEADY, actual NPC FIRE / unchanged echo behavior | ACCEPTABLE existing P04 face; aim PASS |
| P04 / NPC22 | READY, raised STEADY, blackout and post-shot; final version won 149.9ms vs 177ms | ACCEPTABLE featureless face; cape fully contained |
| P04 / NPC02 | READY, existing clean FIRE hold, actual Player shot, win 124.2ms vs 394ms | ACCEPTABLE unchanged art; additional generic hold coverage |

Players and NPCs aim inward at torso/chest/waist height. The existing masked/featureless faces of P04/NPC19/NPC22 do not permit an exact eye-gaze verdict; their body and weapon directions are coherent at 1×. NPC15 hides BANG text, NPC19 replaces STEADY with dots/void, and NPC22 blackens the screen during concentration. These existing ability effects were retained; an obscured instant is not presented as a fully visible eye-direction check.

Frame review also found a DEV first-download limitation: starting immediately while new images are still loading can retain the preceding bitmap briefly after the STEADY label changes. A further real P03/NPC15 run began only after the corrected pre-duel images were visibly loaded. It showed the raised aim throughout the stable STEADY interval and ordinary actual shooting (138.5ms vs 215ms); a brief bitmap-swap transient at the phase boundary remains acceptable at 1×. No timing, additional assets or layout changes were used to hide it. This simulator/Metro observation is not a claim about cold startup in an installed release build.

The final engine-driven NPC01 defeat was reviewed from native video: **BANG → HIT/STAGGER → KNEEL → FALL/DOWN → held DOWN → actual Result**. Player reactions were 150.3ms, 126.3ms and 133.2ms; the NPC reached zero hearts through ordinary outcomes. Final Result showed 3–0, 133.2ms vs 410ms. No idle reset before leaving the arena.

This victory uses an explicitly opt-in, hard-DEV-only input route (`/game/npc-qa`). It mounts the actual production NPC screen and invokes its normal shoot handler 100ms after actual BANG. The existing engine clocks, AI, abilities, hearts and outcome calculation remain authoritative. It is actual engine/controller validation with automated input, **not a manual physical-touch victory claim**. Production route defaults OFF; release builds redirect the QA route and omit the driver. Timer cleanup, latest-state gating and one input per round scope are covered by tests.

Evidence files:

- [Final isolated/contained actual gameplay, 1×](final-isolated-containment-1x.mp4)
- [Loaded-image actual pose transition, 1×](loaded-pose-transition-1x.mp4)
- [Loaded-image pose-transition frames](loaded-pose-transition-timeline.png)
- [Initial full roster actual gameplay, 1×](actual-roster-final-1x.mp4)
- [Actual NPC01 final defeat + Result recording, 1×](actual-engine-final-defeat-1x.mp4)
- [Final defeat motion frame sequence](final-defeat-motion-contact.png)
- [Actual final down capture](P01-NPC01-actual-final-down.png)
- [Actual 3–0 Result capture](P01-NPC01-actual-victory-result.png)
- [Final contained P03/NPC15 capture](P03-NPC15-final-contained.png)
- [Final contained P02/NPC09 capture](P02-NPC09-final-contained.png)
- [Final contained P04/NPC22 capture](P04-NPC22-final-contained.png)
- [Accepted pose preview](accepted-poses-preview.png)

## Scope and validation

The 1,381-file task-start fingerprint found only the intended arena DEV-input hook changed among the tracked files it covers. The helper/tests were separately reviewed; they include pose selection, attachment anchors, source isolation, final-pose hold and input/containment regression checks. The earlier pose-fix modifications to the arena/pre-duel screen remain present. No unrelated existing production files changed in this phase. No production deletions, shared asset changes, staged files, staged media or staged secrets. Full diff check passes. [code-lock-after.json](code-lock-after.json) records the comparison.

Home, Player Select, Local Duel, NPC Select, Result layout, engine/controller, abilities, combat timing and Supabase remain unchanged. Actual QA victory legitimately unlocked NPC02 in simulator-local progress. P01 was selected again; BGM and sound effects remain OFF.

Final validation after all asset isolation and containment changes:

- Typecheck: PASS ([log](typecheck.log)).
- Lint: PASS, including helper check ([log](lint.log)).
- Full runnable tests: 10/10 regression files PASS; faceoff suite 19/19 checks PASS ([log](tests.log)).
- iOS production bundle export: PASS ([log](ios-bundle.log)).
- Android production bundle export: PASS ([log](android-bundle.log)).
- iPhone portrait actual visual: PASS with the stated existing face/ability visibility limitations.
- iPhone landscape actual visual: NOT_VERIFIED.
- Android actual visual: NOT_VERIFIED. Bundle success is not device visual verification.

No remaining blocker found within this targeted NPC portrait scope. No commit or push; no additional asset generation beyond the five targets.
