import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import {
  DUEL_BG_VARIANT,
  type DuelBackgroundVariant,
} from '@/constants/duelBackgroundVariants';
import { colors } from '@/constants/theme';

type Props = {
  /** 2P — 상·하 반쪽 분할 배경 (낮/밤은 매치마다 랜덤) */
  variant: DuelBackgroundVariant;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentWidth: number;
  contentHeight: number;
};

/** 로컬 2P — 상·하 반쪽 분할 배경 */
export function DuelSplitBackground({
  variant,
  children,
  style,
  contentWidth: w,
  contentHeight: h,
}: Props) {
  const halfH = h / 2;
  const cfg = DUEL_BG_VARIANT[variant];

  return (
    <View style={[styles.root, { width: w, height: h }, style]}>
      <View style={[styles.halfClip, { height: halfH }]}>
        <Image
          pointerEvents="none"
          source={cfg.top}
          style={[styles.fullBleedImage, { width: w, height: h }]}
          contentFit="cover"
          contentPosition={cfg.topContentPosition ?? 'bottom'}
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
        <View pointerEvents="none" style={[styles.halfDim, { backgroundColor: cfg.topDim }]} />
      </View>

      <View style={[styles.halfClip, styles.bottomHalf, { height: halfH }]}>
        <Image
          pointerEvents="none"
          source={cfg.bottom}
          style={[styles.fullBleedImage, { width: w, height: h, top: -halfH }]}
          contentFit="cover"
          contentPosition={cfg.bottomContentPosition ?? 'top'}
          cachePolicy="memory-disk"
          priority="high"
          transition={0}
        />
        <View pointerEvents="none" style={[styles.halfDim, { backgroundColor: cfg.bottomDim }]} />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={[...cfg.vignette]}
        locations={[0, 0.46, 0.54, 1]}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[...cfg.splitHorizon]}
        locations={[0.44, 0.5, 0.56]}
        style={[styles.horizonGlow, { top: halfH - 28, height: 56 }]}
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
  halfClip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
  bottomHalf: {
    top: undefined,
    bottom: 0,
  },
  fullBleedImage: {
    position: 'absolute',
    left: 0,
    zIndex: 0,
  },
  halfDim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  horizonGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    backgroundColor: 'transparent',
  },
});
