import { getOrCreateDeviceKey } from '@/lib/supabase/deviceKey';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import type {
  PvpLeaderboardResult,
  PvpMatchmakeResult,
  PvpMatchResult,
  PvpProfile,
  PvpSubmitResult,
} from '@/types/pvp';

async function requireDeviceKey(): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('supabase_not_configured');
  return getOrCreateDeviceKey();
}

export async function pvpLogin(): Promise<PvpProfile> {
  const key = await requireDeviceKey();
  const { data, error } = await getSupabase().rpc('pvp_login_device', {
    p_device_key: key,
  });
  if (error) throw error;
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
