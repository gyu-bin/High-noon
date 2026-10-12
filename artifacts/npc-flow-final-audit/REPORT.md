# NPC Flow Final Integration Audit

TARGET_BRANCH=dev-2.0
AUDIT_DATE=2026-10-13
COMMIT_PUSH=NOT_PERFORMED

승인된 portrait face-off 배치를 그대로 유지한 상태에서 working tree 전체를 검사했다. NPC 경로는 최종 전신 renderer를 직접 사용한다. Home, Player Select, Local Duel, 전투 로직, Supabase 변경은 없다. 아래 PASS는 기록된 검증 범위에 대한 결과이며, 미검증 범위는 별도로 표시했다.

```text
NPC_SELECT=PASS
NPC_DUEL=PASS
NPC_RESULT=PASS

PORTRAIT_SCALE=previous face-off fitted scale × 0.92; 추가 축소 0%
PORTRAIT_OUTWARD_OFFSET≈2.5%W each side; 실제 game 2.488%W
PLAYER_POSITION=LEFT
NPC_POSITION=RIGHT
DUEL_DISTANCE_READS_CLEARLY=YES
CHARACTERS_LARGE_ENOUGH=YES
SIGNAL_HAS_BREATHING_ROOM=YES
NO_CLIPPING=YES
NO_OVERLAP=YES
GROUND_LINE=PASS; 승인된 동일 ground line 유지
MUZZLE_ALIGNMENT=PASS; 승인된 anchors/VFX 유지
VISUAL_RESULT=PASS

FIRST_PERSON_RUNTIME_REMOVED=YES (NPC 경로)
OVER_SHOULDER_RUNTIME_REMOVED=YES (NPC 경로)
TEMP_ROTATION_HACK_REMOVED=YES (NPC 경로)
FACE_DIRECTION=ACCEPTABLE_EXISTING_ASSET_LIMITATION

HOME_CHANGED=NO
PLAYER_SELECT_CHANGED=NO
LOCAL_DUEL_CHANGED=NO
COMBAT_LOGIC_CHANGED=NO
SUPABASE_CHANGED=NO

TYPECHECK=PASS
LINT=PASS
TESTS=PASS; full runnable suite 10 regression files
IOS_BUNDLE=PASS; fresh production export
ANDROID_BUNDLE=PASS; fresh production export

IPHONE_PORTRAIT=PASS; iPhone 17 Simulator, native iOS renderer
IPHONE_LANDSCAPE=NOT_VERIFIED; 현재 portrait lock
ANDROID_VISUAL=NOT_VERIFIED; 이번 감사는 bundle만 확인

UNEXPECTED_FILES=0
UNEXPECTED_DELETIONS=0
COMMIT_READY=YES
```

## Working tree scope

이번 검사는 현재 HEAD 대비 modified 및 untracked 파일 전체를 포함한다. NPC Select와 NPC Result production component는 HEAD와 동일하다. 이미 존재하던 두 화면의 기능을 검증했으며 이번 감사에서 재설계하지 않았다.

| 파일/범위 | 변경 이유 |
|---|---|
| `app/game/npc.tsx` | 최종 `NpcFaceoffDuelArena` 직접 연결 및 설명 정리. 전투 함수·타이밍·hearts·능력·hit 판정 변경 없음. |
| `components/game/NpcFaceoffDuelArena.tsx` | 기존 자산을 사용하는 승인된 전신 대치 renderer. 이번 감사에서는 type import 경로만 정리. |
| `constants/npcFaceoffPresentation.ts`, `constants/npcFaceoffArtBounds.ts` | 승인된 portrait 배치와 기존 이미지의 bounds/총구 기준점. 기존 lock 이후 변경 없음. |
| `components/game/NpcDuelArenaProps.ts` | 두 renderer가 공유하는 type-only props. runtime import 없음. |
| `components/game/NpcFirstPersonDuelArena.tsx` | props type 추출만 변경. Ranked가 사용하는 transpiled runtime은 HEAD와 동일. |
| `components/game/CharacterSprites.tsx` | face-off용 선택적 muzzle 표시와 down ground 보정. 기본값 `true` / `0`으로 기존 caller 동작 유지. |
| `constants/v3DuelAssets.ts`, `utils/preloadDuelSprites.ts` | 사용하지 않는 cinematic export와 NPC 전용 foreground gun preload 정리, 오래된 설명 수정. 이미지 파일 삭제 없음. |
| `app/capture/redesign-duel.tsx`, `scripts/capture_npc_faceoff.cjs` | 개발용 pose/비교 검증. Ranked capture는 기존 renderer 사용. |
| `tests/npc-faceoff-presentation.cjs`, `tests/npc-select-presentation.cjs` | 최종 face-off 연결 및 실제 poster/반응 정의를 확인하도록 회귀 검사 정리. |
| `artifacts/npc-duel-*`, `artifacts/npc-flow-final-audit` | 기존 repository policy에 따른 QA report/json/log 텍스트와 ignored 로컬 media. |

Home, Player Select, Local Duel, Ranked 화면, Result 화면, NPC Select 화면, 패키지/환경 설정, assets, backend 및 Supabase 파일에는 working-tree production 변경이 없다. 공유 renderer/helper의 변경 이유는 위 표와 같다.

## Abandoned runtime cleanup

NPC route는 first-person renderer를 경유하지 않는다. NPC face-off renderer에는 floating foreground gun, over-shoulder render, 임시 30도 회전, over-shoulder READY/AIM/FIRE mapping 및 실험용 import가 없다. 기존 idle/draw/fire/hit/down/fall, backgrounds, muzzle/smoke 자산을 사용한다.

