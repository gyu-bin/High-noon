# HIGH NOON — Character Identity Production Audit

2026-09-30 · dev-2.0 · AUDIT ONLY

26명 감사 완료: **KEEP 7 / MINOR 12 / MAJOR 7**.

우선 P0: P04(망령 사수), NPC15(그림자 사냥꾼), NPC19(보이드 워커), NPC20(에코 팬텀).
P1: NPC06, 09, 10, 12, 13, 14, 16, 17, 18, 22. P2: P03, NPC07,08. P3: NPC02,04.

## 26명 필수 판정 표

현재 asset은 IDLE 경로. 포스터와 모든 pose의 실제 경로/해시는 identity_inventory.json 참조.

| ID | NAME (KO / EN) | TIER / TYPE | CURRENT ASSET | IDENTITY CLASS | CLASSIFICATION | PRIORITY | MAIN ISSUE | REDESIGN DIRECTION | COMBAT POSE STATUS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | 무명의 총잡이 / Nameless Gunslinger | tier 미정의 / selectable_player | [assets/images/characters/clarity/player/01/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/player/01/idle.png) | Grounded baseline gunslinger | KEEP | — | 갈색 롱코트·붉은 반다나가 기본 총잡이 설정과 일치. P04와 외곽이 겹치지만 P04를 바꾸어 해결해야 함. | 현재 identity 보호; 새 설정 추가 불필요. | 현재 identity 가능 / 생성 안 함 |
| P02 | 철의 보안관 / Iron Sheriff | tier 미정의 / selectable_player | [assets/images/characters/clarity/player/02-v2/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/player/02-v2/idle.png) | Sheriff / authority | KEEP | — | 흰 셔츠·청색 스카프·모자/가슴 보안관 별로 구분됨. 외곽은 P01과 비슷하지만 보안관 역할은 전달됨. | 현재 02-v2 보호; rim/승인 기록은 별도 제작 품질 이슈로 확인. | identity 가능; 승인 metadata hold |
| P03 | 붉은 로사 / Crimson Rosa | tier 미정의 / selectable_player | [assets/images/characters/clarity/player/03/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/player/03/idle.png) | Red-haired selectable gunslinger | MINOR REDESIGN | P2 | 붉은 머리·가느다란 허리로 로사가 읽히나 NPC06의 여성 더스터 구조와 축소 시 혼동. | 붉은 머리와 기존 의상 유지; 모자 외곽·코트 길이/분할을 Rachel과 구분. 신규 lore는 만들지 않음. | minor 승인 후 제작 |
| P04 | 망령 사수 / Phantom Sharpshooter | tier 미정의 / selectable_player | [assets/images/characters/clarity/player/04/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/player/04/idle.png) | Phantom fantasy not delivered | MAJOR REDESIGN | P0 | 불투명 검은 롱코트·붉은 스카프의 평범한 총잡이. P01의 검은 변형처럼 읽히며 망령/부활은 외형에 없음. | 망령 identity부터 승인: 비정상적인 외곽·비어 있는 얼굴·소멸하는 의복/물성 중 구체적 주표지를 결정. 단순 glow 금지. | BLOCK: 새 identity 승인 전 금지 |
| N01 | 먼지바람 / Dust Wind | bronze / speed/brown_cowboy | [assets/images/characters/clarity/npc/01/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/01/idle.png) | Dust outlaw / poncho | KEEP | — | 크림 판초와 붉은 V무늬·가려진 얼굴·낡은 의상이 먼지바람 설정을 명확히 전달. | 승인 Combat prototype 포함 완전 보호. NPC15의 중복을 고치고 NPC01은 변경하지 않음. | 승인 FALL/DOWN 보호 / 변경 금지 |
| N02 | 녹슨 총구 / Rusty Barrel | bronze / speed/brown_cowboy | [assets/images/characters/clarity/npc/02/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/02/idle.png) | Weathered vest outlaw | MINOR REDESIGN | P3 | 접힌 소매·패치 조끼·드러난 얼굴은 구분되나 녹/부러진 모자 챙의 의미가 약함. | 현재 조끼/노출 얼굴 유지; 모자 손상 외곽과 낡은 홀스터 소재만 강화. | minor 승인 후 제작 |
| N03 | 황야의 까마귀 / Wasteland Crow | bronze / speed/brown_cowboy / BOSS | [assets/images/characters/clarity/npc/03/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/03/idle.png) | Crow / feather cloak boss | KEEP | — | 깃털 층의 지그재그 외곽과 모자 해골 장식이 까마귀로 읽힘. NPC22와 같은 어두운 망토 계열이나 초기 보스로 적절. | 깃털 identity 유지; NPC22에서 final-boss 차별화. | 현재 identity 가능 / 생성 안 함 |
| N04 | 사막의 여우 / Desert Fox | silver / speed/brown_cowboy | [assets/images/characters/clarity/npc/04/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/04/idle.png) | Sand / fur-lined duster | MINOR REDESIGN | P3 | 모래색·밝은 안감은 구분되나 여우 꼬리 모티프/호박 눈은 축소 시 안 읽힘. | 밝은 코트 유지; 지정된 fox-tail 벨트 모티프와 털 칼라의 외곽만 보강. | minor 승인 후 제작 |
| N05 | 철가면 / Iron Mask | silver / speed/brown_cowboy | [assets/images/characters/clarity/npc/05/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/05/idle.png) | Iron jaw / steel armor | KEEP | — | 금속 턱 덮개·각진 어깨와 무릎 철판이 철가면을 전달. NPC12와 계열은 같지만 부분 갑옷으로 읽힘. | 부분 철갑/턱 덮개 identity 유지; NPC12는 전신 갑주로 구분. | 현재 identity 가능 / 생성 안 함 |
| N06 | 냉혈한 레이첼 / Coldblood Rachel | silver / speed/brown_cowboy / BOSS | [assets/images/characters/clarity/npc/06/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/06/idle.png) | Female bounty hunter boss | MINOR REDESIGN | P1 | 여성 체형·붉은 머리·홀스터는 전달되나 P03과 brown duster 가족이 같고 냉혈/보스 위압감은 약함. | 바운티 헌터/이중 홀스터 유지; Rachel의 더스터 어깨·모자·냉색 눈 표지를 분명히 구분. | minor 승인 후 제작 |
| N07 | 독침 선인장 / Venom Cactus | gold / speed/brown_cowboy | [assets/images/characters/clarity/npc/07/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/07/idle.png) | Cactus / desert punk | MINOR REDESIGN | P2 | 녹색과 어깨 가시가 확대에서 보이나 작은 크기에서는 다시 갈색 판초 총잡이로 수렴. | 현재 초록 계열 유지; 모자/장갑의 선인장 가시가 외곽으로 읽히도록 강화. | minor 승인 후 제작 |
| N08 | 쌍권총 로렌조 / Dual Guns Lorenzo | gold / speed/brown_cowboy | [assets/images/characters/clarity/npc/08/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/08/idle.png) | Theatrical red-vest dual gunner | MINOR REDESIGN | P2 | 붉은 장식 조끼·금 테두리는 독립적이나 DRAW/FIRE 모두 한 자루만 보여 쌍권총 이름이 약함. | 조끼/금 장식 유지; 이미 설정된 twin revolvers를 홀스터/무기 위치에서 읽히게 함. 사격 규칙 변경 아님. | minor 승인 후 제작 |
| N09 | 황금 해골 / Golden Skull | gold / speed/brown_cowboy / BOSS | [assets/images/characters/clarity/npc/09/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/09/idle.png) | Golden skull boss not delivered | MAJOR REDESIGN | P1 | 금 장식은 있으나 얼굴은 검은 천으로 가림. 작은 해골 장신구만으로는 황금 해골 보스로 안 읽힘. | 금 해골 얼굴·금빛 갑주/노란 눈을 주 identity로 다시 잡아 부분 철갑 NPC05와 구분. | BLOCK: 새 identity 승인 전 금지 |
| N10 | 강철 독수리 / Steel Eagle | platinum / skill/sheriff | [assets/images/characters/clarity/npc/10/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/10/idle.png) | Mechanical eagle / armored shoulder | MINOR REDESIGN | P1 | 둥근 강철 어깨는 보이지만 기계 눈과 독수리 엠블럼은 판초/얼굴 가림에 묻힘. | 강철 어깨 유지; 기계 눈과 독수리 표지가 소형에도 읽히는 노출면을 확보. | minor 승인 후 제작 |
| N11 | 침묵의 기관차 / Silent Locomotive | platinum / skill/sheriff | [assets/images/characters/clarity/npc/11/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/11/idle.png) | Broad steam engineer | KEEP | — | 넓은 몸·이마 고글·기관사 코트로 다른 좁은 총잡이 체형과 구분. | 넓은 체형·고글 유지; 현재 설정으로 combat 확장 가능. | 현재 identity 가능 / 생성 안 함 |
| N12 | 블랙 아이언 / Black Iron | platinum / skill/sheriff / BOSS | [assets/images/characters/clarity/npc/12/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/12/idle.png) | Black iron armor boss | MINOR REDESIGN | P1 | 금속 어깨/팔·가려진 얼굴은 맞으나 몸통은 천과 보통 체격으로 읽힘. NPC05와 전신 갑옷 차별이 약함. | 기존 검은 철갑 identity 유지; 흉갑 덩어리·어깨 폭·전신 갑주 구조를 강화. | minor 승인 후 제작 |
| N13 | 미러 잭 / Mirror Jack | diamond / skill/red_gunslinger / SPECIAL | [assets/images/characters/clarity/npc/13/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/13/idle.png) | Split mirror mask | MINOR REDESIGN | P1 | 반반 마스크·밝고 어두운 의복은 보이나 NPC19/20과 밝은 삼각 판초 계열이 같음. 거울 균열은 작음. | 분할 정체성 유지; cracked mirror mask의 면/균열과 대칭 외곽 강화. NPC19/20 신규 identity와 분리. | minor 승인 후 제작 |
| N14 | 썬더 볼트 / Thunder Bolt | diamond / skill/red_gunslinger / SPECIAL | [assets/images/characters/clarity/npc/14/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/14/idle.png) | Electric-blue gunslinger | MINOR REDESIGN | P1 | 푸른 코트는 강한 차별점. 번개 흉터/손의 전기 표지는 가려져 거의 색상만 전달. | 전기 청색 코트 유지; 기존 번개 흉터와 손/소매 모티프를 형태로 강화, 단순 halo 추가 아님. | minor 승인 후 제작 |
| N15 | 그림자 사냥꾼 / Shadow Hunter | diamond / skill/red_gunslinger / BOSS / SPECIAL | [assets/images/characters/clarity/npc/15/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/15/idle.png) | Shadow dissolution not delivered | MAJOR REDESIGN | P0 | 불투명 갈색 판초·붉은 사선·마스크가 NPC01과 겹침. 소멸하는 몸·공허 망토·흰 눈이 없음. | 그림자에 잠기는 비대칭 외곽과 비어 있는 얼굴/흰 눈의 identity부터 확정. 기존 판초 색만 바꾸지 않음. | BLOCK: 새 identity 승인 전 금지 |
| N16 | 베놈 스파이크 / Venom Spike | master / skill/red_gunslinger / SPECIAL | [assets/images/characters/clarity/npc/16/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/16/idle.png) | Purple venom / spikes | MINOR REDESIGN | P1 | 보라 스카프·가시/프린지는 보이나 다른 판초의 보라색 변형처럼 보이고 독액/파충류 재질은 약함. | 보라/가시 유지; spiked collar·reptile scale·독액 모티프를 큰 재질 구획과 외곽으로 보강. | minor 승인 후 제작 |
| N17 | 사막의 악마 드라이든 / Desert Devil Dryden | master / skill/red_gunslinger / BOSS / SPECIAL | [assets/images/characters/clarity/npc/17/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/17/idle.png) | Pale dark-longcoat boss | MINOR REDESIGN | P1 | 키 큰 좁은 검은 코트와 창백한 얼굴 조각은 구분됨. 붉은 눈 테두리·기묘한 평정은 모자 아래 숨음. | 좁은 롱코트 유지; 창백한 머리/눈의 가독성과 보스 자세 강화. 실제 키 설정을 새로 만들지 않음. | minor 승인 후 제작 |
| N18 | 레드 아이 오라클 / Red Eye Oracle | master / skill/red_gunslinger / BOSS / SPECIAL | [assets/images/characters/clarity/npc/18/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/18/idle.png) | Multi-eye oracle boss not delivered | MAJOR REDESIGN | P1 | 탄흔 판초·붉은 작은 메달은 보이나 다중 붉은 눈/예언자 robe가 없어서 낡은 총잡이로 읽힘. | multiple red eyes·예언자 robe 구조를 주표지로 새 identity 확정; 작은 붉은 장식이나 glow로 대체하지 않음. | BLOCK: 새 identity 승인 전 금지 |
| N19 | 보이드 워커 / Void Walker | legend / skill/undead / SPECIAL | [assets/images/characters/clarity/npc/19/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/19/idle.png) | Cosmic void / undead not delivered | MAJOR REDESIGN | P0 | 밝은 V판초·마스크이며 NPC20과 매우 유사. 반전된 몸·옷 너머 별/공허 물질이 없음. | 부분 반전/공허를 비정상 외곽·비어 있는 물질 구획으로 구체화. Echo의 이중 잔상 identity와 분리. | BLOCK: 새 identity 승인 전 금지 |
| N20 | 에코 팬텀 / Echo Phantom | legend / skill/undead / SPECIAL | [assets/images/characters/clarity/npc/20/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/20/idle.png) | Echo phantom not delivered | MAJOR REDESIGN | P0 | NPC19의 회색 변형처럼 보임. 불투명 몸·하나의 외곽이며 반투명 유령/겹친 실루엣이 안 읽힘. | ghost double/겹친 외곽·반투명 물성을 주 identity로 재설계. 단순 glow/회색 recolor 금지. | BLOCK: 새 identity 승인 전 금지 |
| N21 | 장의사 / The Undertaker | legend / skill/undead / BOSS / SPECIAL | [assets/images/characters/clarity/npc/21/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/21/idle.png) | Funeral undertaker / skull cane | KEEP | — | 해골 지팡이·검은 장례 정장·금 장식 코트로 소품/외곽이 명확히 구별. undead 메타를 literal ghost로 재해석하지 않음. | 장례 정장과 해골 지팡이 유지. 현재 명시된 장의사 identity로 combat 확장 가능. | 현재 identity 가능 / 생성 안 함 |
| N22 | 창백한 기수 / The Pale Rider | hidden / skill/undead / BOSS / SPECIAL / SECRET | [assets/images/characters/clarity/npc/22/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/22/idle.png) | Hidden death/bone boss too weak | MAJOR REDESIGN | P1 | 뼈 어깨·가려진 얼굴은 있으나 전체는 갈색 찢긴 망토 총잡이. NPC03 깃털 계열과 겹치고 흰 horse-skull/death 위계가 약함. | 흰 말 해골·표백 뼈 갑주·무얼굴을 주 구조로 승격하고 최종 보스 외곽 재확정. 검게/크게만 만들지 않음. | BLOCK: 새 identity 승인 전 금지 |

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


