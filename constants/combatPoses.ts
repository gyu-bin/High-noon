import type { ImageSourcePropType } from 'react-native';

/**
 * Dedicated combat poses beyond the five clarity poses (idle/draw/fire/hit/down,
 * where the clarity "down" frame is a KNEEL). Register an NPC here only with
 * art that keeps its identity (face, hat, coat, bandana, weapon, palette,
 * proportions) on the same 1254 px canvas and foot line as its clarity set.
 * NPC01 final review assets human-approved on 2026-09-30.
 * Redesign NPCs (09/15/18/19/20/22) share their clarity -v2 canvas instead of 1254
 * (see REDESIGN_ART_META); LOCK_READY sets human-approved on 2026-10-01.
 */
export type NpcCombatPoseSet = { fall?: ImageSourcePropType; down?: ImageSourcePropType };

export const NPC_COMBAT_POSES: Partial<Record<number, NpcCombatPoseSet>> = {
  1: {
    fall: require('@/assets/images/combat/npc/01/fall.png'),
    down: require('@/assets/images/combat/npc/01/down.png'),
  },
  9: {
    fall: require('@/assets/images/combat/npc/09/fall.png'),
    down: require('@/assets/images/combat/npc/09/down.png'),
  },
  15: {
    fall: require('@/assets/images/combat/npc/15/fall.png'),
    down: require('@/assets/images/combat/npc/15/down.png'),
  },
  18: {
    fall: require('@/assets/images/combat/npc/18/fall.png'),
    down: require('@/assets/images/combat/npc/18/down.png'),
  },
  19: {
    fall: require('@/assets/images/combat/npc/19/fall.png'),
    down: require('@/assets/images/combat/npc/19/down.png'),
  },
  20: {
    fall: require('@/assets/images/combat/npc/20/fall.png'),
    down: require('@/assets/images/combat/npc/20/down.png'),
  },
  22: {
    fall: require('@/assets/images/combat/npc/22/fall.png'),
    down: require('@/assets/images/combat/npc/22/down.png'),
  },
};

export const PLAYER_GROUND_REVOLVER: ImageSourcePropType =
  require('@/assets/images/combat/weapons/ground-revolver.png');
