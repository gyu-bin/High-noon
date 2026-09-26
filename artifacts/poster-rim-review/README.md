# Poster rim-light — 3-NPC review only

상태: **HUMAN_REVIEW_REQUIRED**. 비교 이미지 작성 후 중단했습니다. 앱 적용, 22명 배치, Player 처리는 하지 않았습니다.

기존 양피지 texture로 만든 **오프라인 비교 합성**입니다. 런타임 화면 캡처나 새 UI 제안이 아닙니다. 모든 열의 배경·크기·배치가 같으며 캐릭터 경계 처리만 다릅니다.

- A ORIGINAL: 현재 승인된 alpha 복구 identity의 원래 rim light.
- B REDUCED 75%: 선택 경계의 림 RGB와 주변 기존 어두운 재질 RGB의 차이를 75% 억제.
- C REMOVED: 같은 선택 경계의 밝은 림 성분을 주변 기존 어두운 재질 RGB로 대체. 캐릭터 전체의 주황색을 지우는 처리가 아닙니다.

원본 256px에서 외부 투명 영역에 가까운 최대 3px 경계와 강한 빨강·주황 조건을 함께 사용했습니다. 원래의 dark outline 픽셀, 선택되지 않은 모든 픽셀, alpha는 완전히 동일합니다. B/C는 blur·feather·smoothing·AI 생성 없이 RGB만 달리한 검수용 시안입니다. 실제 가죽·금속·천의 따뜻한 내부 하이라이트는 남아 있습니다.

이 색상/위치 마스크는 이번 3개 시안의 후보 범위이며, 22명에게 그대로 승인된 규칙이라는 뜻이 아닙니다. 외곽에 있는 진짜 재질색과 조명을 분리하는 최종 판단은 아래 확대 비교를 포함한 사람 검수에 남깁니다.

## NORMAL — 독침 선인장 (NPC 07)

![A/B/C 포스터 비교](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-rim-review/npc-07-poster-comparison.png)

[모자·어깨·부츠 4배 확대 비교](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-rim-review/npc-07-edge-detail.png)

## BOSS — 황금 해골 (NPC 09)

![A/B/C 포스터 비교](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-rim-review/npc-09-poster-comparison.png)

[모자·어깨·부츠 4배 확대 비교](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-rim-review/npc-09-edge-detail.png)

## SPECIAL — 베놈 스파이크 (NPC 16)

![A/B/C 포스터 비교](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-rim-review/npc-16-poster-comparison.png)

[모자·어깨·부츠 4배 확대 비교](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-rim-review/npc-16-edge-detail.png)

## 보존 검증

- production 원본 및 코드 **1037개** 해시 동일.
- 원본 V3 identity 및 모든 Duel pose 변경 없음.
- 비교용 B/C의 alpha 변경 0픽셀, 원래 dark pixel 변경 0픽셀.
- 마스크 밖 RGBA 변경 0픽셀. 흰색 matte 또는 새로운 반투명 fringe를 생성하지 않았습니다.
- 모든 확대는 nearest-neighbor만 사용했습니다.
- 임시 시안은 `output/poster-rim-review/`에 격리했으며 production 경로와 runtime import를 변경하지 않았습니다.

[픽셀·해시 검증 데이터](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/poster-rim-review/audit.json)