## DATA / IDENTITY INVENTORY — 26명

### P01 — 무명의 총잡이 / Nameless Gunslinger

- tier/type: 미정의 / selectable_player; boss=False; hidden/secret=False; special=False.
- reaction: 미정의 (Player 반응은 사용자 입력).
- unlock: default.
- ability: none; 없음
- designKeywords: 미정의; locale 이름/능력만 사용.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/player/01/idle.png
- poster: assets/images/characters/clarity/player/01/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-P01-dark.png)

### P02 — 철의 보안관 / Iron Sheriff

- tier/type: 미정의 / selectable_player; boss=False; hidden/secret=False; special=False.
- reaction: 미정의 (Player 반응은 사용자 입력).
- unlock: 10 NPC clears.
- ability: lastStand; 매치당 1회, 패배한 라운드를 승리로 바꿉니다.
- designKeywords: 미정의; locale 이름/능력만 사용.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/player/02-v2/idle.png
- poster: assets/images/characters/clarity/player/02-v2/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-P02-dark.png)

### P03 — 붉은 로사 / Crimson Rosa

- tier/type: 미정의 / selectable_player; boss=False; hidden/secret=False; special=False.
- reaction: 미정의 (Player 반응은 사용자 입력).
- unlock: 15 NPC clears.
- ability: headshot; 상대보다 80ms 이상 빠르게 이긴 라운드에서만 발동합니다. NPC 하트 2칸 추가 제거. (매치당 1회)
- designKeywords: 미정의; locale 이름/능력만 사용.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/player/03/idle.png
- poster: assets/images/characters/clarity/player/03/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-P03-dark.png)

