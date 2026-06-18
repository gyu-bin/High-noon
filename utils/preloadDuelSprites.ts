import { Image } from 'expo-image';
import { Image as RNImage, type ImageSourcePropType } from 'react-native';

import {
  getNpcShootFrames,
  getNpcSpriteSource,
  getPlayerShootFrames,
  getPlayerSpriteSource,
} from '@/constants/spriteAssets';
import type { SpritePose } from '@/constants/sprites';

function assetUri(src: ImageSourcePropType): string | null {
  const r = RNImage.resolveAssetSource(src);
  return r?.uri ?? null;
}

const POSES: SpritePose[] = ['idle', 'aim', 'shoot', 'defeat'];

/** 결투에 쓰는 NPC·플레이어 스프라ite 선캐시 — 뱅 순간 디코딩 스톨 방지 */
export async function prefetchDuelSprites(
  npcId: number,
  characterId: number,
): Promise<void> {
  const seen = new Set<string>();
  const uris: string[] = [];

  const push = (src: ImageSourcePropType | undefined) => {
    if (!src) return;
    const uri = assetUri(src);
    if (!uri || seen.has(uri)) return;
    seen.add(uri);
    uris.push(uri);
  };

  for (const pose of POSES) {
    push(getNpcSpriteSource(npcId, pose));
    push(getPlayerSpriteSource(characterId, pose));
  }
  getNpcShootFrames(npcId)?.forEach(push);
  getPlayerShootFrames(characterId)?.forEach(push);

  await Promise.all(
    uris.map((uri) => Image.prefetch(uri, { cachePolicy: 'memory-disk' }).catch(() => false)),
  );
}
