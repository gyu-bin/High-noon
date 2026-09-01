import type { SpritePose } from '@/constants/sprites';
import type { ViewStyle } from 'react-native';

/** 결투 코너 — portrait: 좌하(플레이어) ↔ 우상(NPC) · landscape: 좌(플레이어) ↔ 우(NPC) */
export type DuelCorner = 'bottomLeft' | 'topRight';

/**
 * duel 스프라이트 PNG는 **오른쪽(→) 조준**으로 통일.
 * - bottomLeft(플레이어·좌측): 그대로 → 상대 방향
 * - topRight(NPC·우측): scaleX 반전 → 상대(플레이어) 방향
 */
export function duelFigureTransform(
  corner: DuelCorner,
  _pose: SpritePose = 'idle',
): NonNullable<ViewStyle['transform']> {
  if (corner === 'bottomLeft') {
    return [{ translateY: 14 }, { scale: 0.98 }];
  }
  return [{ scaleX: -1 }, { translateY: 2 }, { scale: 0.96 }];
}

export function duelFlipHorizontal(_corner: DuelCorner): boolean {
  return false;
}

/** 패배 시 코너 바깥(상대 반대)으로 넉백 후 바닥으로 쓰러짐 */
export function duelDefeatKnockback(corner: DuelCorner): { x: number; y: number; rotate: number } {
  if (corner === 'topRight') {
    return { x: 22, y: -8, rotate: -16 };
  }
  return { x: -22, y: 6, rotate: 16 };
}

export const DUEL_FIGURE_SIZE = {
  widthRatio: 0.54,
  maxWidth: 228,
  heightRatio: 1.08,
} as const;

export function duelFigureSize(stageWidth: number): { width: number; height: number } {
  const width = Math.min(
    Math.floor(stageWidth * DUEL_FIGURE_SIZE.widthRatio),
    DUEL_FIGURE_SIZE.maxWidth,
  );
  return { width, height: Math.floor(width * DUEL_FIGURE_SIZE.heightRatio) };
}

/** 가로모드 정면 대치 — 화면 높이 기준으로 캐릭터 크기 결정 */
export function duelFigureSizeLandscape(
  stageHeight: number,
): { width: number; height: number } {
  const maxHeight = Math.floor(DUEL_FIGURE_SIZE.maxWidth * DUEL_FIGURE_SIZE.heightRatio);
  const height = Math.min(Math.floor(stageHeight * 0.56), maxHeight);
  return { width: Math.floor(height / DUEL_FIGURE_SIZE.heightRatio), height };
}
