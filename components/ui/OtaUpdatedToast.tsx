import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/theme';
import { consumeOtaJustApplied } from '@/utils/otaUpdateFlag';

const SHOW_MS = 2600;

/** OTA 재시작 직후 상단 작은 안내 토스트 */
export function OtaUpdatedToast() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-8);

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    void (async () => {
      const show = await consumeOtaJustApplied();
      if (cancelled || !show) return;
      setVisible(true);
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
      hideTimer = setTimeout(() => {
        opacity.value = withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) }),
        );
        translateY.value = withTiming(-6, { duration: 280 });
        setTimeout(() => setVisible(false), 300);
      }, SHOW_MS);
    })();

    return () => {
      cancelled = true;
      if (hideTimer != null) clearTimeout(hideTimer);
    };
  }, [opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top: insets.top + 10 }]}>
      <Animated.View style={[styles.pill, animStyle]}>
        <Text style={styles.text}>업데이트 완료</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(44, 26, 14, 0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.ochre,
  },
  text: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
