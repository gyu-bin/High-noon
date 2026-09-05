import type { NpcDefinition } from '@/types/npc';

/**
 * 카드 `reactionMs` 중심 대칭 흔들림(±절반 ms).
 * 티어마다 다른 고정 테이블 대신 **목표값 비율**으로 통일해 브론즈~히든 모두 같은 규칙.
 */
const JITTER_RATIO = 0.026;
const JITTER_HALF_MIN = 4;
const JITTER_HALF_MAX = 12;

function jitterHalfMsFromTarget(reactionMs: number): number {
  const fromRatio = Math.round(reactionMs * JITTER_RATIO);
  return Math.min(JITTER_HALF_MAX, Math.max(JITTER_HALF_MIN, fromRatio));
}

const NPC_ID = {
  mirrorJack: 13,
  shadowHunter: 15,
  dustWind: 1,
  rustyMuzzle: 2,
  steelEagle: 10,
} as const;

export type SimulateNpcReactionInput = {
  npc: Pick<NpcDefinition, 'id' | 'tier' | 'reactionMs' | 'specialAbility'>;
  /** 직전 판 집중→뱅 딜레이(ms) — #11 기관차 등 */
  previousSteadyToBangDelayMs?: number | null;
  /** #13 미러 잭: 라운드마다 적응 조정된 목표 반응(ms) */
  mirrorAdaptiveMs?: number | null;
};

export type NpcReactionSimulation = {
  reactionMs: number | null;
  npcEarlyTap: boolean;
};

/**
 * 한 라운드에서 NPC의 반응 시간(ms)을 시뮬레이션한다.
 * 기본: 카드 목표 `reactionMs` ±(약 2.6%, 4~12ms) — 모든 NPC 동일 규칙.
 */
export function simulateNpcReaction(input: SimulateNpcReactionInput): NpcReactionSimulation {
  const { npc, previousSteadyToBangDelayMs = null, mirrorAdaptiveMs = null } = input;

  if (npc.tier === 'bronze' && Math.random() < 0.035) {
    return { reactionMs: null, npcEarlyTap: true };
  }

  let ms: number;

  if (npc.id === NPC_ID.shadowHunter) {
    ms = npc.reactionMs;
  } else if (npc.id === NPC_ID.mirrorJack && mirrorAdaptiveMs != null && mirrorAdaptiveMs > 0) {
    const jitter = Math.random() * 10 - 5;
    ms = mirrorAdaptiveMs + jitter;
  } else {
    let half = jitterHalfMsFromTarget(npc.reactionMs);
    if (npc.id === NPC_ID.dustWind) {
      half = Math.round(half * 0.65);
    } else if (npc.id === NPC_ID.rustyMuzzle) {
      half = Math.round(half * 0.92);
    }
    if (npc.id === NPC_ID.steelEagle) {
      half = Math.min(half, 7);
    }
    ms = npc.reactionMs + (Math.random() * 2 - 1) * half;
  }

  if (
    npc.id === 11 &&
    previousSteadyToBangDelayMs != null &&
    previousSteadyToBangDelayMs > 0
  ) {
    const anticipation = Math.min(55, previousSteadyToBangDelayMs * 0.12);
    ms -= anticipation;
  }

  const clamped = Math.max(36, Math.round(ms));
  return { reactionMs: clamped, npcEarlyTap: false };
}

/** 랭킹 고스트 — 평균 ms 주변만 흔들림. 특수능력·얼리 오발 없음. */
export function simulateTargetReactionMs(reactionMs: number): number {
  const half = jitterHalfMsFromTarget(reactionMs);
  const ms = reactionMs + (Math.random() * 2 - 1) * half;
  return Math.max(36, Math.round(ms));
}

/** #17 Dryden: 페이크 유도 배율(확률식 연동 시) */
export function getNpcFakeLureMultiplier(npcId: number): number {
  return npcId === 17 ? 2 : 1;
}
