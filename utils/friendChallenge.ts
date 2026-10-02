import { classifyReaction } from '@/lib/reactionContract';
import { formatUnknownError, isNetworkError } from '@/lib/supabase/errors';
import type { PvpRoundRecord } from '@/types/pvp';

/**
 * Friend Challenge V3 — UNRANKED record duel.
 *
 * The server stores a challenge as exactly three reaction samples (integer ms,
 * 80..2499) that the challenger faces round by round. HIGH NOON only ever sends
 * real shots: the creator's three most recent valid SHOT reactions from record
 * duels (Ranked / Daily / Friend). EARLY, TIMEOUT and INVALID rounds are never
 * turned into a number, and nothing is padded or invented.
 */
export const FRIEND_RECORD_SHOTS = 3;

/** Valid SHOT reactions of a finished record duel, in play order (integer ms). */
export function validShotsFromRounds(rounds: readonly PvpRoundRecord[]): number[] {
  const out: number[] = [];
  for (const r of rounds) {
    if (!r || r.playerEarly || r.playerTimeout || r.playerInvalid) continue;
    const c = classifyReaction(r.playerMs);
    if (c?.kind === 'shot') out.push(c.ms);
  }
  return out;
}

/** Keep the newest `FRIEND_RECORD_SHOTS` real shots, oldest first. */
export function appendRecentShots(
  previous: readonly number[] | null | undefined,
  rounds: readonly PvpRoundRecord[],
): number[] {
  const kept = Array.isArray(previous) ? previous.filter(isRecordShot) : [];
  return [...kept, ...validShotsFromRounds(rounds)].slice(-FRIEND_RECORD_SHOTS);
}

export function isRecordShot(ms: unknown): ms is number {
  return typeof ms === 'number' && Number.isInteger(ms) && ms >= 80 && ms <= 2499;
}

export type ChallengeRecord = {
  sampleMs: [number, number, number];
  bestMs: number;
  avgMs: number;
};

/** The challenge a player can send right now, or null until three real shots exist. */
export function challengeRecordFromShots(
  shots: readonly number[] | null | undefined,
): ChallengeRecord | null {
  const last = Array.isArray(shots) ? shots.slice(-FRIEND_RECORD_SHOTS) : [];
  if (last.length !== FRIEND_RECORD_SHOTS || !last.every(isRecordShot)) return null;
  const sampleMs: [number, number, number] = [last[0]!, last[1]!, last[2]!];
  return {
    sampleMs,
    bestMs: Math.min(...sampleMs),
    avgMs: Math.round((sampleMs[0] + sampleMs[1] + sampleMs[2]) / FRIEND_RECORD_SHOTS),
  };
}

export type FriendChallengeErrorKind = 'invalid' | 'expired' | 'self' | 'offline' | 'failed';

/** Map an RPC failure to a screen state. Raw server text is never shown. */
export function friendChallengeErrorKind(error: unknown): FriendChallengeErrorKind {
  if (isNetworkError(error)) return 'offline';
  const msg = formatUnknownError(error);
  if (msg.includes('supabase_not_configured')) return 'offline';
  if (msg.includes('challenge_expired')) return 'expired';
  if (msg.includes('cannot_challenge_self')) return 'self';
  if (msg.includes('invalid_code') || msg.includes('challenge_not_found')) return 'invalid';
  return 'failed';
}

export type ChallengeExpiry =
  | { state: 'open'; days: number; hours: number; minutes: number }
  /** The device clock says it is over, but only the server can close it. */
  | { state: 'closing' }
  | { state: 'unknown' };

/**
 * Time left until `expires_at` (a server timestamp). The device clock is only
 * used for the countdown label; whether the challenge is still open is decided
 * by the server (pvp_get / pvp_submit raise challenge_expired).
 */
export function challengeExpiry(expiresAt: string | null | undefined, nowMs: number): ChallengeExpiry {
  const end = expiresAt ? Date.parse(expiresAt) : NaN;
  if (!Number.isFinite(end) || !Number.isFinite(nowMs)) return { state: 'unknown' };
  const left = end - nowMs;
  if (left <= 0) return { state: 'closing' };
  const totalMinutes = Math.max(1, Math.ceil(left / 60000));
  return {
    state: 'open',
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

/** Short invitation: title, alias line, code, links. Nothing else. */
export function buildFriendChallengeShareMessage(input: {
  code: string;
  /** Already translated, e.g. "Dust Fox calls you out." */
  inviteLine: string;
  webLink: string;
  deepLink: string;
}): string {
  return [
    'HIGH NOON',
    input.inviteLine,
    `CODE ${input.code}`,
    input.webLink,
    input.deepLink,
  ].join('\n');
}
