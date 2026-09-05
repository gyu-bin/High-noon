import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import {
  DUEL_DEFAULT_BANG_DELAY_MS,
  DUEL_DEFAULT_STAGE_MS,
  DUEL_READY_CUE_MS,
  DUEL_READY_PHASE_TOTAL_MS,
  DUEL_STEADY_SCHEDULE_LEAD_MS,
} from '@/constants/duelTiming';
import { stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';

/**
 * NPC 1인 결투 코어
 * - READY(준비) → STEADY(집중) → BANG(뱅) 순서.
 * - READY→STEADY 총 `DUEL_READY_PHASE_TOTAL_MS` 고정. STEADY→BANG은 `bangDelay*`만 사용(READY 큐 ms와 합산하지 않음).
 * - BANG 무장 상태 이전 탭 → 얼리(즉시 패배). BANG 후 미탭 타임아웃 → 패배.
 * - 일시정지 시 `pausePerfRef`로 뱅 구간 경과 보정.
 * - 반응 ms·NPC별 최단·전체 평균은 `progressStore`(AsyncStorage persist)에 기록.
 */

export type DuelPhase = '대기' | '준비' | '집중' | '페이크' | '뱅' | '결과';

export type DuelOutcome = {
  reactionMs: number | null;
  earlyTap: boolean;
  timeout: boolean;
};

export type DuelTimingConfig = {
  readyCueMinMs: number;
  readyCueMaxMs: number;
  gapMinMs: number;
  gapMaxMs: number;
  bangDelayMinMs: number;
  bangDelayMaxMs: number;
};

export const DEFAULT_DUEL_TIMING: DuelTimingConfig = {
  readyCueMinMs: DUEL_DEFAULT_STAGE_MS.minMs,
  readyCueMaxMs: DUEL_DEFAULT_STAGE_MS.maxMs,
  gapMinMs: DUEL_DEFAULT_STAGE_MS.minMs,
  gapMaxMs: DUEL_DEFAULT_STAGE_MS.maxMs,
  bangDelayMinMs: DUEL_DEFAULT_BANG_DELAY_MS.minMs,
  bangDelayMaxMs: DUEL_DEFAULT_BANG_DELAY_MS.maxMs,
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
const FAKE_BANG_VISUAL_MS = 190;
/** #20 에코 — 1번째↔2번째(진짜) BANG 사이 간격(ms). STEADY 복귀 없음 */
const ECHO_MIDDLE_GAP_MS = 260;

export type DuelStartOptions = {
  fakeBangCount?: number;
  /** #20 — BANG 3연속, 2번째만 진짜(총성·반응 측정) */
  echoBangMiddle?: boolean;
};

function randomPartition(total: number, parts: number, minPart: number): number[] {
  const minSum = parts * minPart;
  if (total < minSum) {
    const base = Math.floor(total / parts);
    const rem = total - base * parts;
    return Array.from({ length: parts }, (_, i) => base + (i < rem ? 1 : 0));
  }
  let excess = total - minSum;
  const out = Array.from({ length: parts }, () => minPart);
  let i = 0;
  while (excess > 0) {
    const idx = i % parts;
    const cur = out[idx];
    if (cur !== undefined) out[idx] = cur + 1;
    excess -= 1;
    i += 1;
  }
  for (let j = out.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    const a = out[j];
    const b = out[k];
    if (a === undefined || b === undefined) continue;
    out[j] = b;
    out[k] = a;
  }
  return out;
}

type SteadyPlanStep = { kind: 'wait' | 'fake'; ms: number };

function buildSteadyPlan(
  totalMs: number,
  fakeCount: number,
  fakeDur: number,
): SteadyPlanStep[] | null {
  if (fakeCount <= 0) return null;
  const reserve = fakeCount * fakeDur;
  if (totalMs <= reserve + (fakeCount + 1) * 40) return null;
  const pool = totalMs - reserve;
  const cuts = randomPartition(pool, fakeCount + 1, 40);
  const plan: SteadyPlanStep[] = [];
  for (let i = 0; i < fakeCount; i++) {
    plan.push({ kind: 'wait', ms: cuts[i]! });
    plan.push({ kind: 'fake', ms: fakeDur });
  }
  plan.push({ kind: 'wait', ms: cuts[fakeCount]! });
  return plan;
}

export type DuelEngineOptions = {
  /**
   * 뱅 진입 즉시(측정 시작과 같은 시점) 호출. 소리·햅틱 같은 신호 채널을 여기서 낸다.
   *
   * 화면의 `useEffect`에서 내면 페인트가 끝난 뒤라 한 프레임 늦게 출발하고, 렌더가
   * 무거운 프레임에서는 더 밀린다. 그러면 소리를 듣고 반응하는 플레이어가 화면을
   * 보고 반응하는 플레이어보다 구조적으로 불리해진다. 반응을 재는 시계와 신호를
   * 내보내는 시점은 같아야 한다. (로컬 2인 엔진의 `onBangEnter`와 같은 역할)
   */
  onBangEnter?: () => void;
  /** 플레이어가 뱅 후 유효 탭(발사) */
  onPlayerShoot?: () => void;
  /** NPC 반응 시간에 opponent 발사 */
  onOpponentShoot?: () => void;
};

/**
 * NPC 1인 결투. `start(timing?, { fakeBangCount })` — NPC별 `duelTiming`이 없을 때만 `DEFAULT_DUEL_TIMING`(단계별 1~5초).
 */
export function useDuelEngine(options?: DuelEngineOptions) {
  const onBangEnterRef = useRef(options?.onBangEnter);
  const onPlayerShootRef = useRef(options?.onPlayerShoot);
  const onOpponentShootRef = useRef(options?.onOpponentShoot);
  onBangEnterRef.current = options?.onBangEnter;
  onPlayerShootRef.current = options?.onPlayerShoot;
  onOpponentShootRef.current = options?.onOpponentShoot;
  const [phase, setPhase] = useState<DuelPhase>('대기');
  const [signalText, setSignalText] = useState('');
  const [outcome, setOutcome] = useState<DuelOutcome | null>(null);
  const [lastSteadyToBangDelayMs, setLastSteadyToBangDelayMs] = useState<number | null>(null);

  const duelSeqRef = useRef(0);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const steadyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bangTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentShotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bangStartMsRef = useRef<number | null>(null);
  const bangArmedRef = useRef(false);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const readyDeadlineRef = useRef<number | null>(null);
  const readyCueDurationRef = useRef<number | null>(null);
  const steadyDeadlineRef = useRef<number | null>(null);
  const bangTimeoutDeadlineRef = useRef<number | null>(null);
  const opponentShotDeadlineRef = useRef<number | null>(null);
  const lastSteadyDurationRef = useRef<number | null>(null);
  const pausePerfRef = useRef<number | null>(null);
  const lastTimingRef = useRef<DuelTimingConfig>(DEFAULT_DUEL_TIMING);

  const clearAllTimers = useCallback(() => {
    clearTimeoutRef(readyTimerRef);
    clearTimeoutRef(steadyTimerRef);
    clearTimeoutRef(bangTimeoutRef);
    clearTimeoutRef(opponentShotTimerRef);
    opponentShotDeadlineRef.current = null;
  }, []);

  const resolveBangLoss = useCallback(
    (next: DuelOutcome) => {
      clearAllTimers();
      bangArmedRef.current = false;
      bangStartMsRef.current = null;
      readyDeadlineRef.current = null;
      readyCueDurationRef.current = null;
      steadyDeadlineRef.current = null;
      bangTimeoutDeadlineRef.current = null;
      opponentShotDeadlineRef.current = null;
      lastSteadyDurationRef.current = null;
      pausePerfRef.current = null;
      phaseRef.current = '결과';
      setOutcome(next);
      setPhase('결과');
      setSignalText('');
    },
    [clearAllTimers],
  );

  const finish = useCallback(
    (next: DuelOutcome) => {
      resolveBangLoss(next);
    },
    [resolveBangLoss],
  );

  const forceTimeout = useCallback(() => {
    if (!bangArmedRef.current) return;
    duelSeqRef.current += 1;
    resolveBangLoss({ reactionMs: null, earlyTap: false, timeout: true });
  }, [resolveBangLoss]);

  const scheduleOpponentShot = useCallback(
    (ms: number) => {
      clearTimeoutRef(opponentShotTimerRef);
      opponentShotDeadlineRef.current = null;
      if (!bangArmedRef.current || ms <= 0) return;
      const seq = duelSeqRef.current;
      opponentShotDeadlineRef.current = Date.now() + ms;
      opponentShotTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq || !bangArmedRef.current) return;
        opponentShotDeadlineRef.current = null;
        onOpponentShootRef.current?.();
        forceTimeout();
      }, ms);
    },
    [forceTimeout],
  );

  const clearOpponentShot = useCallback(() => {
    clearTimeoutRef(opponentShotTimerRef);
    opponentShotDeadlineRef.current = null;
  }, []);

  const enterBang = useCallback((seq: number) => {
    if (duelSeqRef.current !== seq) return;

    const t0 = performance.now();
    bangStartMsRef.current = t0;
    bangArmedRef.current = true;
    bangTimeoutDeadlineRef.current = Date.now() + BANG_TIMEOUT_MS;
    onBangEnterRef.current?.();
    phaseRef.current = '뱅';
    setPhase('뱅');
    setSignalText('Bang!');

    bangTimeoutRef.current = setTimeout(() => {
      if (duelSeqRef.current !== seq || !bangArmedRef.current) return;
      duelSeqRef.current += 1;
      resolveBangLoss({ reactionMs: null, earlyTap: false, timeout: true });
    }, BANG_TIMEOUT_MS);
  }, [resolveBangLoss]);

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

  const scheduleSteadyWithFakes = useCallback(
    (seq: number, leadInMs: number, bangWaitMs: number, fakeCount: number) => {
      lastSteadyDurationRef.current = bangWaitMs;
      const totalMs = leadInMs + bangWaitMs;
      const plan = buildSteadyPlan(totalMs, fakeCount, FAKE_BANG_VISUAL_MS);
      if (!plan) {
        scheduleSteadyThenBang(seq, leadInMs, bangWaitMs);
        return;
      }

      let stepIndex = 0;
      const runNext = () => {
        if (duelSeqRef.current !== seq) return;
        if (stepIndex >= plan.length) {
          steadyDeadlineRef.current = null;
          setLastSteadyToBangDelayMs(bangWaitMs);
          enterBang(seq);
          return;
        }
        const step = plan[stepIndex]!;
        stepIndex += 1;
        if (step.kind === 'wait') {
          steadyDeadlineRef.current = Date.now() + step.ms;
          steadyTimerRef.current = setTimeout(() => {
            steadyDeadlineRef.current = null;
            runNext();
          }, step.ms);
        } else {
          steadyDeadlineRef.current = Date.now() + step.ms;
          phaseRef.current = '페이크';
          setPhase('페이크');
          setSignalText('Bang!');
          steadyTimerRef.current = setTimeout(() => {
            steadyDeadlineRef.current = null;
            phaseRef.current = '집중';
            setPhase('집중');
            setSignalText('Steady');
            runNext();
          }, step.ms);
        }
      };

      runNext();
    },
    [enterBang, scheduleSteadyThenBang],
  );

  const scheduleEchoMiddleBang = useCallback(
    (seq: number, leadInMs: number, bangWaitMs: number) => {
      lastSteadyDurationRef.current = bangWaitMs;
      // 1번 페이크를 조금 더 길게 보여 준 뒤 간격 → 2번 진짜
      const fakeDur = 240;
      const betweenBangMs = ECHO_MIDDLE_GAP_MS;
      const preWait = Math.max(40, bangWaitMs - fakeDur - betweenBangMs);

      const runReal = () => {
        if (duelSeqRef.current !== seq) return;
        steadyDeadlineRef.current = null;
        setLastSteadyToBangDelayMs(bangWaitMs);
        enterBang(seq);
      };

      const runFake = () => {
        if (duelSeqRef.current !== seq) return;
        steadyDeadlineRef.current = Date.now() + fakeDur + betweenBangMs;
        phaseRef.current = '페이크';
        setPhase('페이크');
        setSignalText('Bang!');
        steadyTimerRef.current = setTimeout(() => {
          if (duelSeqRef.current !== seq) return;
          steadyDeadlineRef.current = null;
          runReal();
        }, fakeDur + betweenBangMs);
      };

      const totalMs = leadInMs + preWait;
      steadyDeadlineRef.current = Date.now() + totalMs;
      steadyTimerRef.current = setTimeout(() => {
        steadyDeadlineRef.current = null;
        runFake();
      }, totalMs);
    },
    [enterBang],
  );

  const start = useCallback(
    (
      partialTiming?: Partial<DuelTimingConfig>,
      opts?: DuelStartOptions,
    ) => {
      clearAllTimers();
      bangArmedRef.current = false;
      bangStartMsRef.current = null;
      readyDeadlineRef.current = null;
      readyCueDurationRef.current = null;
      steadyDeadlineRef.current = null;
      bangTimeoutDeadlineRef.current = null;
      lastSteadyDurationRef.current = null;
      pausePerfRef.current = null;

      const t: DuelTimingConfig = {
        ...DEFAULT_DUEL_TIMING,
        ...partialTiming,
      };
      lastTimingRef.current = t;
      const fakeBangCount = Math.max(0, Math.floor(opts?.fakeBangCount ?? 0));
      const echoBangMiddle = opts?.echoBangMiddle === true;

      const seq = ++duelSeqRef.current;
      setOutcome(null);
      setLastSteadyToBangDelayMs(null);
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
        const dBangWait = randomDelayInclusiveMs(t.bangDelayMinMs, t.bangDelayMaxMs);
        if (echoBangMiddle) {
          scheduleEchoMiddleBang(seq, DUEL_STEADY_SCHEDULE_LEAD_MS, dBangWait);
        } else if (fakeBangCount > 0) {
          scheduleSteadyWithFakes(
            seq,
            DUEL_STEADY_SCHEDULE_LEAD_MS,
            dBangWait,
            fakeBangCount,
          );
        } else {
          scheduleSteadyThenBang(seq, DUEL_STEADY_SCHEDULE_LEAD_MS, dBangWait);
        }
      }, readyTotalMs);
    },
    [clearAllTimers, scheduleEchoMiddleBang, scheduleSteadyThenBang, scheduleSteadyWithFakes],
  );

  const tap = useCallback(() => {
    if (bangArmedRef.current && bangStartMsRef.current != null) {
      bangArmedRef.current = false;
      clearTimeoutRef(bangTimeoutRef);
      bangTimeoutDeadlineRef.current = null;
      pausePerfRef.current = null;
      const reactionMs = performance.now() - bangStartMsRef.current;
      bangStartMsRef.current = null;
      duelSeqRef.current += 1;
      onPlayerShootRef.current?.();
      finish({ reactionMs, earlyTap: false, timeout: false });
      return;
    }

    const ph = phaseRef.current;
    if (ph === '대기' || ph === '결과') return;

    if (ph === '준비' || ph === '집중' || ph === '페이크') {
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
    clearTimeoutRef(opponentShotTimerRef);
  }, []);

  const resumeTimers = useCallback(() => {
    const seq = duelSeqRef.current;
    const ph = phaseRef.current;
    if (ph === '결과' || ph === '대기') return;

    const tm = lastTimingRef.current;

    if (ph === '준비' && readyDeadlineRef.current != null) {
      const remaining = Math.max(0, readyDeadlineRef.current - Date.now());
      readyTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq) return;
        readyDeadlineRef.current = null;
        phaseRef.current = '집중';
        setPhase('집중');
        setSignalText('Steady');
        const dBangWait = randomDelayInclusiveMs(tm.bangDelayMinMs, tm.bangDelayMaxMs);
        scheduleSteadyThenBang(seq, DUEL_STEADY_SCHEDULE_LEAD_MS, dBangWait);
      }, remaining);
      return;
    }

    if ((ph === '집중' || ph === '페이크') && steadyDeadlineRef.current != null) {
      const remaining = Math.max(0, steadyDeadlineRef.current - Date.now());
      steadyTimerRef.current = setTimeout(() => {
        if (duelSeqRef.current !== seq) return;
        steadyDeadlineRef.current = null;
        const cur = phaseRef.current;
        if (cur === '페이크') {
          phaseRef.current = '집중';
          setPhase('집중');
          setSignalText('Steady');
          const wait = lastSteadyDurationRef.current ?? 500;
          scheduleSteadyThenBang(seq, DUEL_STEADY_SCHEDULE_LEAD_MS, wait);
          return;
        }
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
        duelSeqRef.current += 1;
        resolveBangLoss({ reactionMs: null, earlyTap: false, timeout: true });
      }, remaining);

      if (opponentShotDeadlineRef.current != null) {
        const oppRemaining = Math.max(0, opponentShotDeadlineRef.current - Date.now());
        opponentShotDeadlineRef.current = Date.now() + oppRemaining;
        opponentShotTimerRef.current = setTimeout(() => {
          if (duelSeqRef.current !== seq || !bangArmedRef.current) return;
          opponentShotDeadlineRef.current = null;
          forceTimeout();
        }, oppRemaining);
      }
    }
  }, [enterBang, scheduleSteadyThenBang, resolveBangLoss, forceTimeout]);

  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

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
    forceBangTimeout: forceTimeout,
    scheduleOpponentShot,
    clearOpponentShot,
    reset,
    pauseTimers,
    resumeTimers,
  };
}