### P04 — 망령 사수 / Phantom Sharpshooter

- tier/type: 미정의 / selectable_player; boss=False; hidden/secret=False; special=False.
- reaction: 미정의 (Player 반응은 사용자 입력).
- unlock: all NPC clears and average reaction <=200ms.
- ability: revive; 매치당 1회, 치명적인 패배(마지막 하트·2:3 직전)를 무효화하고 다시 일어납니다. 광고 부활보다 먼저 발동합니다.
- designKeywords: 미정의; locale 이름/능력만 사용.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/player/04/idle.png
- poster: assets/images/characters/clarity/player/04/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-P04-dark.png)

### N01 — 먼지바람 / Dust Wind

- tier/type: bronze / speed/brown_cowboy; boss=False; hidden/secret=False; special=False.
- reaction: 410ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: weathered cowboy, torn poncho, dust-covered, bandana over mouth, slouched posture.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/01/idle.png
- poster: assets/images/characters/clarity/npc/01/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N01-dark.png)

### N02 — 녹슨 총구 / Rusty Barrel

- tier/type: bronze / speed/brown_cowboy; boss=False; hidden/secret=False; special=False.
- reaction: 395ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: rusted gun holster, patchy leather vest, one eye squinting, stubble, broken hat brim.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/02/idle.png
- poster: assets/images/characters/clarity/npc/02/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N02-dark.png)

