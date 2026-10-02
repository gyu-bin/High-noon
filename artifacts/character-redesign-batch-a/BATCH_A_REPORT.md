# HIGH NOON — Character Identity Redesign Batch A

2026-09-30 · `dev-2.0` · Brief preparation only

감사 결과 승인에 따라 P0 네 명의 **제안 identity 방향과 이미지 생성 brief**를 준비했다.
새 identity 자체가 승인된 것은 아니다. 실제 이미지 생성·production 덮어쓰기·runtime
연결은 수행하지 않았다. 이미지 생성은 사람 승인 후 ChatGPT에서 진행한다.

## Source inventory

CURRENT_RUNTIME_PATH와 HIGH_RES_SOURCE_PATH는 아래 같은 IDLE master다.
모두 현재 registry에 연결된 **1254×1254 RGBA / true-alpha PNG**다.

| ID / NAME | CURRENT_RUNTIME_PATH = HIGH_RES_SOURCE_PATH | SOURCE_RESOLUTION |
| --- | --- | --- |
| P04 망령 사수 / Phantom Sharpshooter | [player/04/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/player/04/idle.png) | 1254×1254 |
| NPC15 그림자 사냥꾼 / Shadow Hunter | [npc/15/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/15/idle.png) | 1254×1254 |
| NPC19 보이드 워커 / Void Walker | [npc/19/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/19/idle.png) | 1254×1254 |
| NPC20 에코 팬텀 / Echo Phantom | [npc/20/idle.png](/Users/mungyubin/Desktop/Coding/High-noon/assets/images/characters/clarity/npc/20/idle.png) | 1254×1254 |

P04 선택/플레이는 clarity idle을 사용한다. NPC 결투는 clarity idle이며 NPC Wanted
표면에는 동일 폴더의 `identity_poster.png`가 별도로 연결된다. 생성 reference는 현재
IDLE 한 장을 사용한다. contact sheet는 비교용이고 generation reference로 올리지 않는다.
old/rejected/unused source는 선택하지 않았다. SHA-256은 source_references.json에 저장했다.

## Proposed direction

| Target | 현재 문제 | 제안 실루엣 / 강한 표지 | 선택하지 않는 요소 |
| --- | --- | --- | --- |
| P04 | P01의 검은 롱코트 변형, 불투명한 일반 총잡이 | 분리되어 떠오르는 두 코트 자락 + 속 빈 얼굴 + 부분 spectral 하체 | 이중 잔상, 큰 연기 구름, glow-only, 과도한 눈 효과 |
| NPC15 | NPC01과 같은 V판초/붉은 사선, 그림자 소멸 없음 | 비대칭 cloak + 한쪽 몸/의복의 외곽 소멸 + 어둠 속 작은 흰 눈 | 몸통 portal, starfield, 흰 가면, 코트 검정 recolor만 |
| NPC19 | NPC20과 거의 같은 밝은 판초, cosmic/void 형태 없음 | 몸통 내부의 큰 alpha 빈 공간 + 끊긴 비정상 코트 패널 + 남은 재질의 절제된 cosmic 표지 | 전체 반전 포즈, 외부 거대한 portal, 보라 glow-only |
| NPC20 | 하나의 불투명 외곽, NPC19의 회색 변형 | 온전한 주 인물 + 한쪽 어깨/팔/코트의 제한된 지연 외곽; 반투명 잔상 | 두 인물/두 머리/두 실제 총, 전신 blur, 전체 opacity 감소 |

### SILHOUETTE_DIFFERENTIATION

P04는 **떠오르는 자락과 물성 소실**, NPC15는 **바깥 경계 침식**, NPC19는 **닫힌 외곽
안의 공허**, NPC20은 **부분 외곽의 시간차 반복**이다. 단순 색상 차이로 구분하지 않는다.
NPC19/20의 기존 반반 판초·기하학 가면을 새 identity의 핵심으로 고정하지 않는다.
원본 reference에 대한 과도한 보존이 기존 실패를 재현하지 않도록 했다.

이 설명은 아직 생성되지 않은 그림의 PASS 주장이 아니다. 실제 후보는 순수 silhouette뿐
아니라 dark/light grayscale composite에서도 검수해야 한다. 특히 Echo의 partial alpha를
이진 alpha로만 판단하면 의미가 사라진다. 256px 선택창, 약241px 결투,160px 스트레스
크기에서 주표지가 남는지를 확인한다.

### COLOR_DIFFERENTIATION

- P04: dark charcoal + pale ash/blue-white 물성 경계, 작은 붉은 목천 흔적.
- NPC15: soot near-black + 매우 제한된 cold white 눈.
- NPC19: void black + 억제된 deep cosmic blue/purple, 작은 크림 의복 잔재.
- NPC20: desaturated ghost gray/blue + partial-alpha echo.

모두 오래된 brown leather belt/holster, dull brass/steel 등 HIGH NOON의 서부 재질을
일부 남긴다. palette는 구조를 보조하며 초자연적인 glow를 전면 장식으로 사용하지 않는다.

### WEAPON_DIFFERENTIATION

전원 IDLE에서 실제 리볼버 한 자루는 홀스터 안에 둔다. Western cylinder/barrel/wood-grip
실루엣은 보존한다. P04 cold worn steel, NPC15 blued steel, NPC19 dark wood/worn metal,
NPC20은 주 몸체의 실제 firearm으로 구분한다. Echo에 두 번째 물리 총을 추가하지 않는다.
이번 첫 brief는 무기 초자연 효과보다 몸의 주표지부터 확인하도록 제한했다.

