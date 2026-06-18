import type { SpritePose } from '@/constants/sprites';
import type { ViewStyle } from 'react-native';

/** 결투 코너 — 좌하(플레이어) ↔ 우상(NPC·P2) 대각선 대치 */
export type DuelCorner = 'bottomLeft' | 'topRight';

const POSE_AIM_DEG = { idle: 0, aim: 3, shoot: 5, defeat: 0 } as const satisfies Record<SpritePose, number>;

function poseBoost(pose: SpritePose): number {
  return POSE_AIM_DEG[pose];
}

/**
 * duel 스프라ite는 →(우상) 조준으로 그린다.
 * - bottomLeft: 그대로 두면 상대(우상) 방향
 * - topRight: scaleX 반전만으로 상대(좌하) 방향
 * (추가 회전은 두 캐릭터가 같은 쪽을 보게 만들어 제거)
 */
export function duelFigureTransform(
  corner: DuelCorner,
  pose: SpritePose = 'idle',
): NonNullable<ViewStyle['transform']> {
  if (pose === 'defeat') {
    if (corner === 'bottomLeft') {
      return [{ translateY: 36 }, { translateX: -8 }];
    }
    return [{ scaleX: -1 }, { translateY: 36 }, { translateX: 8 }];
  }
  const boost = poseBoost(pose);
  if (corner === 'bottomLeft') {
    return [
      { rotate: `${-6 - boost}deg` },
      { translateX: -4 },
      { translateY: 10 },
    ];
  }
  return [
    { scaleX: -1 },
    { rotate: `${6 + boost}deg` },
    { translateX: 6 },
    { translateY: 8 },
  ];
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
