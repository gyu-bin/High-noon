import type { ImageSourcePropType } from 'react-native';

/**
 * Dedicated combat poses beyond the five clarity poses (idle/draw/fire/hit/down,
 * where the clarity "down" frame is a KNEEL). Register an NPC here only with
 * art that keeps its identity (face, hat, coat, bandana, weapon, palette,
 * proportions) on the same 1254 px canvas and foot line as its clarity set.
 * Empty until that art exists — the renderer falls back to the kneel frame.
 */
export type NpcCombatPoseSet = { fall?: ImageSourcePropType; down?: ImageSourcePropType };

export const NPC_COMBAT_POSES: Partial<Record<number, NpcCombatPoseSet>> = {};
