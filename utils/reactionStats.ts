import type { PvpRoundRecord } from '@/types/pvp';

export function averagePlayerMs(rounds: PvpRoundRecord[]): number | null {
  const vals = rounds
    .map((r) => r.playerMs)
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function bestPlayerMs(rounds: PvpRoundRecord[]): number | null {
  let best: number | null = null;
  for (const r of rounds) {
    const ms = r.playerMs;
    if (ms == null || !Number.isFinite(ms)) continue;
    if (ms < 80 || ms > 2500) continue;
    if (best == null || ms < best) best = ms;
  }
  return best;
}

export function ghostSampleFromRounds(
  rounds: PvpRoundRecord[],
  fallback: [number, number, number],
): [number, number, number] {
  const out: [number, number, number] = [...fallback];
  for (let i = 0; i < 3; i++) {
    const ms = rounds[i]?.playerMs;
    if (ms != null && Number.isFinite(ms) && ms >= 80 && ms <= 2500) {
      out[i] = Math.round(ms);
    }
  }
  return out;
}
