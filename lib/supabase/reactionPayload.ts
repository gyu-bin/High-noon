/**
 * Server boundary for reaction milliseconds.
 *
 * Duel timing stays high-precision on the client (`performance.now()` deltas).
 * The ranking RPCs take `integer[]` / `integer`, so every value is converted
 * here — and only here — right before it leaves the device.
 *
 * `null` keeps its meaning (early input / timeout / no valid shot) and is never
 * turned into a number. Non-finite values are treated the same as `null`.
 */
export function normalizeReactionMsForServer(ms: number | null | undefined): number | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  return Math.round(ms);
}

export function normalizeRoundsForServer(
  rounds: readonly (number | null | undefined)[],
): (number | null)[] {
  return rounds.map(normalizeReactionMsForServer);
}

/** Ghost samples are always concrete numbers on the wire; `fallback` fills gaps. */
export function normalizeSamplesForServer(
  samples: readonly (number | null | undefined)[],
  fallback: number,
): number[] {
  const safeFallback = Math.round(fallback);
  return samples.map((ms) => normalizeReactionMsForServer(ms) ?? safeFallback);
}