## Production briefs

[PRODUCTION_BRIEFS.md](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-redesign-batch-a/PRODUCTION_BRIEFS.md)
에 네 명의 source, proposed identity lock, silhouette, palette, clothing, face/head,
weapon, supernatural effect, idle pose, forbidden elements, transparency,
native ≥1254px resolution 및 복사 가능한 영문 생성 지시가 포함된다.
각 대상별 brief 파일에도 공통 규칙과 단일 source 경로를 함께 넣었다.

외부 배경/그림자는 alpha=0. Void의 실제 빈 공간도 alpha=0이며, 별은 빈 픽셀이 아니라
남아 있는 의복/공허 재질에만 둔다. Shadow는 외곽 소실, Echo는 부분 알파를 명시했다.
투명 검은색을 검은 matte 배경으로 대체하면 안 된다.

## PLAYER02_MANIFEST_ISSUE — read-only

PLAYER02_MANIFEST_ISSUE=CONFIRMED_RUNTIME_AND_APPROVAL_PATH_DIVERGENCE

ROOT_CAUSE=registry가 `player/02-v2/{idle,draw,fire,hit,down}.png`를 사용하지만
`assets/images/characters/clarity/manifest.json`의 5개 승인 row는 구 `player/02`를 가리킨다.
02-v2와 registry는 commit `770450d`(2026-09-18)에 들어왔지만 manifest 경로가 함께
동기화되지 않았다. 해당 commit 메시지 자체를 5pose human approval 증거로 간주하지 않는다.
기존 README의 Player02 검수 설명은 버전 특정이 약하다. 후속 poster provenance는 현재
02-v2 IDLE/source와 포스터의 승인을 뒷받침하지만 DRAW/FIRE/HIT/DOWN 승인 증거는 아니다.

`scripts/validate-character-clarity.py`의 이번 read-only 결과는 exit1이며 정확히
Unreviewed runtime registration 5개다. 크기/알파 오류가 아니라 승인 metadata 경로 실패다.
`VISUALLY_REVIEWED=130/130`은 manifest row의 카운터이지 현재 runtime 130개 승인 증명 아님.

SAFE_FIX=다음 별도 허용 작업에서 02-v2 **5pose 버전별 승인 근거를 먼저 확인**한다.
확인된 경우 active manifest 5개 경로와 source hash/승인 provenance를 현재 버전으로
일치시키고, 이전 02 파일/승인 이력은 superseded로 보존한다. 승인 근거가 없는 포즈는
pending으로 두고 human review를 받는다. 존재/registry 등록만 보고 visual_qa_passed로
무조건 바꾸지 않는다. 경로만 02-v2로 변경해 기존 승인을 자동 승계하지 않는다.
수정 후 130개의 중복 없는 active matrix와 read-only validator를 다시 검사한다.

이번에는 manifest, registry, Player02 원본/포스터/pose 파일을 전혀 수정하지 않았다.

## Deliverable checkpoint

P04_SOURCE=clarity/player/04/idle.png (1254×1254)
P04_DIRECTION=FLOATING_LONGCOAT_HOLLOW_FACE_PARTIAL_SPECTRAL_LOWER_BODY
P04_BRIEF=P04_BRIEF.md

NPC15_SOURCE=clarity/npc/15/idle.png (1254×1254)
NPC15_DIRECTION=ASYMMETRIC_OUTER_EDGE_DISSOLUTION_PALE_EYES
NPC15_BRIEF=NPC15_BRIEF.md

NPC19_SOURCE=clarity/npc/19/idle.png (1254×1254)
NPC19_DIRECTION=BOUNDED_INTERIOR_VOID_BROKEN_PANEL_RESTRAINED_COSMIC_MATERIAL
NPC19_BRIEF=NPC19_BRIEF.md

NPC20_SOURCE=clarity/npc/20/idle.png (1254×1254)
NPC20_DIRECTION=ONE_CLEAR_BODY_PARTIAL_DELAYED_TRANSLUCENT_CONTOUR
NPC20_BRIEF=NPC20_BRIEF.md

PRODUCTION_ASSETS_CHANGED=NO
CODE_CHANGED=NO_APP_OR_GAME_CODE
DATABASE_CHANGED=NO
PLAYER02_MANIFEST_MODIFIED=NO
IMAGE_GENERATION=NONE
P0_FALL_DOWN=BLOCKED_UNTIL_NEW_IDENTITY_APPROVAL
NPC01_COMBAT=PROTECTED_UNCHANGED
KEEP_CHARACTERS=UNMODIFIED
STOP=YES

현재는 승인 대기 상태다. 사람 승인 후 ChatGPT에서
**P04 → NPC15 → NPC19 → NPC20** 순으로 각각 생성한다. 이 문서는 생성 실행이 아니다.

## Current production previews (not proposed redesign images)

![Current four / neutral dark](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-redesign-batch-a/CURRENT_PRODUCTION_REFERENCE_dark.png)

[Neutral light comparison](/Users/mungyubin/Desktop/Coding/High-noon/artifacts/character-redesign-batch-a/CURRENT_PRODUCTION_REFERENCE_light.png)
