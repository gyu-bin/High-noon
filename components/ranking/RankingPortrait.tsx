import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { POSTER_PLAYER_IDENTITIES } from '@/constants/posterCharacterAssets';

type Props = {
  width: number;
  height: number;
  characterId?: number;
};

/** Wanted/ranking-only portrait; gameplay retains the original cinematic idle. */
export function RankingPortrait({
  width,
  height,
  characterId = 1,
}: Props) {
  const source = POSTER_PLAYER_IDENTITIES[characterId];

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
        recyclingKey={`wanted-player-${characterId}-poster-v1`}
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
