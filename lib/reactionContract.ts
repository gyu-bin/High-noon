import { normalizeReactionMsForServer } from '@/lib/supabase/reactionPayload';
import type { GhostRoundWire } from '@/types/pvp';

/**
 * HIGH NOON reaction contract — one rule for Ranked, Daily and Friend,
 * identical to the server RPCs (20260928_ghost_snapshot_v2.sql).
 *
 *   normalizedMs = Math.round(rawMs)          (raw performance.now() kept by callers)
 *   valid reaction: 80 <= normalizedMs <= 2499
 *
 * Normalization is only for classification, scoring and the server payload.
 */
export const REACTION_MIN_MS = 80;
export const REACTION_MAX_MS = 2499;
/** Upper bound the server accepts when auditing an INVALID reaction. */
export const INVALID_REACTION_AUDIT_MAX_MS = 10000;

export type RoundWinner = 'player' | 'opponent' | 'draw';

export type ReactionClass =
  | { kind: 'shot'; ms: number }
  | { kind: 'invalid'; ms: number };

/** Post-BANG input only. `null` for a non-finite measurement. */
export function classifyReaction(rawMs: number | null | undefined): ReactionClass | null {
  const ms = normalizeReactionMsForServer(rawMs);
  if (ms == null) return null;
  if (ms >= REACTION_MIN_MS && ms <= REACTION_MAX_MS) return { kind: 'shot', ms };
  return { kind: 'invalid', ms: Math.max(0, Math.min(INVALID_REACTION_AUDIT_MAX_MS, ms)) };
}

export function isValidReaction(rawMs: number | null | undefined): boolean {
  return classifyReaction(rawMs)?.kind === 'shot';
}

/** A player's round in server wire form. */
export function playerRoundWire(input: {
  early: boolean;
  timeout: boolean;
  rawMs: number | null | undefined;
}): GhostRoundWire {
  if (input.early) return { outcome: 'early', reaction_ms: null };
  const c = input.timeout ? null : classifyReaction(input.rawMs);
  if (c == null) return { outcome: 'timeout', reaction_ms: null };
  return c.kind === 'shot'
    ? { outcome: 'shot', reaction_ms: c.ms }
    : { outcome: 'invalid', reaction_ms: c.ms };
}

/**
 * Recorded-sample round (Daily, Friend, V1 ranked): the opponent is a stored
 * reaction time. Same as the server SQL: any non-SHOT player round loses; a
 * SHOT is compared with the sample as integers, equal is a draw.
 */
export function scoreSampleRound(player: GhostRoundWire, sampleMs: number): RoundWinner {
  if (player.outcome !== 'shot' || player.reaction_ms == null) return 'opponent';
  const sample = Math.round(sampleMs);
  return player.reaction_ms < sample ? 'player' : player.reaction_ms > sample ? 'opponent' : 'draw';
}