### N03 — 황야의 까마귀 / Wasteland Crow

- tier/type: bronze / speed/brown_cowboy; boss=True; hidden/secret=False; special=False.
- reaction: 380ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: black feathered cloak, hollow eyes, crow skull on hat, sharp silhouette, dusk lighting.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/03/idle.png
- poster: assets/images/characters/clarity/npc/03/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N03-dark.png)

### N04 — 사막의 여우 / Desert Fox

- tier/type: silver / speed/brown_cowboy; boss=False; hidden/secret=False; special=False.
- reaction: 355ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: sandy fur-trimmed coat, narrow amber eyes, desert camouflage, fox tail motif on belt.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/04/idle.png
- poster: assets/images/characters/clarity/npc/04/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N04-dark.png)

### N05 — 철가면 / Iron Mask

- tier/type: silver / speed/brown_cowboy; boss=False; hidden/secret=False; special=False.
- reaction: 340ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: iron half-mask covering jaw, military coat, cold steel armor plates, expressionless.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/05/idle.png
- poster: assets/images/characters/clarity/npc/05/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N05-dark.png)

### N06 — 냉혈한 레이첼 / Coldblood Rachel

- tier/type: silver / speed/brown_cowboy; boss=True; hidden/secret=False; special=False.
- reaction: 325ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: female bounty hunter, ice-blue eyes, sleek leather duster, dual holsters, calm expression.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/06/idle.png
- poster: assets/images/characters/clarity/npc/06/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N06-dark.png)

