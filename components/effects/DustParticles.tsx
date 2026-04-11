import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';

type ParticleSpec = { x: number; y: number; size: number; delay: number; duration: number };

function buildParticles(width: number, height: number, count: number): ParticleSpec[] {
  const out: ParticleSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2.5,
      delay: Math.floor(Math.random() * 4000),
      duration: 6000 + Math.random() * 8000,
    });
  }
  return out;
}

function DustDot({ spec }: { spec: ParticleSpec }) {
  const drift = useSharedValue(0);
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    drift.value = withDelay(
      spec.delay,
      withRepeat(
        withSequence(
          RM_GAME,
          withTiming(1, {
            duration: spec.duration,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: RM_GAME,
          }),
          withTiming(0, {
            duration: spec.duration,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: RM_GAME,
          }),
        ),
        -1,
        false,
        undefined,
        RM_GAME,
      ),
      RM_GAME,
    );
    opacity.value = withDelay(
      spec.delay,
      withRepeat(
        withSequence(
          RM_GAME,
          withTiming(0.45, {
            duration: spec.duration * 0.5,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: RM_GAME,
          }),
          withTiming(0.08, {
            duration: spec.duration * 0.5,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: RM_GAME,
          }),
        ),
        -1,
        false,
        undefined,
        RM_GAME,
      ),
      RM_GAME,
    );
  }, [spec.delay, spec.duration, drift, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: drift.value * -36 }, { translateX: drift.value * 8 }],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        style,
        {
          left: spec.x,
          top: spec.y,
          width: spec.size,
          height: spec.size,
          borderRadius: spec.size / 2,
        },
      ]}
    />
  );
}

export function DustParticles() {
  const { stageWidth, stageHeight } = usePhoneStageMetrics();
  const specs = useMemo(
    () => buildParticles(stageWidth, stageHeight, 48),
    [stageWidth, stageHeight],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {specs.map((s, i) => (
        <DustDot key={i} spec={s} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    backgroundColor: colors.sand,
  },
});