기존 Ranked 경로가 사용하는 `NpcFirstPersonDuelArena`와 관련 gun/over-shoulder 자산은 유지했다. 따라서 위 REMOVED 값은 **NPC runtime에서 제거**되었다는 뜻이며 저장소 전체 삭제를 의미하지 않는다. Ranked renderer는 type 추출을 제외한 transpiled runtime이 HEAD와 동일하다. Rollback 이미지 파일은 삭제하지 않았다.

[코드 동일성 검사](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/code-audit.json): 승인된 layout source 동일, face-off renderer는 type import 외 동일, legacy runtime 동일, type helper의 runtime import 없음.

## Native flow verification

iPhone 17 Simulator(iOS 27.0, 402×874pt)의 실제 iOS renderer에서 배경 음악과 효과음을 모두 끈 상태로 확인했다.

NPC Select: 실제 `/npc-select`에서 화살표로 NPC01→NPC22 전체 이동, 뒤로 이동, thumbnail 선택을 확인했다. 선택된 production identity poster가 prominent하게 표시되고 실제 NPC 정의의 반응 속도를 사용한다. Carousel의 화살표/thumbnail 동작은 확인했으나 Mac 입력을 통한 touch swipe 자체는 **NOT_VERIFIED**다. 개발 빌드의 전체 unlock 때문에 production persisted progression의 locked gate는 소스와 회귀 검사로 확인했다. 같은 실제 `NpcWantedCard`의 잠금 fixture에서 NPC09는 identity/285ms와 비활성 LOCKED 버튼, NPC22는 silhouette/???/반응 숨김과 비활성 LOCKED 버튼을 확인했다. 이 fixture를 실제 progression 해금 검증으로 계산하지 않았다.

NPC Duel: 승인된 네 조합 P01/NPC01, P02/NPC09, P03/NPC15, P04/NPC22의 READY/idle, STEADY/draw, BANG/fire 및 flash/smoke 비교와 hit/down 검증을 유지한다. 이번 감사에서는 lock source 동일성 확인과 실제 P01/NPC01 1배속 3라운드 결투를 추가 확인했다. 현재 승인을 받은 기존 FIRE artwork의 얼굴 시선은 실제 플레이에서 blocker로 보이지 않았다. 새 에셋을 생성하지 않았다.

NPC Result: 실제 P01/NPC01 결투에서 미발사 패배 3회를 진행했다. hearts 3→2→1→0, NPC 반응 415/411/404ms를 확인한 후 실제 `/result/npc`가 OUTDRAWN, 0—3, Player 반응 없음, NPC404ms를 표시했다. 승자인 NPC01은 오른쪽에 서 있고 Player는 왼쪽 down pose이며 twilight 배경이 이어진다. 재도전은 동일 NPC pre-duel, 상대 선택은 NPC Select로 이동했다. 결과 route를 query 없이 다시 열어 실제 마지막 match snapshot이 복원되는 것도 확인했다.

승리 표시는 실제 production Result에 명시적 QA 입력(3—0, 210/450ms)을 전달한 **render fixture**로 확인했다. YOU WIN, 왼쪽 Player 승자/오른쪽 NPC 패배, 입력 stats 및 CTA가 올바르게 표시된다. 이 숫자는 실제 플레이 반응으로 보고하지 않는다. 실제 플레이 승리와 progression 이후 next-NPC CTA는 이번 native 실행에서 **NOT_VERIFIED**이며, 기존 조건/연결 소스와 회귀 검사는 통과했다. Fake reward/bounty/currency 표시는 없다.

- [선택 화면 전체 NPC navigation 영상](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/select-navigation.mp4)
- [실제 Select→Duel→Defeat Result 및 CTA 1배속 영상](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/full-live-loss-flow.mp4)
- [실제 패배 Result](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/result-live-defeat.png)
- [승리 production render fixture](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/result-victory-production-fixture.png)
- [NPC09 잠금 fixture](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/card-npc09-locked-fixture.png)
- [NPC22 숨김 잠금 fixture](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/card-npc22-locked-fixture.png)
- [승인된 네 조합 CURRENT/FINAL 비교 및 1배속 증거](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/REPORT.md)

## Final validation and Git hygiene

현재 변경 코드로 typecheck, lint, 전체 실행 가능한 회귀 suite 10개(최종 NPC face-off 검사 9개 포함), iOS/Android production bundle export가 모두 성공했다. Expo bundle 검증이며 signed native release build나 Android visual 검증으로 보고하지 않는다. 추가 helper/constants focused lint와 `git diff --check`도 통과했다.

- [Typecheck](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/typecheck.log)
- [Lint](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/lint.log), [focused lint](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/focused-lint.log)
- [Full tests](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/tests.log)
- [iOS production bundle](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/ios-bundle.log)
- [Android production bundle](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-flow-final-audit/android-bundle.log)

Staged files=0. Accidental production deletions=0. Artifact media staged=0. Simulator screenshots/videos staged=0. Downloads/temp files staged=0. Secrets/env files staged=0. QA media는 기존 ignore policy 적용을 확인했고 report/json/log 텍스트만 untracked 검토 대상으로 남는다. 이전 임시 source snapshot은 `/tmp`로 이동해 복구 가능하게 보존했다.

`COMMIT_READY=YES`는 위 scope와 실행 검증을 마쳐 검토 가능한 working tree라는 뜻이다. 미검증 플랫폼/gesture/progression까지 release-ready라는 뜻은 아니다. 승인된 portrait 값을 다시 튜닝하지 않았으며 stage/commit/push 없이 STOP한다.
