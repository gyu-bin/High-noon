import type { NpcReactionSimulation } from '@/utils/npcAI';

export type NpcRoundSimulationSlot = {
  current: NpcReactionSimulation | null;
};

/** Start a new authoritative round. The previous sample must not leak forward. */
export function resetNpcRoundSimulation(slot: NpcRoundSimulationSlot): void {
  slot.current = null;
}

/** Keep the BANG-time sample intact until the result effect has resolved the round. */
export function recordNpcRoundSimulation(
  slot: NpcRoundSimulationSlot,
  simulation: NpcReactionSimulation,
): NpcReactionSimulation {
  slot.current = simulation;
  return simulation;
}

/**
 * Return the sample that drove the NPC shot. Early player taps have no BANG-time
 * sample, so they create exactly one fallback sample and retain it for the rest
 * of the result lifecycle.
 */
export function resolveNpcRoundSimulation(
  slot: NpcRoundSimulationSlot,
  create: () => NpcReactionSimulation,
): NpcReactionSimulation {
  if (slot.current) return slot.current;
  return recordNpcRoundSimulation(slot, create());
}
