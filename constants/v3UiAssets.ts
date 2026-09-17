import type { ImageSourcePropType } from 'react-native';
import { CLARITY_PLAYERS, CLARITY_NPCS } from './clarityCharacterAssets';

/** Selection and gameplay share the same high-resolution identity. */
export const V3_PLAYER_IDENTITIES: Record<number, ImageSourcePropType> =
  Object.fromEntries(Object.entries(CLARITY_PLAYERS).flatMap(([id, poses]) => poses ? [[id, poses.idle]] : []));
export const V3_NPC_IDENTITIES: Record<number, ImageSourcePropType> =
  Object.fromEntries(Object.entries(CLARITY_NPCS).flatMap(([id, poses]) => poses ? [[id, poses.idle]] : []));
export const V3_PALE_LOCKED_SILHOUETTE = require('@/assets/images/hidden/pale_rider_locked_silhouette.png');
