import { getOrCreateDeviceKey } from '@/lib/supabase/deviceKey';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { throwSupabaseError } from '@/lib/supabase/errors';
import type {
  DailyChallenge,
  DailySubmitResult,
  FriendChallenge,
  FriendChallengeCreated,
  FriendChallengeSubmitResult,
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

export async function pvpMatchmake(): Promise<PvpMatchmakeResult> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_matchmake', {
    p_device_key: key,
  });
  if (error) throwSupabaseError(error);
  const raw = data as PvpMatchmakeResult;
  const samples = raw.opponent.sample_ms;
  const sample_ms: [number, number, number] = [
    Number(samples[0]),
    Number(samples[1]),
    Number(samples[2]),
  ];
  return {
    ...raw,
    opponent: { ...raw.opponent, sample_ms },
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
    p_player_rounds: input.playerRounds,
    p_opponent_rounds: input.opponentRounds,
    p_score_player: input.scorePlayer,
    p_score_opponent: input.scoreOpponent,
    p_result: input.result,
    p_character_id: input.characterId,
    p_cosmetic_npc_id: null,
  });
  if (error) throwSupabaseError(error);
  return data as PvpSubmitResult;
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
    p_player_rounds: input.playerRounds,
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

export async function pvpCreateFriendChallenge(input: {
  sampleMs: [number, number, number];
  scoreCreator: number;
  creatorAvgMs: number | null;
  creatorBestMs: number | null;
  characterId: number;
}): Promise<FriendChallengeCreated> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_create_friend_challenge', {
    p_device_key: key,
    p_sample_ms: input.sampleMs,
    p_score_creator: input.scoreCreator,
    p_creator_avg_ms: input.creatorAvgMs,
    p_creator_best_ms: input.creatorBestMs,
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
    p_player_rounds: input.playerRounds,
    p_score_player: input.scorePlayer,
    p_score_creator: input.scoreCreator,
    p_result: input.result,
  });
  if (error) throwSupabaseError(error);
  return data as FriendChallengeSubmitResult;
}
