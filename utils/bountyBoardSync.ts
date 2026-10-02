import { pvpGetDaily, pvpLeaderboard, pvpLogin } from '@/lib/supabase/pvpApi';
import { formatUnknownError } from '@/lib/supabase/errors';
import type { DailyChallenge, PvpLeaderboardResult, PvpProfile } from '@/types/pvp';
import { flushPendingSubmissions, type FlushSummary } from '@/utils/rankingSubmission';

/** After this long without an answer the board stops showing a spinner. */
export const BOUNTY_BOARD_SOFT_TIMEOUT_MS = 8000;

export type BountyBoardData = {
  me: PvpProfile;
  leaderboard: PvpLeaderboardResult;
  /** null: daily could not be loaded; the rest of the board still works. */
  daily: DailyChallenge | null;
};

export async function fetchBountyBoardData(): Promise<BountyBoardData> {
  const me = await pvpLogin();
  const leaderboard = await pvpLeaderboard(30);
  let daily: DailyChallenge | null = null;
  try {
    daily = await pvpGetDaily();
  } catch (cause) {
    console.warn('[pvp] daily fetch failed', formatUnknownError(cause));
  }
  return { me, leaderboard, daily };
}

export type BountyBoardLoadMeta = {
  /** true: background refresh after a pending flush; never shows a spinner. */
  silent: boolean;
};

export type BountyBoardHandlers = {
  /** Foreground loading indicator on/off. Never toggled by silent refreshes. */
  onLoading: (loading: boolean) => void;
  onData: (data: BountyBoardData, meta: BountyBoardLoadMeta) => void;
  /** Foreground load failed. Silent refresh failures keep what is on screen. */
  onError: (cause: unknown) => void;
  /** Foreground load is still waiting after the soft timeout. */
  onSlow: () => void;
  onFlushed?: (summary: FlushSummary) => void;
};

export type BountyBoardSession = {
  /** Foreground load + background pending flush. Never awaits the flush. */
  refresh: () => void;
  dispose: () => void;
};

/**
 * Bounty Board data lifecycle.
 *
 * The board is usable immediately: profile / leaderboard load normally while
 * stored duel submissions are flushed in the background. When that flush
 * settles something, the board refreshes silently (no loading state).
 * The pending queue never blocks the board, and ranked retries stay behind
 * the pvp_capabilities() gate inside rankingSubmission.
 */
export function createBountyBoardSession(
  handlers: BountyBoardHandlers,
  options: {
    softTimeoutMs?: number;
    fetchData?: () => Promise<BountyBoardData>;
    flush?: () => Promise<FlushSummary>;
  } = {},
): BountyBoardSession {
  const softTimeoutMs = options.softTimeoutMs ?? BOUNTY_BOARD_SOFT_TIMEOUT_MS;
  const fetchData = options.fetchData ?? fetchBountyBoardData;
  const flush = options.flush ?? flushPendingSubmissions;
  let disposed = false;
  let seq = 0;
  let appliedSeq = 0;
  let foregroundSeq = 0;

  async function load(silent: boolean): Promise<void> {
    const mine = ++seq;
    if (!silent) foregroundSeq = mine;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (!silent) {
      handlers.onLoading(true);
      timer = setTimeout(() => {
        if (disposed || done || foregroundSeq !== mine) return;
        handlers.onLoading(false);
        handlers.onSlow();
      }, softTimeoutMs);
    }
    try {
      const data = await fetchData();
      // Apply only answers newer than what is already on screen.
      if (disposed || mine < appliedSeq) return;
      appliedSeq = mine;
      handlers.onData(data, { silent });
    } catch (cause) {
      if (disposed) return;
      if (silent) {
        console.warn('[pvp] background refresh failed', formatUnknownError(cause));
      } else if (foregroundSeq === mine) {
        handlers.onError(cause);
      }
    } finally {
      done = true;
      if (timer) clearTimeout(timer);
      if (!disposed && !silent && foregroundSeq === mine) handlers.onLoading(false);
    }
  }

  function flushInBackground(): void {
    flush()
      .then((summary) => {
        if (disposed) return;
        handlers.onFlushed?.(summary);
        if (summary.settled > 0) void load(true);
      })
      .catch((cause: unknown) => {
        console.warn('[pvp] pending flush failed', formatUnknownError(cause));
      });
  }

  return {
    refresh() {
      if (disposed) return;
      void load(false);
      flushInBackground();
    },
    dispose() {
      disposed = true;
    },
  };
}
