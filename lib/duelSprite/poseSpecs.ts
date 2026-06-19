import type { SpritePose } from '@/constants/sprites';

/** scripts/duel_sprite_library.py 와 동일 — idle 대비 포즈 변형 */
export type DuelPoseSpec = {
  scale: number;
  dy: number;
  dx: number;
  rotateDeg: number;
};

export const DUEL_POSE_SPECS: Record<
  SpritePose | 'shoot_00' | 'shoot_01',
  DuelPoseSpec
> = {
  idle: { scale: 1, dy: 0, dx: 0, rotateDeg: 0 },
  aim: { scale: 1.03, dy: -2, dx: 0, rotateDeg: 2 },
  shoot: { scale: 1.06, dy: -4, dx: 0, rotateDeg: 4 },
  shoot_00: { scale: 1.05, dy: -3, dx: 0, rotateDeg: 3 },
  shoot_01: { scale: 1.08, dy: -6, dx: 2, rotateDeg: 6 },
  defeat: { scale: 0.98, dy: 18, dx: -4, rotateDeg: -12 },
};

export const DUEL_SPRITE_TIMING = {
  poseFadeMs: 36,
  shootCrossfadeMs: 120,
  shootInMs: 0,
  idleBobMs: 1400,
  aimPulseMs: 900,
  shootKickInMs: 70,
  shootKickHoldMs: 180,
  defeatInMs: 220,
  victoryHolsterMs: 520,
  victoryPulseMs: 1100,
} as const;
