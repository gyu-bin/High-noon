import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { duelVictoryArt } from '@/constants/duelVictoryArt';

/** Dedicated celebration art; never reuse the shooting or kneeling combat frame. */
export function DuelVictoryPortrait({ skinId, width, height }: {
  skinId: string;
  width: number;
  height: number;
}) {
  const [kind, rawId] = skinId.split(':');
  const id = Number(rawId);
  const source = duelVictoryArt({ kind: kind === 'n' ? 'npc' : 'player', id });
  return (
    <View pointerEvents="none" accessible={false} style={[styles.stage, { width, height }]}>
      <View style={[styles.spotlight, { width: height * 0.7, height: height * 0.7 }]} />
      <View style={[styles.ground, { width: height * 0.48 }]} />
      <Image source={source} contentFit="contain" transition={0}
        style={{ width: Math.max(width, height), height }} />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center' },
  spotlight: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(232, 168, 42, 0.06)', borderWidth: 1, borderColor: 'rgba(232, 168, 42, 0.12)' },
  ground: { position: 'absolute', bottom: 0, height: 9, borderRadius: 999, backgroundColor: 'rgba(0, 0, 0, 0.35)' },
});
