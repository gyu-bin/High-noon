/**
 * NPC `duelTiming` 템플릿용 — ready/gap 필드 기본(엔진 준비 단계 길이와는 무관).
 */
export const DUEL_DEFAULT_STAGE_MS = {
  minMs: 1000,
  maxMs: 5000,
} as const;

/**
 * 집중(STEADY) 이후 실제 뱅까지 **기본** 랜덤 대기(ms) — 1~7초.
 * `thunderbolt`·`paleSilence` 등은 `buildDuelStartParams`에서 별도 덮어씀.
 */
export const DUEL_DEFAULT_BANG_DELAY_MS = {
  minMs: 1000,
  maxMs: 7000,
} as const;

/**
 * 준비(READY) 단계 — 집중(STEADY) 직전까지 **고정** 총 길이(ms).
 * 내부는 큐 길이 + 나머지 간격으로만 나눕니다(랜덤 없음).
 */
export const DUEL_READY_PHASE_TOTAL_MS = 2000;
export const DUEL_READY_CUE_MS = 1000;

/**
 * STEADY 직후 스케줄에만 쓰는 선행(ms). READY 큐 길이(`DUEL_READY_CUE_MS`)와 **합치면 안 됨** —
 * 합치면 매 라운드 동일한 1초가 앞에 붙어 `bangDelay` 랜덤이 체감상 거의 같아 보인다.
 */
export const DUEL_STEADY_SCHEDULE_LEAD_MS = 0;
