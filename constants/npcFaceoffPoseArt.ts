import type { ImageSourcePropType } from 'react-native';

import { characterArtDisplayScale } from './characterArtMetadata';
import { CLARITY_PLAYERS } from './clarityCharacterAssets';
import { faceoffGroundFraction, faceoffMuzzleAnchor } from './npcFaceoffPresentation';
import { getV3NpcPose, V3_PRE_DUEL_NPC_FACEOFF, V3_PRE_DUEL_PLAYER_FACEOFF } from './v3DuelAssets';

type StandingStage = 'ready' | 'aim' | 'fire';
type SourceDirection = 'left' | 'right';

/** Reviewed source directions, not a blanket slot flip. The redesigned draw
 * frames differ from ordinary draw frames. Some FIRE faces remain ambiguous
 * or oppose their barrel; mirroring cannot repair that painted-in limitation. */
const PLAYER_DIRECTIONS: Record<number, { draw: SourceDirection; fire: SourceDirection }> = {
  1: { draw: 'right', fire: 'left' }, 2: { draw: 'right', fire: 'left' },
  3: { draw: 'right', fire: 'left' }, 4: { draw: 'right', fire: 'left' },
};
const NPC_DIRECTIONS: Record<number, { draw: SourceDirection; fire: SourceDirection }> = {
  1: { draw: 'right', fire: 'left' }, 9: { draw: 'left', fire: 'left' },
  15: { draw: 'right', fire: 'left' }, 18: { draw: 'right', fire: 'left' },
  19: { draw: 'left', fire: 'left' }, 20: { draw: 'left', fire: 'left' },
  22: { draw: 'left', fire: 'left' },
};
// Existing clean torso-aim FIRE art can be held without runtime shot effects.
const CLEAN_NPC_FIRE_HOLD = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 21]);

// NPC-only corrections; shared Local/Ranked FIRE art retains its original anchors.
const PLAYER_FACEOFF_FIRE: Partial<Record<number, ImageSourcePropType>> = {
  2: require('../assets/images/characters/clarity/player/02-v2/fire-faceoff.png'),
  3: require('../assets/images/characters/clarity/player/03/fire-faceoff.png'),
};
const NPC_FACEOFF_DRAW: Partial<Record<number, ImageSourcePropType>> = {
  15: require('../assets/images/characters/clarity/npc/15-v2/draw-faceoff.png'),
  19: require('../assets/images/characters/clarity/npc/19-v2/draw-faceoff.png'),
  22: require('../assets/images/characters/clarity/npc/22-v2/draw-faceoff.png'),
};

/** Presentation-only art selection. A held FIRE frame never activates runtime
 * shot effects. NPC15/19/20/22 FIRE has baked shot effects, so never hold it. */
export function faceoffStandingArt(kind: 'player' | 'npc', id: number, stage: StandingStage) {
  if (id === 1) {
    // Existing clean, coherent body/face/barrel cutouts, contained in a square.
    // The same raised barrel becomes a firing pose only with actual shot FX.
    return {
      source: kind === 'player' ? V3_PRE_DUEL_PLAYER_FACEOFF[1]! : V3_PRE_DUEL_NPC_FACEOFF[1]!,
      pose: 'faceoff' as const, flipHorizontal: false, artScale: 1,
      groundFraction: kind === 'player' ? 1461 / 1536 : 1472 / 1536,
      muzzle: kind === 'player'
        ? { x: (256 + 987) / 1536, y: 507 / 1536 }
        : { x: (256 + 103) / 1536, y: 650 / 1536 },
    };
  }
  const fireHold = kind === 'player' || CLEAN_NPC_FIRE_HOLD.has(id);
  const pose = stage === 'fire' || (stage === 'aim' && fireHold) ? 'fire' : 'draw';
  const directions = kind === 'player' ? PLAYER_DIRECTIONS[id] : NPC_DIRECTIONS[id];
  const sourceDirection = directions?.[pose] ?? (pose === 'fire' ? 'left' : 'right');
  return {
    source: kind === 'player'
      ? (pose === 'fire' ? PLAYER_FACEOFF_FIRE[id] : undefined) ?? (CLARITY_PLAYERS[id] ?? CLARITY_PLAYERS[1])![pose]
      : (stage === 'aim' && pose === 'draw' ? NPC_FACEOFF_DRAW[id] : undefined) ?? getV3NpcPose(id, pose),
    pose, flipHorizontal: sourceDirection !== (kind === 'player' ? 'right' : 'left'),
    artScale: characterArtDisplayScale(kind, id),
    groundFraction: faceoffGroundFraction(kind, id),
    // NPC-only corrected FIRE sources have measured painted barrel tips.
    // This changes only the FX attachment point, never lane placement or timing.
    muzzle: kind === 'player' && id === 2 && pose === 'fire'
      ? { x: 37 / 1254, y: 199 / 1254 }
      : kind === 'player' && id === 3 && pose === 'fire'
        ? { x: 14 / 1254, y: 216 / 1254 }
        : faceoffMuzzleAnchor(kind, id),
  };
}
