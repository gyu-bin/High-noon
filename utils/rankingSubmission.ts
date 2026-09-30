import {
  isFriendChallengeClosedError,
  isNetworkError,
  isRankedMatchClosedError,
} from '@/lib/supabase/errors';
import {
  pvpCapabilities,
  pvpHistory,
  pvpLogin,
  pvpSubmitDaily,
  pvpSubmitFriendChallenge,
  pvpSubmitMatch,
  pvpSubmitMatchV2,
} from '@/lib/supabase/pvpApi';
import { normalizeRoundsForServer } from '@/lib/supabase/reactionPayload';
import { usePvpStatsStore } from '@/store/pvpStatsStore';
import {
  usePvpStore,
  type RankingSubmissionFailure,
} from '@/store/pvpStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import {
  useRankingSubmissionStore,
  whenRankingSubmissionsReady,
  type PendingSubmission,
} from '@/store/rankingSubmissionStore';
import type {
  DailySubmitResult,
  GhostRoundWire,
  FriendChallengeSubmitResult,
  PvpMatchResult,
  PvpSubmitResult,
} from '@/types/pvp';
import { utcDateKey } from '@/utils/dailyChallenge';

/** Non-network server errors stop being retried after this many attempts. */
const MAX_SUBMIT_ATTEMPTS = 5;
/** `pvp_history` window used to find a match that was settled but not acknowledged. */
const RECOVERY_HISTORY_LIMIT = 30;

export type RankingSubmitOutcome =
  | {
      status: 'submitted';
      kind: 'ranked';
      /** null: settled on the server, but before/after could not be rebuilt exactly. */
      settlement: PvpSubmitResult | null;
      recovered: boolean;
    }
  | { status: 'submitted'; kind: 'daily'; settlement: DailySubmitResult }
  | { status: 'submitted'; kind: 'friend'; settlement: FriendChallengeSubmitResult }
  | {
      status: 'pending_retry';
      /** false: kept, but must not be re-sent until the server is idempotent. */
      retryable: boolean;
    }
  | { status: 'failed'; reason: RankingSubmissionFailure };

export function rankedSubmissionId(matchId: string): string {
  return `ranked:${matchId}`;
}

export function dailySubmissionId(challengeDate: string): string {
  return `daily:${challengeDate}`;
}

export function friendSubmissionId(code: string): string {
  return `friend:${code}`;
}

type RankedEvidence = {
  matchId: string;
  opponentIsBot: boolean;
  playerRounds: (number | null)[];
  opponentRounds: number[];
  scorePlayer: number;
  scoreOpponent: number;
  result: PvpMatchResult;
  characterId: number;
};

export function buildRankedSubmission(
  input: RankedEvidence & {
    /** Ghost V2 match: the played rounds in server wire form. */
    roundsV2?: GhostRoundWire[];
  },
): PendingSubmission {
  const { roundsV2, ...evidence } = input;
  return {
    kind: 'ranked',
    id: rankedSubmissionId(input.matchId),
    ...evidence,
    ...(roundsV2 ? { roundsV2: roundsV2.map((r) => ({ ...r })) } : {}),
    playerRounds: normalizeRoundsForServer(input.playerRounds),
    forfeit: false,
    completedAt: Date.now(),
    attempts: 0,
  };
}

/**
 * Forfeit uses the existing `pvp_submit_match` contract: every round is sent as
 * "no valid shot" (null), which the server scores as an opponent point, so the
 * server — not the client — settles the loss and rating. The server has no
 * dedicated forfeit RPC yet (see Step 2 hardening plan).
 */
export function buildRankedForfeit(
  input: Omit<RankedEvidence, 'playerRounds' | 'scorePlayer' | 'scoreOpponent' | 'result'>,
): PendingSubmission {
  return {
    kind: 'ranked',
    id: rankedSubmissionId(input.matchId),
    ...input,
    playerRounds: [null, null, null],
    scorePlayer: 0,
    scoreOpponent: 2,
    result: 'loss',
    forfeit: true,
    completedAt: Date.now(),
    attempts: 0,
  };
}

