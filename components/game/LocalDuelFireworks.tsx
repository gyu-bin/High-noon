import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';

type Origin = 'top' | 'bottom';

type SparkSpec = {
  angle: number;
  dist: number;
  size: number;
  hue: string;
};

function buildSparks(count: number, seed: number): SparkSpec[] {
  let r = seed % 9973 || 1;
  const rnd = () => {
    r = (r * 48271) % 2147483647;
    return (r & 0xffff) / 0xffff;
  };
  const hues = ['#FFFFFF', '#FFEB3B', colors.ochre, '#FFD54F', '#FFF8E1', colors.sand];
  const out: SparkSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push({
      angle: (i / count) * Math.PI * 2 + (rnd() - 0.5) * 0.7,
      dist: 90 + rnd() * 160,
      size: 9 + rnd() * 14,
      hue: hues[i % hues.length]!,
    });
  }
  return out;
}

function Spark({
  angle,
  dist,
  size,
  hue,
  cx,
  cy,
  burstId,
}: {
  angle: number;
  dist: number;
  size: number;
  hue: string;
  cx: number;
  cy: number;
  burstId: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(t);
    t.value = 0;
    t.value = withTiming(1, {
      duration: 820,
      easing: Easing.out(Easing.cubic),
      reduceMotion: RM_GAME,
    });
    return () => cancelAnimation(t);
  }, [burstId, t]);

  const animStyle = useAnimatedStyle(() => {
    'worklet';
    const p = t.value;
    const gx = Math.cos(angle) * dist * p;
    const gy = Math.sin(angle) * dist * p + 42 * p * p;
    return {
      opacity: 0.2 + (1 - p) * 0.85,
      transform: [{ translateX: gx }, { translateY: gy }, { scale: 0.55 + p * 0.75 }],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.spark,
        {
          left: cx - size / 2,
          top: cy - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: hue,
        },
        animStyle,
      ]}
    />
  );
}

type Props = {
  origin: 'top' | 'bottom';
  width: number;
  height: number;
  halfH: number;
  burstId: number;
};

/**
 * 2인 대결 승리 연출 — 모달 위 레이어에서 보이도록 큰 스파크
 */
export function LocalDuelFireworks({ origin, width, height, halfH, burstId }: Props) {
  const specs = useMemo(() => buildSparks(40, burstId * 7919 + 104729), [burstId]);

  const cx = width / 2;
  const cy = origin === 'top' ? halfH * 0.45 : height - halfH * 0.48;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.layer]}>
      {specs.map((s, i) => (
        <Spark
          key={`${burstId}-${i}`}
          angle={s.angle}
          dist={s.dist}
          size={s.size}
          hue={s.hue}
          cx={cx}
          cy={cy}
          burstId={burstId}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 20,
    elevation: 20,
  },
  spark: {
    position: 'absolute',
    shadowColor: '#FFF',
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