### N07 — 독침 선인장 / Venom Cactus

- tier/type: gold / speed/brown_cowboy; boss=False; hidden/secret=False; special=False.
- reaction: 310ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: cactus spine motif on hat, green-tinted coat, spiked gloves, desert punk aesthetic.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/07/idle.png
- poster: assets/images/characters/clarity/npc/07/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N07-dark.png)

### N08 — 쌍권총 로렌조 / Dual Guns Lorenzo

- tier/type: gold / speed/brown_cowboy; boss=False; hidden/secret=False; special=False.
- reaction: 298ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: ornate twin revolvers, flamboyant red vest, gold trim, theatrical villain energy.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/08/idle.png
- poster: assets/images/characters/clarity/npc/08/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N08-dark.png)

### N09 — 황금 해골 / Golden Skull

- tier/type: gold / speed/brown_cowboy; boss=True; hidden/secret=False; special=False.
- reaction: 285ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: gold skull face paint, gilded armor, glowing yellow eyes, opulent western villain.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/09/idle.png
- poster: assets/images/characters/clarity/npc/09/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N09-dark.png)

### N10 — 강철 독수리 / Steel Eagle

- tier/type: platinum / skill/sheriff; boss=False; hidden/secret=False; special=False.
- reaction: 270ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: mechanical eye implant, steel shoulder armor, eagle emblem, precision gunslinger.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/10/idle.png
- poster: assets/images/characters/clarity/npc/10/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N10-dark.png)

