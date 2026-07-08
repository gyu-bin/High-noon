import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';

const DUST_MAIN = 'rgba(206, 172, 122, 0.9)';
const DUST_SOFT = 'rgba(178, 142, 96, 0.8)';
const DUST_HAZE = 'rgba(228, 202, 158, 0.65)';

type PuffSpec = {
  xFrac: number;
  yFrac: number;
  sizeFrac: number;
  driftX: number;
  driftY: number;
  delayMs: number;
  color: string;
};

/** 착지 지점에서 양옆으로 퍼지는 원샷 흙먼지 */
const PUFFS: PuffSpec[] = [
  { xFrac: 0.38, yFrac: 0.88, sizeFrac: 0.16, driftX: -26, driftY: -10, delayMs: 0, color: DUST_MAIN },
  { xFrac: 0.62, yFrac: 0.88, sizeFrac: 0.15, driftX: 26, driftY: -12, delayMs: 30, color: DUST_MAIN },
  { xFrac: 0.5, yFrac: 0.92, sizeFrac: 0.2, driftX: 0, driftY: -6, delayMs: 0, color: DUST_HAZE },
  { xFrac: 0.3, yFrac: 0.92, sizeFrac: 0.11, driftX: -38, driftY: -4, delayMs: 70, color: DUST_SOFT },
  { xFrac: 0.7, yFrac: 0.92, sizeFrac: 0.1, driftX: 38, driftY: -5, delayMs: 90, color: DUST_SOFT },
];

const ImpactPuff = memo(function ImpactPuff({
  spec,
  width,
  height,
  delayMs,
  active,
}: {
  spec: PuffSpec;
  width: number;
  height: number;
  delayMs: number;
  active: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      delayMs + spec.delayMs,
      withTiming(1, {
        duration: 620,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      }),
    );
  }, [active, delayMs, progress, spec.delayMs]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value <= 0 ? 0 : (1 - progress.value) * 0.9,
    transform: [
      { translateX: spec.driftX * progress.value },
      { translateY: spec.driftY * progress.value },
      { scale: 0.35 + progress.value * 1.25 },
    ],
  }));

  const size = Math.round(Math.min(width, height) * spec.sizeFrac);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.puff,
        {
          left: width * spec.xFrac - size / 2,
          top: height * spec.yFrac - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  );
});

type Props = {
  width: number;
  height: number;
  active: boolean;
  /** defeat 시작 → 바닥 착지까지의 지연 */
  impactDelayMs: number;
  /** 캐릭터가 낙하한 만큼 먼지 기준선을 내림 */
  groundOffsetY?: number;
};

/** 쓰러진 캐릭터가 바닥에 닿는 순간 한 번 터지는 흙먼지 */
export const DefeatDustOverlay = memo(function DefeatDustOverlay({
  width,
  height,
  active,
  impactDelayMs,
  groundOffsetY = 0,
}: Props) {
  if (!active) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { width, height, top: groundOffsetY }]}
    >
      {PUFFS.map((spec, i) => (
        <ImpactPuff
          key={i}
          spec={spec}
          width={width}
          height={height}
          delayMs={impactDelayMs}
          active={active}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
  puff: {
    position: 'absolute',
  },
});
