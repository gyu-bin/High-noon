import type { ImageSourcePropType } from 'react-native';

import type { SpritePose } from '@/constants/sprites';

type PoseMap = Partial<Record<SpritePose, ImageSourcePropType>>;
type ShootSeq = ImageSourcePropType[];

const NPC_SPRITES: Partial<Record<number, PoseMap>> = {
  1: {
    aim: require('@/assets/sprites/npc/npc_01_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_01_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_01_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_01_shoot.png'),
  },
  2: {
    aim: require('@/assets/sprites/npc/npc_02_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_02_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_02_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_02_shoot.png'),
  },
  3: {
    aim: require('@/assets/sprites/npc/npc_03_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_03_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_03_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_03_shoot.png'),
  },
  4: {
    aim: require('@/assets/sprites/npc/npc_04_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_04_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_04_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_04_shoot.png'),
  },
  5: {
    aim: require('@/assets/sprites/npc/npc_05_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_05_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_05_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_05_shoot.png'),
  },
  6: {
    aim: require('@/assets/sprites/npc/npc_06_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_06_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_06_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_06_shoot.png'),
  },
  7: {
    aim: require('@/assets/sprites/npc/npc_07_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_07_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_07_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_07_shoot.png'),
  },
  8: {
    aim: require('@/assets/sprites/npc/npc_08_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_08_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_08_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_08_shoot.png'),
  },
  9: {
    aim: require('@/assets/sprites/npc/npc_09_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_09_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_09_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_09_shoot.png'),
  },
  10: {
    aim: require('@/assets/sprites/npc/npc_10_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_10_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_10_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_10_shoot.png'),
  },
  11: {
    aim: require('@/assets/sprites/npc/npc_11_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_11_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_11_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_11_shoot.png'),
  },
  12: {
    aim: require('@/assets/sprites/npc/npc_12_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_12_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_12_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_12_shoot.png'),
  },
  13: {
    aim: require('@/assets/sprites/npc/npc_13_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_13_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_13_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_13_shoot.png'),
  },
  14: {
    aim: require('@/assets/sprites/npc/npc_14_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_14_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_14_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_14_shoot.png'),
  },
  15: {
    aim: require('@/assets/sprites/npc/npc_15_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_15_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_15_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_15_shoot.png'),
  },
  16: {
    aim: require('@/assets/sprites/npc/npc_16_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_16_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_16_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_16_shoot.png'),
  },
  17: {
    aim: require('@/assets/sprites/npc/npc_17_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_17_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_17_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_17_shoot.png'),
  },
  18: {
    aim: require('@/assets/sprites/npc/npc_18_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_18_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_18_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_18_shoot.png'),
  },
  19: {
    aim: require('@/assets/sprites/npc/npc_19_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_19_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_19_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_19_shoot.png'),
  },
  20: {
    aim: require('@/assets/sprites/npc/npc_20_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_20_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_20_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_20_shoot.png'),
  },
  21: {
    aim: require('@/assets/sprites/npc/npc_21_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_21_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_21_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_21_shoot.png'),
  },
  22: {
    aim: require('@/assets/sprites/npc/npc_22_aim.png'),
    defeat: require('@/assets/sprites/npc/npc_22_defeat.png'),
    idle: require('@/assets/sprites/npc/npc_22_idle.png'),
    shoot: require('@/assets/sprites/npc/npc_22_shoot.png'),
  },
};

const PLAYER_SPRITES: Partial<Record<number, PoseMap>> = {
  1: {
    aim: require('@/assets/sprites/player/player_01_aim.png'),
    defeat: require('@/assets/sprites/player/player_01_defeat.png'),
    idle: require('@/assets/sprites/player/player_01_idle.png'),
    shoot: require('@/assets/sprites/player/player_01_shoot.png'),
  },
};

