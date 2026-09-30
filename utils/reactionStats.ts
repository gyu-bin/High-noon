import { classifyReaction } from '@/lib/reactionContract';
import type { PvpRoundRecord } from '@/types/pvp';

/**
 * Valid reactions only (shared contract: normalized 80..2499). EARLY, TIMEOUT
 * and INVALID rounds never count as a speed. Values stay raw for display.
 */
function validRaw(rounds: PvpRoundRecord[]): number[] {
  return rounds
    .filter((r) => !r.playerEarly && !r.playerTimeout && !r.playerInvalid)
    .map((r) => r.playerMs)
    .filter((v): v is number => v != null && classifyReaction(v)?.kind === 'shot');
}

export function averagePlayerMs(rounds: PvpRoundRecord[]): number | null {
  const vals = validRaw(rounds);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function bestPlayerMs(rounds: PvpRoundRecord[]): number | null {
  const vals = validRaw(rounds);
  return vals.length === 0 ? null : Math.min(...vals);
}

export function ghostSampleFromRounds(
  rounds: PvpRoundRecord[],
  fallback: [number, number, number],
): [number, number, number] {
  const out: [number, number, number] = [...fallback];
  for (let i = 0; i < 3; i++) {
    const r = rounds[i];
    if (!r || r.playerEarly || r.playerTimeout || r.playerInvalid) continue;
    const c = classifyReaction(r.playerMs);
    if (c?.kind === 'shot') out[i] = c.ms;
  }
  return out;
}
