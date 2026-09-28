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

/**
 * Server settlement state of the duel just played.
 * - submitting: request in flight
 * - submitted: server confirmed (last*Submit holds the settlement)
 * - pending_retry: kept in rankingSubmissionStore, safe to retry
 * - failed: server will never accept it (window closed / rejected)
 */
export type RankingSubmissionStatus =
  | 'idle'
  | 'submitting'
  | 'submitted'
  | 'pending_retry'
  | 'failed';

export type RankingSubmissionFailure = 'expired' | 'rejected';

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
  submissionStatus: RankingSubmissionStatus;
  submissionFailure: RankingSubmissionFailure | null;
  /** pending_retry only: false while the server cannot take a safe re-submit. */
  submissionRetryable: boolean;
  /** rankingSubmissionStore id of the duel shown on the result screen. */
  submissionId: string | null;
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
  setSubmission: (
    status: RankingSubmissionStatus,
    submissionId?: string | null,
    failure?: RankingSubmissionFailure | null,
    retryable?: boolean,
  ) => void;
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
  submissionStatus: 'idle',
  submissionFailure: null,
  submissionRetryable: true,
  submissionId: null,
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
      submissionStatus: 'idle',
      submissionFailure: null,
      submissionRetryable: true,
      submissionId: null,
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
      submissionStatus: 'idle',
      submissionFailure: null,
      submissionRetryable: true,
      submissionId: null,
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
      submissionStatus: 'idle',
      submissionFailure: null,
      submissionRetryable: true,
      submissionId: null,
    }),

  pushRound: (round) => set((s) => ({ rounds: [...s.rounds, round] })),

  setScores: (playerWins, opponentWins) => set({ playerWins, opponentWins }),

  setLastSubmit: (lastSubmit) => set({ lastSubmit }),

  setLastDailySubmit: (lastDailySubmit) => set({ lastDailySubmit }),

  setLastFriendSubmit: (lastFriendSubmit) => set({ lastFriendSubmit }),

  setDailyChallenge: (dailyChallenge) => set({ dailyChallenge }),

  setLastCreatedChallengeCode: (lastCreatedChallengeCode) =>
    set({ lastCreatedChallengeCode }),

  setSubmission: (submissionStatus, submissionId, failure = null, retryable = true) =>
    set((s) => ({
      submissionStatus,
      submissionId: submissionId === undefined ? s.submissionId : submissionId,
      submissionFailure: failure,
      submissionRetryable: retryable,
    })),

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
