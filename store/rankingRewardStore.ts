import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  currentSeasonKey,
  higherRankTier,
  parseRankTier,
} from '@/constants/pvpRanks';
import type { PvpRankTier } from '@/types/pvp';

type RankingRewardState = {
  seasonPeaks: Record<string, PvpRankTier>;
  selectedCosmeticNpcId: number | null;
  recordSeasonPeak: (tier: string) => void;
  setCosmeticNpcId: (id: number | null) => void;
};

export const useRankingRewardStore = create<RankingRewardState>()(
  persist(
    (set, get) => ({
      seasonPeaks: {},
      selectedCosmeticNpcId: null,

      recordSeasonPeak: (tier) => {
        const key = currentSeasonKey();
        const next = parseRankTier(tier);
        const prev = get().seasonPeaks[key];
        const peak = prev ? higherRankTier(prev, next) : next;
        if (prev === peak) return;
        set({ seasonPeaks: { ...get().seasonPeaks, [key]: peak } });
      },

      setCosmeticNpcId: (id) => set({ selectedCosmeticNpcId: id }),
    }),
    {
      name: 'high-noon-ranking-rewards',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        seasonPeaks: s.seasonPeaks,
        selectedCosmeticNpcId: s.selectedCosmeticNpcId,
      }),
    },
  ),
);

export function whenRankingRewardsReady(): Promise<void> {
  if (useRankingRewardStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useRankingRewardStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
