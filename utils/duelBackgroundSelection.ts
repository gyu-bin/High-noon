/** Equal-width probability buckets; call only at a match boundary, never per round. */
export const DUEL_BACKGROUND_IDS = ['twilight', 'canyon', 'moonlit'] as const;
export type DuelBackgroundId = typeof DUEL_BACKGROUND_IDS[number];

export function pickDuelBackground(random: () => number = Math.random): DuelBackgroundId {
  const index = Math.min(2, Math.max(0, Math.floor(random() * 3)));
  return DUEL_BACKGROUND_IDS[index]!;
}
