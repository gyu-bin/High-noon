import { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';
import type { DuelPhase } from '@/hooks/useDuelEngine';

export type DuelSignalBoardPhase = 'idle' | '준비' | '집중' | '페이크' | '뱅' | '결과';

export type DuelSignalBoardProps = {
  phase: DuelSignalBoardPhase;
  onFlashComplete?: () => void;
  /** #15 등 — 뱅 타이포를 배경색에 가깝게 */
  blindBangText?: boolean;
  /** #19 등 — 준비↔집중·뱅 색 교환 느낌 */
  invertSignalColors?: boolean;
};

/** useDuelEngine `대기` → 보드 `idle` */
export function enginePhaseToSignalBoardPhase(phase: DuelPhase): DuelSignalBoardPhase {
  if (phase === '대기') return 'idle';
  return phase as DuelSignalBoardPhase;
}

const BG = '#2C1A0E';
const BORDER = '#C8860A';
const CREAM = '#F5E6C8';
const OCHRE = '#C8860A';
const BANG_RED = '#8B1A1A';

function signalLabel(phase: DuelSignalBoardPhase): string {
  switch (phase) {
    case '준비':
      return '준비';
    case '집중':
      return '집중';
    case '페이크':
      return '뱅!';
    case '뱅':
      return '뱅!';
    default:
      return '';
  }
}

/**
 * NPC 결투 중앙 신호판 — 나무 질감 프레임 + 단계별 타이포/애니메이션 + 뱅 시 전면 플래시
 */
export function DuelSignalBoard({
  phase,
  onFlashComplete,
  blindBangText = false,
  invertSignalColors = false,
}: DuelSignalBoardProps) {
  const flashOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);

  const fireComplete = useCallback(() => {
    onFlashComplete?.();
  }, [onFlashComplete]);

  useEffect(() => {
    if (phase === '집중' || phase === '페이크') {
      pulse.value = 1;
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, {
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
        false,
        undefined,
        RM_GAME,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
  }, [phase, pulse]);

  useEffect(() => {
    if (phase === '뱅' || phase === '페이크') {
      flashOpacity.value = 0.4;
      flashOpacity.value = withTiming(
        0,
        { duration: 300, reduceMotion: RM_GAME },
        (finished) => {
          if (finished) {
            runOnJS(fireComplete)();
          }
        },
      );
    } else {
      cancelAnimation(flashOpacity);
      flashOpacity.value = 0;
    }
  }, [phase, flashOpacity, fireComplete]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const label = signalLabel(phase);
  const showLabel = label.length > 0;

  const textStyle = (() => {
    const bangStyle =
      blindBangText && (phase === '뱅' || phase === '페이크')
        ? styles.textBangBlind
        : styles.textBang;
    if (invertSignalColors) {
      if (phase === '준비') return styles.textSteady;
      if (phase === '집중') return styles.textReady;
      if (phase === '뱅' || phase === '페이크') return styles.textReady;
    }
    if (phase === '뱅' || phase === '페이크') return bangStyle;
    if (phase === '집중') return styles.textSteady;
    return styles.textReady;
  })();

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, flashStyle]}
      />
      <View style={styles.woodPanel}>
        <Text style={styles.duelLabel}>DUEL ★ ★</Text>
        {showLabel ? (
          <Animated.View
            key={phase}
            entering={FadeIn.duration(200)}
            style={styles.signalBlock}
          >
            {phase === '집중' || phase === '페이크' ? (
              <Animated.View style={[pulseStyle, styles.pulseWrap]}>
                <Text
                  style={[
                    textStyle,
                    phase === '페이크' ? styles.textBangSize : styles.textSteadySize,
                  ]}
                >
                  {label}
                </Text>
              </Animated.View>
            ) : (
              <Text style={[textStyle, phase === '뱅' ? styles.textBangSize : styles.textReadySize]}>
                {label}
              </Text>
            )}
          </Animated.View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BANG_RED,
    zIndex: 10,
  },
  woodPanel: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: BORDER,
    backgroundColor: BG,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1,
  },
  duelLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 3,
    color: CREAM,
  },
  signalBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  pulseWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textReady: {
    color: CREAM,
    fontWeight: '800',
  },
  textReadySize: {
    fontSize: 28,
    letterSpacing: 2,
  },
  textSteady: {
    color: OCHRE,
    fontWeight: '900',
  },
  textSteadySize: {
    fontSize: 34,
    letterSpacing: 2,
  },
  textBang: {
    color: BANG_RED,
    fontWeight: '900',
  },
  textBangBlind: {
    color: BG,
    fontWeight: '900',
  },
  textBangSize: {
    fontSize: 44,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  placeholder: {
    minHeight: 52,
  },
});
