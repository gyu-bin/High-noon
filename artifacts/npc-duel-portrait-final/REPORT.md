# NPC Duel Portrait FINAL Spacing

TARGET_BRANCH=dev-2.0

VISUAL_RESULT=PASS

요청한 네 조합을 iPhone 17 시뮬레이터의 실제 iOS 렌더러에서 비교했다. CURRENT는 기존 portrait −8% 버전이고, FINAL은 동일 크기에서 X 위치만 추가 이동한 버전이다. 중앙 35~40% 목표는 평가에 사용하지 않았다.

```text
DUEL_DISTANCE_READS_CLEARLY=YES
CHARACTERS_LARGE_ENOUGH=YES
SIGNAL_HAS_BREATHING_ROOM=YES
NO_CLIPPING=YES
NO_OVERLAP=YES

PORTRAIT_PLAYER_CENTER_X=CURRENT − 2.5%W (실제 game 화면: −2.488%W)
PORTRAIT_NPC_CENTER_X=CURRENT + 2.5%W (실제 game 화면: +2.488%W)
PORTRAIT_SCALE_CHANGE=기존 −8% 유지; CURRENT 대비 추가 변화 0%

READY_SPACING=PASS
STEADY_SPACING=PASS
BANG_SPACING=PASS
GROUND_LINE=UNCHANGED; 양쪽 기준선 655.5pt
CHARACTER_CLIPPING=NONE_OBSERVED
MUZZLE_FLASH_SMOKE_CLIPPING=NONE_OBSERVED
SIGNAL_OVERLAP=NONE
HUD_OVERLAP=NONE
MUZZLE_ALIGNMENT=UNCHANGED; 효과와 캐릭터가 동일 X 이동

P01_NPC01=PASS
P02_NPC09=PASS
P03_NPC15=PASS
P04_NPC22=PASS

TYPECHECK=PASS
LINT=PASS
TESTS=PASS; 전체 회귀 파일 10개, NPC presentation 검사 9개 포함
NATIVE_IOS_RUNTIME=PASS
SOUND=BACKGROUND_MUSIC_OFF / EFFECTS_OFF
COMMIT_PUSH=NOT_PERFORMED
```

세로 화면에서 각 캐릭터를 2.5%W 이동하되 화면 끝에 최소 2pt를 남긴다. 비교용 native capture 화면은 좌우 padding 16pt라서 각 10.05pt 이동하며, 실제 game 화면은 padding 12pt라서 각 10pt 이동한다. HUD 여백은 유지했다. 크기·groundY·총구 기준점·효과 크기·전투 애니메이션·타이밍은 그대로다.

피격·패배 캐릭터는 기존 위치와 여백을 사용해 반동 중 가장자리 잘림을 방지한다. 기존 화면 흔들림이 제공되는 결투도 CURRENT 배치를 유지한다. 흔들림 강도나 능력 로직은 변경하지 않았다. Landscape와 다른 화면은 이번 추가 이동의 적용 대상이 아니다.

| 조합 | CURRENT/FINAL 공통 크기(pt) | 중앙 silhouette 간격 CURRENT → FINAL(pt) | READY / DRAW / FIRE |
|---|---:|---:|---|
| P01 / NPC01 | 229.30 | 78.78 → 98.88 | PASS |
| P02 / NPC09 | 162.13 | 62.03 → 82.13 | PASS |
| P03 / NPC15 | 167.34 | 63.07 → 83.17 | PASS |
| P04 / NPC22 | 140.75 | 57.75 → 77.85 | PASS |

표는 동일한 native capture 조건(402×874pt, padding 16pt)이다. source frame 중심점은 그림의 실제 몸 중심과 다를 수 있으므로 전체 좌표는 [layout-audit.json](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/layout-audit.json)에 별도로 기록했다.

비교 캡처는 READY/idle, STEADY/draw, BANG/fire 각각 CURRENT→FINAL 순서다. 총 12개의 CURRENT 및 12개의 FINAL 전신 캡처를 확보했다.

- [P01 / NPC01 비교](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/P01-NPC01-comparison.jpg)
- [P02 / NPC09 비교](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/P02-NPC09-comparison.jpg)
- [P03 / NPC15 비교](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/P03-NPC15-comparison.jpg)
- [P04 / NPC22 비교](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/P04-NPC22-comparison.jpg)

네 조합 각각의 Player/NPC 발사 replay 영상 8개와 0.1초 간격 프레임에서 flash/smoke를 확인했다. FINAL 폴더에는 hit/down/player-hit 추가 캡처도 있다. NPC15, NPC22, P04의 큰 망토와 말 silhouette이 유지되며 눈에 보이는 잘림이나 상대 몸과의 겹침이 없다. Replay는 개발용 pose 검증이며 실제 전투 타이밍 검증과 구분했다.

실제 `/game/npc` P01/NPC01 1배속 결투는 무음으로 실행했다. READY→STEADY→BANG, NPC 발사/연기, Player 피격/회복, hearts 3→2, 결과의 상대 반응 405ms를 확인했다. 속도 변경 없이 원본의 12초 구간을 발췌했다.

- [실제 1배속 결투 영상](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/live-duel-1x-review.mp4)
- [실제 BANG/발사/피격 프레임](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/live-bang-frames.jpg)
- [무음 설정](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/sound-off.png)

검증 로그: [typecheck](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/typecheck.log), [lint](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/lint.log), [추가 helper/renderer lint](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/focused-lint.log), [전체 tests](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/tests.log), [최종 NPC tests](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/npc-duel-portrait-final/faceoff-tests.log).

Native Metro에서 변경 코드를 실행해 검증했다. 새 dependency나 asset import가 없어 production export bundle은 재실행하지 않았으며 이전 bundle PASS 결과는 이번 실행 결과와 구분한다. 코드 리뷰와 별도 시각 검토에서도 이번 spacing 변경에 남은 결함이 발견되지 않았다. 시각 PASS는 요청한 네 조합과 기록된 portrait 조건에 대한 결과다.

이번 변경은 presentation helper, NPC faceoff renderer, 해당 회귀 검사 및 QA 자료에 한정했다. 추가 에셋 생성·combat logic·다른 화면 변경·commit·push 없이 종료한다.