export function buildDailySubmission(input: {
  challengeDate: string;
  playerRounds: (number | null)[];
  scorePlayer: number;
  scoreOpponent: number;
  result: PvpMatchResult;
}): PendingSubmission {
  return {
    kind: 'daily',
    id: dailySubmissionId(input.challengeDate),
    ...input,
    playerRounds: normalizeRoundsForServer(input.playerRounds),
    completedAt: Date.now(),
    attempts: 0,
  };
}

export function buildFriendSubmission(input: {
  code: string;
  playerRounds: (number | null)[];
  scorePlayer: number;
  scoreCreator: number;
  result: PvpMatchResult;
}): PendingSubmission {
  return {
    kind: 'friend',
    id: friendSubmissionId(input.code),
    ...input,
    playerRounds: normalizeRoundsForServer(input.playerRounds),
    completedAt: Date.now(),
    attempts: 0,
  };
}

/**
 * The match left `assigned` without us seeing the response. `pvp_submit_match`
 * locks the row and requires `status = 'assigned'`, so a second submit can
 * never apply rating twice. Read the settled row back from history instead.
 */
async function recoverRankedSettlement(
  matchId: string,
): Promise<RankingSubmitOutcome> {
  const history = await pvpHistory(RECOVERY_HISTORY_LIMIT);
  const index = history.findIndex((h) => h.id === matchId);
  if (index < 0) {
    // Not in history: the 30-minute assignment window closed before settlement.
    return { status: 'failed', reason: 'expired' };
  }
  const entry = history[index]!;
  const profile = await pvpLogin();
  usePvpStore.getState().setProfile(profile);

  // Current rating equals this match's rating_after only if nothing settled since.
  const settlement: PvpSubmitResult | null =
    index === 0
      ? {
          match_id: matchId,
          rating_before: profile.rating - entry.rating_delta,
          rating_after: profile.rating,
          rating_delta: entry.rating_delta,
          rank_tier: profile.rank_tier,
          wins: profile.wins,
          losses: profile.losses,
        }
      : null;
  return { status: 'submitted', kind: 'ranked', settlement, recovered: true };
}

async function attemptSubmission(entry: PendingSubmission): Promise<RankingSubmitOutcome> {
  if (entry.kind === 'ranked') {
    try {
      if (entry.roundsV2 && !entry.forfeit) {
        const settlement = await pvpSubmitMatchV2({
          matchId: entry.matchId,
          rounds: entry.roundsV2,
          characterId: entry.characterId,
        });
        return { status: 'submitted', kind: 'ranked', settlement, recovered: false };
      }
      const settlement = await pvpSubmitMatch({
        matchId: entry.matchId,
        opponentIsBot: entry.opponentIsBot,
        playerRounds: entry.playerRounds,
        opponentRounds: entry.opponentRounds,
        scorePlayer: entry.scorePlayer,
        scoreOpponent: entry.scoreOpponent,
        result: entry.result,
        characterId: entry.characterId,
      });
      return { status: 'submitted', kind: 'ranked', settlement, recovered: false };
    } catch (error) {
      if (isRankedMatchClosedError(error)) return recoverRankedSettlement(entry.matchId);
      throw error;
    }
  }

  if (entry.kind === 'daily') {
    // pvp_submit_daily always targets the server's current UTC day. Sending an
    // old result after midnight would settle the wrong daily.
    if (entry.challengeDate !== utcDateKey()) {
      return { status: 'failed', reason: 'expired' };
    }
    // Idempotent on the server: a repeat returns `already_completed`.
    const settlement = await pvpSubmitDaily({
      playerRounds: entry.playerRounds,
      scorePlayer: entry.scorePlayer,
      scoreOpponent: entry.scoreOpponent,
      result: entry.result,
    });
    return { status: 'submitted', kind: 'daily', settlement };
  }

  try {
    // Idempotent on the server: unique (challenge, challenger) + `already_completed`.
    const settlement = await pvpSubmitFriendChallenge({
      code: entry.code,
      playerRounds: entry.playerRounds,
      scorePlayer: entry.scorePlayer,
      scoreCreator: entry.scoreCreator,
      result: entry.result,
    });
    return { status: 'submitted', kind: 'friend', settlement };
  } catch (error) {
    if (isFriendChallengeClosedError(error)) return { status: 'failed', reason: 'rejected' };
    throw error;
  }
}

