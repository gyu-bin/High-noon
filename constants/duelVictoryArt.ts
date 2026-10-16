import type { ImageSourcePropType } from 'react-native';
import { NPC_VICTORY_ART } from './npcVictoryArt';
import { CLARITY_NPCS } from './clarityCharacterAssets';
import type { LocalDuelSkin } from './localDuelSkin';

export const PLAYER_VICTORY_ART: Record<number, ImageSourcePropType> = {
  1: require('@/assets/images/characters/victory/player-01.png'),
  2: require('@/assets/images/characters/victory/player-02.png'),
  3: require('@/assets/images/characters/victory/player-03.png'),
  4: require('@/assets/images/characters/victory/player-04.png'),
};

export function duelVictoryArt(skin: LocalDuelSkin): ImageSourcePropType {
  return skin.kind === 'npc'
    ? NPC_VICTORY_ART[skin.id] ?? CLARITY_NPCS[skin.id]?.idle ?? PLAYER_VICTORY_ART[1]!
    : PLAYER_VICTORY_ART[skin.id] ?? PLAYER_VICTORY_ART[1]!;
}
