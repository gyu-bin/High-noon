import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { gameImages } from '@/constants/gameImages';
import { colors } from '@/constants/theme';
import type { DuelBackgroundVariant } from '@/constants/duelBackgroundVariants';

type Props = {
  /** NPC 1P — 단일 이미지 전체 화면 (분할 없음) */
  variant: DuelBackgroundVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentWidth: number;
  contentHeight: number;
};

const FULL_BG = {
  day: {
    source: gameImages.duelBgDayFull,
    dim: 'rgba(30, 16, 4, 0.2)',
    vignette: [
      'rgba(30, 16, 4, 0.38)',
      'rgba(20, 10, 2, 0.06)',
      'rgba(20, 10, 2, 0.1)',
      'rgba(30, 16, 4, 0.45)',
    ] as const,
  },
  night: {
    source: gameImages.duelBgNightFull,
    dim: 'rgba(8, 6, 24, 0.28)',
    vignette: [
      'rgba(8, 6, 28, 0.52)',
      'rgba(8, 6, 28, 0.08)',
      'rgba(8, 6, 28, 0.12)',
      'rgba(6, 4, 20, 0.5)',
    ] as const,
  },
} as const;

/** NPC 결투 — 낮/밤 단일 전체 배경 */
export function DuelFullBackground({
  variant,
  children,
  style,
  contentWidth: w,
  contentHeight: h,
}: Props) {
  const cfg = FULL_BG[variant];

  return (
    <View style={[styles.root, { width: w, height: h }, style]}>
      <Image
        pointerEvents="none"
        source={cfg.source}
        style={[styles.bgImage, { width: w, height: h }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />

      <View pointerEvents="none" style={[styles.dim, { backgroundColor: cfg.dim }]} />

      <LinearGradient
        pointerEvents="none"
        colors={[...cfg.vignette]}
        locations={[0, 0.28, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.foreground} pointerEvents="box-none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.darkBrown,
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 0,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'transparent',
  },
});
