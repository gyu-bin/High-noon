## 판단 기준과 제한

26명 전수의 현재 연결된 IDLE, DRAW, FIRE, HIT, DOWN 130개와 포스터 26개를 검사했다.
old 256/512px, 기획 보드, rejected, 미사용 prototype, Simulator 사진은 identity
판정의 source로 사용하지 않았다. 동일 perceived height 비교는 파생 contact sheet만
alpha bbox로 정렬한다. 실제 원본 크기 비교와 pose strips는 같은 원본 canvas로 유지했다.
실루엣만으로 모두 구별되는가에 대한 답은 **아니오**다. 색/얼굴/소품을 합치면 일부는
구별되므로, 모든 유사 외곽을 일괄 MAJOR로 처리하지 않고 설정의 주표지가 남는지 봤다.
숫자 점수는 사용하지 않았다. 이 분류는 이번 감사의 제안이며 사람의 최종 승인 전이다.

KEEP의 제작 품질은 육안/파일 기준이다. 인간 승인과 native device runtime sign-off를
새로 만들어내지 않는다. 선명도가 좋다는 이유로 초자연 identity 실패를 통과시키지 않았다.

## Source of truth / 연결 추적

- `constants/clarityCharacterAssets.ts`: 4 Player + 22 NPC의 완전한 5-pose registry.
- Player02는 **player/02-v2**, 다른 Player는 01/03/04. NPC는 npc/01…22.
- `constants/spriteAssets.ts`: aim→draw, shoot→fire, defeat→hit; settled final은 clarity/down.
- Player Select: `CharacterSelector`→`V3_PLAYER_IDENTITIES`→clarity idle.
- NPC Select: `NpcWantedCard`→`NpcPortrait`→`POSTER_NPC_IDENTITIES`→identity_poster.
- Local 선택/플레이, Ranked player sprite도 clarity pose registry를 사용한다.
- NPC Duel: `getV3NpcPose`; NPC01만 `constants/combatPoses.ts`의 전용 FALL/lying DOWN 추가.
- clarity/down은 **KNEEL**이다. 26명 전원 FALL/DOWN 완성이라는 뜻이 아니다.
- NPC result 화면은 기존 clarity/down을 계속 사용한다. 이번에는 변경하지 않았다.
- 보호된 NPC01 combat FALL/DOWN, Ground Revolver는 identity 교체 대상이 아니다.

### 데이터 불일치 — 수정하지 않고 기록

현재 표시 영어명은 `locales/npcI18n.ts`와 `utils/npcLabels.ts`의 조합이다.
`NPC_ROSTER`의 THE DRIFTER, RED TOM, CALAMITY ANNIE 등 이름은 runtime 표시명에 사용되지
않고 반응 속도만 사용된다. 따라서 과거 기획 보드 이름으로 현재 identity를 판정하지 않았다.
NPC lore 전용 필드는 없다. 아래 설정은 `designKeywords`라는 **디자인 의도**이지 새로
작성한 전기가 아니다. Player tier/reaction speed/lore도 정의되어 있지 않다.
NPC17은 boss=true이며 NPC18과 같이 Master boss다. Player04는 hidden unlock지만
isHidden=false라 목록에 보인다. NPC22만 secret=true; NPC19–21은 NPC18 클리어 전 mask.

기존 `scripts/validate-character-clarity.py` 실행은 **FAIL**했다. 130 파일의 RGBA/크기
검사가 아니라, **Player02-v2 5개 경로가 clarity/manifest.json의 승인 row에 없는 문제**다.
manifest는 아직 Player02의 구 02 경로를 기록한다. 이번 source는 runtime 02-v2를 사용했고
legacy 02를 대신 검수하지 않았다. 이 불일치는 감사 추적/승인 기록 문제이며, 보안관
디자인 자체를 MAJOR로 바꿀 근거는 아니다. 승인 기록 reconciliation 전 생산 착수는 보류한다.

