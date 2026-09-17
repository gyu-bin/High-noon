import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  cancelAnimation,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';

type Props = {
  width: number;
  height: number;
  active: boolean;
  /** PNG 조준 방향(→). NPC는 scaleX 반전으로 ← */
  flipHorizontal?: boolean;
  /** Horizontal muzzle point in the unflipped source image (0–1). */
  anchorX?: number;
};

/** shoot 포즈 보조 — 스프라이트 머즐이 약할 때 발사 느낌 */
export const MuzzleFlashOverlay = memo(function MuzzleFlashOverlay({
  width,
  height,
  active,
  flipHorizontal = false,
  anchorX,
}: Props) {
  const flash = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      flash.value = withTiming(0, { duration: 100, reduceMotion: RM_GAME });
      return;
    }
    flash.value = withSequence(
      withTiming(1, { duration: 20, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
      withTiming(0, { duration: 180, easing: Easing.inOut(Easing.quad), reduceMotion: RM_GAME }),
    );
    return () => cancelAnimation(flash);
  }, [active, flash]);

  const style = useAnimatedStyle(() => ({
    opacity: flash.value,
    transform: [{ scale: 0.85 + flash.value * 0.35 }],
  }));

  const barrelX = width * (anchorX ?? (flipHorizontal ? 0.22 : 0.72));
  const barrelY = height * 0.38;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.root,
        {
          left: barrelX - width * 0.23,
          top: barrelY - height * 0.15,
          width: width * 0.46,
          height: height * 0.3,
        },
        style,
      ]}
    >
      <Image source={require('@/assets/images/vfx/production/vfx_muzzle_flash.png')}
        contentFit="contain" transition={0} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    position: 'absolute',
    width: '38%',
    height: '42%',
    borderRadius: 999,
  },
  burst: {
    position: 'absolute',
    width: '72%',
    height: '55%',
    borderRadius: 999,
    opacity: 0.85,
  },
  burstOuter: {
    position: 'absolute',
    width: '100%',
    height: '78%',
    borderRadius: 999,
    opacity: 0.45,
  },
});
