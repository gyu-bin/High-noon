# NPC SELECT — FINAL SCALE & CHARACTER QUALITY PASS

**크기 수정 완료 / 품질 비교 FAIL / FINAL PRODUCTION LOCK 보류**

```text
NPC_SELECT_CHARACTER_SCALE=1.50x
POSTER_SCALE=width 1.0676x / height 1.0980x
SOURCE_RESOLUTION=NPC identity 256x256 / Character Select Player 1254x1254
POSTER_RESOLUTION=512x512 (정확한 2배 픽셀 복제, 실제 디테일 256x256)
QUALITY_COMPARE=FAIL
```

## 결과와 남은 문제

NPC 표시 캔버스를 170.67pt에서 256pt로 키웠다. 포스터는 297.48×408pt에서 317.58×448pt로 조정했다. WANTED를 줄이고 REACTION을 한 줄로 만들었다. 능력 설명은 한 줄로 제한하며 일반·보스·특수는 같은 캐릭터 공간을 사용한다. 캐러셀, 데이터, 해금, Duel, 진행도와 랭킹은 변경하지 않았다.

실제 크기 비교에서 1.65배는 모자·부츠와 인접 정보 사이 여백이 부족했다. 1.45~1.55배 사이의 1.50배를 선택했다. 기존 22개 포스터의 alpha bounds는 높이 94.9~98.8%로 이미 유사해 캐릭터별 배율 22개를 추가하지 않았다. 모두 같은 contain 캔버스를 사용한다.

현재 NPC 전신은 약 243~253pt이며 포스터 안쪽 높이의 약 57~59%다. 요청의 '기존 대비 1.45~1.65배'와 '포스터 usable height의 40~45%'는 현재 화면 기준 동시에 만족하지 않는다. 이번 결과는 캐릭터의 확실한 확대를 우선했으며, 40~45% 비율을 달성했다고 주장하지 않는다.

품질 차이는 렌더링 크기 외에 원본 해상도 차이에도 있다. NPC 포스터는 256px identity를 512px로 그대로 복제했으며, 복제 과정의 디테일 손실/quantization은 없다. 승인된 alpha와 선택 영역 밖 RGBA도 정확히 보존된다. 그러나 native source와 파일 크기가 동일하지 않고, 실제 내부 디테일은 Player 1254px보다 적다. 현재 상태를 품질 동등성 PASS로 잠그지 않는다.

저장소에 1254px NPC clarity 원본 22개가 존재한다. 이를 포스터에 사용하려면 별도 고해상도 포스터 제작이 필요하다. 이번 요청의 '문제가 발견되면 보고, 임의 재처리 금지'에 따라 승인된 alpha/rim pipeline을 재실행하지 않았고, 모든 이미지 파일을 그대로 유지했다. 고해상도 포스터 제작 허용 여부를 사용자에게 확인한 상태다.

## 검증 범위

- iPhone 17 Pro 시뮬레이터, iOS 27.0, 1206×2622 실제 앱 캡처. 물리 기기 검증은 아니다.
- NPC 01, 09, 12, 15, 21, 22 DEV 모두 전신/무기/코트와 CTA가 화면 안에 표시된다.
- TypeScript, 변경 파일 ESLint, git diff 공백 검사 통과.
- 이번 작업의 기존 소스 변경은 app/npc-select.tsx와 components/npc/NpcWantedCard.tsx 두 파일이다.
- 원본/포스터/Player/Duel 이미지 및 alpha 변경 없음. 기존 잠금과 DEV 분기 변경 없음.
- 캐릭터 이미지 opacity 1, contain, 별도 scale transform 없음. 기존 캐러셀 translateX는 유지.

## 같은 실제 화면 크기 비교

두 화면은 각각 1206×2622 원본 그대로 나란히 배치했다. 이미지 크기 조정 없이 제목만 위에 추가했다.

### Character Select Player vs NPC Select Black Iron

![Character Select Player vs NPC Select Black Iron](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/player-vs-npc-same-size.png)

### 동일 포스터 A/B/C/D — NPC 크기만 변경

![동일 포스터 A/B/C/D — NPC 크기만 변경](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/four-scale-device-comparison.png)

### NPC 01 확대 전후

![NPC 01 확대 전후](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/before-after-npc01.png)

## 대표 NPC 원본 캡처 6종

### NPC 01

![NPC 01](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/final-A-npc01.png)

### NPC 09 Boss

![NPC 09 Boss](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/final-B-npc09.png)

### NPC 12 Black Iron

![NPC 12 Black Iron](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/final-C-npc12.png)

### NPC 15 Special

![NPC 15 Special](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/final-D-npc15.png)

### NPC 21 Undertaker

![NPC 21 Undertaker](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/final-E-npc21.png)

### NPC 22 Pale Rider DEV

![NPC 22 Pale Rider DEV](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/final-F-npc22-dev.png)

[전체 22개 source/render 감사](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-final-scale/source-and-render-audit.json)
