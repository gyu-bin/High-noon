# NPC Duel — third-person face-off pass

Branch: `dev-2.0`. No commit or push.

NPC Duel now renders the production full-body player on the left and NPC on the right. Both actors share one layout scale and ground line. Wide capes, horses, and baked echoes reduce both actors together to preserve their silhouettes and central separation. Existing production mappings, expanded-canvas metadata, backgrounds, signal board, HUD information, reaction timelines, and VFX are reused. Ranked and Local retain their previous render paths.

The implementation and layout checks passed. Strict face-to-face FIRE artwork is only partially satisfied: some existing production FIRE images have the head looking opposite the barrel. A horizontal flip cannot align both simultaneously; barrels point inward. No assets were regenerated to hide that limitation.

```text
NPC_DUEL_LAYOUT=PASS — full-body left/right face-off; overall strict facing is PARTIAL
PLAYER_POSITION=LEFT
NPC_POSITION=RIGHT
FACE_EACH_OTHER=PARTIAL — inward idle/draw silhouettes and FIRE barrels; some original FIRE head gazes conflict
SAME_GROUND_LINE=PASS — production foot metadata; P02 down sole offset; runtime checked
SCALE_CONSISTENCY=PASS — production display scale retained; both actors reduced together when required

READY_POSE=PASS — idle
STEADY_POSE=PASS — draw
BANG_POSE=PASS — existing fire on actual shot flags; inward barrels
HIT_POSE=PASS — existing hit/reaction and recovery timelines
FINAL_DEFEAT=PASS — existing NPC hit/stagger/kneel/fall/down; existing PlayerCharacterSprite hit/down

FIRST_PERSON_WEAPON_REMOVED=YES — absent from NPC face-off render path; rollback assets retained
OVER_SHOULDER_REMOVED=YES — absent from NPC face-off render path
NEW_CHARACTER_ASSETS_ADDED=0

BACKGROUND_REUSED=YES — twilight town, dusty canyon, moonlit frontier; match-held selection retained
HUD_REUSED=YES — existing YOU/portrait/hearts, ROUND, NPC/portrait/hearts information and styling
MUZZLE_VFX_REUSED=YES — muzzleFlash and gunSmoke; measured mirrored anchors; runtime shot replay checked

P01_NPC01_QA=PASS_LAYOUT_POSES_REACTIONS — FIRE head-gaze limitation applies
P02_NPC09_QA=PASS_LAYOUT_POSES_REACTIONS — current production v2; FIRE head-gaze limitation applies
P03_NPC15_QA=PASS_LAYOUT_POSES_REACTIONS — current production v2; FIRE head-gaze limitation applies
P04_NPC22_QA=PASS_LAYOUT_POSES_REACTIONS — 04-v2 and NPC22-v2; horse/cape preserved; FIRE head-gaze limitation applies

IPHONE_PORTRAIT=PASS_LAYOUT_AND_REACTIONS — actual iPhone 17 simulator, Expo Go native development runtime
IPHONE_LANDSCAPE=NOT_VERIFIED — release configuration is portrait-locked; landscape layout mathematics tested only
ANDROID_VISUAL=PASS_LAYOUT_POSES — isolated Small_Phone emulator, Expo Go SDK54; four required pairs, READY/STEADY/BANG/DOWN

TYPECHECK=PASS
LINT=PASS
TESTS=PASS — 10 regression files, including 6 new face-off checks
IOS_BUNDLE=PASS — production JavaScript/assets export; not a signed native Release build
ANDROID_BUNDLE=PASS — production JavaScript/assets export; not a signed native Release build

COMBAT_LOGIC_CHANGED=NO
SUPABASE_CHANGED=NO
OTHER_SCREENS_CHANGED=NO — production screens; development capture harness extended for QA

BLOCKERS=Strict FIRE head gaze cannot be fully aligned using the supplied production images and horizontal flip alone. Landscape release runtime remains unverified due to portrait lock.
```

## Runtime evidence

iPhone 17: iOS 27 simulator `66B81EA7-8132-4677-A443-2C5F96FB06ED`.

- Actual `/game/npc` engine recording: [P01–NPC01 live three-round match](captures/P01-NPC01-live-round.mp4). READY/STEADY/BANG and NPC firing followed by player damage, recovery, and final defeat were observed; hearts decreased 3 → 2 → 1 → 0. This was a timeout-loss run, not a successful player-shot timing test.
- Production-renderer presentation replays: [nonlethal NPC hit/recovery](captures/P01-NPC01-survive-runtime.mp4), [NPC final defeat](captures/P01-NPC01-final-runtime.mp4), [player final defeat](captures/P01-NPC01-player-final-runtime.mp4), [player shot and muzzle VFX](captures/P01-NPC01-player-shot-runtime.mp4), [NPC22 final defeat](captures/P04-NPC22-final-runtime.mp4). These development capture replays inject pose/shot/hearts props; they do not constitute engine outcome tests.
- Seven iPhone pairs each have 11 native screenshots: READY, STEADY, BANG, hit, recover, kneel, fall, down, player hit, player recover, player down. Additional canyon and moonlit screenshots confirm background reuse. Screenshots are actual native rendering from the development capture route, not image mockups.
- Android: 720 × 1280 isolated emulator with temporary userdata in `/tmp/highnoon-faceoff-avd`; existing installed user apps were preserved. Sixteen native screenshots cover four required pairs and four stages. Android visual QA did not exercise a live combat round.

| Pair | iPhone stage sheet | Android stage sheet |
| --- | --- | --- |
| P01 / NPC01 | [View](captures/P01-NPC01-qa.jpg) | [View](captures/Android-P01-NPC01-qa.jpg) |
| P02 / NPC09 | [View](captures/P02-NPC09-qa.jpg) | [View](captures/Android-P02-NPC09-qa.jpg) |
| P03 / NPC15 | [View](captures/P03-NPC15-qa.jpg) | [View](captures/Android-P03-NPC15-qa.jpg) |
| P04 / NPC22 | [View](captures/P04-NPC22-qa.jpg) | [View](captures/Android-P04-NPC22-qa.jpg) |
| P01 / NPC18 | [View](captures/P01-NPC18-qa.jpg) | — |
| P02 / NPC19 | [View](captures/P02-NPC19-qa.jpg) | — |
| P03 / NPC20 | [View](captures/P03-NPC20-qa.jpg) | — |

## Verification and scope

`npm run typecheck`, `npm run lint`, `npm test`, both `expo export` platform bundles, and `git diff --check` completed successfully after the final code edits. Logs: [tests](validation.log), [lint](lint.log), [iOS export](ios-bundle.log), [Android export](android-bundle.log), [coverage capture](capture.log). Code review found no remaining actionable implementation defect.

The new renderer only consumes authoritative existing game props. The production NPC route changes by one opt-in prop. Shared sprite changes are optional parameters with the previous defaults. No combat engine, timing, ability rules, score, hearts, progression, Supabase, asset files, Home, selection, Result, Local, or Ranked screen code was changed.

The attachment available in this task contained the written request only; the mentioned last reference image was unavailable. Composition was verified against its written left/right full-body specification.

Capture media are local ignored QA artifacts. Logs, report, implementation, and helper/test files remain uncommitted. Work stopped without commit or push.
