import type { SpritePose } from '@/constants/sprites';
import type { DuelPhase } from '@/hooks/useDuelEngine';

/** §1-3 NPC — READY idle / STEADY aim / BANG shoot */
export function npcSpritePoseFromPhase(phase: DuelPhase): SpritePose {
  if (phase === '뱅') return 'shoot';
  if (phase === '집중' || phase === '페이크') return 'aim';
  return 'idle';
}

/** §1-3 플레이어 — READY idle / STEADY aim / BANG(+탭) shoot */
export function playerSpritePoseFromPhase(
  phase: DuelPhase,
  shootAckActive: boolean,
): SpritePose {
  if (shootAckActive) return 'shoot';
  if (phase === '뱅') return 'shoot';
  if (phase === '집중' || phase === '페이크') return 'aim';
  return 'idle';
}

/** 로컬 2P — 뱅 탭한 플레이어만 shoot 프레임 재생 */
export function localPlayerSpritePoseFromPhase(
  phase: DuelPhase,
  shootAckActive: boolean,
): SpritePose {
  if (shootAckActive) return 'shoot';
  if (phase === '집중' || phase === '페이크' || phase === '뱅') return 'aim';
  return 'idle';
}
