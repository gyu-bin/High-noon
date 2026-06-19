import type { SpritePose } from '@/constants/sprites';
import type { ViewStyle } from 'react-native';

/** 결투 코너 — 좌하(플레이어) ↔ 우상(NPC·P2) 대각선 대치 */
export type DuelCorner = 'bottomLeft' | 'topRight';

/**
 * duel 스프라이트는 PNG에서 **오른쪽(→) 조준**으로 그린다.
 * - bottomLeft(플레이어): 그대로 → 화면 우상(NPC 방향)
 * - topRight(NPC): scaleX 반전 → 화면 좌하(플레이어 방향)
 */
export function duelFigureTransform(
  corner: DuelCorner,
  pose: SpritePose = 'idle',
): NonNullable<ViewStyle['transform']> {
  if (pose === 'defeat') {
    if (corner === 'bottomLeft') {
      return [{ translateY: 20 }, { translateX: -8 }];
    }
    return [{ scaleX: -1 }, { translateY: -22 }, { translateX: 6 }];
  }
  if (corner === 'bottomLeft') {
    return [{ translateY: 22 }];
  }
  return [{ scaleX: -1 }, { translateY: 8 }];
}

export function duelFlipHorizontal(_corner: DuelCorner): boolean {
  return false;
}

/**
 * 로컬 2P 상단 구역(180° 회전) — `bottomLeft`와 같은 조준.
 * 부모 회전과 합쳐지면 화면상 아래(P1) 쪽을 향한다.
 */
export function localDuelTopHalfFigureTransform(
  pose: SpritePose = 'idle',
): NonNullable<ViewStyle['transform']> {
  return duelFigureTransform('bottomLeft', pose);
}

export const DUEL_FIGURE_SIZE = {
  widthRatio: 0.58,
  maxWidth: 240,
  heightRatio: 1.15,
} as const;

export function duelFigureSize(stageWidth: number): { width: number; height: number } {
  const width = Math.min(
    Math.floor(stageWidth * DUEL_FIGURE_SIZE.widthRatio),
    DUEL_FIGURE_SIZE.maxWidth,
  );
  return { width, height: Math.floor(width * DUEL_FIGURE_SIZE.heightRatio) };
}
