import { create } from 'zustand';

import type {
  DailyChallenge,
  DailySubmitResult,
  FriendChallenge,
  FriendChallengeSubmitResult,
  PvpMatchmakeResult,
  PvpMatchMode,
  PvpOpponent,
  PvpProfile,
  PvpRoundRecord,
  PvpSubmitResult,
} from '@/types/pvp';

type PvpStoreState = {
  profile: PvpProfile | null;
  matchId: string | null;
  opponent: PvpOpponent | null;
  matchMode: PvpMatchMode;
  dailyChallenge: DailyChallenge | null;
  friendChallenge: FriendChallenge | null;
  /** 진행 중/직전 매치 라운드 로그 */
  rounds: PvpRoundRecord[];
  playerWins: number;
  opponentWins: number;
  lastSubmit: PvpSubmitResult | null;
  lastDailySubmit: DailySubmitResult | null;
  lastFriendSubmit: FriendChallengeSubmitResult | null;
  lastCreatedChallengeCode: string | null;
  authReady: boolean;
  authError: string | null;
  setAuthReady: (ready: boolean, error?: string | null) => void;
  setProfile: (profile: PvpProfile | null) => void;
  beginMatch: (payload: PvpMatchmakeResult, mode?: PvpMatchMode) => void;
  beginDailyMatch: (daily: DailyChallenge) => void;
  beginFriendMatch: (challenge: FriendChallenge) => void;
  pushRound: (round: PvpRoundRecord) => void;
  setScores: (playerWins: number, opponentWins: number) => void;
  setLastSubmit: (result: PvpSubmitResult | null) => void;
  setLastDailySubmit: (result: DailySubmitResult | null) => void;
  setLastFriendSubmit: (result: FriendChallengeSubmitResult | null) => void;
  setDailyChallenge: (daily: DailyChallenge | null) => void;
  setLastCreatedChallengeCode: (code: string | null) => void;
  clearMatch: () => void;
};

export const usePvpStore = create<PvpStoreState>((set) => ({
  profile: null,
  matchId: null,
  opponent: null,
  matchMode: 'ranked',
  dailyChallenge: null,
  friendChallenge: null,
  rounds: [],
  playerWins: 0,
  opponentWins: 0,
  lastSubmit: null,
  lastDailySubmit: null,
  lastFriendSubmit: null,
  lastCreatedChallengeCode: null,
  authReady: false,
  authError: null,

  setAuthReady: (authReady, error = null) =>
    set({ authReady, authError: error ?? null }),

  setProfile: (profile) => set({ profile }),

  beginMatch: (payload, mode = 'ranked') =>
    set({
      profile: payload.player,
      matchId: payload.match_id ?? null,
      opponent: payload.opponent,
      matchMode: mode,
      dailyChallenge: null,
      friendChallenge: null,
      rounds: [],
      playerWins: 0,
      opponentWins: 0,
      lastSubmit: null,
      lastDailySubmit: null,
      lastFriendSubmit: null,
      lastCreatedChallengeCode: null,
    }),

  beginDailyMatch: (daily) =>
    set({
      matchMode: 'daily',
      matchId: null,
      dailyChallenge: daily,
      friendChallenge: null,
      opponent: {
        id: `daily-${daily.challenge_date}`,
        display_name: daily.opponent_name,
        character_id: daily.character_id,
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
      lastFriendSubmit: null,
      lastCreatedChallengeCode: null,
    }),

  beginFriendMatch: (challenge) =>
    set({
      matchMode: 'friend',
      matchId: null,
      dailyChallenge: null,
      friendChallenge: challenge,
      opponent: {
        id: `friend-${challenge.code}`,
        display_name: challenge.creator_name,
        character_id: challenge.character_id,
        rating: 0,
        rank_tier: 'gold',
        is_bot: true,
        sample_ms: challenge.sample_ms,
      },
      rounds: [],
      playerWins: 0,
      opponentWins: 0,
      lastSubmit: null,
      lastDailySubmit: null,
      lastFriendSubmit: null,
      lastCreatedChallengeCode: null,
    }),

  pushRound: (round) => set((s) => ({ rounds: [...s.rounds, round] })),

  setScores: (playerWins, opponentWins) => set({ playerWins, opponentWins }),

  setLastSubmit: (lastSubmit) => set({ lastSubmit }),

  setLastDailySubmit: (lastDailySubmit) => set({ lastDailySubmit }),

  setLastFriendSubmit: (lastFriendSubmit) => set({ lastFriendSubmit }),

  setDailyChallenge: (dailyChallenge) => set({ dailyChallenge }),

  setLastCreatedChallengeCode: (lastCreatedChallengeCode) =>
    set({ lastCreatedChallengeCode }),

  clearMatch: () =>
    set({
      opponent: null,
      matchId: null,
      matchMode: 'ranked',
      dailyChallenge: null,
      friendChallenge: null,
      rounds: [],
      playerWins: 0,
      opponentWins: 0,
    }),
}));
