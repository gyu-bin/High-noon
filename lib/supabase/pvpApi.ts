import { getOrCreateDeviceKey } from '@/lib/supabase/deviceKey';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { isNetworkError, throwSupabaseError } from '@/lib/supabase/errors';
import {
  normalizeReactionMsForServer,
  normalizeRoundsForServer,
  normalizeSamplesForServer,
} from '@/lib/supabase/reactionPayload';
import type {
  DailyChallenge,
  DailySubmitResult,
  FriendChallenge,
  FriendChallengeCreated,
  FriendChallengeSubmitResult,
  GhostRoundWire,
  PvpLeaderboardResult,
  PvpHistoryEntry,
  PvpMatchmakeResult,
  PvpMatchResult,
  PvpProfile,
  PvpSubmitResult,
} from '@/types/pvp';
import {
  getLocalDaily,
  submitLocalDaily,
  type DailyChallengePayload,
} from '@/utils/dailyChallenge';
import { normalizeChallengeCode } from '@/utils/challengeLink';
import { isRecordShot, type ChallengeRecord } from '@/utils/friendChallenge';
import { parseGhostRounds } from '@/lib/supabase/ghostRounds';

/**
 * Ranked only: placeholder for a legacy opponent-sample slot with no shot. The
 * server scores ranked matches itself and ignores p_opponent_rounds. Friend
 * challenges never use it (see pvpCreateFriendChallenge).
 */
const GHOST_SAMPLE_FALLBACK_MS = 280;

async function requireDeviceKey(): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('supabase_not_configured');
  return getOrCreateDeviceKey();
}

function parseDailySamples(raw: unknown): [number, number, number] {
  const arr = raw as number[];
  return [Number(arr[0]), Number(arr[1]), Number(arr[2])];
}

function normalizeDaily(data: DailyChallengePayload | DailyChallenge): DailyChallenge {
  const samples = data.sample_ms;
  return {
    ...data,
    sample_ms: [Number(samples[0]), Number(samples[1]), Number(samples[2])],
  };
}

function normalizeFriendChallenge(
  raw: FriendChallenge & { sample_ms: unknown },
): FriendChallenge {
  return {
    ...raw,
    sample_ms: parseDailySamples(raw.sample_ms),
  };
}

export async function pvpLogin(): Promise<PvpProfile> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_login_device', {
    p_device_key: key,
  });
  if (error) throwSupabaseError(error);
  return data as PvpProfile;
}

export async function pvpUpdateProfile(input: {
  characterId?: number;
}): Promise<PvpProfile> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_update_profile', {
    p_device_key: key,
    p_character_id: input.characterId ?? null,
    p_cosmetic_npc_id: null,
    p_clear_cosmetic: true,
  });
  if (error) {
    // RPC not deployed yet — fall back to login profile only
    if (error.message?.includes('pvp_update_profile')) {
      return pvpLogin();
    }
    throwSupabaseError(error);
  }
  return data as PvpProfile;
}

/**
 * Ranked matchmaking. On a Ghost V2 server (pvp_capabilities().ghost_snapshot_v2)
 * the V2 RPC is used and the opponent carries `ghost_rounds`; otherwise the V1
 * contract is used unchanged.
 */
export async function pvpMatchmake(): Promise<PvpMatchmakeResult> {
  const key = await requireDeviceKey();
  const v2 = await supportsGhostSnapshotV2();
  const { data, error } = await getSupabase().rpc(v2 ? 'pvp_matchmake_v2' : 'pvp_matchmake', {
    p_device_key: key,
  });
  if (error) throwSupabaseError(error);
  const raw = data as PvpMatchmakeResult & { opponent: { ghost_rounds?: unknown } };
  const ghostRounds = v2 ? parseGhostRounds(raw.opponent.ghost_rounds) : null;
  const samples = raw.opponent.sample_ms as unknown as (number | null)[];
  const sample_ms: [number, number, number] = [0, 1, 2].map((i) => {
    const round = ghostRounds?.[i];
    if (round) return round.outcome === 'shot' ? round.reactionMs : GHOST_SAMPLE_FALLBACK_MS;
    const n = Number(samples[i]);
    return Number.isFinite(n) && samples[i] != null ? n : GHOST_SAMPLE_FALLBACK_MS;
  }) as [number, number, number];
  const opponent = { ...raw.opponent };
  delete opponent.ghost_rounds;
  if (v2 && !ghostRounds) {
    // Never replay a V2 assignment from guessed values.
    throw new Error('invalid_ghost_rounds');
  }
  return {
    ...raw,
    ghost_version: ghostRounds ? 2 : 1,
    opponent: ghostRounds
      ? { ...opponent, sample_ms, ghost_rounds: ghostRounds }
      : { ...opponent, sample_ms },
  };
}