const NPC_SHOOT_FRAMES: Partial<Record<number, ShootSeq>> = {
  1: [require('@/assets/sprites/npc/npc_01_shoot_00.png'), require('@/assets/sprites/npc/npc_01_shoot_01.png')],
  2: [require('@/assets/sprites/npc/npc_02_shoot_00.png'), require('@/assets/sprites/npc/npc_02_shoot_01.png')],
  3: [require('@/assets/sprites/npc/npc_03_shoot_00.png'), require('@/assets/sprites/npc/npc_03_shoot_01.png')],
  4: [require('@/assets/sprites/npc/npc_04_shoot_00.png'), require('@/assets/sprites/npc/npc_04_shoot_01.png')],
  5: [require('@/assets/sprites/npc/npc_05_shoot_00.png'), require('@/assets/sprites/npc/npc_05_shoot_01.png')],
  6: [require('@/assets/sprites/npc/npc_06_shoot_00.png'), require('@/assets/sprites/npc/npc_06_shoot_01.png')],
  7: [require('@/assets/sprites/npc/npc_07_shoot_00.png'), require('@/assets/sprites/npc/npc_07_shoot_01.png')],
  8: [require('@/assets/sprites/npc/npc_08_shoot_00.png'), require('@/assets/sprites/npc/npc_08_shoot_01.png')],
  9: [require('@/assets/sprites/npc/npc_09_shoot_00.png'), require('@/assets/sprites/npc/npc_09_shoot_01.png')],
  10: [require('@/assets/sprites/npc/npc_10_shoot_00.png'), require('@/assets/sprites/npc/npc_10_shoot_01.png')],
  11: [require('@/assets/sprites/npc/npc_11_shoot_00.png'), require('@/assets/sprites/npc/npc_11_shoot_01.png')],
  12: [require('@/assets/sprites/npc/npc_12_shoot_00.png'), require('@/assets/sprites/npc/npc_12_shoot_01.png')],
  13: [require('@/assets/sprites/npc/npc_13_shoot_00.png'), require('@/assets/sprites/npc/npc_13_shoot_01.png')],
  14: [require('@/assets/sprites/npc/npc_14_shoot_00.png'), require('@/assets/sprites/npc/npc_14_shoot_01.png')],
  15: [require('@/assets/sprites/npc/npc_15_shoot_00.png'), require('@/assets/sprites/npc/npc_15_shoot_01.png')],
  16: [require('@/assets/sprites/npc/npc_16_shoot_00.png'), require('@/assets/sprites/npc/npc_16_shoot_01.png')],
  17: [require('@/assets/sprites/npc/npc_17_shoot_00.png'), require('@/assets/sprites/npc/npc_17_shoot_01.png')],
  18: [require('@/assets/sprites/npc/npc_18_shoot_00.png'), require('@/assets/sprites/npc/npc_18_shoot_01.png')],
  19: [require('@/assets/sprites/npc/npc_19_shoot_00.png'), require('@/assets/sprites/npc/npc_19_shoot_01.png')],
  20: [require('@/assets/sprites/npc/npc_20_shoot_00.png'), require('@/assets/sprites/npc/npc_20_shoot_01.png')],
  21: [require('@/assets/sprites/npc/npc_21_shoot_00.png'), require('@/assets/sprites/npc/npc_21_shoot_01.png')],
  22: [require('@/assets/sprites/npc/npc_22_shoot_00.png'), require('@/assets/sprites/npc/npc_22_shoot_01.png')],
};

const PLAYER_SHOOT_FRAMES: Partial<Record<number, ShootSeq>> = {
  1: [require('@/assets/sprites/player/player_01_shoot_00.png'), require('@/assets/sprites/player/player_01_shoot_01.png')],
};

function pickPose(map: Partial<Record<number, PoseMap>>, id: number, pose: SpritePose) {
  const entry = map[id];
  if (!entry) return undefined;
  return entry[pose] ?? entry.idle;
}

export function getNpcSpriteSource(npcId: number, pose: SpritePose) {
  return pickPose(NPC_SPRITES, npcId, pose);
}

export function getPlayerSpriteSource(characterId: number, pose: SpritePose) {
  return pickPose(PLAYER_SPRITES, characterId, pose);
}

export function getNpcShootFrames(npcId: number): ShootSeq | undefined {
  const seq = NPC_SHOOT_FRAMES[npcId];
  return seq?.length ? seq : undefined;
}

export function getPlayerShootFrames(characterId: number): ShootSeq | undefined {
  const seq = PLAYER_SHOOT_FRAMES[characterId];
  return seq?.length ? seq : undefined;
}
