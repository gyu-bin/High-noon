import { Image } from 'expo-image';

import { POSTER_NPC_IDENTITIES } from '@/constants/posterCharacterAssets';

/** Wanted-only identity. Duel keeps its separate cinematic sprite registry. */
export function NpcPortrait({ id, size }: { id: number; size: number }) {
  return <Image source={POSTER_NPC_IDENTITIES[id]} contentFit="contain" transition={0}
    allowDownscaling={false} recyclingKey={`npc-poster-hires-v1-${id}`}
    accessibilityLabel={`Portrait ${id}`} style={{ width: size, height: size, maxWidth: '100%' }} />;
}
