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

/**
 * NPC 1인 결투. 탭은 `bangArmedRef`·`bangStartMsRef`를 `phase` state보다 먼저 본다
 * (뱅 직후 `phaseRef`가 한 박자 늦을 때 얼리로 오인하지 않도록).
 * `phaseRef`는 타이머·finish·reset·enterBang과 동기에 맞춰 즉시 갱신한다.
 */
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
    phaseRef.current = '결과';
    setOutcome(next);
    setPhase('결과');
    setSignalText('');
  }, [clearAllTimers]);

  const enterBang = useCallback((seq: number) => {
    if (duelSeqRef.current !== seq) return;

    const t0 = performance.now();
    bangStartMsRef.current = t0;
    bangArmedRef.current = true;
    bangTimeoutDeadlineRef.current = Date.now() + BANG_TIMEOUT_MS;
    phaseRef.current = '뱅';
    setPhase('뱅');
    setSignalText('Bang!');

    bangTimeoutRef.current = setTimeout(() => {
      if (duelSeqRef.current !== seq || !bangArmedRef.current) return;
      bangArmedRef.current = false;
      bangStartMsRef.current = null;
      bangTimeoutDeadlineRef.current = null;
      phaseRef.current = '결과';
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
    phaseRef.current = '준비';
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
      phaseRef.current = '집중';
      setPhase('집중');
      setSignalText('Steady');
      const dBangWait = randomDelayInclusiveMs(0, 10000);
      scheduleSteadyThenBang(seq, cueMs, dBangWait);
    }, readyTotalMs);
  }, [clearAllTimers, scheduleSteadyThenBang]);

  const tap = useCallback(() => {
    // phase state보다 먼저 — 뱅 직후 한 프레임에 phaseRef가 '집중'이어도 반응으로 처리
    if (bangArmedRef.current && bangStartMsRef.current != null) {
      bangArmedRef.current = false;
      clearTimeoutRef(bangTimeoutRef);
      bangTimeoutDeadlineRef.current = null;
      pausePerfRef.current = null;
      const reactionMs = performance.now() - bangStartMsRef.current;
      bangStartMsRef.current = null;
      duelSeqRef.current += 1;
      finish({ reactionMs, earlyTap: false, timeout: false });
      return;
    }

    const ph = phaseRef.current;
    if (ph === '대기' || ph === '결과') return;

    if (ph === '준비' || ph === '집중') {
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

    if (ph === '뱅') {
      duelSeqRef.current += 1;
      bangTimeoutDeadlineRef.current = null;
      pausePerfRef.current = null;
      finish({ reactionMs: null, earlyTap: true, timeout: false });
    }
  }, [finish]);

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
    phaseRef.current = '대기';
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
        phaseRef.current = '결과';
        setOutcome({ reactionMs: null, earlyTap: false, timeout: true });
        setPhase('결과');
        setSignalText('');
      }, remaining);
    }
  }, [enterBang, scheduleSteadyThenBang]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  /** UI 피드백용 — `phase` state보다 실제 뱅 반응 창과 일치 */
  const isBangReactionArmed = useCallback(
    () => bangArmedRef.current && bangStartMsRef.current != null,
    [],
  );

  return {
    phase,
    signalText,
    outcome,
    lastSteadyToBangDelayMs,
    start,
    tap,
    isBangReactionArmed,
    reset,
    pauseTimers,
    resumeTimers,
  };
}
