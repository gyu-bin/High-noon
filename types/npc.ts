export type NpcTier =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'legend'
  | 'hidden';

/** SPEED(브론즈~골드) / SKILL(플래티넘~) */
export type NpcZone = 'speed' | 'skill';

/** §3 스프라이트 아키타입 */
export type NpcArchetype =
  | 'brown_cowboy'
  | 'sheriff'
  | 'red_gunslinger'
  | 'undead';

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
  /** #13 미러 잭 — 이길수록 빨라지고, 질수록 느려지는 적응형 */
  | 'mirror'
  /** #14 썬더볼트 — BANG 글자 없음, 페이크 번개 + 진짜는 총성·번개만 */
  | 'thunderbolt'
  /** #15 그림자 사냥꾼 — BANG 텍스트 거의 invisible */
  | 'blindBang'
  /** #16 베놈 — 집중 중 화면 흔들림 (약함) */
  | 'screenShakeLight'
  /** #17 Dryden — 집중 중 화면 흔들림 (중간) */
  | 'screenShakeMedium'
  /** #18 레드 아이 — 집중 중 화면 흔들림 (강함) */
  | 'screenShakeHeavy'
  /** #19 보이드 — 집중 중 공허(신호 삼킴), 뱅 때 보라 균열 */
  | 'invertedSignals'
  /** #20 에코 — BANG 3연속, 2번째(총성)만 진짜 */
  | 'echoReady'
  /** #21 Undertaker — 매 라운드 공허/썬더/에코/격진/반전 중 하나를 훔침 */
  | 'chaosRandom'
  /** #22 Pale Rider — 무음 뱅·암전·집중~뱅 긴 랜덤(매 라운드 샘플) */
  | 'paleSilence';

export type NpcDefinition = {
  id: number;
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
