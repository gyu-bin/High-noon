import type { ImageSourcePropType } from 'react-native';

import {
  getNpcDownSource,
  getNpcShootFrames,
  getNpcSpriteSource,
  getPlayerDownSource,
  getPlayerShootFrames,
  getPlayerSpriteSource,
} from '@/constants/spriteAssets';
import type { SpritePose } from '@/constants/sprites';

export type DuelSpriteMode = 'npc' | 'player';

export type DuelSpriteLayers = {
  idle: ImageSourcePropType | undefined;
  aim: ImageSourcePropType | undefined;
  defeat: ImageSourcePropType | undefined;
  /** defeat(휘청) 뒤 바닥에 누운 프레임 — 없으면 defeat 유지 */
  down: ImageSourcePropType | undefined;
  shootFrame0: ImageSourcePropType | undefined;
  shootFrame1: ImageSourcePropType | undefined;
  useDualShootFrames: boolean;
};

function pickPose(
  mode: DuelSpriteMode,
  id: number,
  pose: SpritePose,
): ImageSourcePropType | undefined {
  const src =
    mode === 'npc'
      ? getNpcSpriteSource(id, pose)
      : getPlayerSpriteSource(id, pose);
  if (src) return src;
  if (pose === 'defeat') {
    return mode === 'npc'
      ? getNpcSpriteSource(id, 'idle')
      : getPlayerSpriteSource(id, 'idle');
  }
  return undefined;
}

/** 먼지바람 기준 4포즈 + 2프레임 슛 — defeat 없으면 idle 폴백 */
export function resolveDuelSpriteLayers(
  mode: DuelSpriteMode,
  id: number,
): DuelSpriteLayers {
  const idle = pickPose(mode, id, 'idle');
  const aim = pickPose(mode, id, 'aim') ?? idle;
  const defeat = pickPose(mode, id, 'defeat');
  const down = mode === 'npc' ? getNpcDownSource(id) : getPlayerDownSource(id);
  const shoot =
    mode === 'npc'
      ? getNpcSpriteSource(id, 'shoot')
      : getPlayerSpriteSource(id, 'shoot');
  const shootFrames =
    mode === 'npc' ? getNpcShootFrames(id) : getPlayerShootFrames(id);

  const frame0 = shootFrames?.[0] ?? shoot ?? aim;
  const frame1 = shootFrames?.[1];
  const useDualShootFrames = frame1 != null && frame0 != null;

  return {
    idle,
    aim,
    defeat,
    down,
    shootFrame0: frame0,
    shootFrame1: useDualShootFrames ? frame1 : undefined,
    useDualShootFrames,
  };
}