### N11 — 침묵의 기관차 / Silent Locomotive

- tier/type: platinum / skill/sheriff; boss=False; hidden/secret=False; special=False.
- reaction: 258ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: massive build, steam engineer coat, goggles on forehead, silent menacing stare.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/11/idle.png
- poster: assets/images/characters/clarity/npc/11/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N11-dark.png)

### N12 — 블랙 아이언 / Black Iron

- tier/type: platinum / skill/sheriff; boss=True; hidden/secret=False; special=False.
- reaction: 248ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: none; 없음
- designKeywords: full black iron armor, no face visible, obsidian revolver, imposing silhouette.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/12/idle.png
- poster: assets/images/characters/clarity/npc/12/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N12-dark.png)

### N13 — 미러 잭 / Mirror Jack

- tier/type: diamond / skill/red_gunslinger; boss=False; hidden/secret=False; special=True.
- reaction: 235ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: mirror; 이길수록 더 빨라지고, 질수록 느려집니다. 연승하면 점점 버티기 어려워집니다.
- designKeywords: cracked mirror mask, split-color outfit, unsettling symmetry.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/13/idle.png
- poster: assets/images/characters/clarity/npc/13/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N13-dark.png)

### N14 — 썬더 볼트 / Thunder Bolt

- tier/type: diamond / skill/red_gunslinger; boss=False; hidden/secret=False; special=True.
- reaction: 225ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: thunderbolt; BANG 글자 없음. 집중 후 0.9~4.8초 사이 번개(페이크 2회) → 총성이 진짜. 소리로 반응.
- designKeywords: lightning scar across face, electric blue coat, crackling energy around hands.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/14/idle.png
- poster: assets/images/characters/clarity/npc/14/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N14-dark.png)

### N15 — 그림자 사냥꾼 / Shadow Hunter

- tier/type: diamond / skill/red_gunslinger; boss=True; hidden/secret=False; special=True.
- reaction: 215ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: blindBang; 뱅 글자가 거의 보이지 않습니다. 소리·감각으로만 반응해야 합니다.
- designKeywords: half-dissolved into shadow, smoke trails, dark void cloak, glowing white eyes only.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/15/idle.png
- poster: assets/images/characters/clarity/npc/15/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N15-dark.png)

### N16 — 베놈 스파이크 / Venom Spike

- tier/type: master / skill/red_gunslinger; boss=False; hidden/secret=False; special=True.
- reaction: 205ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: screenShakeLight; 집중 중 화면이 살짝 흔들립니다.
- designKeywords: purple venom drip motif, spiked collar, reptile scale texture.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/16/idle.png
- poster: assets/images/characters/clarity/npc/16/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N16-dark.png)

### N17 — 사막의 악마 드라이든 / Desert Devil Dryden

- tier/type: master / skill/red_gunslinger; boss=True; hidden/secret=False; special=True.
- reaction: 198ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: screenShakeMedium; 집중 중 화면이 흔들려 집중하기 어렵습니다.
- designKeywords: pale skin, red-rimmed eyes, black longcoat, moonlit backlight, eerie calm.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/17/idle.png
- poster: assets/images/characters/clarity/npc/17/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N17-dark.png)

### N18 — 레드 아이 오라클 / Red Eye Oracle

- tier/type: master / skill/red_gunslinger; boss=True; hidden/secret=False; special=True.
- reaction: 192ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: screenShakeHeavy; 집중 중 화면이 격렬하게 흔들립니다.
- designKeywords: multiple glowing red eyes, prophet robes with bullet holes, ominous aura.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/18/idle.png
- poster: assets/images/characters/clarity/npc/18/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N18-dark.png)

### N19 — 보이드 워커 / Void Walker

- tier/type: legend / skill/undead; boss=False; hidden/secret=False; special=True.
- reaction: 185ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: invertedSignals; 집중 중 화면이 보라 공허에 잠깁니다. STEADY가 사라지고 ···만 보입니다. 뱅 때 균열.
- designKeywords: body partially inverted, cosmic void texture, stars visible through coat.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/19/idle.png
- poster: assets/images/characters/clarity/npc/19/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N19-dark.png)

### N20 — 에코 팬텀 / Echo Phantom

