# Face-off pose direction + defeat fix

Branch: `dev-2.0`. No commit or push performed. No assets generated, edited, or deleted.

**VISUAL_RESULT=NEEDS_ADJUSTMENT**

The P01/NPC01 live arena now uses the existing clean face-off cutouts with coherent inward body, face, and barrel direction. Final defeat stays latched through the result handoff instead of reverting to idle when the transient defeat flag clears. The requested all-character direction standard is not satisfied by the existing artwork, and an actual player victory was not verified.

## Requested report

The first ten direction fields below refer to P01/NPC01. They do not certify the other character combinations.

| Field | Result |
| --- | --- |
| PRE_DUEL_PLAYER_AIM | PASS for existing waist/abdomen-level inward aim; no newly raised-arm artwork |
| PRE_DUEL_NPC_AIM | PASS for existing inward abdomen aim; barrel remains slightly down-left |
| READY_PLAYER_FACING | PASS, actual gameplay |
| READY_NPC_FACING | PASS, actual gameplay |
| STEADY_PLAYER_AIM | PASS, actual gameplay |
| STEADY_NPC_AIM | PASS, actual gameplay |
| BANG_PLAYER_AIM | PASS in native production-renderer replay; actual player shot NOT_VERIFIED |
| BANG_NPC_AIM | PASS, actual NPC shot in gameplay |
| NPC01_RIGHT_SIDE_FACING | PASS, existing face-off source faces left without mirroring |
| FACE_EACH_OTHER | YES for P01/NPC01; NO for the complete requested character coverage |
| NPC_FINAL_DEFEAT | PASS in animated native production-renderer replay, including dedicated FALL and prone DOWN; actual won match NOT_VERIFIED |
| PLAYER_FINAL_DEFEAT | PASS in actual gameplay, existing kneeling/down terminal pose |
| DEFEATED_CHARACTER_REMAINS_DOWN | PASS for actual player loss through result handoff and NPC renderer replay; lifecycle regression checks also pass |
| P01_NPC01 | NEEDS_ADJUSTMENT_VERIFICATION: observed presentation passes, but actual player shot/victory remains unverified |
| P02_NPC09 | NEEDS_ADJUSTMENT: P02 face/body oppose barrel; NPC09 strict gaze remains ambiguous |
| P03_NPC15 | NEEDS_ADJUSTMENT: P03 face/body oppose barrel; NPC15 clean DRAW still aims downward |
| P04_NPC22 | NEEDS_ADJUSTMENT: P04 gaze cannot be certified; NPC22 clean DRAW points upward |
| TYPECHECK | PASS |
| LINT | PASS, including separate lint of the new helper |
| TESTS | PASS, 10 regression files; 13 face-off presentation checks |
| IOS_BUNDLE | PASS, production Expo export; not a signed native build |
| ANDROID_BUNDLE | PASS, production Expo export; not an Android visual verification |
| VISUAL_RESULT | NEEDS_ADJUSTMENT |

## Implementation and preserved scope

- `constants/npcFaceoffPoseArt.ts`: per-character/per-pose source direction and clean aim-hold selection. P01/NPC01 reuse their registered transparent face-off assets for standing stages and actual-shot presentation, rather than their ordinary FIRE artwork whose face and barrel disagree. Actual shots add existing recoil, muzzle flash, and smoke. This is an explicit artwork substitution: it does not create a new dedicated FIRE drawing.
- `components/game/NpcPreDuelScreen.tsx`: selects aim-hold art with the corresponding slot direction. P01/NPC01 already used these same pre-duel cutouts; their original gun height is preserved. Other IDs use the best available clean production pose.
- `components/game/NpcFaceoffDuelArena.tsx`: selects standing art, places its existing muzzle effects at the selected barrel, and preserves final defeat until hearts recover or the duel identity/round changes. Zero hearts alone do not reveal defeat early. BANG alone does not show baked FIRE effects before the actual NPC shot.
- `tests/npc-faceoff-presentation.cjs`: covers shot-effect gating and final-defeat reveal/hold/reset lifecycle, including result handoff and returning to a previous identity.

