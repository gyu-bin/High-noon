# HIGH NOON — FACE-OFF ASSET BLOCKER TRIAGE

TARGET_BRANCH=dev-2.0

VISUAL_STATUS=TARGETED_ASSET_FIX_REQUIRED

ASSET_FIX_REQUIRED_COUNT=5

ASSET_FIX_REQUIRED_LIST=P02_FIRE, P03_FIRE, NPC15_DRAW, NPC19_DRAW, NPC22_DRAW

CODE_FIXES_REMAINING=YES

ASSET_FIXES_REMAINING=YES

NPC_ACTUAL_DEFEAT_PLAY_QA=FAIL

NPC_ACTUAL_VICTORY_PLAY_QA=FAIL

위 victory 키는 사용자 정의대로 **Player가 match에서 승리하여 NPC의 최종 패배가 발생하는 실제 플레이 검증**을 뜻한다.

## 검토 범위와 잠금

iPhone 17 / iOS 27 시뮬레이터의 실제 production 화면에서 P01–P04와 NPC01–22를 검토했다. 음향은 꺼진 상태를 유지했다. 신호, NPC 발사, 능력은 기존 전투 엔진의 실제 라운드에서 발생했다. 정상 1× 플레이 관찰이 판정 근거이며, 확대 원본과 영상에서 추출한 정지 화면은 위치를 설명하는 보조 자료다. fixture와 replay는 실제 승리의 증거로 사용하지 않았다.

현재 P01/NPC01 방향, defeated pose hold, portrait scale ×0.92, outward offset 약 2.5%씩, spacing, ground line, muzzle alignment를 유지했다. 이번 triage에서 production 코드·테스트·캐릭터 에셋 수정은 0건이다. 새 이미지 생성·교체, flip/rotation 보정, commit/push는 하지 않았다. 이전 작업의 미커밋 변경은 그대로 남겼다.

## 판정 해석

아래 표는 **새 이미지가 필요한가**를 판정한다. `ACCEPTABLE*`은 DRAW를 READY의 짧은 발총 동작으로 재사용할 수 있다는 뜻이다. **그 DRAW를 현재처럼 STEADY 내내 유지하는 화면은 조준 높이 기준 FAIL**이며 전체 화면 PASS를 의미하지 않는다. 해당 15개 NPC에는 깨끗한 기존 FIRE가 있어, 향후 presentation의 pose 선택 검토가 남는다. 이번 단계에서는 코드를 변경하지 않았다.

NPC15·19·22는 현재 DRAW가 조준 hold에 부적합하고 FIRE에는 이미 그려진 발사 효과가 있어, 기존 FIRE를 효과 없는 hold로 그대로 사용할 수 없다. 따라서 세 DRAW만 이미지 교체 후보로 지정했다. NPC20은 기존 DRAW가 이미 수평 조준이므로 제외했다.

P02·P03는 실제 STEADY에서 FIRE가 몇 초간 유지되는 동안 얼굴/몸과 총구의 방향 충돌이 명확했다. 총구 자체는 상대 torso/waist 범위를 향하므로 FIRE의 얼굴·몸 방향만 교정 대상으로 삼는다. DRAW까지 교체하지 않는다.

## Player

| 캐릭터 | 판정 | DRAW 얼굴 / 총구 | FIRE 얼굴 / 총구 | 실제 관찰과 교체 범위 |
| --- | --- | --- | --- | --- |
| P01 | PASS | 현재 활성 faceoff cutout이 상대 방향을 향함 | 동일 활성 cutout의 inward aim | NPC01 실제 라운드에서 확인. 사용하지 않는 별도 원본 DRAW/FIRE의 판정으로 확대하지 않음 |
| P02 | ASSET_FIX_REQUIRED | 얼굴은 inward, 총구는 holster 아래 — READY의 전환 동작으로 ACCEPTABLE | 얼굴/몸은 own-left로 읽힘: FAIL / 총구는 RIGHT torso: PASS | FIRE만. 정상 속도의 held STEADY에서 명확 |
| P03 | ASSET_FIX_REQUIRED | 얼굴은 inward, 총구는 holster 아래 — READY의 전환 동작으로 ACCEPTABLE | 얼굴/몸은 own-left로 읽힘: FAIL / 총구는 RIGHT waist: PASS | FIRE만. 정상 속도의 held STEADY에서 명확 |
| P04 | ACCEPTABLE | 두 총을 들어 올리는 READY 전환 | 두 총은 RIGHT torso/chest. 가려진 얼굴은 다소 정면이나 1×에서 명확한 반대 시선 blocker 아님 | NPC21/22, NPC01/20 실제 라운드. 새 이미지 불필요 |