- tier/type: legend / skill/undead; boss=False; hidden/secret=False; special=True.
- reaction: 180ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: echoReady; BANG이 연속 3번. 1번째·3번째는 가짜, 2번째 총성만 진짜입니다.
- designKeywords: ghostly double image, translucent body, two overlapping silhouettes.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/20/idle.png
- poster: assets/images/characters/clarity/npc/20/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N20-dark.png)

### N21 — 장의사 / The Undertaker

- tier/type: legend / skill/undead; boss=True; hidden/secret=False; special=True.
- reaction: 175ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: chaosRandom; 매 라운드 공허·썬더·에코·격진 중 하나를 훔칩니다.
- designKeywords: funeral black suit, coffin motif, skull-topped cane, final judgment energy.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/21/idle.png
- poster: assets/images/characters/clarity/npc/21/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N21-dark.png)

### N22 — 창백한 기수 / The Pale Rider

- tier/type: hidden / skill/undead; boss=True; hidden/secret=True; special=True.
- reaction: 182ms.
- unlock: 진행도 순차 해금; NPC19–21 mask/NPC22 secret gate 별도.
- ability: paleSilence; 집중 후 오래 기다린 뒤 뱅이 터지며, 집중 중 화면이 어두워집니다.
- designKeywords: white horse skull motif, bleached bone armor, no face, absolute silence, death incarnate.
- lore 전용 필드: 미정의 (새로 만들지 않음).
- idle: assets/images/characters/clarity/npc/22/idle.png
- poster: assets/images/characters/clarity/npc/22/identity_poster.png
- pose evidence: [5-pose sheet](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/poses-N22-dark.png)

## Contact sheets / outputs

- A-players: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/A-players-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/A-players-light.png)
- B-npc01-11: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/B-npc01-11-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/B-npc01-11-light.png)
- C-npc12-22: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/C-npc12-22-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/C-npc12-22-light.png)
- D-boss-special-supernatural: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/D-boss-special-supernatural-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/D-boss-special-supernatural-light.png)
- E-full26-silhouettes: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/E-full26-silhouettes-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/E-full26-silhouettes-light.png)
- select-thumbnails: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/select-thumbnails-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/select-thumbnails-light.png)
- duel-approx241: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/duel-approx241-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/duel-approx241-light.png)
- duel-thumbnails: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/duel-thumbnails-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/duel-thumbnails-light.png)
- players-original-canvas: [neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/players-original-canvas-dark.png) / [neutral light](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-identity-audit/players-original-canvas-light.png)

## Final checkpoint

```text
TOTAL_CHARACTERS=26
KEEP=7
MINOR_REDESIGN=12
MAJOR_REDESIGN=7
P0=4
P1=10
P2=3
P3=2
PLAYER_AUDIT=COMPLETE_4
NPC_AUDIT=COMPLETE_22
PALE_RIDER=MAJOR_P1
SUPERNATURAL=P04_N15_N19_N20_MAJOR_P0
HIGH_TIER=PROGRESSION_WEAK_EXCEPT_N21_ANCHOR
COMBAT_READY=["P01", "P02", "N01", "N03", "N05", "N11", "N21"]
COMBAT_BLOCKED=["P03", "P04", "N02", "N04", "N06", "N07", "N08", "N09", "N10", "N12", "N13", "N14", "N15", "N16", "N17", "N18", "N19", "N20", "N22"]
ADDITIONAL_APPROVAL_METADATA_HOLD=["P02"]
PRODUCTION_FILES_HASH_VERIFIED=156
SIMULATOR_REFERENCE=NOT_CAPTURED_ORCA_UNAVAILABLE
CODE_CHANGED=NO_APP_CODE
ASSETS_CHANGED=NO
DATABASE_CHANGED=NO
GENERATION=NONE
STATUS=AUDIT_COMPLETE_HUMAN_CLASSIFICATION_REVIEW_PENDING
MOST_SIMILAR_PAIRS=NPC19/20;P01/P04;NPC01/15;P03/NPC06;NPC03/22;NPC05/12;NPC13/19/20
QUALITY_ISSUES=P02_RIM_WARNING;P02_APPROVAL_MANIFEST_MISMATCH
CONTACT_SHEETS=A_B_C_D_E_DARK_AND_LIGHT
SMALL_SIZE_SHEETS=SELECT256_DUEL241_STRESS160_DARK_AND_LIGHT
STOP=YES
```
