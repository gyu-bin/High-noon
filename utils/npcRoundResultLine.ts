import { npcRoundReactionMargin } from './npcRoundReactionMargin';

type RoundData =
  | { kind: 'win'; playerMs: number | null; npcMs: number | null; npcMisfire?: boolean; lastStand?: boolean }
  | { kind: 'loss'; reason: 'early' | 'timeout' | 'slower'; playerMs: number | null; npcMs: number | null; revive?: boolean };

/**
 * The plain-language line under a round result. A millisecond margin only when both reactions were
 * actually measured; otherwise the cause (foul, opponent fired first, timeout, opponent misfire, ability) or nothing.
 */
export function npcRoundResultLine(data: RoundData): { key: string; marginMs?: number } | null {
  const margin = npcRoundReactionMargin(data);
  if (margin != null) return { key: data.kind === 'win' ? 'result.roundText.marginWin' : 'result.roundText.marginLoss', marginMs: margin };
  if (data.kind === 'loss') {
    if (data.revive) return { key: 'result.roundText.causeAbility' };
    if (data.reason === 'early') return { key: 'result.roundText.causeEarly' };
    // The engine also reports 'timeout' when the NPC's shot lands before any tap: say so plainly.
    if (data.reason === 'timeout') return { key: data.npcMs != null ? 'result.roundText.causeShotFirst' : 'result.roundText.causeTimeout' };
    return null;
  }
  if (data.lastStand) return { key: 'result.roundText.causeAbility' };
  if (data.npcMisfire) return { key: 'result.roundText.causeNpcMisfire' };
  return null;
}
