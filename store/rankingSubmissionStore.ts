import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { GhostRoundWire, PvpMatchResult } from '@/types/pvp';

type PendingBase = {
  /** Stable key: one pending entry per match / daily date / challenge code. */
  id: string;
  /** Round reactions already normalized to the server integer contract. */
  playerRounds: (number | null)[];
  result: PvpMatchResult;
  completedAt: number;
  attempts: number;
};

export type PendingRankedSubmission = PendingBase & {
  kind: 'ranked';
  matchId: string;
  opponentIsBot: boolean;
  opponentRounds: number[];
  scorePlayer: number;
  scoreOpponent: number;
  characterId: number;
  /** Player left an active ranked duel; every round is submitted as no-shot. */
  forfeit: boolean;
  /**
   * Ghost V2 match: the played rounds (1..3) sent to pvp_submit_match_v2.
   * Absent on V1 matches and on entries stored by older app versions.
   */
  roundsV2?: GhostRoundWire[];
};

export type PendingDailySubmission = PendingBase & {
  kind: 'daily';
  /** UTC date of the daily that was played; the server only accepts today. */
  challengeDate: string;
  scorePlayer: number;
  scoreOpponent: number;
};

export type PendingFriendSubmission = PendingBase & {
  kind: 'friend';
  code: string;
  scorePlayer: number;
  scoreCreator: number;
};

export type PendingSubmission =
  | PendingRankedSubmission
  | PendingDailySubmission
  | PendingFriendSubmission;

type RankingSubmissionState = {
  pending: PendingSubmission[];
  upsertPending: (entry: PendingSubmission) => void;
  removePending: (id: string) => void;
  bumpAttempts: (id: string) => void;
};

/**
 * Completed duels whose server settlement has not been confirmed yet.
 * Holds no device key or other secret — only the duel evidence the RPCs need.
 */
export const useRankingSubmissionStore = create<RankingSubmissionState>()(
  persist(
    (set) => ({
      pending: [],

      upsertPending: (entry) =>
        set((s) => ({
          pending: [...s.pending.filter((p) => p.id !== entry.id), entry],
        })),

      removePending: (id) =>
        set((s) => ({ pending: s.pending.filter((p) => p.id !== id) })),

      bumpAttempts: (id) =>
        set((s) => ({
          pending: s.pending.map((p) =>
            p.id === id ? { ...p, attempts: p.attempts + 1 } : p,
          ),
        })),
    }),
    {
      name: 'high-noon-ranking-pending-submissions',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ pending: s.pending }),
    },
  ),
);

export function whenRankingSubmissionsReady(): Promise<void> {
  if (useRankingSubmissionStore.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useRankingSubmissionStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}
