# NPC Select — Final Visual Polish

NPC Select의 포스터 구성만 변경했습니다. 아래 PNG는 iPhone 17 Pro / iOS 27.0 시뮬레이터에서 실행한 앱의 **1206 × 2622 원본 캡처**입니다. 합성 이미지나 목업이 아닙니다.

## 변경 내용

- 포스터 폭: 화면의 84% → 74%, 이전 폭의 약 88%.
- iPhone 17 Pro 포스터 높이: 500pt → 400pt, 이전 높이의 80%. 더 작은 높이에서 정보가 밀집되어, 전신·보조 이름·능력 설명·44pt 버튼을 읽을 수 있는 높이로 조정했습니다.
- 캐릭터는 원본 contain 표시, 약 45% usable-area 기준의 8pt 단위 크기. 모자와 부츠를 자르지 않습니다.
- Rye WANTED + 작은 구분 장식, 기존 한글 명조 이름, 저장소의 실제 영문 이름을 사용합니다. 독침 선인장의 기존 영문은 VENOM CACTUS입니다.
- 검은 pill을 절제된 tier/type 한 줄로 변경했습니다. 보스는 작은 해골, 특수는 SPECIAL DUEL과 기존 능력 설명을 표시합니다. 반응 수치는 변경하지 않았습니다.
- 일반 NPC에는 없는 lore를 추가하지 않았습니다.
- 기존 WesternButton을 사용합니다. CTA는 포스터 전체 폭의 약 69%입니다.
- 기존 parchment texture에 따뜻한 색조와 가장자리 음영만 적용했습니다.
- 기존 석양 배경을 유지하고 NPC Select에만 덜 어두운 배경 옵션을 적용했습니다. 다른 화면의 기본 옵션은 그대로입니다.
- 작은 brass chevron, 조용한 인덱스, 하단 swipe hint를 유지했습니다.

## 실제 화면

### A. Normal — 독침 선인장

![일반 NPC](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-select-final-polish/A-normal.png)

### B. Boss — 황금 해골

![보스 NPC](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-select-final-polish/B-boss.png)

### C. Special — 미러 잭

![특수 NPC](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-select-final-polish/C-special.png)

### D. Locked Pale Rider

별도 로컬 Metro를 `--no-dev --minify`로 실행하여 `__DEV__=false`인 production JS 조건에서 확인했습니다. 잠금을 강제로 지정한 fixture가 아닙니다. 기존 저장 상태에서 ???, 기존 실루엣, 비활성화된 잠김 버튼을 확인했습니다. 네이티브 배포용 Release 빌드 검증을 의미하지는 않습니다.

![잠긴 Pale Rider](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-select-final-polish/D-pale-locked.png)

### E. DEV unlocked Pale Rider — 추가 확인

기존 개발 서버로 돌아와 실제 identity가 표시되는 것을 확인했습니다. DEV 해금 플래그와 진행 저장소를 변경하지 않았습니다.

![DEV Pale Rider](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-select-final-polish/E-pale-dev.png)

## 검증 및 보호 범위

- TypeScript 검사 통과.
- 수정한 세 파일 ESLint 통과.
- git diff whitespace 검사 통과.
- 이번 작업 직전 해시와 비교: 937개 중 UI 세 파일만 변경, 934개 유지.
- PNG 773개 전부 해시 동일. NPC 데이터, 반응 수치, alpha, 해금, 게임 로직, routing, audio/VFX도 그대로입니다.
- 기존 진행 작업과 alpha 복구 결과를 보존했습니다.
- A/B/C에서 캐릭터 전신, 이름, 분류, 반응, CTA와 특수 설명을 검수했습니다.
- 릴리스 조건에서 01 → 22 캐러셀 순환과 잠금 표시를 확인했습니다.
- 검수용 별도 서버를 종료하고 기존 DEV 실행으로 복귀했습니다.

세부 검증: [verification.json](/Users/mungyubin/Desktop/Coding/High-noon/High-noon/artifacts/npc-select-final-polish/verification.json)
