/**
 * §1 스프라이트 시스템 — PNG 프레임 경로 규칙.
 * `assets/sprites/npc/npc_XX_{idle|aim|shoot}.png` 추가 시 `require`를 SPRITE_FRAMES에 등록.
 * 에셋 없을 때는 CharacterSprites가 SVG 폴백 + pose 변형을 사용합니다.
 */
export type SpritePose = 'idle' | 'aim' | 'shoot' | 'defeat';

export function npcSpriteAssetKey(npcId: number, pose: SpritePose): string {
  const id = String(npcId).padStart(2, '0');
  return `npc_${id}_${pose}`;
}

export function playerSpriteAssetKey(
  characterId: number,
  pose: SpritePose,
): string {
  const id = String(characterId).padStart(2, '0');
  return `player_${id}_${pose}`;
}

/** pose별 시각 보정(SVG/PNG 공통) — §1-3 타이밍 */
export const SPRITE_POSE_TRANSFORM: Record<
  SpritePose,
  { scale: number; translateY: number }
> = {
  idle: { scale: 1, translateY: 0 },
  aim: { scale: 1.03, translateY: -2 },
  shoot: { scale: 1.06, translateY: -4 },
  defeat: { scale: 0.98, translateY: 18 },
};
