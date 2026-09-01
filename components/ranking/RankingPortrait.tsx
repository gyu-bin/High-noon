import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import {
  getNpcSpriteSource,
  getPlayerSpriteSource,
} from '@/constants/spriteAssets';
import { SPRITE_CACHE_REVISION } from '@/constants/sprites';

type Props = {
  width: number;
  height: number;
  /** null이면 플레이어 캐릭터 */
  cosmeticNpcId?: number | null;
  characterId?: number;
};

/** 랭킹 UI용 — 결투 이펙트/레이어 없이 idle 이미지만 */
export function RankingPortrait({
  width,
  height,
  cosmeticNpcId = null,
  characterId = 1,
}: Props) {
  const source =
    cosmeticNpcId != null
      ? getNpcSpriteSource(cosmeticNpcId, 'idle')
      : getPlayerSpriteSource(characterId, 'idle');

  if (!source) {
    return <View style={{ width, height }} />;
  }

  return (
    <View style={[styles.box, { width, height }]}>
      <Image
        source={source}
        style={{ width, height, backgroundColor: 'transparent' }}
        contentFit="contain"
        cachePolicy="none"
        transition={0}
        recyclingKey={`rank-portrait-${cosmeticNpcId ?? `p${characterId}`}-r${SPRITE_CACHE_REVISION}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