function applySettlementSideEffects(
  entry: PendingSubmission,
  outcome: RankingSubmitOutcome,
): void {
  if (outcome.status !== 'submitted') return;
  if (outcome.kind === 'ranked' && outcome.settlement) {
    const s = outcome.settlement;
    useRankingRewardStore.getState().recordSeasonPeak(s.rank_tier);
    const { profile, setProfile } = usePvpStore.getState();
    if (profile) {
      setProfile({
        ...profile,
        rating: s.rating_after,
        rank_tier: s.rank_tier,
        wins: s.wins,
        losses: s.losses,
      });
    }
  }
  if (outcome.kind === 'daily' && entry.kind === 'daily' && !outcome.settlement.already_completed) {
    usePvpStatsStore.getState().recordDailyComplete(entry.challengeDate);
  }
}

/**
 * Ranked re-submission is only safe when the server settles each match once.
 * The donor-era `pvp_submit_match` applies rating on every call, so retry
 * stays off until the server reports `ranked_submit_idempotent` (added by
 * 20260927_reconcile_bounty_ranking_v3.sql). Only a positive answer is cached.
 */
let rankedRetrySafe = false;

export async function isRankedRetrySafe(): Promise<boolean> {
  if (rankedRetrySafe) return true;
  try {
    const caps = await pvpCapabilities();
    rankedRetrySafe = caps?.ranked_submit_idempotent === true;
  } catch {
    return false;
  }
  return rankedRetrySafe;
}

async function retryableFor(entry: PendingSubmission): Promise<boolean> {
  return entry.kind !== 'ranked' || isRankedRetrySafe();
}

const inFlight = new Map<string, Promise<RankingSubmitOutcome>>();

/** Latest outcome per submission id this session; bounded, newest kept. */
const lastOutcome = new Map<string, RankingSubmitOutcome>();
const LAST_OUTCOME_LIMIT = 50;

function rememberOutcome(id: string, outcome: RankingSubmitOutcome): void {
  lastOutcome.delete(id);
  lastOutcome.set(id, outcome);
  while (lastOutcome.size > LAST_OUTCOME_LIMIT) {
    const oldest = lastOutcome.keys().next().value;
    if (oldest === undefined) break;
    lastOutcome.delete(oldest);
  }
}

/**
 * Only the result screen that is showing this submission gets the outcome.
 * A late answer for an older match must not overwrite a newer duel's state.
 */
function mirrorIfCurrent(id: string, outcome: RankingSubmitOutcome): void {
  if (usePvpStore.getState().submissionId === id) applyOutcomeToPvpStore(id, outcome);
}

/**
 * Persist first, then submit. Anything short of a server answer leaves the
 * entry in rankingSubmissionStore so it can be retried later without the
 * client ever inventing a settlement.
 */
export function submitRankingResult(entry: PendingSubmission): Promise<RankingSubmitOutcome> {
  const running = inFlight.get(entry.id);
  if (running) return running;

  const store = useRankingSubmissionStore.getState();
  const existing = store.pending.find((p) => p.id === entry.id);
  if (!existing) store.upsertPending(entry);
  const current = existing ?? entry;

  const run = (async (): Promise<RankingSubmitOutcome> => {
    // A stored ranked entry may already have been settled by a lost request.
    if (existing && !(await retryableFor(current))) {
      return { status: 'pending_retry', retryable: false };
    }
    let outcome: RankingSubmitOutcome;
    try {
      outcome = await attemptSubmission(current);
    } catch (error) {
      useRankingSubmissionStore.getState().bumpAttempts(current.id);
      const attempts = current.attempts + 1;
      if (!isNetworkError(error) && attempts >= MAX_SUBMIT_ATTEMPTS) {
        outcome = { status: 'failed', reason: 'rejected' };
      } else {
        console.warn('[ranking] submission pending retry', current.id);
        return { status: 'pending_retry', retryable: await retryableFor(current) };
      }
    }
    useRankingSubmissionStore.getState().removePending(current.id);
    applySettlementSideEffects(current, outcome);
    return outcome;
  })();

  // Settlement is owned here, not by any screen: the outcome reaches the
  // result state even if the duel / result component has unmounted.
  const task = run.then(
    (outcome) => {
      rememberOutcome(entry.id, outcome);
      mirrorIfCurrent(entry.id, outcome);
      return outcome;
    },
    (error: unknown): RankingSubmitOutcome => {
      // Unexpected failure: the entry stays stored; never retry ranked blindly.
      console.warn('[ranking] submission error kept pending', entry.id, error);
      const outcome: RankingSubmitOutcome = {
        status: 'pending_retry',
        retryable: entry.kind !== 'ranked',
      };
      mirrorIfCurrent(entry.id, outcome);
      return outcome;
    },
  );

  inFlight.set(entry.id, task);
  void task.finally(() => inFlight.delete(entry.id));
  return task;
}

