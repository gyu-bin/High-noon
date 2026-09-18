import type { PvpRoundRecord } from '@/types/pvp';

export type ShareResultInput = {
  playerName: string;
  opponentName: string;
  rounds: PvpRoundRecord[];
  playerWins: number;
  opponentWins: number;
  avgMs: number | null;
  bestMs?: number | null;
  streak?: number | null;
  won: boolean;
  draw: boolean;
  challengeLine: string;
  challengeCode?: string | null;
  challengeLink?: string | null;
  /** 데일리 챌린지 완료 시 뱃지 카피 */
  dailyBadge?: string | null;
  seasonBadge?: string | null;
  resultVictory: string;
  resultDefeat: string;
  resultDraw: string;
};

const SHARE_HOOKS = [
  (ms: string) => `${ms}. 이거 이길 수 있음?`,
  (ms: string) => `나보다 빠르면 인정. ${ms}`,
  (ms: string) => `오늘 High Noon에서 ${ms} 나옴.`,
  (ms: string) => `${ms}. Think you're faster?`,
  (ms: string) => `WANTED: beat my ${ms}`,
];

export function pickShareHook(avgMs: number | null, seed = Date.now()): string {
  const ms = avgMs != null ? `${Math.round(avgMs)}ms` : '???ms';
  const idx = Math.abs(seed) % SHARE_HOOKS.length;
  return SHARE_HOOKS[idx]!(ms);
}

/**
 * Wordle형 텍스트 공유 — 틱톡/인스타 스토리에 붙여넣기 쉬운 그리드.
 */
export function buildPvpShareText(input: ShareResultInput): string {
  const grid = input.rounds
    .map((r) => {
      if (r.winner === 'player') return '🟩';
      if (r.winner === 'opponent') return '🟥';
      return '⬛';
    })
    .join('');

  const lines = input.rounds.map((r, i) => {
    const mine = r.playerMs != null ? `${Math.round(r.playerMs)}` : '—';
    const theirs = r.opponentMs != null ? `${Math.round(r.opponentMs)}` : '—';
    const mark =
      r.winner === 'player' ? '✓' : r.winner === 'opponent' ? '✗' : '=';
    return `${i + 1}  ${mine}ms vs ${theirs}ms  ${mark}`;
  });

  const resultLabel = input.won
    ? input.resultVictory
    : input.draw
      ? input.resultDraw
      : input.resultDefeat;
  const avg = input.avgMs != null ? `${Math.round(input.avgMs)}ms` : '—';
  const best =
    input.bestMs != null ? `${Math.round(input.bestMs)}ms` : null;

  const out = [
    'HIGH NOON',
    pickShareHook(input.avgMs, input.avgMs != null ? Math.round(input.avgMs) : 0),
    grid || '⬜⬜⬜',
    `${input.playerName} vs ${input.opponentName}`,
    ...lines,
    `${resultLabel}  ${input.playerWins}–${input.opponentWins}  ·  AVG ${avg}`,
  ];
  if (best) {
    out.push(`BEST ${best}`);
  }
  if (input.streak != null && input.streak > 0) {
    out.push(`🔥 Streak ${input.streak}`);
  }
  if (input.dailyBadge) {
    out.push(`🏅 ${input.dailyBadge}`);
  }
  if (input.seasonBadge) {
    out.push(`⭐ ${input.seasonBadge}`);
  }
  out.push(input.challengeLine);
  if (input.challengeCode) {
    out.push(`CODE ${input.challengeCode}`);
  }
  if (input.challengeLink) {
    out.push(input.challengeLink);
  }
  return out.join('\n');
}
