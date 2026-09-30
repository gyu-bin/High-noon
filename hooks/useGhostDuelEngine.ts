import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import {
  DUEL_DEFAULT_BANG_DELAY_MS,
  DUEL_READY_CUE_MS,
  DUEL_READY_PHASE_TOTAL_MS,
  DUEL_STEADY_SCHEDULE_LEAD_MS,
} from '@/constants/duelTiming';
import type { DuelPhase } from '@/hooks/useDuelEngine';
import type { GhostRound } from '@/types/pvp';
import { playerRoundWire, scoreSampleRound } from '@/lib/reactionContract';
import { ghostReplayWire, scoreGhostRound } from '@/lib/supabase/ghostRounds';
import { stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';

export type GhostRoundOutcome = {
  /** Raw performance.now() reaction; never rounded here. */
  playerMs: number | null;
  opponentMs: number | null;
  /** Input before BANG. */
  playerEarly: boolean;
  playerTimeout: boolean;
  /** Input after BANG but normalized outside 80..2499: lost round, never a speed. */
  playerInvalid?: boolean;
  /** Ghost V2: the recorded round was a foul (EARLY / INVALID); the ghost never fires. */
  opponentFoul?: boolean;
  winner: 'player' | 'opponent' | 'draw';
};

/**
 * Round verdict with the shared server contract (lib/reactionContract):
 *  - 'ghost'  (Ranked): GHOST_ROUND_RULES vs the replayed ghost round
 *  - 'sample' (Daily / Friend): the stored sample is compared as an integer
 * The raw reaction stays in `playerMs`; only the normalized value decides.
 */
function resolveRound(
  o: Omit<GhostRoundOutcome, 'winner' | 'playerInvalid'>,
  ghost: number | GhostRound,
  scoring: 'ghost' | 'sample',
): Pick<GhostRoundOutcome, 'winner' | 'playerInvalid'> {
  const player = playerRoundWire({ early: o.playerEarly, timeout: o.playerTimeout, rawMs: o.playerMs });
  const winner =
    scoring === 'sample' && typeof ghost === 'number'
      ? scoreSampleRound(player, ghost)
      : scoreGhostRound(player, ghostReplayWire(ghost));
  return { winner, playerInvalid: player.outcome === 'invalid' };
}

function randomDelayInclusiveMs(minMs: number, maxMs: number): number {
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

function clearTimeoutRef(ref: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (ref.current != null) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

const BANG_TIMEOUT_MS = 2500;

/**
 * 비동기 고스트 결투 — 플레이어만 탭, 상대는 ghostMs 후 자동 발사.
 * 로컬 2인 엔진과 분리해 couch 모드를 건드리지 않는다.
 */
export function useGhostDuelEngine(options?: {
  onBangEnter?: () => void;
  onBangTap?: (ms: number) => void;
  onGhostFire?: (ms: number) => void;
  /**
   * Both follow the server contract (integer ms, valid 80..2499), so the round
   * shown on screen is the round the server settles.
   * 'ghost': Ranked (Ghost V2 rule table). 'sample' (default): Daily / Friend.
   */
  scoring?: 'ghost' | 'sample';
}) {
  const scoringRef = useRef(options?.scoring ?? 'sample');
  scoringRef.current = options?.scoring ?? 'sample';
  const ghostReplayRef = useRef<number | GhostRound>(0);
  const onBangEnterRef = useRef(options?.onBangEnter);
  const onBangTapRef = useRef(options?.onBangTap);
  const onGhostFireRef = useRef(options?.onGhostFire);
  onBangEnterRef.current = options?.onBangEnter;
  onBangTapRef.current = options?.onBangTap;
  onGhostFireRef.current = options?.onGhostFire;

  const [phase, setPhase] = useState<DuelPhase>('대기');
  const [signalText, setSignalText] = useState('');
  const [outcome, setOutcome] = useState<GhostRoundOutcome | null>(null);

  const duelSeqRef = useRef(0);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const steadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bangTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ghostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bangT0Ref = useRef<number | null>(null);
  const bangArmedRef = useRef(false);
  const playerMsRef = useRef<number | null>(null);
  const ghostMsRef = useRef<number | null>(null);
  const ghostFiredMsRef = useRef<number | null>(null);
  const bangFinalizedRef = useRef(false);
  const playerEarlyRef = useRef(false);
  /** Ghost V2 EARLY / INVALID round: no ghost shot is scheduled; the ghost fouled. */
  const ghostFoulRef = useRef(false);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const readyDeadlineRef = useRef<number | null>(null);
  const steadyDeadlineRef = useRef<number | null>(null);
  const bangTimeoutDeadlineRef = useRef<number | null>(null);
  const pausePerfRef = useRef<number | null>(null);
  const pauseWallRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    clearTimeoutRef(readyTimerRef);
    clearTimeoutRef(steadyTimerRef);
    clearTimeoutRef(bangTimeoutRef);
    clearTimeoutRef(ghostTimerRef);
  }, []);

  const finishRound = useCallback(
    (partial: Omit<GhostRoundOutcome, 'winner' | 'playerInvalid'>) => {
      clearAllTimers();
      bangArmedRef.current = false;
      bangT0Ref.current = null;
      phaseRef.current = '결과';
      const next: GhostRoundOutcome = {
        ...partial,
        ...resolveRound(partial, ghostReplayRef.current, scoringRef.current),
      };
      setOutcome(next);
      setPhase('결과');
      setSignalText('');
    },
    [clearAllTimers],
  );

  const completeBangTimeout = useCallback(
    (seq: number) => {
      if (duelSeqRef.current !== seq) return;
      if (bangFinalizedRef.current) return;
      bangFinalizedRef.current = true;
      bangArmedRef.current = false;
      clearTimeoutRef(ghostTimerRef);
      finishRound({
        playerMs: playerMsRef.current,
        opponentMs: ghostFiredMsRef.current,
        playerEarly: false,
        playerTimeout: playerMsRef.current == null,
        opponentFoul: ghostFoulRef.current,
      });
    },
    [finishRound],
  );

  const enterBang = useCallback(
    (seq: number) => {
      if (duelSeqRef.current !== seq) return;

      playerMsRef.current = null;
      ghostFiredMsRef.current = null;
      playerEarlyRef.current = false;
      bangFinalizedRef.current = false;
      const t0 = performance.now();
      bangT0Ref.current = t0;
      bangArmedRef.current = true;
      bangTimeoutDeadlineRef.current = Date.now() + BANG_TIMEOUT_MS;
      onBangEnterRef.current?.();
      phaseRef.current = '뱅';
      setPhase('뱅');
      setSignalText('Bang!');

      const ghostTarget = ghostMsRef.current;
      if (ghostTarget != null && ghostTarget >= 0) {
        ghostTimerRef.current = setTimeout(() => {
          if (duelSeqRef.current !== seq) return;
          if (bangFinalizedRef.current) return;
          ghostFiredMsRef.current = ghostTarget;
          onGhostFireRef.current?.(ghostTarget);
          // 플레이어가 이미 쐈으면 즉시 마감
          if (playerMsRef.current != null || playerEarlyRef.current) {
            bangFinalizedRef.current = true;
            bangArmedRef.current = false;
            clearTimeoutRef(bangTimeoutRef);
            finishRound({
              playerMs: playerMsRef.current,
              opponentMs: ghostTarget,
              playerEarly: playerEarlyRef.current,
              playerTimeout: false,
            });
          }
        }, ghostTarget);
      }

      bangTimeoutRef.current = setTimeout(() => {
        completeBangTimeout(seq);
      }, BANG_TIMEOUT_MS);
    },
    [completeBangTimeout, finishRound],
  );

  const scheduleSteadyThenBang = useCallback(
    (seq: number, leadInMs: number, bangWaitMs: number) => {
      const totalMs = leadInMs + bangWaitMs;
      steadyDeadlineRef.current = Date.now() + totalMs;
      steadyTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq) return;
        steadyDeadlineRef.current = null;
        enterBang(seq);
      }, totalMs);
    },
    [enterBang],
  );

  /**
   * @param ghost 이번 라운드 고스트: 반응(ms) 숫자(V1 / Daily / Friend) 또는
   *   Ghost V2 라운드. SHOT은 기록된 반응 후 발사, EARLY/INVALID/TIMEOUT은 발사하지 않는다.
   */
  const start = useCallback(
    (ghost: number | GhostRound) => {
      const ghostReactionMs =
        typeof ghost === 'number' ? ghost : ghost.outcome === 'shot' ? ghost.reactionMs : null;
      ghostFoulRef.current =
        typeof ghost !== 'number' && (ghost.outcome === 'early' || ghost.outcome === 'invalid');
      ghostReplayRef.current = ghost;
      clearAllTimers();
      bangArmedRef.current = false;
      bangT0Ref.current = null;
      playerMsRef.current = null;
      ghostFiredMsRef.current = null;
      playerEarlyRef.current = false;
      bangFinalizedRef.current = false;
      ghostMsRef.current = ghostReactionMs;
      readyDeadlineRef.current = null;
      steadyDeadlineRef.current = null;
      bangTimeoutDeadlineRef.current = null;
      pausePerfRef.current = null;
      pauseWallRef.current = null;

      const seq = ++duelSeqRef.current;
      setOutcome(null);
      phaseRef.current = '준비';
      setPhase('준비');
      setSignalText('Ready');

      const cueMs = Math.min(DUEL_READY_CUE_MS, DUEL_READY_PHASE_TOTAL_MS - 200);
      const betweenReadyAndSteadyMs = Math.max(200, DUEL_READY_PHASE_TOTAL_MS - cueMs);
      const readyTotalMs = cueMs + betweenReadyAndSteadyMs;
      readyDeadlineRef.current = Date.now() + readyTotalMs;
      readyTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq) return;
        readyDeadlineRef.current = null;
        phaseRef.current = '집중';
        setPhase('집중');
        setSignalText('Steady');
        const dBangWait = randomDelayInclusiveMs(
          DUEL_DEFAULT_BANG_DELAY_MS.minMs,
          DUEL_DEFAULT_BANG_DELAY_MS.maxMs,
        );
        scheduleSteadyThenBang(seq, DUEL_STEADY_SCHEDULE_LEAD_MS, dBangWait);
      }, readyTotalMs);
    },
    [clearAllTimers, scheduleSteadyThenBang],
  );

  const tap = useCallback(() => {
    if (
      bangArmedRef.current &&
      bangT0Ref.current != null &&
      !bangFinalizedRef.current
    ) {
      if (playerMsRef.current != null) return;
      const ms = performance.now() - bangT0Ref.current;
      playerMsRef.current = ms;
      onBangTapRef.current?.(ms);
      if (ghostFiredMsRef.current != null) {
        bangFinalizedRef.current = true;
        bangArmedRef.current = false;
        clearTimeoutRef(bangTimeoutRef);
        clearTimeoutRef(ghostTimerRef);
        finishRound({
          playerMs: ms,
          opponentMs: ghostFiredMsRef.current,
          playerEarly: false,
          playerTimeout: false,
        });
      } else if (ghostMsRef.current == null) {
        // Ghost V2 EARLY / INVALID / TIMEOUT round: no ghost shot will come, settle now.
        bangFinalizedRef.current = true;
        bangArmedRef.current = false;
        clearTimeoutRef(bangTimeoutRef);
        finishRound({
          playerMs: ms,
          opponentMs: null,
          playerEarly: false,
          playerTimeout: false,
          opponentFoul: ghostFoulRef.current,
        });
      }
      return;
    }

    const ph = phaseRef.current;
    if (ph === '대기' || ph === '결과') return;

    if (ph === '준비' || ph === '집중' || ph === '페이크' || ph === '뱅') {
      stopDuelSignalSpeech();
      clearAllTimers();
      duelSeqRef.current += 1;
      playerEarlyRef.current = true;
      bangFinalizedRef.current = true;
      finishRound({
        playerMs: null,
        opponentMs: null,
        playerEarly: true,
        playerTimeout: false,
      });
    }
  }, [clearAllTimers, finishRound]);

  const reset = useCallback(() => {
    stopDuelSignalSpeech();
    duelSeqRef.current += 1;
    clearAllTimers();
    bangArmedRef.current = false;
    bangT0Ref.current = null;
    playerMsRef.current = null;
    ghostFiredMsRef.current = null;
    playerEarlyRef.current = false;
    ghostFoulRef.current = false;
    bangFinalizedRef.current = false;
    ghostMsRef.current = null;
    readyDeadlineRef.current = null;
    steadyDeadlineRef.current = null;
    bangTimeoutDeadlineRef.current = null;
    pausePerfRef.current = null;
    pauseWallRef.current = null;
    phaseRef.current = '대기';
    setOutcome(null);
    setPhase('대기');
    setSignalText('');
  }, [clearAllTimers]);

  const pauseTimers = useCallback(() => {
    if (pauseWallRef.current != null) return;
    pauseWallRef.current = Date.now();
    if (phaseRef.current === '뱅' && bangArmedRef.current) {
      pausePerfRef.current = performance.now();
    } else {
      pausePerfRef.current = null;
    }
    clearAllTimers();
  }, [clearAllTimers]);

  const resumeTimers = useCallback(() => {
    const seq = duelSeqRef.current;
    const ph = phaseRef.current;
    const pausedWall = pauseWallRef.current;
    const pausedDuration = pausedWall == null ? 0 : Date.now() - pausedWall;
    pauseWallRef.current = null;
    if (ph === '결과' || ph === '대기') return;

    if (ph === '준비' && readyDeadlineRef.current != null) {
      readyDeadlineRef.current += pausedDuration;
      const remaining = Math.max(0, readyDeadlineRef.current - Date.now());
      readyTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq) return;
        readyDeadlineRef.current = null;
        phaseRef.current = '집중';
        setPhase('집중');
        setSignalText('Steady');
        const dBangWait = randomDelayInclusiveMs(
          DUEL_DEFAULT_BANG_DELAY_MS.minMs,
          DUEL_DEFAULT_BANG_DELAY_MS.maxMs,
        );
        scheduleSteadyThenBang(seq, DUEL_STEADY_SCHEDULE_LEAD_MS, dBangWait);
      }, remaining);
      return;
    }

    if (ph === '집중' && steadyDeadlineRef.current != null) {
      steadyDeadlineRef.current += pausedDuration;
      const remaining = Math.max(0, steadyDeadlineRef.current - Date.now());
      steadyTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq) return;
        steadyDeadlineRef.current = null;
        enterBang(seq);
      }, remaining);
      return;
    }

    if (
      ph === '뱅' &&
      bangArmedRef.current &&
      bangT0Ref.current != null &&
      bangTimeoutDeadlineRef.current != null
    ) {
      const tPause = pausePerfRef.current;
      pausePerfRef.current = null;
      if (tPause != null) {
        bangT0Ref.current += performance.now() - tPause;
      }
      bangTimeoutDeadlineRef.current += pausedDuration;
      const remainingBang = Math.max(0, bangTimeoutDeadlineRef.current - Date.now());
      bangTimeoutDeadlineRef.current = Date.now() + remainingBang;
      bangTimeoutRef.current = setTimeout(() => completeBangTimeout(seq), remainingBang);

      const ghostTarget = ghostMsRef.current;
      if (ghostTarget != null && ghostFiredMsRef.current == null) {
        const elapsed = performance.now() - bangT0Ref.current;
        const remainingGhost = Math.max(0, ghostTarget - elapsed);
        ghostTimerRef.current = setTimeout(() => {
          if (duelSeqRef.current !== seq || bangFinalizedRef.current) return;
          ghostFiredMsRef.current = ghostTarget;
          onGhostFireRef.current?.(ghostTarget);
          if (playerMsRef.current != null || playerEarlyRef.current) {
            bangFinalizedRef.current = true;
            bangArmedRef.current = false;
            clearTimeoutRef(bangTimeoutRef);
            finishRound({
              playerMs: playerMsRef.current,
              opponentMs: ghostTarget,
              playerEarly: playerEarlyRef.current,
              playerTimeout: false,
            });
          }
        }, remainingGhost);
      }
    }
  }, [completeBangTimeout, enterBang, finishRound, scheduleSteadyThenBang]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  const isBangReactionArmed = useCallback(
    () =>
      bangArmedRef.current &&
      bangT0Ref.current != null &&
      !bangFinalizedRef.current,
    [],
  );

  return {
    phase,
    signalText,
    outcome,
    start,
    tap,
    isBangReactionArmed,
    reset,
    pauseTimers,
    resumeTimers,
  };
}
