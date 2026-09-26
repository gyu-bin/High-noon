# NPC High-Resolution Poster Source Migration — 3-NPC Pilot

대표 3명 검증 결과는 **QUALITY_COMPARE=PASS**다. 요청한 STOP 조건에 따라 NPC 07, 12, 15만 런타임에 연결했으며 나머지 19명은 기존 승인 포스터를 유지한다. 22명 일괄 제작은 실행하지 않았다.

```text
PILOT_NPCS=07,12,15
SOURCE_RESOLUTION=1254×1254 native
POSTER_RESOLUTION=1254×1254 native
UPSCALE_256=NO
ALPHA_CHANGED_PIXELS=0
UNSELECTED_VISIBLE_PIXEL_CHANGES=0
QUALITY_COMPARE=PASS
BATCH_22_EXECUTED=NO
STATUS=AWAITING HUMAN APPROVAL
```

## High-resolution source audit

22명 모두 `assets/images/characters/clarity/npc/XX/idle.png`에 1254×1254 원본이 있다. 네 장의 전신 비교표를 직접 검수했으며, hat, face/mask, coat/poncho, build, weapon, accessories, silhouette, palette가 현재 승인 identity와 일치한다.

| ID | 이름 | 기존 승인 source | 해상도 | high-res source | 해상도 | 일치 신뢰도 |
|---:|---|---|---:|---|---:|---|
| 01 | 먼지바람 | `assets/images/characters/enemy/01/identity.png` | 256×256 | `assets/images/characters/clarity/npc/01/idle.png` | 1254×1254 | HIGH |
| 02 | 녹슨 총구 | `assets/images/characters/enemy/02/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/02/idle.png` | 1254×1254 | HIGH |
| 03 | 황야의 까마귀 | `assets/images/characters/enemy/03/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/03/idle.png` | 1254×1254 | HIGH |
| 04 | 사막의 여우 | `assets/images/characters/enemy/04/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/04/idle.png` | 1254×1254 | HIGH |
| 05 | 철가면 | `assets/images/characters/enemy/05/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/05/idle.png` | 1254×1254 | HIGH |
| 06 | 냉혈한 레이첼 | `assets/images/characters/enemy/06/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/06/idle.png` | 1254×1254 | HIGH |
| 07 | 독침 선인장 | `assets/images/characters/enemy/07/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/07/idle.png` | 1254×1254 | HIGH |
| 08 | 쌍권총 로렌조 | `assets/images/characters/enemy/08/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/08/idle.png` | 1254×1254 | HIGH |
| 09 | 황금 해골 | `assets/images/characters/enemy/09/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/09/idle.png` | 1254×1254 | HIGH |
| 10 | 강철 독수리 | `assets/images/characters/enemy/10/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/10/idle.png` | 1254×1254 | HIGH |
| 11 | 침묵의 기관차 | `assets/images/characters/enemy/11/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/11/idle.png` | 1254×1254 | HIGH |
| 12 | 블랙 아이언 | `assets/images/characters/enemy/12/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/12/idle.png` | 1254×1254 | HIGH |
| 13 | 미러 잭 | `assets/images/characters/enemy/13/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/13/idle.png` | 1254×1254 | HIGH |
| 14 | 썬더 볼트 | `assets/images/characters/enemy/14/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/14/idle.png` | 1254×1254 | HIGH |
| 15 | 그림자 사냥꾼 | `assets/images/characters/enemy/15/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/15/idle.png` | 1254×1254 | HIGH |
| 16 | 베놈 스파이크 | `assets/images/characters/enemy/16/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/16/idle.png` | 1254×1254 | HIGH |
| 17 | 사막의 악마 드라이든 | `assets/images/characters/enemy/17/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/17/idle.png` | 1254×1254 | HIGH |
| 18 | 레드 아이 오라클 | `assets/images/characters/enemy/18/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/18/idle.png` | 1254×1254 | HIGH |
| 19 | 보이드 워커 | `assets/images/characters/enemy/19/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/19/idle.png` | 1254×1254 | HIGH |
| 20 | 에코 팬텀 | `assets/images/characters/enemy/20/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/20/idle.png` | 1254×1254 | HIGH |
| 21 | 장의사 | `assets/images/characters/enemy/21/identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/21/idle.png` | 1254×1254 | HIGH |
| 22 | 창백한 기수 | `assets/images/hidden/pale_rider_identity_clean.png` | 256×256 | `assets/images/characters/clarity/npc/22/idle.png` | 1254×1254 | HIGH |

