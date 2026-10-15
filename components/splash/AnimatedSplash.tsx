import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SplashBrand, SplashScene } from './SplashScene';

export function AnimatedSplash({ onComplete }: { onComplete: () => void }) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const logo = useSharedValue(0);
  useEffect(() => {
    logo.value = withTiming(1, { duration: reduceMotion ? 1 : 450 });
    opacity.value = withDelay(reduceMotion ? 0 : 950, withTiming(0, { duration: reduceMotion ? 250 : 300, easing: Easing.inOut(Easing.quad) }, (finished) => {
      if (finished) runOnJS(onComplete)();
    }));
    return () => { cancelAnimation(opacity); cancelAnimation(logo); };
  }, [logo, onComplete, opacity, reduceMotion]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const brandFade = useAnimatedStyle(() => ({ opacity: logo.value }));
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { zIndex: 100, backgroundColor: '#1A0C06' }, fade]}>
    <SplashScene><Animated.View style={[StyleSheet.absoluteFill, brandFade]}><SplashBrand /></Animated.View></SplashScene>
  </Animated.View>;
}