type StartSubmissionOptions = {
  /**
   * true (default): this is the duel shown on the result screen, so its
   * settlement state is tracked in pvpStore. false: fire-and-keep (forfeit).
   */
  track?: boolean;
  /** Runs once when this start sends a new request and it resolves. */
  onSettled?: (outcome: RankingSubmitOutcome) => void;
};

/**
 * Duel-end entry point. Returns immediately (no await needed) so the caller
 * can navigate to the result screen right away; settlement continues here.
 *
 * One submission per id: a repeated start for the same match (re-entered
 * duel route, double finish) never sends again — it re-attaches the result
 * screen to the in-flight request or to the last known outcome.
 * Later retries go through retryPendingSubmission / flushPendingSubmissions,
 * which keep the pvp_capabilities() gate for ranked entries.
 */
export function startRankingSubmission(
  entry: PendingSubmission,
  options: StartSubmissionOptions = {},
): Promise<RankingSubmitOutcome> {
  const { track = true, onSettled } = options;
  if (track) usePvpStore.getState().setSubmission('submitting', entry.id);

  const running = inFlight.get(entry.id);
  if (running) return running;

  const known = lastOutcome.get(entry.id);
  if (known) {
    if (track) applyOutcomeToPvpStore(entry.id, known);
    return Promise.resolve(known);
  }

  const task = submitRankingResult(entry);
  if (onSettled) {
    void task.then((outcome) => {
      try {
        onSettled(outcome);
      } catch (error) {
        console.warn('[ranking] onSettled failed', error);
      }
    });
  }
  return task;
}

export function retryPendingSubmission(id: string): Promise<RankingSubmitOutcome> | null {
  const entry = useRankingSubmissionStore.getState().pending.find((p) => p.id === id);
  return entry ? submitRankingResult(entry) : null;
}

export type FlushSummary = {
  /** Entries the server confirmed during this flush. */
  settled: number;
  /** Entries still stored on the device afterwards. */
  remaining: number;
};

let flushing: Promise<FlushSummary> | null = null;

/**
 * Retry every stored submission once, oldest first. Concurrent callers share
 * one pass. Meant to run in the background — nothing should await it before
 * showing UI. Ranked entries stay gated by pvp_capabilities() inside
 * submitRankingResult.
 */
export function flushPendingSubmissions(): Promise<FlushSummary> {
  if (flushing) return flushing;
  const pass = (async (): Promise<FlushSummary> => {
    await whenRankingSubmissionsReady();
    const queue = [...useRankingSubmissionStore.getState().pending].sort(
      (a, b) => a.completedAt - b.completedAt,
    );
    let settled = 0;
    for (const entry of queue) {
      const outcome = await submitRankingResult(entry);
      if (outcome.status === 'submitted') settled += 1;
    }
    return { settled, remaining: useRankingSubmissionStore.getState().pending.length };
  })();
  flushing = pass;
  void pass.then(
    () => {
      if (flushing === pass) flushing = null;
    },
    () => {
      if (flushing === pass) flushing = null;
    },
  );
  return pass;
}

/** Mirror an outcome into the result-screen state. */
export function applyOutcomeToPvpStore(id: string, outcome: RankingSubmitOutcome): void {
  const s = usePvpStore.getState();
  if (outcome.status === 'pending_retry') {
    s.setSubmission('pending_retry', id, null, outcome.retryable);
    return;
  }
  if (outcome.status === 'failed') {
    s.setSubmission('failed', id, outcome.reason);
    return;
  }
  if (outcome.kind === 'ranked') {
    s.setLastSubmit(outcome.settlement);
  } else if (outcome.kind === 'daily') {
    s.setLastDailySubmit(outcome.settlement);
  } else {
    s.setLastFriendSubmit(outcome.settlement);
  }
  s.setSubmission('submitted', id);
}
