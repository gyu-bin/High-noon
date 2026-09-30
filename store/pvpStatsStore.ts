import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PvpRoundRecord } from '@/types/pvp';
import { utcDateKey } from '@/utils/dailyChallenge';
import { appendRecentShots } from '@/utils/friendChallenge';

type PvpStatsState = {
  /** UTC daily duel streak (consecutive completion days) */
  dailyStreak: number;
  /** Last UTC date key when daily was completed */
  lastDailyDateKey: string | null;
  /** Best valid reaction across ranking/daily/friend (ms) */
  bestReactionMs: number | null;
  /** Newest 3 valid SHOT reactions (integer ms) from record duels — the Friend Challenge record. */
  recentShots: number[];
  /** Last challenge this device sent (reused while its record is unchanged and not expired). */
  lastChallenge: SentChallenge | null;
  recordDailyComplete: (dateKey?: string) => void;
  recordBestReaction: (ms: number | null | undefined) => void;
  recordRecentShots: (rounds: readonly PvpRoundRecord[]) => void;
  setLastChallenge: (challenge: SentChallenge | null) => void;
};

export type SentChallenge = {
  code: string;
  /** Server timestamp. */
  expiresAt: string;
  sampleMs: [number, number, number];
};

function previousUtcDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return utcDateKey(dt);
}

export const usePvpStatsStore = create<PvpStatsState>()(
  persist(
    (set, get) => ({
      dailyStreak: 0,
      lastDailyDateKey: null,
      bestReactionMs: null,
      recentShots: [],
      lastChallenge: null,

      recordDailyComplete: (dateKey = utcDateKey()) => {
        const prev = get().lastDailyDateKey;
        if (prev === dateKey) return;
        const yesterday = previousUtcDateKey(dateKey);
        const nextStreak = prev === yesterday ? get().dailyStreak + 1 : 1;
        set({ dailyStreak: nextStreak, lastDailyDateKey: dateKey });
      },

      recordBestReaction: (ms) => {
        if (ms == null || !Number.isFinite(ms)) return;
        const rounded = Math.round(ms);
        if (rounded < 80 || rounded > 2500) return;
        const prev = get().bestReactionMs;
        if (prev != null && rounded >= prev) return;
        set({ bestReactionMs: rounded });
      },

      recordRecentShots: (rounds) => {
        set({ recentShots: appendRecentShots(get().recentShots, rounds) });
      },

      setLastChallenge: (lastChallenge) => set({ lastChallenge }),
    }),
    {
      name: 'high-noon-pvp-stats',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        dailyStreak: s.dailyStreak,
        lastDailyDateKey: s.lastDailyDateKey,
        bestReactionMs: s.bestReactionMs,
        recentShots: s.recentShots,
        lastChallenge: s.lastChallenge,
      }),
    },
  ),
);