## Player 4명 비교

- P01: 현재 기본 총잡이 기준점 KEEP. 갈색 롱코트/붉은 반다나와 실용적인 벨트/부츠.
- P02: 현재 02-v2 KEEP. 흰 셔츠·청색 스카프·별 배지가 P01과 구분된다. 외곽만은 비슷하다.
- P03: MINOR. 붉은 머리/허리는 유효하지만 NPC06과 코트·모자·헤어 계열을 분리해야 한다.
- P04: MAJOR/P0. P01의 검은 변형이며 망령/부활이라는 selectable fantasy가 전달되지 않는다.

P02의 기존 scale mismatch는 현재 동일 canvas/alpha 높이 비교에서 뚜렷하게 재현되지 않았다.
1254 canvas IDLE alpha>24 높이: P01=1205px, P02=1206px, P03=1204px, P04=1195px.
HIT/DOWN 우측 의복에 강한 amber/orange rim은 남아 있다. 이는 실제 의복 위의 directional
highlight이고, 자동으로 알파 파손/외부 glow라 단정하지 않았다. 새로운 원본 수정은 하지 않았다.

## NPC 진행 위계 / High tier

01–06은 먼지 판초·조끼·깃털·모래 코트·부분 철갑·여성 사냥꾼으로 비교적 구별된다.
07–12에서는 소품/부분 금속이 늘지만 공통 brown cowboy 외곽이 강하다. Platinum 중
NPC11의 큰 체형/고글은 성공적이고, NPC10의 기계 눈/독수리는 약하다. NPC12는 전신 철갑
보스보다 NPC05의 변형에 가깝다.

13–18은 푸른 코트(N14)/분할 의복(N13)/보라(N16) 같은 색상 표지는 있으나,
소형에서는 특수능력 캐릭터보다 변색된 총잡이로 보인다. N15/N18은 설정의 주표지가 없다.
19–22에서 undead/supernatural 위계가 크게 무너진다. N19/N20은 밝은 판초의 색조 차이고,
N22는 어두운 ragged cowboy다. N21만 지팡이/장례 정장으로 독립적 최상위 정체성을 확보한다.

### Pale Rider 별도 판정: MAJOR / P1

뼈처럼 보이는 어깨 장식·찢긴 긴 옷·가려진 얼굴은 존재한다. 따라서 뼈 표지가 전혀 없다고
평가하지 않는다. 하지만 흰 horse-skull/표백 bone armor가 주 형태가 아니라 작은 장식이며,
얼굴/몸/총/자세는 다른 cowboy 문법 그대로다. silhouette는 N03의 깃털 망토 가족과 가깝고,
축소하면 최종 hidden encounter라기보다 추가 갈색 NPC로 읽힌다. 일반 인물보다 즉시
강하게 보이는 위계와 창백한 죽음의 기억점이 부족하다. 마스크를 검게/크게만 만들거나
glow를 추가하는 해결은 충분하지 않다. **identity 재승인 전 FALL/DOWN 금지**.

### Ghost / Supernatural

P04, N15, N19, N20은 P0. N18/N22는 보스 위계 P1. N17은 창백한 얼굴·좁은 롱코트
기준점이 남아 MINOR다. N21의 funeral/죽음 소품은 설정과 맞아 KEEP이며, undead 메타를
새 유령 lore로 확대하지 않는다.

후속 concept 검토는 P04의 empty face/소멸 의복, N15의 shadow-dissolving 외곽,
N19의 부분 반전/void material, N20의 겹친 ghost silhouette, N18의 다중 눈/robe,
N22의 horse-skull/bone 구조를 서로 독립적으로 결정해야 한다. 이들은 제안 방향이며
이번에 새로운 설정이나 이미지를 만든 것은 아니다. 단순 glow는 해결책으로 제시하지 않는다.

## MOST_SIMILAR_PAIRS

