import type { ImageSourcePropType } from 'react-native';
import { CLARITY_NPCS, CLARITY_PLAYERS, type ClarityPoseSet } from './clarityCharacterAssets';
import type { SpritePose } from './sprites';

type ShootSeq = readonly [ImageSourcePropType, ImageSourcePropType];
function claritySource(set: ClarityPoseSet | undefined, pose: SpritePose): ImageSourcePropType | undefined {
  if (!set) return undefined;
  if (pose === 'aim') return set.draw;
  if (pose === 'shoot') return set.fire;
  if (pose === 'defeat') return set.hit;
  return set.idle;
}
// One production registry for selection, NPC duel and local duel.
// Legacy files remain on disk, but are no longer bundled as unused fallbacks.
export function getNpcSpriteSource(id: number, pose: SpritePose) {
  return claritySource(CLARITY_NPCS[id], pose);
}
export function getPlayerSpriteSource(id: number, pose: SpritePose) {
  return claritySource(CLARITY_PLAYERS[id], pose);
}
export function getNpcDownSource(id: number): ImageSourcePropType | undefined {
  return CLARITY_NPCS[id]?.down;
}
export function getPlayerDownSource(id: number): ImageSourcePropType | undefined {
  return CLARITY_PLAYERS[id]?.down;
}
export function getNpcShootFrames(_id: number): ShootSeq | undefined { return undefined; }
export function getPlayerShootFrames(_id: number): ShootSeq | undefined { return undefined; }