The locked `constants/npcFaceoffPresentation.ts` is byte-identical to HEAD. Portrait scale ×0.92, outward offset approximately 2.5% per side, lane centers, ground line, landscape layout, HUD, and background choices were not tuned. Different source-image sole positions are aligned to the same existing ground line. No clipping or HUD/signal overlap was observed in the captured portrait sequences, including muzzle flash/smoke.

Combat engine/result timing, hearts, difficulty, abilities, Supabase, NPC Select, Result UI, Local Duel, Home, player selection, pose registries, and source assets are unchanged. The result-handoff fix is in the arena presentation latch; the combat screen remains unchanged.

## Actual iPhone 17 portrait evidence

Native iOS 27 simulator, 402×874 points / 1206×2622 pixels. Background music and sound effects were confirmed off. No Android or landscape visual claim is made.

Actual production flow and combat engine:

- [Pre-Duel](preduel-final-live.png)
- [READY](ready-live.png)
- [STEADY](steady-live.png)
- [BANG](bang-live.png)
- [Actual NPC firing and hit sequence](live-bang-vfx-frames.jpg)
- [Player final defeat](player-final-defeat-live.png)
- [1× actual duel recording](after-live-p01-npc01-1x.mp4)

The actual recording includes normal signal progression, NPC shots, early/timeout losses, player final kneeling defeat, Continue, and the production defeat Result. Touch automation did not produce a verified player shot/victory. Therefore actual NPC loss in a won match is explicitly NOT_VERIFIED.

Animated native production-component replay, using the existing development capture route (not a won match and not a static mockup):

- [NPC01 defeat sequence](npc-final-sequence.jpg), [1× replay](npc-final-runtime-replay-1x.mp4), [prone terminal pose](npc-final-down-runtime.png)
- P02/NPC09: [sequence](P02-NPC09-native-sequence.jpg), [Pre-Duel](P02-NPC09-preduel-native.png), [terminal DOWN](P02-NPC09-player-shot-final-terminal.png)
- P03/NPC15: [sequence](P03-NPC15-native-sequence.jpg), [Pre-Duel](P03-NPC15-preduel-native.png), [terminal DOWN](P03-NPC15-player-shot-final-terminal.png)
- P04/NPC22: [sequence](P04-NPC22-native-sequence.jpg), [Pre-Duel](P04-NPC22-preduel-native.png), [terminal DOWN](P04-NPC22-player-shot-final-terminal.png)

These replays exercise the real renderer with timed props, showing READY, STEADY, actual-shot effects, hit/recovery, and final fall/down. They provide animation and clipping evidence, but do not certify actual combat outcomes or input timing.

## Remaining artwork constraints

[Source audit](source-direction-audit.md) and [metadata](source-direction-metadata.json) cover P01–P04 and NPC01/09/15/18/19/20/22. Horizontal mirroring cannot fix a face and barrel drawn in opposite directions. P02/P03 have no eligible clean current-identity substitute. NPC15/19/22 clean DRAW has unsuitable gun elevation, while FIRE contains painted flash/smoke and cannot serve as a clean aim hold. NPC09/18/P04 directional gaze remains ambiguous. NPC20 has a coherent clean left-facing DRAW source, but was source-audited only.

All seven inspected NPCs have registered dedicated FALL/DOWN artwork. The three spot-check NPCs were observed prone in native replay. Player terminal artwork is the existing supported kneeling defeat pose. No first-person ground POV, floating gun, shoulder presentation, or temporary rotation hack was introduced.

The requested universal pose-direction result cannot be marked PASS using these existing assets under the current no-asset-edit constraint. No unrequested asset work was performed.

## Validation and hygiene

Logs: [typecheck](typecheck.log), [lint](lint.log), [full tests](tests.log), [helper lint](focused-lint.log), [iOS export](ios-bundle.log), [Android export](android-bundle.log).

`git diff --check` passes. No files are staged, no production files are deleted, and capture media is ignored by repository policy. The only production changes are the two presentation components and the new pose-art helper; tests and QA text are separate. See [scope verification](scope-verification.json).

COMMIT_PUSH=NOT_PERFORMED

STOP.