P02_DRAW_FACE_DIRECTION=ACCEPTABLE_INWARD

P02_DRAW_MUZZLE_DIRECTION=ACCEPTABLE_READY_TRANSITION_ONLY

P02_FIRE_FACE_DIRECTION=ASSET_FIX_REQUIRED

P02_FIRE_MUZZLE_DIRECTION=PASS_RIGHT_TORSO

P03_DRAW_FACE_DIRECTION=ACCEPTABLE_INWARD

P03_DRAW_MUZZLE_DIRECTION=ACCEPTABLE_READY_TRANSITION_ONLY

P03_FIRE_FACE_DIRECTION=ASSET_FIX_REQUIRED

P03_FIRE_MUZZLE_DIRECTION=PASS_RIGHT_WAIST

## NPC 전체

FIRE 판정은 실제 NPC 발사와 그 직후 보이는 production pose 기준이다. 작은 정면/반대쪽 얼굴 각도가 확대 화면에서 보여도, 정상 속도에서 명확한 몰입 방해가 아니면 재생성 대상으로 올리지 않았다.

| ID | 판정 | DRAW | FIRE | 현재 STEADY / 제한 |
| --- | --- | --- | --- | --- |
| NPC01 | PASS | 활성 faceoff cutout PASS | 활성 faceoff cutout PASS | coherent LEFT aim. 별도 미사용 원본은 교체 대상 아님 |
| NPC02 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; 기존 clean FIRE 사용 검토. 작은 얼굴 각도만으로 재생성하지 않음 |
| NPC03 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE. 까마귀 가면 각도는 1× blocker 아님 |
| NPC04 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC05 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC06 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE. 확대 얼굴 각도는 재생성 근거로 삼지 않음 |
| NPC07 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC08 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC09 | PASS | ACCEPTABLE as draw transition | PASS | 기존 clean FIRE hold는 LEFT torso로 자연스럽게 읽힘 |
| NPC10 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC11 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE. 작은 얼굴 각도는 1× blocker 아님 |
| NPC12 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC13 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC14 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE. 파란 identity edging은 발사 효과로 분류하지 않음 |
| NPC15 | ASSET_FIX_REQUIRED | ASSET_FIX_REQUIRED | ACCEPTABLE | DRAW는 ground 방향 hold. FIRE의 painted smoke 때문에 clean hold 대용 불가 |
| NPC16 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC17 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC18 | PASS | ACCEPTABLE as draw transition | PASS | 기존 clean FIRE hold와 실제 shot이 LEFT torso를 향함 |
| NPC19 | ASSET_FIX_REQUIRED | ASSET_FIX_REQUIRED | ACCEPTABLE | void 능력으로 STEADY 글자는 ...로 가려져도 ground 방향 DRAW hold는 보임. FIRE는 LEFT torso |
| NPC20 | PASS | PASS | PASS | clean DRAW가 LEFT torso aim. 실제 echo round의 FIRE도 inward |
| NPC21 | ACCEPTABLE* | ACCEPTABLE* | ACCEPTABLE | downward hold FAIL; clean FIRE |
| NPC22 | ASSET_FIX_REQUIRED | ASSET_FIX_REQUIRED | ACCEPTABLE, 제한 있음 | blackout 직전 hold에서 총이 위를 향함. 실제 BANG 순간은 능력으로 가려짐; veil 해제 뒤 LEFT torso FIRE 확인. 가려진 순간의 얼굴/flash까지 PASS라고 주장하지 않음 |

## 필요한 이미지 목록만

각 파일의 정확한 production 참조, source 축/기존 runtime flip, canvas와 identity lock은 [generation-candidates.md](generation-candidates.md)에 기록했다. 이미지 작업은 실행하지 않았다.

| 후보 | CURRENT_PROBLEM | REFERENCE_ASSET | DESIRED_DIRECTION | IDENTITY_LOCK_REQUIREMENTS |
| --- | --- | --- | --- | --- |
| P02_FIRE | held aim에서 얼굴/몸 LEFT, 총 RIGHT | clarity/player/02-v2/fire.png | runtime RIGHT로 얼굴·몸·총구 일치; source LEFT 유지 | 현재 sheriff 얼굴/수염, 갈색 star hat, grey-brown coat, cream vest, BLUE scarf, chest badge, silver revolver. 1254 canvas/발 위치 유지 |
| P03_FIRE | held aim에서 얼굴/몸 LEFT, 총 RIGHT | clarity/player/03/fire.png | runtime RIGHT, source LEFT 유지 | 현재 여성 얼굴/긴 머리, 갈색 모자/coat, RED lower-face scarf, pale shirt, belt/holster/silver gun. 1254 canvas/발 유지 |
| NPC15_DRAW | ground aim; FIRE에 baked smoke | clarity/npc/15-v2/draw.png | runtime LEFT waist/torso, source RIGHT 유지 | ragged black hat/coat, shadow face/paired white eyes, 검은 identity wisps, boots; 1624 canvas와 기존 ground 유지 |
| NPC19_DRAW | ground aim; FIRE에 baked flash | clarity/npc/19-v2/draw.png | runtime LEFT waist/torso, source LEFT 유지 | hat motif, violet circular eye, cosmic cloak voids/fragments/star texture, belt/boots/gun; 1682 canvas/ground 유지 |
| NPC22_DRAW | upward aim; FIRE에 baked flash | clarity/npc/22-v2/draw.png | runtime LEFT waist/torso, source LEFT 유지 | pale hat, white hair, black featureless face, cross/lace cape, ghost horse head/mane, long barrel; 1684 canvas/ground/horse extent 유지 |

