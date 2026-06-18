import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { DustParticles } from '@/components/effects/DustParticles';
import {
  WESTERN_HERO_FALLBACK,
  WESTERN_HERO_GRADIENT,
  WESTERN_SUN_GLOW,
} from '@/constants/westernBackground';
import { gameImages } from '@/constants/gameImages';

type Props = {
  children?: React.ReactNode;
  showDust?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 타이틀·메뉴 공통 — 황야 마을 일러스트 + 황혼 오버레이 */
export function WesternHomeBackground({
  children,
  showDust = true,
  style,
}: Props) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.bgClip} pointerEvents="none">
        <Image
          source={gameImages.titleHero}
          style={styles.bgImage}
          contentFit="cover"
          contentPosition="center"
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={[...WESTERN_SUN_GLOW.colors]}
        locations={[...WESTERN_SUN_GLOW.locations]}
        style={styles.sunGlow}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[...WESTERN_HERO_GRADIENT.colors]}
        locations={[...WESTERN_HERO_GRADIENT.locations]}
        style={StyleSheet.absoluteFill}
      />

      {showDust ? <DustParticles /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WESTERN_HERO_FALLBACK,
    overflow: 'hidden',
  },
  bgClip: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.06 }],
  },
  sunGlow: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: '18%',
    height: '42%',
    borderRadius: 999,
  },
});
