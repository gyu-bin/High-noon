/** 결투 아레나 공통 쉐이드·캐릭터 연출 (NPC 1P / 로컬 2P) */
export const DUEL_ARENA_SHADE = {
  colors: [
    'rgba(8, 4, 2, 0.26)',
    'rgba(8, 4, 2, 0.02)',
    'rgba(8, 4, 2, 0.02)',
    'rgba(8, 4, 2, 0.28)',
  ] as const,
  locations: [0, 0.22, 0.72, 1] as const,
};

/** 발 밑 접지 그림자 */
export const DUEL_FIGURE_SHADOW = {
  npc: {
    widthRatio: 0.68,
    bottom: 6,
    opacity: 0.28,
  },
  player: {
    widthRatio: 0.72,
    bottom: 4,
    opacity: 0.32,
  },
} as const;

/** 얼리 탭만 짧은 모달 지연 */
export const DUEL_EARLY_MODAL_DELAY_MS = 80;
