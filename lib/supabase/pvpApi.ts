import { getOrCreateDeviceKey } from '@/lib/supabase/deviceKey';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  DailyChallenge,
  DailySubmitResult,
  PvpLeaderboardResult,
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

export async function pvpLogin(): Promise<PvpProfile> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_login_device', {
    p_device_key: key,
  });
  if (error) throw error;
  return data as PvpProfile;
}

export async function pvpUpdateProfile(input: {
  characterId?: number;
  cosmeticNpcId?: number | null;
  clearCosmetic?: boolean;
}): Promise<PvpProfile> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_update_profile', {
    p_device_key: key,
    p_character_id: input.characterId ?? null,
    p_cosmetic_npc_id: input.cosmeticNpcId ?? null,
    p_clear_cosmetic: input.clearCosmetic ?? false,
  });
  if (error) {
    // RPC not deployed yet — fall back to login profile only
    if (error.message?.includes('pvp_update_profile')) {
      return pvpLogin();
    }
    throw error;
  }
  return data as PvpProfile;
}

export async function pvpMatchmake(): Promise<PvpMatchmakeResult> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_matchmake', {
    p_device_key: key,
  });
  if (error) throw error;
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
  opponentId: string;
  opponentIsBot: boolean;
  playerRounds: (number | null)[];
  opponentRounds: number[];
  scorePlayer: number;
  scoreOpponent: number;
  result: PvpMatchResult;
  characterId: number;
  cosmeticNpcId?: number | null;
}): Promise<PvpSubmitResult> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_submit_match', {
    p_device_key: key,
    p_opponent_id: input.opponentId,
    p_opponent_is_bot: input.opponentIsBot,
    p_player_rounds: input.playerRounds,
    p_opponent_rounds: input.opponentRounds,
    p_score_player: input.scorePlayer,
    p_score_opponent: input.scoreOpponent,
    p_result: input.result,
    p_character_id: input.characterId,
    p_cosmetic_npc_id: input.cosmeticNpcId ?? null,
  });
  if (error) throw error;
  return data as PvpSubmitResult;
}

export async function pvpSetCosmeticNpc(
  cosmeticNpcId: number | null,
): Promise<PvpProfile> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_set_cosmetic_npc', {
    p_device_key: key,
    p_cosmetic_npc_id: cosmeticNpcId,
  });
  if (error) throw error;
  return data as PvpProfile;
}

export async function pvpRerollDisplayName(): Promise<PvpProfile> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_reroll_display_name', {
    p_device_key: key,
  });
  if (error) throw error;
  return data as PvpProfile;
}

export async function pvpLeaderboard(limit = 50): Promise<PvpLeaderboardResult> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_leaderboard', {
    p_device_key: key,
    limit_count: limit,
  });
  if (error) throw error;
  return data as PvpLeaderboardResult;
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
    throw error;
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
    throw error;
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
    throw error;
  }
}
