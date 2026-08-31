import { create } from 'zustand';

import type {
  PvpMatchmakeResult,
  PvpOpponent,
  PvpProfile,
  PvpRoundRecord,
  PvpSubmitResult,
} from '@/types/pvp';

type PvpStoreState = {
  profile: PvpProfile | null;
  opponent: PvpOpponent | null;
  /** 진행 중/직전 매치 라운드 로그 */
  rounds: PvpRoundRecord[];
  playerWins: number;
  opponentWins: number;
  lastSubmit: PvpSubmitResult | null;
  authReady: boolean;
  authError: string | null;
  setAuthReady: (ready: boolean, error?: string | null) => void;
  setProfile: (profile: PvpProfile | null) => void;
  beginMatch: (payload: PvpMatchmakeResult) => void;
  pushRound: (round: PvpRoundRecord) => void;
  setScores: (playerWins: number, opponentWins: number) => void;
  setLastSubmit: (result: PvpSubmitResult | null) => void;
  clearMatch: () => void;
};

export const usePvpStore = create<PvpStoreState>((set) => ({
  profile: null,
  opponent: null,
  rounds: [],
  playerWins: 0,
  opponentWins: 0,
  lastSubmit: null,
  authReady: false,
  authError: null,

  setAuthReady: (authReady, error = null) =>
    set({ authReady, authError: error ?? null }),

  setProfile: (profile) => set({ profile }),

  beginMatch: (payload) =>
    set({
      profile: payload.player,
      opponent: payload.opponent,
      rounds: [],
      playerWins: 0,
      opponentWins: 0,
      lastSubmit: null,
    }),

  pushRound: (round) => set((s) => ({ rounds: [...s.rounds, round] })),

  setScores: (playerWins, opponentWins) => set({ playerWins, opponentWins }),

  setLastSubmit: (lastSubmit) => set({ lastSubmit }),

  clearMatch: () =>
    set({
      opponent: null,
      rounds: [],
      playerWins: 0,
      opponentWins: 0,
    }),
}));
