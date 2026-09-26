# HIGH NOON — Character Asset Alpha Repair Pass

상태: 이번 alpha audit/repair와 QA를 마쳤습니다. **특수 캐릭터 52개 파일은 HUMAN_REVIEW_REQUIRED로 남겼으며 수정하지 않았습니다.** 다음 작업으로 진행하지 않습니다.

```
TOTAL_ASSETS_AUDITED=291
ALPHA_PASS=131
ALPHA_REPAIRED=108
HUMAN_REVIEW_REQUIRED=52
```

## 검사 범위와 집계

291개는 중복 경로가 없는 실제 PNG 파일 수입니다. 지정된 256px V3 포즈 130개뿐 아니라, 현재 결투가 사용하는 별도 고해상도 clarity 포즈 130개도 검사했습니다. identity 26개, 1인칭 무기 4개(지정된 3포즈 + 현재 cinematic 오버레이 1개), 숨김 실루엣 1개가 나머지입니다.

기존 NPC 21개 identity는 현재 선택 화면이 사용하는 승인된 `*_clean.png`를 검사 대상으로 삼았습니다. 이전 원본은 그대로 보존했고, 승인된 복구본에 복구 알고리즘을 다시 적용하지 않았습니다.

| 분류 | 검사 | PASS | REPAIRED | HUMAN_REVIEW_REQUIRED |
|---|---:|---:|---:|---:|
| Player identity | 4 | 1 | 2 | 1 |
| Player poses — 20 V3 + 20 active | 40 | 16 | 14 | 10 |
| NPC identity | 22 | 22 | 0 | 0 |
| NPC poses — 110 V3 + 110 active | 220 | 91 | 89 | 40 |
| First-person weapon | 4 | 1 | 3 | 0 |
| Hidden locked silhouette | 1 | 0 | 0 | 1 |
| **합계** | **291** | **131** | **108** | **52** |

Hidden/special을 별도 횡단 집계하면 56개입니다(위 표와 중복). 이미 승인된 NPC identity 4개는 PASS, 신규 복구 0개, 나머지 52개는 검토 보류입니다.

## 실제 변경

- Player 02·03 identity 2개, 일반 Player 포즈 14개, 일반 NPC 포즈 89개, 1인칭 리볼버 3포즈를 복구했습니다.
- **303,410개**의 손상된 alpha-0 그림자 픽셀에서 원래 남아 있던 RGB를 사용했습니다.
- 기존에 보이던 RGBA 변경 **0픽셀**, 복구 픽셀의 원래 RGB 변경 **0픽셀**입니다. 기존 주황/빨강 림라이트, 밝은 디테일, 포즈는 그대로입니다.
- 승인된 보수적 복구법을 사용했습니다. 3×3 이진 마스크는 내부 영역을 판단하는 보조 수단이고, 원본 이미지에 blur·smoothing·sharpen을 적용하지 않습니다.
- 1인칭 무기는 소매가 캔버스 밖으로 이어지는 형태이므로, 기존 실루엣이 캔버스 경계와 만나는 지점 사이에만 감지용 경계를 만들어 내부 그림자를 판별했습니다. RGB 증거 없는 외부 공간과 방아쇠 주변 빈 공간을 임의로 칠하지 않았습니다. 3포즈 전후 비교로 검수했습니다.
- 파생 작업이 아니라 canonical PNG 경로를 유지해야 하므로, 이번에는 원본 파일을 별도 백업한 뒤 **동일 경로**의 알파를 복구했습니다. 승인된 NPC identity 파생본 21개는 기존 방식 그대로 유지했습니다.
- 남은 완전 투명 픽셀 아래 RGB만 정리했습니다. artwork 재생성, AI upscale, 색 변경, 디자인 변경, 런타임 matte/outline 추가는 하지 않았습니다.

## 백업과 무결성

108개 수정 파일 모두 `originals/<기존 상대경로>`에 바이트 그대로 백업했습니다. 백업 SHA-256과 수정 직전 SHA-256이 일치하며 덮어쓰기 전에 검증됩니다. 이미 다른 백업이 있거나 검수 목록의 원본 해시가 달라지면 도구는 쓰기를 거부합니다.

- 108개 백업 존재 및 해시 일치.
- 모든 원래 visible 픽셀과 복구 RGB 보존 검증.
- 이미지 dimensions와 alpha bounding box 유지.
- 기존 NPC 복구본 21개 SHA-256 동일.
- Player 04 및 NPC 15/19/20/22의 보호 대상 파일 SHA-256 동일.
- V3 canonical 포즈 행렬 **130/130**, 현재 runtime 포즈 행렬도 **130/130**, 누락 **0**.
- 기존 코드·설정·manifest 파일 **192개** 해시 동일. 이번 패스에서 게임 로직, 데이터, 반응값, 해금, 라우팅, 오디오, VFX, 순위, progressStore, runtime imports를 변경하지 않았습니다.
- 검사 도구의 빠른 연결영역 탐색은 24개 동치 테스트와 기존 승인 NPC 21개 결과의 픽셀 동일성 검증을 통과했습니다.

