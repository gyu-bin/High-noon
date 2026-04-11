import { Image } from 'expo-image';
import { Image as RNImage } from 'react-native';

import { gameImages } from '@/constants/gameImages';

function assetUri(src: number): string | null {
  const r = RNImage.resolveAssetSource(src);
  return r?.uri ?? null;
}

/** 결투·결과 화면 배경 — 첫 라운드에서 디코딩 지연으로 빈 배경이 보이지 않도록 선캐시 */
export async function preloadSceneImages(): Promise<void> {
  const uris = [
    assetUri(gameImages.duelBackground),
    assetUri(gameImages.winScreen),
    assetUri(gameImages.loseScreen),
  ].filter((u): u is string => Boolean(u));

  await Promise.all(
    uris.map((uri) =>
      Image.prefetch(uri, { cachePolicy: 'memory-disk' }).catch(() => false),
    ),
  );
}
