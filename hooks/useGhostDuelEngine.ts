import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import {
  DUEL_DEFAULT_BANG_DELAY_MS,
  DUEL_READY_CUE_MS,
  DUEL_READY_PHASE_TOTAL_MS,
  DUEL_STEADY_SCHEDULE_LEAD_MS,
} from '@/constants/duelTiming';
import type { DuelPhase } from '@/hooks/useDuelEngine';
import { stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';

export type GhostRoundOutcome = {
  playerMs: number | null;
  opponentMs: number | null;
  playerEarly: boolean;
  playerTimeout: boolean;
  winner: 'player' | 'opponent' | 'draw';
};

function randomDelayInclusiveMs(minMs: number, maxMs: number): number {
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

function clearTimeoutRef(ref: MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (ref.current != null) {
    clearTimeout(ref.current);
    ref.current = null;
  }
}

function resolveGhostWinner(o: Omit<GhostRoundOutcome, 'winner'>): GhostRoundOutcome['winner'] {
  if (o.playerEarly) return 'opponent';
  if (o.playerTimeout && o.opponentMs != null) return 'opponent';
  if (o.playerTimeout && o.opponentMs == null) return 'draw';
  if (o.playerMs != null && o.opponentMs != null) {
    if (o.playerMs < o.opponentMs) return 'player';
    if (o.opponentMs < o.playerMs) return 'opponent';
    return 'draw';
  }
  if (o.playerMs != null) return 'player';
  if (o.opponentMs != null) return 'opponent';
  return 'draw';
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
}) {
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

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const readyDeadlineRef = useRef<number | null>(null);
  const steadyDeadlineRef = useRef<number | null>(null);
  const bangTimeoutDeadlineRef = useRef<number | null>(null);
  const pausePerfRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    clearTimeoutRef(readyTimerRef);
    clearTimeoutRef(steadyTimerRef);
    clearTimeoutRef(bangTimeoutRef);
    clearTimeoutRef(ghostTimerRef);
  }, []);

  const finishRound = useCallback(
    (partial: Omit<GhostRoundOutcome, 'winner'>) => {
      clearAllTimers();
      bangArmedRef.current = false;
      bangT0Ref.current = null;
      phaseRef.current = '결과';
      const next: GhostRoundOutcome = {
        ...partial,
        winner: resolveGhostWinner(partial),
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

  /** @param ghostReactionMs 이번 라운드 고스트 반응(ms) */
  const start = useCallback(
    (ghostReactionMs: number) => {
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
    bangFinalizedRef.current = false;
    ghostMsRef.current = null;
    readyDeadlineRef.current = null;
    steadyDeadlineRef.current = null;
    bangTimeoutDeadlineRef.current = null;
    pausePerfRef.current = null;
    phaseRef.current = '대기';
    setOutcome(null);
    setPhase('대기');
    setSignalText('');
  }, [clearAllTimers]);

  const pauseTimers = useCallback(() => {
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
    if (ph === '결과' || ph === '대기') return;

    if (ph === '준비' && readyDeadlineRef.current != null) {
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
