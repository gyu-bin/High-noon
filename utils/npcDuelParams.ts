import type { DuelTimingConfig } from '@/hooks/useDuelEngine';
import type { NpcDefinition } from '@/types/npc';

export type ChaosMode = 'void' | 'thunder' | 'echo' | 'quake';

export const CHAOS_MODES: readonly ChaosMode[] = [
  'void',
  'thunder',
  'echo',
  'quake',
] as const;

function randomDelayInclusiveMs(minMs: number, maxMs: number): number {
  if (maxMs <= minMs) return minMs;
  return minMs + Math.floor(Math.random() * (maxMs - minMs + 1));
}

/** NPC 정의 + 라운드 랜덤 규칙 → `useDuelEngine.start` 인자 */
export function buildDuelStartParams(
  npc: NpcDefinition,
  chaosMode: ChaosMode | null = null,
): {
  timing: Partial<DuelTimingConfig>;
  fakeBangCount: number;
  echoBangMiddle?: boolean;
} {
  const timing: Partial<DuelTimingConfig> = { ...npc.duelTiming };

  let fakeBangCount = npc.fakeBangCount;
  let echoBangMiddle = false;

  if (npc.specialAbility === 'paleSilence') {
    const delay = randomDelayInclusiveMs(3500, 14000);
    timing.bangDelayMinMs = delay;
    timing.bangDelayMaxMs = delay;
  } else if (npc.specialAbility === 'thunderbolt') {
    // STEADY 직후 바로 누르는 리듬 게임 방지 — 충분히 기다린 뒤 무글자 번개 + 페이크
    timing.bangDelayMinMs = 900;
    timing.bangDelayMaxMs = 4800;
    fakeBangCount = 2;
  } else if (npc.specialAbility === 'echoReady') {
    echoBangMiddle = true;
    fakeBangCount = 0;
  } else if (npc.specialAbility === 'chaosRandom') {
    // #21 — 매 라운드 다른 NPC 스킬을 훔침 (항상 티남)
    switch (chaosMode) {
      case 'thunder':
        timing.bangDelayMinMs = 900;
        timing.bangDelayMaxMs = 4800;
        fakeBangCount = 2;
        break;
      case 'echo':
        echoBangMiddle = true;
        fakeBangCount = 0;
        break;
      case 'void':
        fakeBangCount = 1;
        break;
      case 'quake':
        fakeBangCount = 2;
        break;
      default:
        fakeBangCount = 1 + Math.floor(Math.random() * 2);
        break;
    }
  }

  return { timing, fakeBangCount, echoBangMiddle };
}
