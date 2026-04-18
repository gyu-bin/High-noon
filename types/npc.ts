export type NpcTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'legend'
  | 'hidden';

/** 결투 타이밍 — `useDuelEngine.start`에 전달 */
export type NpcDuelTiming = {
  readyCueMinMs: number;
  readyCueMaxMs: number;
  gapMinMs: number;
  gapMaxMs: number;
  bangDelayMinMs: number;
  bangDelayMaxMs: number;
};

export type NpcSpecialAbility =
  | 'none'
  /** #13 미러 잭 — 직전 플레이어 유효 반응(ms) 모방 */
  | 'mirror'
  /** #14 썬더볼트 — STEADY 직후 극초단 BANG(50~110ms) */
  | 'thunderbolt'
  /** #15 그림자 사냥꾼 — BANG 텍스트 블라인드 */
  | 'blindBang'
  /** #16 베놈 — 페이크 BANG ×1 */
  | 'fakeSingles'
  /** #17 Dryden — 페이크 2~4, 야간 배경 고정 */
  | 'fakeMultis'
  /** #18 레드 아이 — 페이크 + 블라인드 복합 */
  | 'comboFakeBlind'
  /** #19 보이드 — 신호 색상 반전(READY↔BANG 혼동) */
  | 'invertedSignals'
  /** #20 에코 — READY 음성 이중(청각 페이크) */
  | 'echoReady'
  /** #21 Undertaker — 라운드마다 반전/블라인드/복합/없음 + 뱅·페이크 랜덤 */
  | 'chaosRandom'
  /** #22 Pale Rider — 무음 뱅·암전·집중~뱅 긴 랜덤(매 라운드 샘플) */
  | 'paleSilence';

export type NpcDefinition = {
  id: number;
  name: string;
  title: string;
  /** 카드 표기 목표 반응(ms). 시뮬은 이 값 부근(티어 ±수 ms)에서 출렁임 — 낮을수록 강함 */
  reactionMs: number;
  tier: NpcTier;
  bossFlag: boolean;
  /** 1번만 기본 해금 — 나머지는 진행으로 */
  unlocked: boolean;
  /** 선택 목록에 숨김(조건 충족 시에만 표시) */
  secret?: boolean;
  duelTiming: NpcDuelTiming;
  /** 0이면 페이크 없음. #17 등은 런타임에서 덮어씀 */
  fakeBangCount: number;
  specialAbility: NpcSpecialAbility;
  /** 에셋/프롬프트용 (선택) */
  designKeywords?: string;
};