검수표: [01–06](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/identity-audit-1.png), [07–12](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/identity-audit-2.png), [13–18](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/identity-audit-3.png), [19–22](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/identity-audit-4.png).

## Pilot asset pipeline

각 후보는 1254×1254 clarity idle 원본에서 직접 만들었다. 256px 파일을 입력으로 사용하거나 확대하지 않았다. native 크기를 유지하며 외부 red/orange rim C mask만 주변의 원래 dark material RGB로 교체했다. AI, blur, sharpening, resampling, quantization, 색상 재설계는 사용하지 않았다.

- NPC 07: 외곽 rim 6,307픽셀 교체
- NPC 12: 외곽 rim 995픽셀 교체
- NPC 15: 외곽 rim 8,386픽셀 교체
- 세 파일 모두 alpha 변경 0, 선택 영역 밖 보이는 RGB 변경 0, 미처리 후보 0
- 투명 픽셀 아래 숨은 RGB만 0으로 정리했다. 보이는 픽셀과 alpha에는 영향이 없다.
- NPC 07/12 alpha detector PASS. NPC 15는 특수 캐릭터 보호 규칙상 자동 PASS 대상이 아니므로, 승인된 intentional transparency를 byte-for-byte 보존하고 실제 parchment/dark 합성으로 검수했다.

비교: [현재 256 / high-res source / clean poster — parchment](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/pilot-current-source-clean-parchment.png), [dark background](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/pilot-current-source-clean-dark.png). 상세 수치는 [pilot manifest](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/pilot-manifest.json)에 기록했다.

## iPhone 17 Pro actual app comparison

아래 비교는 모두 iPhone 17 Pro 시뮬레이터의 1206×2622 실제 앱 캡처다. 좌우 화면을 resize하지 않고 같은 크기로 배치했다.

### NPC 07 · current 256 vs high-res 1254

![NPC 07 current vs high-res](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/device-npc07-current-vs-highres.png)

### NPC 12 · current 256 vs high-res 1254

![NPC 12 current vs high-res](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/device-npc12-current-vs-highres.png)

### NPC 15 · current 256 vs high-res 1254

![NPC 15 current vs high-res](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/device-npc15-current-vs-highres.png)

### Character Select Player vs high-res NPC Select

![Player vs high-res NPC](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-high-res-pilot/device-player-vs-highres-npc.png)

Player와 NPC 모두 1254×1254 source를 사용한다. 실제 화면에서 모자/머리, 의상 주름, 장갑·홀스터, 부츠, 외곽선의 apparent sharpness가 유사하며 NPC에 256px pixel-cluster 확대가 남지 않는다.

## Layout and performance

고해상도 적용 후에도 캐릭터 크기는 이전 대비 1.50×, 포스터는 폭 1.0676×·높이 1.0980×를 유지했다. 세 체형 모두 full body/weapon/coat가 보이고 clipping이 없으며 배경의 sunset과 town silhouette도 읽힌다.

NPC Select는 현재 선택된 NPC의 `Image` 하나만 렌더한다. 이전/다음은 화살표만 표시하므로 22개의 1254px PNG를 동시에 decode/render하지 않는다. carousel translate animation은 유지된다.

Duel registry와 five-pose assets, NPC data/reaction/AI, unlock/DEV, READY/STEADY/BANG, audio/VFX, routing, ranking, progress는 변경하지 않았다. TypeScript, 변경 파일 ESLint, diff whitespace 검사는 통과했다.

## Stop

대표 3명의 human-quality validation까지만 완료했다. 현재 런타임도 07/12/15만 pilot asset을 사용한다. 나머지 19명 batch production은 사람 승인 후 진행한다.
