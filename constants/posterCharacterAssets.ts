import type { ImageSourcePropType } from 'react-native';

/** PRODUCTION LOCK: clean identities for parchment / Wanted surfaces only.
 * Do not use these in Duel. spriteAssets.ts / clarityCharacterAssets.ts retain
 * the original cinematic five-pose sets. Provenance: poster-manifest.json.
 */
export const POSTER_NPC_IDENTITIES: Partial<Record<number, ImageSourcePropType>> = {
  1: require('@/assets/images/characters/clarity/npc/01/identity_poster.png'),
  2: require('@/assets/images/characters/clarity/npc/02/identity_poster.png'),
  3: require('@/assets/images/characters/clarity/npc/03/identity_poster.png'),
  4: require('@/assets/images/characters/clarity/npc/04/identity_poster.png'),
  5: require('@/assets/images/characters/clarity/npc/05/identity_poster.png'),
  6: require('@/assets/images/characters/clarity/npc/06/identity_poster.png'),
  7: require('@/assets/images/characters/clarity/npc/07/identity_poster.png'),
  8: require('@/assets/images/characters/clarity/npc/08/identity_poster.png'),
  9: require('@/assets/images/characters/clarity/npc/09/identity_poster.png'),
  10: require('@/assets/images/characters/clarity/npc/10/identity_poster.png'),
  11: require('@/assets/images/characters/clarity/npc/11/identity_poster.png'),
  12: require('@/assets/images/characters/clarity/npc/12/identity_poster.png'),
  13: require('@/assets/images/characters/clarity/npc/13/identity_poster.png'),
  14: require('@/assets/images/characters/clarity/npc/14/identity_poster.png'),
  15: require('@/assets/images/characters/clarity/npc/15/identity_poster.png'),
  16: require('@/assets/images/characters/clarity/npc/16/identity_poster.png'),
  17: require('@/assets/images/characters/clarity/npc/17/identity_poster.png'),
  18: require('@/assets/images/characters/clarity/npc/18/identity_poster.png'),
  19: require('@/assets/images/characters/clarity/npc/19/identity_poster.png'),
  20: require('@/assets/images/characters/clarity/npc/20/identity_poster.png'),
  21: require('@/assets/images/characters/clarity/npc/21/identity_poster.png'),
  22: require('@/assets/images/characters/clarity/npc/22/identity_poster.png'),
};

/** Shared by MY WANTED, profile, and future challenge / share posters. */
export const POSTER_PLAYER_IDENTITIES: Partial<Record<number, ImageSourcePropType>> = {
  1: require('@/assets/images/characters/clarity/player/01/identity_poster.png'),
  2: require('@/assets/images/characters/clarity/player/02-v2/identity_poster.png'),
  3: require('@/assets/images/characters/clarity/player/03/identity_poster.png'),
  4: require('@/assets/images/characters/clarity/player/04/identity_poster.png'),
};
