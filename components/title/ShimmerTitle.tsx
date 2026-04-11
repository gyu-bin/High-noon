import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';

type Props = {
  label: string;
  fontFamily: string;
  fontSize?: number;
  /** 좌우 여백 제외 최대 가로(미지정 시 화면 기준) */
  maxWidth?: number;
};

export function ShimmerTitle({
  label,
  fontFamily,
  fontSize = 44,
  maxWidth: maxWidthProp,
}: Props) {
  const { stageWidth } = usePhoneStageMetrics();
  const titleSlotW = useMemo(
    () => Math.min(maxWidthProp ?? stageWidth - 32, stageWidth - 24),
    [maxWidthProp, stageWidth],
  );
  const band = useMemo(() => Math.max(220, Math.min(360, titleSlotW * 0.95)), [titleSlotW]);

  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withRepeat(
      withTiming(1, {
        duration: 2600,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: RM_GAME,
      }),
      -1,
      true,
      undefined,
      RM_GAME,
    );
  }, [shift]);

  const sweep = useAnimatedStyle(
    () => ({
      transform: [{ translateX: (shift.value - 0.5) * band }],
    }),
    [band],
  );

  const letterSpacing = fontSize > 36 ? 4 : 3;
  const maskTextStyle = [
    styles.maskText,
    {
      fontFamily,
      fontSize,
      letterSpacing,
      maxWidth: titleSlotW,
    },
  ];

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrap, { width: titleSlotW }]}>
        <Text
          style={[styles.fallback, { fontFamily, fontSize, letterSpacing }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.45}
        >
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: titleSlotW }]}>
      <MaskedView
        style={[styles.maskHost, { minHeight: fontSize * 1.45, width: titleSlotW }]}
        maskElement={
          <View style={[styles.maskInner, { width: titleSlotW }]}>
            <Text
              style={maskTextStyle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.45}
            >
              {label}
            </Text>
          </View>
        }
      >
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['#6B4510', colors.ochre, '#6B4510']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.sweepHost, sweep, { width: band, marginLeft: -band / 2 }]}>
            <LinearGradient
              colors={['transparent', '#FFF3C2', '#FFD86B', '#FFF3C2', 'transparent']}
              locations={[0, 0.35, 0.5, 0.65, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.sweepGradient}
            />
          </Animated.View>
        </View>
      </MaskedView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskHost: {
    alignSelf: 'center',
  },
  maskInner: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  maskText: {
    color: '#000',
    textAlign: 'center',
    fontWeight: '400',
    width: '100%',
  },
  sweepHost: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
  },
  sweepGradient: {
    flex: 1,
    width: '100%',
  },
  fallback: {
    color: colors.ochre,
    textAlign: 'center',
    fontWeight: '400',
  },
});
