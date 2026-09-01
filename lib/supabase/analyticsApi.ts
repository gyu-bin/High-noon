import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getOrCreateDeviceKey } from '@/lib/supabase/deviceKey';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { useProgressStore } from '@/store/progressStore';

export type AdminOverview = {
  total_matches: number;
  unique_devices: number;
  median_reaction_ms: number | null;
  avg_highest_unlocked: number | null;
  cleared_npc_avg: number | null;
  last_7d_matches: number;
  progress_funnel: { npc_id: number; wins: number; matches: number }[];
};

export async function recordMatchAnalytics(input: {
  npcId: number;
  won: boolean;
  playerWins: number;
  npcWins: number;
}): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    const deviceKey = await getOrCreateDeviceKey();
    const progress = useProgressStore.getState();
    const { sumMs, count } = progress.reactionAggregate;
    const avgReactionMs = count > 0 ? sumMs / count : null;

    const { error } = await getSupabase().rpc('analytics_record_match', {
      p_device_key: deviceKey,
      p_app_version:
        Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '',
      p_platform: Platform.OS,
      p_npc_id: input.npcId,
      p_won: input.won,
      p_player_wins: input.playerWins,
      p_npc_wins: input.npcWins,
      p_avg_reaction_ms: avgReactionMs,
      p_highest_unlocked: progress.highestUnlockedNpcId,
    });

    if (error) {
      console.warn('[analytics] record failed:', error.message);
    }
  } catch {
    // 통계 실패가 게임 플로우를 막지 않게
  }
}

export async function fetchAdminOverview(pin: string): Promise<AdminOverview> {
  if (!isSupabaseConfigured) {
    throw new Error('supabase_not_configured');
  }

  const { data, error } = await getSupabase().rpc('admin_get_overview', {
    p_pin: pin.trim(),
  });

  if (error) {
    if (error.code === '42501' || error.message.includes('invalid_pin')) {
      throw new Error('invalid_pin');
    }
    throw error;
  }

  return data as AdminOverview;
}
