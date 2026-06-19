import type { SpritePose } from '@/constants/sprites';
import type { DuelPhase } from '@/hooks/useDuelEngine';

/** NPC — READY idle / STEADY·페이크 aim / BANG shoot / 승리 idle+연기 */
export function npcSpritePoseFromPhase(phase: DuelPhase): SpritePose {
  if (phase === '뱅') return 'shoot';
  if (phase === '집중' || phase === '페이크') return 'aim';
  return 'idle';
}

/** §1-3 플레이어 — READY idle / STEADY aim 모션 / BANG shoot 모션 */
export function playerSpritePoseFromPhase(
  phase: DuelPhase,
  shootAckActive: boolean,
): SpritePose {
  if (shootAckActive) return 'shoot';
  if (phase === '뱅') return 'shoot';
  if (phase === '집중' || phase === '페이크') return 'aim';
  return 'idle';
}

/** 로컬 2P — STEADY aim 모션 / 탭 시 shoot 모션 */
export function localPlayerSpritePoseFromPhase(
  phase: DuelPhase,
  shootAckActive: boolean,
): SpritePose {
  if (shootAckActive) return 'shoot';
  if (phase === '집중' || phase === '페이크' || phase === '뱅') return 'aim';
  return 'idle';
}
