import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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

import {
  getVictoryEffectSpec,
  type VictoryAnchor,
  type VictoryEffectSpec,
} from './victoryEffectSpecs';

type Props = {
  mode: 'npc' | 'player';
  id: number;
  width: number;
  height: number;
  active: boolean;
};

function anchorPx(anchor: VictoryAnchor, width: number, height: number) {
  return { left: width * anchor.x, top: height * anchor.y };
}

const SmokePuff = memo(function SmokePuff({
  left,
  top,
  size,
  color,
  delayMs,
  driftX,
  driftY,
  active,
}: {
  left: number;
  top: number;
  size: number;
  color: string;
  delayMs: number;
  driftX: number;
  driftY: number;
  active: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(0, { duration: 0, reduceMotion: RM_GAME }),
          withTiming(1, {
            duration: 1400,
            easing: Easing.out(Easing.cubic),
            reduceMotion: RM_GAME,
          }),
        ),
        -1,
        false,
      ),
    );
  }, [active, delayMs, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.85,
    transform: [
      { translateX: driftX * progress.value },
      { translateY: driftY * progress.value },
      { scale: 0.45 + progress.value * 1.1 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.puff,
        {
          left: left - size / 2,
          top: top - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
});

const MouthSmokeRing = memo(function MouthSmokeRing({
  left,
  top,
  color,
  active,
}: {
  left: number;
  top: number;
  color: string;
  active: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0, reduceMotion: RM_GAME }),
        withTiming(1, {
          duration: 1800,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
        withTiming(0, { duration: 400, reduceMotion: RM_GAME }),
      ),
      -1,
      false,
    );
  }, [active, progress]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.7,
    transform: [
      { translateX: 18 * progress.value },
      { translateY: -6 * progress.value },
      { scaleX: 0.7 + progress.value * 1.4 },
      { scaleY: 0.45 + progress.value * 0.9 },
    ],
  }));

  const wispStyle = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.5,
    transform: [
      { translateX: 24 * progress.value },
      { translateY: -14 * progress.value },
      { scale: 0.5 + progress.value * 0.9 },
    ],
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.mouthRing,
          {
            left: left - 14,
            top: top - 8,
            borderColor: color,
          },
          ringStyle,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.mouthWisp,
          {
            left: left + 4,
            top: top - 4,
            backgroundColor: color,
          },
          wispStyle,
        ]}
      />
    </>
  );
});

function GunSmokeLayer({
  spec,
  width,
  height,
  active,
}: {
  spec: VictoryEffectSpec;
  width: number;
  height: number;
  active: boolean;
}) {
  const { left, top } = anchorPx(spec.barrel, width, height);
  const base = Math.min(width, height) * 0.11;

  return (
    <>
      <SmokePuff
        active={active}
        left={left}
        top={top}
        size={base}
        color={spec.gunSmokeColor}
        delayMs={0}
        driftX={-8}
        driftY={-28}
      />
      <SmokePuff
        active={active}
        left={left + base * 0.15}
        top={top - base * 0.1}
        size={base * 0.85}
        color={spec.gunSmokeAccent}
        delayMs={320}
        driftX={-12}
        driftY={-34}
      />
      <SmokePuff
        active={active}
        left={left - base * 0.1}
        top={top + base * 0.05}
        size={base * 0.7}
        color={spec.gunSmokeColor}
        delayMs={640}
        driftX={-5}
        driftY={-24}
      />
    </>
  );
}

function DustWispsLayer({
  spec,
  width,
  height,
  active,
}: {
  spec: VictoryEffectSpec;
  width: number;
  height: number;
  active: boolean;
}) {
  const { left, top } = anchorPx(spec.barrel, width, height);
  const dust = spec.dustColor ?? spec.gunSmokeAccent;
  const base = Math.min(width, height) * 0.07;

  return (
    <>
      <SmokePuff
        active={active}
        left={left + 6}
        top={top + 10}
        size={base}
        color={dust}
        delayMs={180}
        driftX={14}
        driftY={-18}
      />
      <SmokePuff
        active={active}
        left={left - 4}
        top={top + 14}
        size={base * 0.8}
        color={dust}
        delayMs={520}
        driftX={20}
        driftY={-12}
      />
      <SmokePuff
        active={active}
        left={left + 12}
        top={top + 6}
        size={base * 0.65}
        color={spec.gunSmokeAccent}
        delayMs={860}
        driftX={26}
        driftY={-8}
      />
    </>
  );
}

export const VictoryEffectsOverlay = memo(function VictoryEffectsOverlay({
  mode,
  id,
  width,
  height,
  active,
}: Props) {
  const spec = getVictoryEffectSpec(mode, id);
  if (!spec || !active) return null;

  const mouth = spec.mouth ? anchorPx(spec.mouth, width, height) : null;

  return (
    <View pointerEvents="none" style={[styles.root, { width, height }]}>
      {spec.kinds.includes('gunSmoke') ? (
        <GunSmokeLayer spec={spec} width={width} height={height} active={active} />
      ) : null}
      {spec.kinds.includes('dustWisps') ? (
        <DustWispsLayer spec={spec} width={width} height={height} active={active} />
      ) : null}
      {spec.kinds.includes('mouthSmoke') && mouth && spec.mouthSmokeColor ? (
        <MouthSmokeRing
          active={active}
          left={mouth.left}
          top={mouth.top}
          color={spec.mouthSmokeColor}
        />
      ) : null}
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
  mouthRing: {
    position: 'absolute',
    width: 28,
    height: 16,
    borderRadius: 999,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  mouthWisp: {
    position: 'absolute',
    width: 16,
    height: 10,
    borderRadius: 999,
  },
});
