import {
  classifyReaction,
  INVALID_REACTION_AUDIT_MAX_MS,
  playerRoundWire,
  REACTION_MAX_MS,
  REACTION_MIN_MS,
  type RoundWinner,
} from '@/lib/reactionContract';
import type { GhostOutcome, GhostRound, GhostRoundWire, PvpRoundRecord } from '@/types/pvp';

export type { RoundWinner } from '@/lib/reactionContract';

/** Ghost Snapshot V2 wire helpers (ranked). Reaction rules: lib/reactionContract. */
export const GHOST_SHOT_MIN_MS = REACTION_MIN_MS;
export const GHOST_SHOT_MAX_MS = REACTION_MAX_MS;

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

export function parseGhostRound(raw: unknown): GhostRound | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { outcome?: unknown; reaction_ms?: unknown };
  if (r.outcome === 'shot') {
    const ms = r.reaction_ms;
    if (!isInt(ms) || ms < GHOST_SHOT_MIN_MS || ms > GHOST_SHOT_MAX_MS) return null;
    return { outcome: 'shot', reactionMs: ms };
  }
  if (r.outcome === 'invalid') {
    const ms = r.reaction_ms;
    if (!isInt(ms)) return null;
    const inRange = (ms >= 0 && ms < GHOST_SHOT_MIN_MS) ||
      (ms > GHOST_SHOT_MAX_MS && ms <= INVALID_REACTION_AUDIT_MAX_MS);
    return inRange ? { outcome: 'invalid', reactionMs: ms } : null;
  }
  if ((r.outcome === 'early' || r.outcome === 'timeout') && r.reaction_ms == null) {
    return { outcome: r.outcome, reactionMs: null };
  }
  return null;
}

/**
 * Server scoring contract (pvp_score_rounds_v2), as an explicit table.
 * Row = player outcome, column = ghost outcome. 'compare' = integer ms, lower wins.
 *  - a player foul (EARLY / INVALID) always loses the round
 *  - otherwise a ghost foul (EARLY / INVALID) gives the player the round
 * tests/ghost-snapshot-v2.cjs checks every cell against the SQL function.
 */
export const GHOST_ROUND_RULES: Record<GhostOutcome, Record<GhostOutcome, RoundWinner | 'compare'>> = {
  early: { shot: 'opponent', early: 'opponent', timeout: 'opponent', invalid: 'opponent' },
  invalid: { shot: 'opponent', early: 'opponent', timeout: 'opponent', invalid: 'opponent' },
  shot: { shot: 'compare', early: 'player', timeout: 'player', invalid: 'player' },
  timeout: { shot: 'opponent', early: 'player', timeout: 'draw', invalid: 'player' },
};

export function scoreGhostRound(player: GhostRoundWire, ghost: GhostRoundWire): RoundWinner {
  const rule = GHOST_ROUND_RULES[player.outcome][ghost.outcome];
  if (rule !== 'compare') return rule;
  const p = player.reaction_ms as number;
  const g = ghost.reaction_ms as number;
  return p < g ? 'player' : p > g ? 'opponent' : 'draw';
}

/** A ghost replay value (V1 number or V2 round) in wire form. */
export function ghostReplayWire(ghost: number | GhostRound): GhostRoundWire {
  if (typeof ghost === 'number') {
    // A stored sample is a recorded SHOT; outside the valid range it never
    // fires inside the window, so it replays as TIMEOUT (pvp_match_opponent_rounds).
    const c = classifyReaction(ghost);
    return c?.kind === 'shot'
      ? { outcome: 'shot', reaction_ms: c.ms }
      : { outcome: 'timeout', reaction_ms: null };
  }
  return { outcome: ghost.outcome, reaction_ms: ghost.reactionMs } as GhostRoundWire;
}

/** Exactly three valid rounds, or null (the assignment is then treated as V1). */
export function parseGhostRounds(raw: unknown): [GhostRound, GhostRound, GhostRound] | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  const parsed = raw.map(parseGhostRound);
  if (parsed.some((r) => r == null)) return null;
  return parsed as [GhostRound, GhostRound, GhostRound];
}

/** One played round of the local player, as the server expects it. */
export function playerRoundForServer(record: PvpRoundRecord): GhostRoundWire {
  return playerRoundWire({
    early: record.playerEarly,
    timeout: record.playerTimeout,
    rawMs: record.playerMs,
  });
}

export function playerRoundsForServer(records: readonly PvpRoundRecord[]): GhostRoundWire[] {
  return records.slice(0, 3).map(playerRoundForServer);
}