| Pair | 실제 비교 근거 | 처리 방향 |
| --- | --- | --- |
| NPC19 ↔ NPC20 | 밝은 V판초, 밝은 마스크, 같은 모자/부츠/몸/리볼버 위치; 주 차이는 warm vs cool | 둘의 Void와 Echo를 서로 다른 구조로 재확정 |
| Player01 ↔ Player04 | 긴 코트 분할·붉은 반다나·모자·자세·체격; P04는 어두운 팔레트 | P01 유지, P04 망령 concept 재확정 |
| NPC01 ↔ NPC15 | 불투명 판초의 붉은 사선, 가려진 얼굴, brown palette, 같은 무기/자세 | NPC01 완전 보호, NPC15만 shadow로 재확정 |
| Player03 ↔ NPC06 | 붉은 머리·여성 체형·갈색 더스터·허리/홀스터 | 둘의 모자/코트 외곽을 MINOR로 분리 |
| NPC03 ↔ NPC22 | 가려진 얼굴, 어두운 겹겹 ragged cloak, 작은 skull/bone 장식 | Crow 유지, Pale Rider의 흰 bone/boss 구조 강화 |
| NPC05 ↔ NPC12 | 검은 steel shoulder/arm, 마스크, 보통 cowboy 폭 | partial armor와 full armor를 구조적으로 분리 |
| NPC13 ↔ NPC19/20 | 밝은 삼각 판초·밝은 face mask | Mirror 분할은 유지, Void/Echo는 다른 concept |

같은 리볼버·비슷한 idle stance·허리 벨트·부츠는 거의 전 roster에 반복된다. 서부 세계관의
공통 언어로 허용하되, special/hidden 캐릭터의 유일한 정체성까지 동일 문법으로 처리하면 실패다.

## Small-size 판정

Select sheet: 현재 NPC identity_poster, Player idle을 원본 canvas 기준 256px로 렌더했다.
실제 선택 카드는 NPC 최대 256pt, Player 약314–340pt이며 device pixel ratio와 카드 높이에
따라 달라진다. 256px sheet는 보수적인 thumbnail 검사이지 Simulator 1:1이라고 주장하지 않는다.
Duel 근사 sheet는 241px square: 402pt 폭×0.48×1.25에 대응한다. NPC01은 실제 1.30이므로
약251pt square다. 160px sheet는 추가 거리/소형 스트레스 테스트다. Local의 split 영역은
다른 sizing을 쓰므로 Player 160px는 보수적인 비교다.

작게 읽히는 주표지: P02 흰 셔츠/별, N01 V판초, N03 깃털 외곽, N05 금속 어깨,
N11 넓은 몸/고글, N14 청색 코트, N21 지팡이.
작게 사라지거나 혼동되는 주표지: P03 vs N06 머리/코트, N04 fox-tail, N07 작은 가시,
N08 twin gun, N09 작은 skull, N10 기계 눈/독수리, N13 mirror 균열, N16 reptile/독,
N17 눈, N18 눈/메달, N22 bone 장식. P04/N15/N19/N20은 확대에서도 판타지가 미전달이다.

## Production quality — identity와 분리

측정: runtime pose 130 + poster 26 = 156 PNG 모두 1254×1254 RGBA. true alpha와 완전
투명 배경 픽셀 존재. alpha>24 기준 canvas edge에 닿는 파일 0개. `production_inventory.json`
에 실제 bbox/부분 알파/원본 SHA-256이 있다. 저장 크기만으로 모든 파일의 native 생성
이력을 증명하지 않았다. clarity README는 native 생성/no upscale로 기록하고, 현재 poster
빌더는 같은1254 idle을 resize 없이 파생하도록 기록한다.

RIM_LIGHT=Player02-v2/hit.png, down.png의 우측 코트/부츠 amber edge가 idle보다 강함 — 경미한
             lighting consistency 주의, identity redesign 판정과 별도. 외부 전체 glow FAIL 아님.
