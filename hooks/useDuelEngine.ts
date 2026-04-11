import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import { stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';

export type DuelPhase = '대기' | '준비' | '집중' | '뱅' | '결과';

export type DuelOutcome = {
  reactionMs: number | null;
  earlyTap: boolean;
  timeout: boolean;
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

const BANG_TIMEOUT_MS = 2500;

export function useDuelEngine() {
  const [phase, setPhase] = useState<DuelPhase>('대기');
  const [signalText, setSignalText] = useState('');
  const [outcome, setOutcome] = useState<DuelOutcome | null>(null);
  const [lastSteadyToBangDelayMs, setLastSteadyToBangDelayMs] = useState<number | null>(null);

  const duelSeqRef = useRef(0);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const steadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bangTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bangStartMsRef = useRef<number | null>(null);
  const bangArmedRef = useRef(false);

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
  /** 뱅 단계에서 일시정지 누른 시각(performance) — 재개 시 반응 시간에서 제외 */
  const pausePerfRef = useRef<number | null>(null);

  const clearAllTimers = useCallback(() => {
    clearTimeoutRef(readyTimerRef);
    clearTimeoutRef(steadyTimerRef);
    clearTimeoutRef(bangTimeoutRef);
  }, []);

  const finish = useCallback((next: DuelOutcome) => {
    stopDuelSignalSpeech();
    clearAllTimers();
    bangArmedRef.current = false;
    bangStartMsRef.current = null;
    readyDeadlineRef.current = null;
    readyCueDurationRef.current = null;
    steadyDeadlineRef.current = null;
    bangTimeoutDeadlineRef.current = null;
    lastSteadyDurationRef.current = null;
    pausePerfRef.current = null;
    setOutcome(next);
    setPhase('결과');
    setSignalText('');
  }, [clearAllTimers]);

  const enterBang = useCallback((seq: number) => {
    setPhase('뱅');
    setSignalText('Bang!');

    if (duelSeqRef.current !== seq) return;

    const t0 = performance.now();
    bangStartMsRef.current = t0;
    bangArmedRef.current = true;
    bangTimeoutDeadlineRef.current = Date.now() + BANG_TIMEOUT_MS;
    bangTimeoutRef.current = setTimeout(() => {
      if (duelSeqRef.current !== seq || !bangArmedRef.current) return;
      bangArmedRef.current = false;
      bangStartMsRef.current = null;
      bangTimeoutDeadlineRef.current = null;
      setOutcome({ reactionMs: null, earlyTap: false, timeout: true });
      setPhase('결과');
      setSignalText('');
    }, BANG_TIMEOUT_MS);
  }, []);

  const scheduleSteadyThenBang = useCallback(
    (seq: number, leadInMs: number, bangWaitMs: number) => {
      lastSteadyDurationRef.current = bangWaitMs;
      const totalMs = leadInMs + bangWaitMs;
      steadyDeadlineRef.current = Date.now() + totalMs;
      steadyTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq) return;
        steadyDeadlineRef.current = null;
        setLastSteadyToBangDelayMs(bangWaitMs);
        enterBang(seq);
      }, totalMs);
    },
    [enterBang],
  );

  const start = useCallback(() => {
    clearAllTimers();
    bangArmedRef.current = false;
    bangStartMsRef.current = null;
    readyDeadlineRef.current = null;
    readyCueDurationRef.current = null;
    steadyDeadlineRef.current = null;
    bangTimeoutDeadlineRef.current = null;
    lastSteadyDurationRef.current = null;
    pausePerfRef.current = null;

    const seq = ++duelSeqRef.current;
    setOutcome(null);
    setLastSteadyToBangDelayMs(null);
    setPhase('준비');
    setSignalText('Ready');

    const cueMs = randomDelayInclusiveMs(1000, 1900);
    const betweenReadyAndSteadyMs = randomDelayInclusiveMs(500, 1100);
    const readyTotalMs = cueMs + betweenReadyAndSteadyMs;
    readyCueDurationRef.current = cueMs;
    readyDeadlineRef.current = Date.now() + readyTotalMs;
    readyTimerRef.current = setTimeout(() => {
      if (duelSeqRef.current !== seq) return;
      readyDeadlineRef.current = null;
      setPhase('집중');
      setSignalText('Steady');
      const dBangWait = randomDelayInclusiveMs(0, 10000);
      scheduleSteadyThenBang(seq, cueMs, dBangWait);
    }, readyTotalMs);
  }, [clearAllTimers, scheduleSteadyThenBang]);

  const tap = useCallback(() => {
    if (phase === '대기' || phase === '결과') return;

    if (phase === '준비' || phase === '집중') {
      stopDuelSignalSpeech();
      duelSeqRef.current += 1;
      readyDeadlineRef.current = null;
      readyCueDurationRef.current = null;
      steadyDeadlineRef.current = null;
      bangTimeoutDeadlineRef.current = null;
      pausePerfRef.current = null;
      finish({ reactionMs: null, earlyTap: true, timeout: false });
      return;
    }

    if (phase === '뱅') {
      if (!bangArmedRef.current || bangStartMsRef.current == null) {
        duelSeqRef.current += 1;
        bangTimeoutDeadlineRef.current = null;
        pausePerfRef.current = null;
        finish({ reactionMs: null, earlyTap: true, timeout: false });
        return;
      }

      bangArmedRef.current = false;
      clearTimeoutRef(bangTimeoutRef);
      bangTimeoutDeadlineRef.current = null;
      pausePerfRef.current = null;

      const reactionMs = performance.now() - bangStartMsRef.current;
      bangStartMsRef.current = null;
      duelSeqRef.current += 1;

      setOutcome({ reactionMs, earlyTap: false, timeout: false });
      setPhase('결과');
      setSignalText('');
      clearTimeoutRef(readyTimerRef);
      clearTimeoutRef(steadyTimerRef);
    }
  }, [phase, finish]);

  const reset = useCallback(() => {
    stopDuelSignalSpeech();
    duelSeqRef.current += 1;
    clearAllTimers();
    bangArmedRef.current = false;
    bangStartMsRef.current = null;
    readyDeadlineRef.current = null;
    readyCueDurationRef.current = null;
    steadyDeadlineRef.current = null;
    bangTimeoutDeadlineRef.current = null;
    lastSteadyDurationRef.current = null;
    pausePerfRef.current = null;
    setOutcome(null);
    setLastSteadyToBangDelayMs(null);
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
        setPhase('집중');
        setSignalText('Steady');
        const leadIn =
          readyCueDurationRef.current ?? randomDelayInclusiveMs(1000, 1900);
        const dBangWait = randomDelayInclusiveMs(0, 10000);
        scheduleSteadyThenBang(seq, leadIn, dBangWait);
      }, remaining);
      return;
    }

    if (ph === '집중' && steadyDeadlineRef.current != null) {
      const remaining = Math.max(0, steadyDeadlineRef.current - Date.now());
      steadyTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq) return;
        steadyDeadlineRef.current = null;
        setLastSteadyToBangDelayMs(lastSteadyDurationRef.current ?? 0);
        enterBang(seq);
      }, remaining);
      return;
    }

    if (
      ph === '뱅' &&
      bangArmedRef.current &&
      bangStartMsRef.current != null &&
      bangTimeoutDeadlineRef.current != null
    ) {
      const tPause = pausePerfRef.current;
      pausePerfRef.current = null;
      if (tPause != null) {
        bangStartMsRef.current += performance.now() - tPause;
      }
      const remaining = Math.max(0, bangTimeoutDeadlineRef.current - Date.now());
      bangTimeoutDeadlineRef.current = Date.now() + remaining;
      bangTimeoutRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq || !bangArmedRef.current) return;
        bangArmedRef.current = false;
        bangStartMsRef.current = null;
        bangTimeoutDeadlineRef.current = null;
        setOutcome({ reactionMs: null, earlyTap: false, timeout: true });
        setPhase('결과');
        setSignalText('');
      }, remaining);
    }
  }, [enterBang, scheduleSteadyThenBang]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  return {
    phase,
    signalText,
    outcome,
    lastSteadyToBangDelayMs,
    start,
    tap,
    reset,
    pauseTimers,
    resumeTimers,
  };
}
