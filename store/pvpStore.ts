import { create } from 'zustand';

import type {
  DailyChallenge,
  DailySubmitResult,
  PvpMatchmakeResult,
  PvpMatchMode,
  PvpOpponent,
  PvpProfile,
  PvpRoundRecord,
  PvpSubmitResult,
} from '@/types/pvp';

type PvpStoreState = {
  profile: PvpProfile | null;
  opponent: PvpOpponent | null;
  matchMode: PvpMatchMode;
  dailyChallenge: DailyChallenge | null;
  /** 진행 중/직전 매치 라운드 로그 */
  rounds: PvpRoundRecord[];
  playerWins: number;
  opponentWins: number;
  lastSubmit: PvpSubmitResult | null;
  lastDailySubmit: DailySubmitResult | null;
  authReady: boolean;
  authError: string | null;
  setAuthReady: (ready: boolean, error?: string | null) => void;
  setProfile: (profile: PvpProfile | null) => void;
  beginMatch: (payload: PvpMatchmakeResult, mode?: PvpMatchMode) => void;
  beginDailyMatch: (daily: DailyChallenge) => void;
  pushRound: (round: PvpRoundRecord) => void;
  setScores: (playerWins: number, opponentWins: number) => void;
  setLastSubmit: (result: PvpSubmitResult | null) => void;
  setLastDailySubmit: (result: DailySubmitResult | null) => void;
  setDailyChallenge: (daily: DailyChallenge | null) => void;
  clearMatch: () => void;
};

export const usePvpStore = create<PvpStoreState>((set) => ({
  profile: null,
  opponent: null,
  matchMode: 'ranked',
  dailyChallenge: null,
  rounds: [],
  playerWins: 0,
  opponentWins: 0,
  lastSubmit: null,
  lastDailySubmit: null,
  authReady: false,
  authError: null,

  setAuthReady: (authReady, error = null) =>
    set({ authReady, authError: error ?? null }),

  setProfile: (profile) => set({ profile }),

  beginMatch: (payload, mode = 'ranked') =>
    set({
      profile: payload.player,
      opponent: payload.opponent,
      matchMode: mode,
      dailyChallenge: null,
      rounds: [],
      playerWins: 0,
      opponentWins: 0,
      lastSubmit: null,
      lastDailySubmit: null,
    }),

  beginDailyMatch: (daily) =>
    set({
      matchMode: 'daily',
      dailyChallenge: daily,
      opponent: {
        id: `daily-${daily.challenge_date}`,
        display_name: daily.opponent_name,
        character_id: daily.character_id,
        cosmetic_npc_id: daily.cosmetic_npc_id,
        rating: 0,
        rank_tier: 'gold',
        is_bot: true,
        sample_ms: daily.sample_ms,
      },
      rounds: [],
      playerWins: 0,
      opponentWins: 0,
      lastSubmit: null,
      lastDailySubmit: null,
    }),

  pushRound: (round) => set((s) => ({ rounds: [...s.rounds, round] })),

  setScores: (playerWins, opponentWins) => set({ playerWins, opponentWins }),

  setLastSubmit: (lastSubmit) => set({ lastSubmit }),

  setLastDailySubmit: (lastDailySubmit) => set({ lastDailySubmit }),

  setDailyChallenge: (dailyChallenge) => set({ dailyChallenge }),

  clearMatch: () =>
    set({
      opponent: null,
      matchMode: 'ranked',
      dailyChallenge: null,
      rounds: [],
      playerWins: 0,
      opponentWins: 0,
    }),
}));
