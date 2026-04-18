import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import {
  DUEL_DEFAULT_BANG_DELAY_MS,
  DUEL_READY_CUE_MS,
  DUEL_READY_PHASE_TOTAL_MS,
  DUEL_STEADY_SCHEDULE_LEAD_MS,
} from '@/constants/duelTiming';
import type { DuelPhase } from '@/hooks/useDuelEngine';
import { stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';

export type LocalPlayerId = 'p1' | 'p2';

export type LocalPlayerRoundState = {
  reactionMs: number | null;
  earlyTap: boolean;
  timeout: boolean;
};

export type LocalRoundOutcome = {
  p1: LocalPlayerRoundState;
  p2: LocalPlayerRoundState;
  winner: LocalPlayerId | 'draw';
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

function resolveWinner(
  p1: LocalPlayerRoundState,
  p2: LocalPlayerRoundState,
): LocalPlayerId | 'draw' {
  if (p1.earlyTap && p2.earlyTap) return 'draw';
  if (p1.earlyTap) return 'p2';
  if (p2.earlyTap) return 'p1';
  if (p1.timeout && p2.timeout) return 'draw';
  if (p1.timeout && p2.reactionMs != null) return 'p2';
  if (p2.timeout && p1.reactionMs != null) return 'p1';
  if (p1.reactionMs != null && p2.reactionMs != null) {
    if (p1.reactionMs < p2.reactionMs) return 'p1';
    if (p2.reactionMs < p1.reactionMs) return 'p2';
    return 'draw';
  }
  if (p1.reactionMs != null) return 'p1';
  if (p2.reactionMs != null) return 'p2';
  return 'draw';
}

const BANG_TIMEOUT_MS = 2500;

/**
 * 로컬 2인 결투. 뱅은 두 명 반응 ms가 모두 쌓이거나 뱅 타임아웃까지 라운드를 유예한다.
 * `commitLocalTouches`로 동시 터치·동시 얼리를 한 번에 반영하고, 입력은 `phaseRef`로 판정한다.
 */
export function useLocalDuelEngine() {
  const [phase, setPhase] = useState<DuelPhase>('대기');
  const [signalText, setSignalText] = useState('');
  const [outcome, setOutcome] = useState<LocalRoundOutcome | null>(null);

  const duelSeqRef = useRef(0);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const steadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bangTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bangT0Ref = useRef<number | null>(null);
  const bangArmedRef = useRef(false);
  const p1MsRef = useRef<number | null>(null);
  const p2MsRef = useRef<number | null>(null);
  const bangFinalizedRef = useRef(false);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const readyDeadlineRef = useRef<number | null>(null);
  /** 준비 단계 길이(ms) — 집중 구간 앞부분(동일 박자)에도 동일 값 사용 */
  const readyCueDurationRef = useRef<number | null>(null);
  const steadyDeadlineRef = useRef<number | null>(null);
  const bangTimeoutDeadlineRef = useRef<number | null>(null);
  const lastSteadyDurationRef = useRef<number | null>(null);
  const pausePerfRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    clearTimeoutRef(readyTimerRef);
    clearTimeoutRef(steadyTimerRef);
    clearTimeoutRef(bangTimeoutRef);
  }, []);

  const finishRound = useCallback((next: LocalRoundOutcome) => {
    stopDuelSignalSpeech();
    clearAllTimers();
    bangArmedRef.current = false;
    bangT0Ref.current = null;
    p1MsRef.current = null;
    p2MsRef.current = null;
    readyDeadlineRef.current = null;
    readyCueDurationRef.current = null;
    steadyDeadlineRef.current = null;
    bangTimeoutDeadlineRef.current = null;
    lastSteadyDurationRef.current = null;
    pausePerfRef.current = null;
    phaseRef.current = '결과';
    setOutcome(next);
    setPhase('결과');
    setSignalText('');
  }, [clearAllTimers]);

  /** 뱅 라운드 종료 — 두 명 반응이 모두 찍히거나 뱅 타임아웃 시 마감 */
  const completeBangRound = useCallback(
    (seq: number) => {
      if (duelSeqRef.current !== seq) return;
      if (bangFinalizedRef.current) return;
      bangFinalizedRef.current = true;
      bangArmedRef.current = false;
      clearTimeoutRef(bangTimeoutRef);
      bangTimeoutDeadlineRef.current = null;
      pausePerfRef.current = null;
      const p1: LocalPlayerRoundState = {
        reactionMs: p1MsRef.current,
        earlyTap: false,
        timeout: p1MsRef.current == null,
      };
      const p2: LocalPlayerRoundState = {
        reactionMs: p2MsRef.current,
        earlyTap: false,
        timeout: p2MsRef.current == null,
      };
      finishRound({
        p1,
        p2,
        winner: resolveWinner(p1, p2),
      });
    },
    [finishRound, clearAllTimers],
  );

  const tryFinishBang = useCallback(() => {
    if (bangFinalizedRef.current) return;
    if (p1MsRef.current == null || p2MsRef.current == null) return;
    completeBangRound(duelSeqRef.current);
  }, [completeBangRound]);

  const finalizeBangTimeout = useCallback(
    (seq: number) => {
      completeBangRound(seq);
    },
    [completeBangRound],
  );

  const enterBang = useCallback(
    (seq: number) => {
      if (duelSeqRef.current !== seq) return;

      p1MsRef.current = null;
      p2MsRef.current = null;
      bangFinalizedRef.current = false;
      const t0 = performance.now();
      bangT0Ref.current = t0;
      bangArmedRef.current = true;
      bangTimeoutDeadlineRef.current = Date.now() + BANG_TIMEOUT_MS;
      phaseRef.current = '뱅';
      setPhase('뱅');
      setSignalText('Bang!');

      bangTimeoutRef.current = setTimeout(() => {
        finalizeBangTimeout(seq);
      }, BANG_TIMEOUT_MS);
    },
    [finalizeBangTimeout],
  );

  const scheduleSteadyThenBang = useCallback(
    (seq: number, leadInMs: number, bangWaitMs: number) => {
      lastSteadyDurationRef.current = bangWaitMs;
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

  const start = useCallback(() => {
    clearAllTimers();
    bangArmedRef.current = false;
    bangT0Ref.current = null;
    p1MsRef.current = null;
    p2MsRef.current = null;
    bangFinalizedRef.current = false;
    readyDeadlineRef.current = null;
    readyCueDurationRef.current = null;
    steadyDeadlineRef.current = null;
    bangTimeoutDeadlineRef.current = null;
    lastSteadyDurationRef.current = null;
    pausePerfRef.current = null;

    const seq = ++duelSeqRef.current;
    setOutcome(null);
    phaseRef.current = '준비';
    setPhase('준비');
    setSignalText('Ready');

    const cueMs = Math.min(DUEL_READY_CUE_MS, DUEL_READY_PHASE_TOTAL_MS - 200);
    const betweenReadyAndSteadyMs = Math.max(
      200,
      DUEL_READY_PHASE_TOTAL_MS - cueMs,
    );
    const readyTotalMs = cueMs + betweenReadyAndSteadyMs;
    readyCueDurationRef.current = cueMs;
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
  }, [clearAllTimers, scheduleSteadyThenBang]);

  /**
   * 동시 터치(changedTouches)에서 한 번에 넘길 때 사용.
   * phase state 클로저 대신 phaseRef + 뱅 arming ref로 판정해 레이스를 줄임.
   */
  const commitLocalTouches = useCallback(
    (playersInput: readonly LocalPlayerId[]) => {
      if (playersInput.length === 0) return;
      const players = [...new Set(playersInput)];

      if (
        bangArmedRef.current &&
        bangT0Ref.current != null &&
        !bangFinalizedRef.current
      ) {
        for (const player of players) {
          if (player === 'p1' && p1MsRef.current == null) {
            p1MsRef.current = performance.now() - bangT0Ref.current;
          } else if (player === 'p2' && p2MsRef.current == null) {
            p2MsRef.current = performance.now() - bangT0Ref.current;
          }
        }
        if (p1MsRef.current != null && p2MsRef.current != null) {
          clearTimeoutRef(bangTimeoutRef);
          bangTimeoutDeadlineRef.current = null;
          tryFinishBang();
        }
        return;
      }

      const ph = phaseRef.current;
      if (ph === '대기' || ph === '결과') return;

      if (ph === '준비' || ph === '집중' || ph === '페이크') {
        stopDuelSignalSpeech();
        clearAllTimers();
        duelSeqRef.current += 1;
        readyDeadlineRef.current = null;
        readyCueDurationRef.current = null;
        steadyDeadlineRef.current = null;
        bangTimeoutDeadlineRef.current = null;
        pausePerfRef.current = null;
        const p1Early = players.includes('p1');
        const p2Early = players.includes('p2');
        const p1: LocalPlayerRoundState = {
          reactionMs: null,
          earlyTap: p1Early,
          timeout: false,
        };
        const p2: LocalPlayerRoundState = {
          reactionMs: null,
          earlyTap: p2Early,
          timeout: false,
        };
        finishRound({
          p1,
          p2,
          winner: resolveWinner(p1, p2),
        });
        return;
      }

      if (ph === '뱅') {
        clearAllTimers();
        duelSeqRef.current += 1;
        bangTimeoutDeadlineRef.current = null;
        pausePerfRef.current = null;
        const p1Early = players.includes('p1');
        const p2Early = players.includes('p2');
        const p1: LocalPlayerRoundState = {
          reactionMs: null,
          earlyTap: p1Early,
          timeout: false,
        };
        const p2: LocalPlayerRoundState = {
          reactionMs: null,
          earlyTap: p2Early,
          timeout: false,
        };
        finishRound({
          p1,
          p2,
          winner: resolveWinner(p1, p2),
        });
      }
    },
    [clearAllTimers, finishRound, tryFinishBang],
  );

  const tap = useCallback(
    (player: LocalPlayerId) => {
      commitLocalTouches([player]);
    },
    [commitLocalTouches],
  );

  const reset = useCallback(() => {
    stopDuelSignalSpeech();
    duelSeqRef.current += 1;
    clearAllTimers();
    bangArmedRef.current = false;
    bangT0Ref.current = null;
    p1MsRef.current = null;
    p2MsRef.current = null;
    bangFinalizedRef.current = false;
    readyDeadlineRef.current = null;
    readyCueDurationRef.current = null;
    steadyDeadlineRef.current = null;
    bangTimeoutDeadlineRef.current = null;
    lastSteadyDurationRef.current = null;
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
    clearTimeoutRef(readyTimerRef);
    clearTimeoutRef(steadyTimerRef);
    clearTimeoutRef(bangTimeoutRef);
  }, []);

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
      const remaining = Math.max(0, bangTimeoutDeadlineRef.current - Date.now());
      bangTimeoutDeadlineRef.current = Date.now() + remaining;
      bangTimeoutRef.current = setTimeout(() => {
        finalizeBangTimeout(seq);
      }, remaining);
    }
  }, [enterBang, finalizeBangTimeout, scheduleSteadyThenBang]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  /** UI 피드백용 — `phase`보다 실제 뱅 반응 창과 일치 */
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
    commitLocalTouches,
    isBangReactionArmed,
    reset,
    pauseTimers,
    resumeTimers,
  };
}
