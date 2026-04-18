import type { DuelTimingConfig } from '@/hooks/useDuelEngine';
import type { NpcDefinition } from '@/types/npc';

function randomDelayInclusiveMs(minMs: number, maxMs: number): number {
  if (maxMs <= minMs) return minMs;
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

/** NPC 정의 + 라운드 랜덤 규칙 → `useDuelEngine.start` 인자 */
export function buildDuelStartParams(npc: NpcDefinition): {
  timing: Partial<DuelTimingConfig>;
  fakeBangCount: number;
} {
  const timing: Partial<DuelTimingConfig> = { ...npc.duelTiming };

  if (npc.specialAbility === 'paleSilence') {
    const delay = randomDelayInclusiveMs(3500, 14000);
    timing.bangDelayMinMs = delay;
    timing.bangDelayMaxMs = delay;
  } else if (npc.specialAbility === 'thunderbolt') {
    timing.bangDelayMinMs = 50;
    timing.bangDelayMaxMs = 110;
  } else if (npc.specialAbility === 'chaosRandom') {
    const lo0 = npc.duelTiming.bangDelayMinMs;
    const hi0 = npc.duelTiming.bangDelayMaxMs;
    const r1 = randomDelayInclusiveMs(lo0, hi0);
    const r2 = randomDelayInclusiveMs(lo0, hi0);
    timing.bangDelayMinMs = Math.min(r1, r2);
    timing.bangDelayMaxMs = Math.max(r1, r2);
  }

  let fakeBangCount = npc.fakeBangCount;
  if (npc.specialAbility === 'fakeMultis') {
    fakeBangCount = 2 + Math.floor(Math.random() * 3);
  } else if (npc.specialAbility === 'comboFakeBlind') {
    fakeBangCount = 1 + Math.floor(Math.random() * 2);
  } else if (npc.specialAbility === 'chaosRandom') {
    fakeBangCount = Math.floor(Math.random() * 4);
  }

  return { timing, fakeBangCount };
}