export async function pvpSubmitMatch(input: {
  matchId: string;
  opponentIsBot: boolean;
  playerRounds: (number | null)[];
  opponentRounds: number[];
  scorePlayer: number;
  scoreOpponent: number;
  result: PvpMatchResult;
  characterId: number;
}): Promise<PvpSubmitResult> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_submit_match', {
    p_device_key: key,
    // The deployed RPC keeps its legacy parameter name, but this value is the
    // immutable assignment id returned by pvp_matchmake, not a profile id.
    p_opponent_id: input.matchId,
    p_opponent_is_bot: input.opponentIsBot,
    p_player_rounds: normalizeRoundsForServer(input.playerRounds),
    p_opponent_rounds: normalizeSamplesForServer(input.opponentRounds, GHOST_SAMPLE_FALLBACK_MS),
    p_score_player: input.scorePlayer,
    p_score_opponent: input.scoreOpponent,
    p_result: input.result,
    p_character_id: input.characterId,
    p_cosmetic_npc_id: null,
  });
  if (error) throwSupabaseError(error);
  return data as PvpSubmitResult;
}

export type PvpServerCapabilities = {
  contract?: string;
  ranked_submit_idempotent?: boolean;
  forfeit_rpc?: boolean;
  ghost_snapshot_v2?: boolean;
  history_rounds?: boolean;
};

/** Ghost V2 submission: the player's played rounds (1..3), scored by the server. */
export async function pvpSubmitMatchV2(input: {
  matchId: string;
  rounds: GhostRoundWire[];
  characterId: number;
}): Promise<PvpSubmitResult> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_submit_match_v2', {
    p_device_key: key,
    p_match_id: input.matchId,
    p_rounds: input.rounds,
    p_character_id: input.characterId,
  });
  if (error) throwSupabaseError(error);
  return data as PvpSubmitResult;
}

const GHOST_V2_NEGATIVE_TTL_MS = 5 * 60 * 1000;
let ghostV2Supported = false;
let ghostV2CheckedAt = 0;

/**
 * Only a positive answer is kept for the session; a negative / failed check is
 * retried after a few minutes so a migrated server is picked up without restart.
 */
export async function supportsGhostSnapshotV2(): Promise<boolean> {
  if (ghostV2Supported) return true;
  if (Date.now() - ghostV2CheckedAt < GHOST_V2_NEGATIVE_TTL_MS) return false;
  ghostV2CheckedAt = Date.now();
  try {
    const caps = await pvpCapabilities();
    ghostV2Supported = caps?.ghost_snapshot_v2 === true;
  } catch {
    ghostV2CheckedAt = 0;
    return false;
  }
  return ghostV2Supported;
}

/**
 * `pvp_capabilities` exists only on the reconciled V3 baseline
 * (20260927_reconcile_bounty_ranking_v3.sql). A donor-era database has no such
 * RPC, which is reported as `null`. Network failures still throw.
 */
export async function pvpCapabilities(): Promise<PvpServerCapabilities | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabase().rpc('pvp_capabilities');
  if (error) {
    if (isNetworkError(error)) throwSupabaseError(error);
    return null;
  }
  return (data ?? null) as PvpServerCapabilities | null;
}

export async function pvpRerollDisplayName(): Promise<PvpProfile> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_reroll_display_name', {
    p_device_key: key,
  });
  if (error) throwSupabaseError(error);
  return data as PvpProfile;
}

export async function pvpLeaderboard(limit = 50): Promise<PvpLeaderboardResult> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_leaderboard', {
    p_device_key: key,
    limit_count: limit,
  });
  if (error) throwSupabaseError(error);
  return data as PvpLeaderboardResult;
}

export async function pvpHistory(limit = 8): Promise<PvpHistoryEntry[]> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_history', {
    p_device_key: key,
    limit_count: limit,
  });
  if (error) throwSupabaseError(error);
  return (Array.isArray(data) ? data : []) as PvpHistoryEntry[];
}