모든 hold 후보는 새 muzzle flash/gun smoke/recoil 없이 준비한다. NPC의 기존 identity wisps·void·horse는 보존한다. NPC09/18/20, P04와 다른 NPC FIRE는 재생성 목록에 넣지 않았다.

## 실제 NPC 최종 패배 검증

NPC_ACTUAL_DEFEAT_PLAY_QA=FAIL — 실제 match victory를 완료하지 못해 미검증으로 남는다. NPC defeat 구현의 실패를 확인했다는 뜻은 아니다.

전투 타이밍을 바꾸지 않고 추가 자동 플레이를 시도했다. 좌표 터치는 READY에서 early loss가 발생하는 것으로 입력 경로를 확인했고, 같은 조작 호출 안에서 BANG 접근성 상태 감지 직후 터치하는 방식 및 NPC20의 실제 echo cue를 사용한 시도도 진행했다. NPC01의 발사는 약 403–417ms이며 화면 상태 확인 약 226–368ms와 터치 처리 약 160–212ms가 겹쳐 유효 발사를 등록하지 못했다. 최종 관찰 라운드는 player reaction — / NPC 411ms timeout이었다.

P02의 실제 Last Stand로 한 라운드를 이긴 장면은 있었으나 match final defeat가 아니므로 이 QA의 PASS 근거로 세지 않았다. 이전 fixture/native replay의 down hold 역시 실제 승리를 대신하지 않는다. 실제 BANG→NPC HIT→FALL/DOWN→held→Result 전체 연결은 남은 검증 항목이다. 사용자에게 직접 플레이를 다시 요청하지 않았다.

## 실제 1× 증거

- [actual-roster-1x.mp4](actual-roster-1x.mp4): 약 13분 20.83초. 실제 P02/P03/P04 선택과 NPC02–22 정상 속도 라운드. 숨김/blackout도 실제 기존 능력 그대로 포함.
- [actual-victory-attempt-1x.mp4](actual-victory-attempt-1x.mp4): 실제 P01/NPC01 baseline과 발사 시도. 최종 NPC 승리 검증 영상 아님.
- [actual-victory-calibrated-1x.mp4](actual-victory-calibrated-1x.mp4): 실제 추가 NPC01/NPC20 발사 시도.
- [actual-npc-defeat-attempt-1x.mp4](actual-npc-defeat-attempt-1x.mp4): 마지막 자동 승리 시도, 약 130.95초. 성공한 NPC final defeat가 아님.
- [NPC15-steady-native.png](NPC15-steady-native.png), [NPC19-steady-native.png](NPC19-steady-native.png): 실제 영상에서 추출한 held DRAW의 낮은 aim. NPC19 중앙 ...는 기존 능력.

미디어는 repository policy에 따라 local ignored 파일이며 staged 상태가 아니다. source audit 문서의 NOT_VERIFIED는 해당 원본 검토만의 경계이고, 이 통합 보고서의 실제 관찰과 구분한다.

## 종료 상태

이번 단계는 분류와 교체 목록 작성만 수행했다. CODE_FIXES_REMAINING=YES는 15개 NPC의 기존 clean FIRE로 aim hold를 구성하는 향후 presentation 선택 검토를 뜻한다. combat logic 변경을 뜻하지 않는다. 코드나 이미지를 고치기 위해 이번 단계의 잠금을 풀지 않았다.

타입 검사/lint/tests/bundle을 이번 단계에서 새로 실행하지 않았다. production 변경이 없는 triage이고 기존 검증 결과를 새 실행 결과로 표시하지 않는다. 시작 시 저장한 파일 해시와 종료 시 전체 비교는 code-lock-after.json에 기록했다.

COMMIT_CREATED=NO

PUSHED=NO

STOP.