ALPHA=가시적인 배경 사각형/누락 알파 문제 없음. Trigger/천 틈 등 내부 topology 전부를
      수치 자동 판정했다고 주장하지 않음. Phantom의 불투명함은 알파 손상이 아니라 identity 실패.
BLUR=공통적인 native blur/256px upscale 흔적을 이번 highres source에서 확인하지 못함.
SCALE=Player02-v2 전체 scale mismatch 재현 안 됨; 네 player idle의 bbox/머리 비율과
      원본 canvas 비교를 사용. 고유 broad/slender 체격 차이를 정규화 결함으로 취급하지 않음.
CROPPING=alpha>24로 canvas에 잘린 생산 파일 없음. 아주 낮은 fringe는 cutoff 판정에서 제외.
OTHER=Player02-v2 승인 metadata 5경로 불일치. cloth/hat/weapon construction은 5pose에 대체로
      안정적. clarity/down은 kneel이므로 실제 lying DOWN 완료로 오인하면 안 됨.

강한 blue(N14)/purple(N16) 소재 accent와 red bandana를 orange halo로 오분류하지 않았다.
전원 sharpen/recolor/alpha repair를 권하지 않는다. 품질이 충분한데 identity가 실패하는
대표 사례는 P04, N15, N19, N20이다.

## Combat expansion gate

KEEP 7명 = P01, P02, N01, N03, N05, N11, N21.
현재 identity로 확장 가능하다는 **설계 판단**이다. N01의 승인 FALL/DOWN은 이미 완료/보호.
P02는 승인 기록 경로 불일치를 먼저 reconciliation해야 하므로 착수 승인으로 간주하지 않는다.
나머지 KEEP도 실제 batch 착수는 사용자의 별도 승인 필요.

MINOR 12명 = P03, N02, N04, N06, N07, N08, N10, N12, N13, N14, N16, N17.
minor identity 정리 → human 승인 → 기존 5pose 일관성 반영 → FALL/DOWN.

MAJOR 7명 = P04, N09, N15, N18, N19, N20, N22.
새 identity 승인 전 FALL/DOWN 생성 금지. idle만 바꾸고 다른 pose를 방치하면 안 된다.

이번 감사의 COMBAT_READY는 identity 관점 7명, COMBAT_BLOCKED는 redesign 19명이다.
추가로 P02에 승인 metadata hold가 존재한다. 실제 생성/대체/게임 코드 변경은 0건이다.

## Simulator reference / 검증 경계

이번에 새 Simulator NPC Select/Duel capture는 수행하지 못했다.
computer-use skill을 확인했으나 `orca skills get computer-use`는
`zsh: command not found: orca`(exit127)였다. 그 skill의 중지 지침에 따라 화면 자동화는
중지하고 asset audit를 계속했다. 이전 Simulator 캡처를 production source나 신규 검증
증거로 재활용하지 않았다. SMALL_SIZE_TEST는 파생 에셋 sheet 기반이다.

## 보호와 STOP

앱 코드, runtime mapping, 원본 PNG, 승인 NPC01 combat, ground gun, DB/Supabase, ranking,
friend/daily, Bounty Board, Ghost Snapshot V2, rating/게임 규칙은 수정하지 않았다.
기존 worktree 변경은 이전 Combat 작업의 변경이며 이번 감사에서 revert/덮어쓰기하지 않았다.
새 파일은 `artifacts/character-identity-audit/`의 감사 데이터/보고서/증거/helper만이다.
CODE_CHANGED=NO는 앱/게임 코드 의미다. 기존 코드 변경이 없었던 깨끗한 checkout이라는 뜻이 아니다.

NO_GENERATION / NO_REDESIGN / NO_ASSET_REPLACEMENT / NO_DATABASE_WRITE.
사람이 KEEP/MINOR/MAJOR 분류를 확인할 때까지 STOP.
