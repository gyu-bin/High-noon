import { useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';
import type { DuelPhase } from '@/hooks/useDuelEngine';

type Props = {
  phase: DuelPhase;
  signalText: string;
  onBangPhaseEnter?: () => void;
  /** 반쪽 화면 등에 넣을 때 레이아웃 조절 */
  wrapStyle?: StyleProp<ViewStyle>;
};

export function NpcSignalStage({
  phase,
  signalText,
  onBangPhaseEnter,
  wrapStyle,
}: Props) {
  const readyOp = useSharedValue(0);
  const steadyPulse = useSharedValue(1);

  useEffect(() => {
    if (phase === '준비') {
      readyOp.value = 0;
      readyOp.value = withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      });
    }
  }, [phase, readyOp]);

  useEffect(() => {
    if (phase === '집중') {
      steadyPulse.value = 1;
      steadyPulse.value = withRepeat(
        withSequence(
          RM_GAME,
          withTiming(1.06, {
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: RM_GAME,
          }),
          withTiming(1, {
            duration: 700,
            easing: Easing.inOut(Easing.sin),
            reduceMotion: RM_GAME,
          }),
        ),
        -1,
        true,
        undefined,
        RM_GAME,
      );
    } else {
      steadyPulse.value = withTiming(1, { duration: 200, reduceMotion: RM_GAME });
    }
  }, [phase, steadyPulse]);

  useEffect(() => {
    if (phase === '뱅') {
      onBangPhaseEnter?.();
    }
  }, [phase, onBangPhaseEnter]);

  const readyStyle = useAnimatedStyle(() => ({
    opacity: phase === '준비' ? readyOp.value : phase === '집중' || phase === '뱅' ? 1 : 0.35,
  }));

  const steadyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: phase === '집중' ? steadyPulse.value : 1 }],
  }));

  const showReady = phase === '준비' && signalText === 'Ready';
  const showSteady = phase === '집중' && signalText === 'Steady';
  const showBang = phase === '뱅' && signalText === 'Bang!';

  return (
    <View style={[styles.wrap, wrapStyle]} pointerEvents="none">
      {showReady ? (
        <Animated.Text style={[styles.signalText, readyStyle]}>READY</Animated.Text>
      ) : null}
      {showSteady ? (
        <Animated.Text style={[styles.signalText, steadyStyle]}>STEADY</Animated.Text>
      ) : null}
      {showBang ? <Text style={styles.bangText}>BANG!</Text> : null}
      {phase === '대기' ? (
        <Text style={styles.waitText}>라운드 시작…</Text>
      ) : null}
      {phase === '결과' && !showBang ? (
        <Text style={styles.waitText}> </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  signalText: {
    fontSize: 52,
    fontWeight: '900',
    color: colors.ochre,
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.92)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    backgroundColor: 'transparent',
  },
  bangText: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.rustRed,
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.92)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    backgroundColor: 'transparent',
  },
  waitText: {
    fontSize: 18,
    color: colors.sand,
    opacity: 0.7,
    backgroundColor: 'transparent',
  },
});