export async function pvpGetDaily(): Promise<DailyChallenge> {
  if (!isSupabaseConfigured) {
    return normalizeDaily(await getLocalDaily());
  }
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_get_daily', {
    p_device_key: key,
  });
  if (error) {
    if (
      error.message?.includes('pvp_get_daily') ||
      error.message?.includes('daily_challenges')
    ) {
      return normalizeDaily(await getLocalDaily());
    }
    throwSupabaseError(error);
  }
  const raw = data as DailyChallenge & { sample_ms: unknown };
  return normalizeDaily({
    ...raw,
    sample_ms: parseDailySamples(raw.sample_ms),
  });
}

export async function pvpSubmitDaily(input: {
  playerRounds: (number | null)[];
  scorePlayer: number;
  scoreOpponent: number;
  result: PvpMatchResult;
  shared?: boolean;
}): Promise<DailySubmitResult> {
  if (!isSupabaseConfigured) {
    return submitLocalDaily(input);
  }
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_submit_daily', {
    p_device_key: key,
    p_player_rounds: normalizeRoundsForServer(input.playerRounds),
    p_score_player: input.scorePlayer,
    p_score_opponent: input.scoreOpponent,
    p_result: input.result,
    p_shared: input.shared ?? false,
  });
  if (error) {
    if (
      error.message?.includes('pvp_submit_daily') ||
      error.message?.includes('daily_completions')
    ) {
      return submitLocalDaily(input);
    }
    throwSupabaseError(error);
  }
  return data as DailySubmitResult;
}

export async function pvpMarkDailyShared(): Promise<void> {
  if (!isSupabaseConfigured) {
    const daily = await getLocalDaily();
    if (daily.completion) {
      await submitLocalDaily({
        playerRounds: [],
        scorePlayer: daily.completion.score_player,
        scoreOpponent: daily.completion.score_opponent,
        result: daily.completion.result,
        shared: true,
      });
    }
    return;
  }
  const key = await requireDeviceKey();
  const { error } = await getSupabase().rpc('pvp_mark_daily_shared', {
    p_device_key: key,
  });
  if (error && !error.message?.includes('pvp_mark_daily_shared')) {
    throwSupabaseError(error);
  }
}

/**
 * Friend Challenge V3: the record is three real SHOT reactions (integer ms,
 * 80..2499). Anything else is refused here, before the server would pad it —
 * no fallback or opponent sample ever stands in for a missing shot.
 */
export async function pvpCreateFriendChallenge(input: {
  record: ChallengeRecord;
  characterId: number;
}): Promise<FriendChallengeCreated> {
  const { sampleMs, avgMs, bestMs } = input.record;
  if (sampleMs.length !== 3 || !sampleMs.every(isRecordShot)) {
    throw new Error('invalid_sample_ms');
  }
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_create_friend_challenge', {
    p_device_key: key,
    p_sample_ms: [sampleMs[0], sampleMs[1], sampleMs[2]],
    // A record challenge has no match score; the column is informational only.
    p_score_creator: 0,
    p_creator_avg_ms: avgMs,
    p_creator_best_ms: bestMs,
    p_character_id: input.characterId,
    p_cosmetic_npc_id: null,
  });
  if (error) throwSupabaseError(error);
  const raw = data as FriendChallengeCreated & { sample_ms: unknown };
  return {
    ...raw,
    sample_ms: parseDailySamples(raw.sample_ms),
  };
}

export async function pvpGetFriendChallenge(code: string): Promise<FriendChallenge> {
  const key = await requireDeviceKey();
  const normalized = normalizeChallengeCode(code);
  const { data, error } = await getSupabase().rpc('pvp_get_friend_challenge', {
    p_device_key: key,
    p_code: normalized,
  });
  if (error) throwSupabaseError(error);
  return normalizeFriendChallenge(data as FriendChallenge & { sample_ms: unknown });
}

export async function pvpSubmitFriendChallenge(input: {
  code: string;
  playerRounds: (number | null)[];
  scorePlayer: number;
  scoreCreator: number;
  result: PvpMatchResult;
}): Promise<FriendChallengeSubmitResult> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_submit_friend_challenge', {
    p_device_key: key,
    p_code: normalizeChallengeCode(input.code),
    p_player_rounds: normalizeRoundsForServer(input.playerRounds),
    p_score_player: input.scorePlayer,
    p_score_creator: input.scoreCreator,
    p_result: input.result,
  });
  if (error) throwSupabaseError(error);
  return data as FriendChallengeSubmitResult;
}
