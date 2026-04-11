import type { NpcDefinition, NpcTier } from '@/types/npc';

/** 티어별 반응시간 +편차(최대 ms) — 값이 클수록 NPC가 더 느려질 수 있음 */
const TIER_DEVIATION_MS: Record<NpcTier, number> = {
  bronze: 78,
  silver: 52,
  gold: 32,
  platinum: 19,
  diamond: 11,
  master: 7,
  legend: 5,
};

const NPC_ID = {
  rider: 9,
  sybil: 12,
  lace: 15,
  dryden: 17,
} as const;

export type SimulateNpcReactionInput = {
  npc: Pick<NpcDefinition, 'id' | 'tier' | 'reactionMs'>;
  /** #9 번개손 라이더: 플레이어 연승(>0)이면 반응 -10ms */
  playerWinStreak?: number;
  /** #12 예언자 시빌: 직전 판 집중→뱅 딜레이(ms). 없으면 기억 없음 */
  previousSteadyToBangDelayMs?: number | null;
};

export type NpcReactionSimulation = {
  /** NPC 오발이면 null */
  reactionMs: number | null;
  npcEarlyTap: boolean;
};

/**
 * 한 라운드에서 NPC의 반응 시간(ms)을 시뮬레이션한다.
 * - 브론즈 티어: 5% 확률로 NPC가 먼저 오발(npcEarlyTap).
 * - #15 레이스: 편차 없이 baseReactionMs 고정.
 * - 그 외: 목표 반응 이상~+티어 편차(ms)만큼 느려질 수 있음(표기보다 빠르게 나오지 않음).
 * - #9·#12는 해당 NPC일 때만 보정 적용.
 */
export function simulateNpcReaction(input: SimulateNpcReactionInput): NpcReactionSimulation {
  const { npc, playerWinStreak = 0, previousSteadyToBangDelayMs = null } = input;

  if (npc.tier === 'bronze' && Math.random() < 0.035) {
    return { reactionMs: null, npcEarlyTap: true };
  }

  let ms: number;

  if (npc.id === NPC_ID.lace) {
    ms = npc.reactionMs;
  } else {
    const spread = TIER_DEVIATION_MS[npc.tier];
    // 카드의 목표 반응(ms)은 NPC가 그보다 빠르게 나오지 않도록,
    // 같은 시간~조금 더 느린 쪽으로만 흔들림(이전: ±편차로 표기보다 빠른 수치 가능).
    ms = npc.reactionMs + Math.random() * spread;
  }

  if (npc.id === NPC_ID.rider && playerWinStreak > 0) {
    ms -= 10;
  }

  if (
    npc.id === NPC_ID.sybil &&
    previousSteadyToBangDelayMs != null &&
    previousSteadyToBangDelayMs > 0
  ) {
    const anticipation = Math.min(65, previousSteadyToBangDelayMs * 0.14);
    ms -= anticipation;
  }

  const clamped = Math.max(1, Math.round(ms));
  return { reactionMs: clamped, npcEarlyTap: false };
}

/**
 * #17 사막의 악마 드라이든: 얼리탭 유도용 페이크(가짜 STEADY 등) 확률 배율.
 * 실제 확률은 `baseFakeProbability * getNpcFakeLureMultiplier(npcId)` 후 [0,1]로 클램프 권장.
 */
export function getNpcFakeLureMultiplier(npcId: number): number {
  return npcId === NPC_ID.dryden ? 2 : 1;
}
