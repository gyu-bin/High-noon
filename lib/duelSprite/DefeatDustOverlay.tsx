import { Image } from 'expo-image';
import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';
import { V3_DUEL_VFX } from '@/constants/v3DuelAssets';

/** vfx_fall_dust.png 안에서 먼지 덩어리 바닥선이 차지하는 높이 비율 (256px 중 약 195px) */
const DUST_BASE_FRAC = 0.76;

type PuffSpec = {
  xFrac: number;
  /** 스프라이트 한 변 길이 (스프라이트 폭 대비) */
  sizeFrac: number;
  driftX: number;
  driftY: number;
  delayMs: number;
  mirror: boolean;
  peakOpacity: number;
};

/** 착지 지점에서 양옆으로 퍼지는 원샷 흙먼지 — NPC 와 같은 픽셀 먼지 원화 */
const PUFFS: PuffSpec[] = [
  { xFrac: 0.5, sizeFrac: 0.78, driftX: 0, driftY: -4, delayMs: 0, mirror: false, peakOpacity: 0.95 },
  { xFrac: 0.28, sizeFrac: 0.42, driftX: -24, driftY: -6, delayMs: 50, mirror: true, peakOpacity: 0.8 },
  { xFrac: 0.72, sizeFrac: 0.42, driftX: 24, driftY: -6, delayMs: 70, mirror: false, peakOpacity: 0.8 },
];

/** 먼지 바닥선 (스프라이트 높이 대비) */
const GROUND_FRAC = 0.92;

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
        duration: 760,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      }),
    );
    return () => cancelAnimation(progress);
  }, [active, delayMs, progress, spec.delayMs]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value <= 0 ? 0 : (1 - progress.value) * spec.peakOpacity,
    transform: [
      { translateX: spec.driftX * progress.value },
      { translateY: spec.driftY * progress.value },
      { scaleX: (spec.mirror ? -1 : 1) * (0.6 + progress.value * 0.5) },
      { scaleY: 0.6 + progress.value * 0.5 },
    ],
  }));

  const size = Math.round(width * spec.sizeFrac);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.puff,
        {
          left: width * spec.xFrac - size / 2,
          // 원화 속 먼지 바닥이 지면선에 닿도록 배치하고, 바닥을 기준으로 부풀린다.
          top: height * GROUND_FRAC - size * DUST_BASE_FRAC,
          width: size,
          height: size,
          transformOrigin: `50% ${DUST_BASE_FRAC * 100}%`,
        },
        style,
      ]}
    >
      <Image source={V3_DUEL_VFX.fallDust} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} cachePolicy="memory-disk" />
    </Animated.View>
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
