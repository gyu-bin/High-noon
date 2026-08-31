import type { PvpRoundRecord } from '@/types/pvp';

export type ShareResultInput = {
  playerName: string;
  opponentName: string;
  rounds: PvpRoundRecord[];
  playerWins: number;
  opponentWins: number;
  avgMs: number | null;
  won: boolean;
  draw: boolean;
  challengeLine: string;
  /** 데일리 챌린지 완료 시 뱃지 카피 */
  dailyBadge?: string | null;
  seasonBadge?: string | null;
  cosmeticLabel?: string | null;
  resultVictory: string;
  resultDefeat: string;
  resultDraw: string;
};

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

  const out = [
    'HIGH NOON',
    grid || '⬜⬜⬜',
    `${input.playerName} vs ${input.opponentName}`,
    ...lines,
    `${resultLabel}  ${input.playerWins}–${input.opponentWins}  ·  AVG ${avg}`,
  ];
  if (input.dailyBadge) {
    out.push(`🏅 ${input.dailyBadge}`);
  }
  if (input.seasonBadge) {
    out.push(`⭐ ${input.seasonBadge}`);
  }
  if (input.cosmeticLabel) {
    out.push(`🤠 ${input.cosmeticLabel}`);
  }
  out.push(input.challengeLine);
  return out.join('\n');
}
