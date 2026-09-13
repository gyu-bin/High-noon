import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';

import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ShimmerTitle } from '@/components/title/ShimmerTitle';
import { FONT_RYE } from '@/constants/fonts';

type Props = {
  /** 스플래시가 사라진 뒤에만 아래의 실제 타이틀 화면을 조작할 수 있다. */
  onComplete: () => void;
};

const SPLASH_IMAGE = require('@/assets/branding/splash-high-noon.png');

/**
 * Native splash와 같은 artwork를 첫 프레임에 그린 뒤, 타이틀 화면을 서서히 드러낸다.
 * 타이머가 아니라 Reanimated completion callback을 사용해 언마운트 뒤 작업이 남지 않는다.
 */
export function AnimatedSplash({ onComplete }: Props) {
  const reduceMotion = useReducedMotion();
  const completed = useRef(false);

  // Native splash와 pixel position을 맞추기 위해 첫 프레임은 1이다.
  const backgroundScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.55);
  const silhouetteVeilOpacity = useSharedValue(0.15);
  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(10);
  const logoScale = useSharedValue(0.98);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    const finish = () => {
      if (completed.current) return;
      completed.current = true;
      onComplete();
    };

    if (reduceMotion) {
      // 움직임 감소 설정에서는 첫 장면을 잠시 보여 준 뒤 부드러운 fade만 한다.
      screenOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) runOnJS(finish)();
      });
    } else {
      const cinematicEase = Easing.out(Easing.cubic);

      backgroundScale.value = withDelay(
        150,
        withSequence(
          withTiming(1.035, { duration: 90, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 360, easing: cinematicEase }),
        ),
      );
      glowOpacity.value = withDelay(150, withTiming(1, { duration: 450, easing: cinematicEase }));
      silhouetteVeilOpacity.value = withDelay(
        250,
        withTiming(0, { duration: 450, easing: cinematicEase }),
      );
      logoOpacity.value = withDelay(550, withTiming(1, { duration: 400, easing: cinematicEase }));
      logoTranslateY.value = withDelay(550, withTiming(0, { duration: 400, easing: cinematicEase }));
      logoScale.value = withDelay(550, withTiming(1, { duration: 400, easing: cinematicEase }));
      screenOpacity.value = withDelay(
        950,
        withTiming(0, { duration: 300, easing: Easing.inOut(Easing.quad) }, (finished) => {
          if (finished) runOnJS(finish)();
        }),
      );
    }

    return () => {
      cancelAnimation(backgroundScale);
      cancelAnimation(glowOpacity);
      cancelAnimation(silhouetteVeilOpacity);
      cancelAnimation(logoOpacity);
      cancelAnimation(logoTranslateY);
      cancelAnimation(logoScale);
      cancelAnimation(screenOpacity);
    };
  }, [
    backgroundScale,
    glowOpacity,
    logoOpacity,
    logoScale,
    logoTranslateY,
    onComplete,
    reduceMotion,
    screenOpacity,
    silhouetteVeilOpacity,
  ]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: screenOpacity.value }));
  const backgroundStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backgroundScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const silhouetteVeilStyle = useAnimatedStyle(() => ({ opacity: silhouetteVeilOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }, { scale: logoScale.value }],
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.root, screenStyle]}
    >
      <Animated.Image source={SPLASH_IMAGE} resizeMode="cover" style={[styles.image, backgroundStyle]} />
      <Animated.View style={[styles.sunGlow, glowStyle]} />
      <AnimatedLinearGradient
        colors={['transparent', 'rgba(12, 5, 2, 0.42)', 'rgba(12, 5, 2, 0.04)', 'transparent']}
        locations={[0, 0.52, 0.82, 1]}
        style={[styles.silhouetteVeil, silhouetteVeilStyle]}
      />
      <Animated.View style={[styles.logo, logoStyle]}>
        <ShimmerTitle label="HIGH NOON" fontFamily={FONT_RYE} fontSize={48} />
      </Animated.View>
    </Animated.View>
  );
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A0C06',
    overflow: 'hidden',
    zIndex: 100,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  sunGlow: {
    position: 'absolute',
    width: '64%',
    aspectRatio: 1,
    top: '16%',
    alignSelf: 'center',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 184, 74, 0.18)',
  },
  silhouetteVeil: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '35%',
    bottom: '8%',
    borderRadius: 180,
  },
  logo: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '57%',
  },
});
