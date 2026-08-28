import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';

type Props = {
  visible: boolean;
  message?: string;
  onHidden?: () => void;
  durationMs?: number;
};

/** 화면 하단 작은 OTA 안내 토스트 */
export function OtaUpdatedToast({
  visible,
  message,
  onHidden,
  durationMs = 2200,
}: Props) {
  const { t } = useTranslation();
  const label = message ?? t('ota.updated');
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      return;
    }

    opacity.value = withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.quad) });

    const hide = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) });
      translateY.value = withTiming(6, { duration: 200 });
      setTimeout(() => onHidden?.(), 220);
    }, durationMs);

    return () => clearTimeout(hide);
  }, [visible, durationMs, onHidden, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 16 }]}>
      <Animated.View style={[styles.pill, animStyle]}>
        <Text style={styles.text}>{label}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 200,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 12, 8, 0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(212, 160, 23, 0.55)',
  },
  text: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