## 현재 결투 런타임과의 관계

`constants/spriteAssets.ts`는 현재 `CLARITY_PLAYERS` / `CLARITY_NPCS`의 고해상도 포즈를 참조합니다. 이 별도 130개 파일에도 전체 alpha 검사를 실행하고 어두운 배경·종이 배경 비교판을 확인했습니다.

이 세트에서는 alpha=0 아래 RGB가 12 이하의 미세 값만 남아 있었고, 일반 캐릭터 합성에서 256px V3 원본의 광범위한 내부 그림자 탈락은 재현되지 않았습니다. 반투명 픽셀 개수나 미세 RGB 잔여값만으로 opaque 복구하지 않았습니다. 고해상도 세트는 전부 변경하지 않았고, 그 중 보호 대상 25개는 의도 판정을 위해 검토 보류했습니다.

현재 first-person cinematic 오버레이도 같은 손상이 확인되지 않아 유지했습니다. 따라서 이번 변경을 고해상도 런타임 아트 교체로 보아서는 안 됩니다.

## HUMAN_REVIEW_REQUIRED

검토 보류는 52개 모두가 손상 확정이라는 뜻이 아닙니다. ghost translucency / void / negative space / spectral edge의 의도 여부를 detector만으로 판단하지 않기 위한 분류입니다.

| 캐릭터 | 보류 수 | 범위 |
|---|---:|---|
| Player 04 ghost | 11 | 256px identity 1 + V3 포즈 5 + active 포즈 5 |
| NPC 15 Shadow Hunter | 10 | V3 포즈 5 + active 포즈 5 |
| NPC 19 Void Walker | 10 | V3 포즈 5 + active 포즈 5 |
| NPC 20 Echo Phantom | 10 | V3 포즈 5 + active 포즈 5 |
| NPC 22 Pale Rider | 11 | V3 포즈 5 + active 포즈 5 + locked silhouette 1 |

각 포즈는 해당 approved identity의 material/alpha 특성과 비교했습니다. 어떤 경우에도 identity의 실루엣을 다른 포즈에 복사하지 않았습니다. 애매한 특수 투명도는 원본을 유지했습니다.

## QA 자료

아래 자료는 원본 production PNG와 실제 V3 Duel 배경을 사용한 **오프라인 합성**입니다. 실행 중인 기기 화면 캡처로 표기하지 않습니다. 확대/축소는 QA 표시용 nearest-neighbor만 사용했습니다.

- [일반·보스·Special Duel: IDLE/DRAW/FIRE/HIT/DOWN 전후](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/duel-normal-boss-special.png)
- [현재 runtime 포즈: 변경 없이 V3 배경 합성](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/duel-current-runtime.png)
- [보호 캐릭터: 원본 유지, 검토용 합성](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/duel-protected-review.png)
- [Player 20포즈 — dark](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/players-all20-dark.png)
- [Player 20포즈 — parchment](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/players-all20-parchment.png)
- [Player 02 확대](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/before-after-player02.png)
- [Player 03 확대](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/before-after-player03.png)
- [일반 NPC 확대](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/before-after-npc-normal.png)
- [보스 NPC 확대](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/before-after-npc-boss.png)
- [Special Duel NPC 확대](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/before-after-npc-special.png)
- [의도 판정 보류 NPC: 원본 유지](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/before-after-spectral-review.png)
- [리볼버 3포즈 전후](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/weapon-all3-before-after.png)

![Player 02 복구 전후](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/qa/before-after-player02.png)

## 도구와 데이터

`Pillow`와 `NumPy`가 설치된 Python으로 아래 명령을 실행하면 read-only 감사를 수행합니다.

```sh
python3 scripts/repair_character_alpha.py --output output/alpha-audit
```

쓰기에는 `--apply`와 파일별 원본 SHA-256을 담은 `--reviewed-paths` 목록이 필요합니다. 보호 캐릭터와 이전 승인 NPC identity는 목록에 넣어도 쓰기를 거부합니다. 현재 저장된 목록은 이번 패스의 검수 증거이며 이미 복구된 파일에 재적용하면 해시 불일치로 중단됩니다.

- [전체 감사·복구 metadata](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/manifest.json)
- [정확한 52개 검토 경로](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/human-review.json)
- [검증 요약](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/verified-summary.json)
- [이번 검수 원본 해시 목록](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/alpha-repair-v1/reviewed-paths.json)

일반 캐릭터에서 확인된 내부 그림자 손상은 복구했습니다. 원본에 남아 있던 모호한 미세 공백이나 독립 픽셀은 일괄 삭제하지 않았습니다. 보호된 특수 디자인의 최종 의도 판정은 위 human-review 목록으로 남기고 여기서 중단합니다.
