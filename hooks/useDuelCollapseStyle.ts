import {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

import type { DuelCorner } from '@/constants/duelArena';
import { RM_GAME } from '@/constants/reanimatedGame';

export const DUEL_COLLAPSE_MS = 560;

/** 코너별 쓰러짐 — 크게 회전하지 않고 아래로 가라앉음 */
export function duelCollapseStyleFor(
  progress: number,
  corner: DuelCorner,
): {
  transform: Array<
    | { translateY: number }
    | { translateX: number }
    | { rotate: string }
    | { scale: number }
  >;
  opacity: number;
} {
  'worklet';
  const p = Math.min(1, Math.max(0, progress));
  const outward = corner === 'bottomLeft' ? -1 : 1;
  return {
    transform: [
      { translateY: p * 88 },
      { translateX: p * outward * 10 },
      { rotate: `${p * outward * 18}deg` },
      { scale: 1 - p * 0.07 },
    ],
    opacity: 1 - p * 0.55,
  };
}

export function useDuelCollapseStyle(fall: SharedValue<number>, corner: DuelCorner) {
  return useAnimatedStyle(() => duelCollapseStyleFor(fall.value, corner));
}

export function animateDuelCollapse(fall: SharedValue<number>) {
  fall.value = 0;
  fall.value = withTiming(1, {
    duration: DUEL_COLLAPSE_MS,
    easing: Easing.in(Easing.cubic),
    reduceMotion: RM_GAME,
  });
}

export function resetDuelCollapse(fall: SharedValue<number>) {
  fall.value = 0;
}
