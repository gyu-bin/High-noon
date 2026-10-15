import { Image } from 'expo-image';
import { Image as RNImage, type ImageSourcePropType } from 'react-native';

import type { LocalDuelSkin } from '@/constants/localDuelSkin';
import {
  getNpcDownSource,
  getNpcShootFrames,
  getNpcSpriteSource,
  getPlayerDownSource,
  getPlayerShootFrames,
  getPlayerSpriteSource,
} from '@/constants/spriteAssets';
import type { SpritePose } from '@/constants/sprites';

function assetUri(src: ImageSourcePropType): string | null {
  const r = RNImage.resolveAssetSource(src);
  return r?.uri ?? null;
}

const POSES: SpritePose[] = ['idle', 'aim', 'shoot', 'defeat'];

function collectSkinUris(skin: LocalDuelSkin, push: (src: ImageSourcePropType | undefined) => void) {
  if (skin.kind === 'npc') {
    for (const pose of POSES) push(getNpcSpriteSource(skin.id, pose));
    push(getNpcDownSource(skin.id));
    getNpcShootFrames(skin.id)?.forEach(push);
    return;
  }
  for (const pose of POSES) push(getPlayerSpriteSource(skin.id, pose));
  push(getPlayerDownSource(skin.id));
  getPlayerShootFrames(skin.id)?.forEach(push);
}

/** 결투에 쓰는 NPC·플레이어 스프라ite 선캐시 — 뱅 순간 디코딩 스톨 방지 */
export async function prefetchDuelSprites(
  npcId: number,
  characterId: number,
): Promise<void> {
  await prefetchLocalDuelSprites(
    { kind: 'npc', id: npcId },
    { kind: 'player', id: characterId },
  );
}

/** 로컬 2인전 — P1/P2 스킨(유저·NPC) 선캐시 */
export async function prefetchLocalDuelSprites(
  p1: LocalDuelSkin,
  p2: LocalDuelSkin,
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

  collectSkinUris(p1, push);
  collectSkinUris(p2, push);

  await Promise.all(
    uris.map((uri) => Image.prefetch(uri, { cachePolicy: 'memory-disk' }).catch(() => false)),
  );
}
