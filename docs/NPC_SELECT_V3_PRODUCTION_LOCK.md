> 후속 요청으로 composition/quality 최종 잠금을 다시 검토 중이다. Alpha/rim 승인과 Duel 분리는 유지한다. 현재 결과는 [최종 크기·품질 검수](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/docs/NPC_SELECT_FINAL_SCALE_REVIEW.md)를 따른다.

# NPC SELECT V3 — PRODUCTION LOCKED

승인된 C — RIM LIGHT REMOVED를 포스터 전용 NPC 22명과 Player 4명에 적용했다. 기존 NPC Select 구성과 cinematic 배경을 유지한다.

```text
POSTER_NPC_ASSETS=22/22
POSTER_PLAYER_ASSETS=4/4
RIM_LIGHT_REMOVED=PASS (승인된 외곽 C 처리)
ALPHA_PASS=26/26
DEVICE_QA=PASS (iPhone 17 Pro simulator)
DUEL_REGRESSION=PASS (원본 해시 + 기존 전투 렌더러)
NPC SELECT V3 — PRODUCTION LOCKED
```

## 에셋과 사용 경계

NPC Select는 `POSTER_NPC_IDENTITIES`, RankingPortrait는 `POSTER_PLAYER_IDENTITIES`를 사용한다. 공통 매핑은 `constants/posterCharacterAssets.ts`, 출처·해시·용도는 `assets/images/characters/poster-manifest.json`에 기록했다. 이후 Wanted/Profile/Friend Challenge/Share도 이 매핑을 재사용한다. Duel은 기존 cinematic/clarity 매핑을 유지한다.

NPC는 승인된 alpha source에서 512px로 정확히 2배 픽셀 복제했다. Player는 현재 활성 identity인 clarity idle 1254px 원본 크기를 유지했다. Player 02는 현재 사용하는 02-v2의 파란 스카프 캐릭터이며, 옛 identity로 되돌리지 않았다.

외부 경계의 붉은·주황 rim 후보만 주변의 원래 어두운 재질 색으로 교체했다. C 처리에 잔여 opacity 혼합을 사용하지 않는다. 내부 의상·가죽·금속·피부·하이라이트와 기존 어두운 윤곽은 보존했다. AI 생성, 흐림, sharpening, bicubic/Lanczos 필터는 사용하지 않았다. 특수 캐릭터의 승인된 투명 영역도 유지했다.

## 검증

- 기존 PNG 773개 해시 동일. 작업 시작 시 1,037개 기준 파일 중 기존 변경은 포스터 관련 UI 4개뿐이다. 앞선 alpha repair 변경은 그대로 보존했다.
- 26개 모두 알파 변경 0픽셀, 선택 영역 밖 보이는 색상 변경 0픽셀, 처리하지 못한 rim 후보 0픽셀.
- 일반 NPC 캡처의 캐릭터는 512 물리 픽셀로 렌더링되며, 불투명 픽셀 RGB가 PNG와 100% 일치한다.
- TypeScript 검사, 변경 코드 ESLint, git diff 공백 검사 통과.
- NPC 데이터, 반응값, 해금/DEV 정책, Duel 로직, 오디오, VFX, 라우팅, 진행도, 랭킹 로직은 변경하지 않았다.

검증 환경은 iPhone 17 Pro 시뮬레이터다. 잠금 화면은 Expo Go에서 production JS (`__DEV__=false`)로 확인했다. 물리 기기 또는 native Release 바이너리 검증은 아니다. Duel은 기존 capture route의 실제 전투 렌더러로 보스 aim과 일반 shoot를 확인했으며 실전 경기 진행은 하지 않았다.

## 실제 NPC Select 캡처

아래 이미지는 각각 1206 × 2622 원본 캡처다. 별도 합성이나 썸네일이 아니다.

### 일반 NPC · 독침 선인장

![일반 NPC · 독침 선인장](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/A-normal.png)

### 보스 · 황금 해골

![보스 · 황금 해골](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/B-boss.png)

### 특수 · 베놈 스파이크

![특수 · 베놈 스파이크](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/C-special.png)

### Pale Rider · release 정책 잠금

![Pale Rider · release 정책 잠금](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/D-pale-locked.png)

### Pale Rider · DEV 해금

![Pale Rider · DEV 해금](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/E-pale-dev.png)

## Before / After

![전체 원본 / 포스터](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/npc07-before-after.png)

![모자 / 어깨 / 코트 / 부츠 확대](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/npc07-edges-before-after.png)

## 전체 26개 및 Duel 검수

- [npc-01-parchment.png](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/npc-01-parchment.png)
- [npc-07-parchment.png](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/npc-07-parchment.png)
- [npc-13-parchment.png](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/npc-13-parchment.png)
- [npc-19-parchment.png](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/npc-19-parchment.png)
- [player-01-parchment.png](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/player-01-parchment.png)
- [F-duel-boss-original.png](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/F-duel-boss-original.png)
- [G-duel-fire-original.png](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/G-duel-fire-original.png)
- [audit.json](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/audit.json)
- [native-pixel-check.json](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-production-lock/native-pixel-check.json)

에셋 재생성은 검수 상태를 pending으로 되돌린다. 승인 없이 NPC Select 캐릭터 아트 방향을 다시 변경하지 않는다.
