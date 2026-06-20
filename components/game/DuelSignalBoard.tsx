import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DUEL_SIGNAL_SPEC } from '@/constants/npcVisual';
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
  /** #20 에코팬텀 — READY 잔상 (TTS 이중 재생 대신) */
  echoReady?: boolean;
  /** panel: 나무 박스 / minimal: 배경 위 플로팅 */
  variant?: 'panel' | 'minimal';
};

/** useDuelEngine `대기` → 보드 `idle` */
export function enginePhaseToSignalBoardPhase(phase: DuelPhase): DuelSignalBoardPhase {
  if (phase === '대기') return 'idle';
  return phase as DuelSignalBoardPhase;
}

const BG = '#2C1A0E';
const BORDER = '#C8860A';
const CREAM = '#F5E6C8';
const BANG_RED = DUEL_SIGNAL_SPEC.bang.color;

function signalLabel(phase: DuelSignalBoardPhase): string {
  switch (phase) {
    case '준비':
      return DUEL_SIGNAL_SPEC.ready.text;
    case '집중':
    case '페이크':
      return DUEL_SIGNAL_SPEC.steady.text;
    case '뱅':
      return DUEL_SIGNAL_SPEC.bang.text;
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
  echoReady = false,
  variant = 'panel',
}: DuelSignalBoardProps) {
  const minimal = variant === 'minimal';
  const flashOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);
  const echoOpacity = useSharedValue(0);
  const prevPhaseRef = useRef(phase);

  const fireComplete = useCallback(() => {
    onFlashComplete?.();
  }, [onFlashComplete]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    if (phase === '집중' && prev === '준비') {
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
    } else if (phase !== '집중' && phase !== '페이크') {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
  }, [phase, pulse]);

  useEffect(() => {
    if (!echoReady || phase !== '준비') {
      cancelAnimation(echoOpacity);
      echoOpacity.value = 0;
      return;
    }
    echoOpacity.value = 0;
    echoOpacity.value = withSequence(
      withTiming(0, { duration: 420, reduceMotion: RM_GAME }),
      withTiming(0.42, { duration: 180, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
      withTiming(0, { duration: 520, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
    );
  }, [echoReady, phase, echoOpacity]);

  useEffect(() => {
    if (phase === '뱅' || phase === '페이크') {
      cancelAnimation(flashOpacity);
      const peak = phase === '페이크' ? (minimal ? 0.22 : 0.3) : minimal ? 0.36 : 0.48;
      const dur = phase === '페이크' ? (minimal ? 110 : 140) : minimal ? 160 : 220;
      flashOpacity.value = peak;
      flashOpacity.value = withTiming(
        0,
        { duration: dur, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME },
        (finished) => {
          if (finished && phase === '뱅') {
            runOnJS(fireComplete)();
          }
        },
      );
    } else {
      cancelAnimation(flashOpacity);
      flashOpacity.value = 0;
    }
  }, [phase, flashOpacity, fireComplete, minimal]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const echoStyle = useAnimatedStyle(() => ({
    opacity: echoOpacity.value,
    transform: [{ translateX: 6 }, { scale: 1.04 }],
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
      if (phase === '집중' || phase === '페이크') return styles.textReady;
      if (phase === '뱅') return styles.textReady;
    }
    if (phase === '뱅') return bangStyle;
    if (phase === '집중' || phase === '페이크') return styles.textSteady;
    return styles.textReady;
  })();

  const minimalTextShadow = minimal
    ? {
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 3 } as const,
        textShadowRadius: 10,
      }
    : null;
  const readySize = minimal ? { fontSize: 34, letterSpacing: 3 } : styles.textReadySize;
  const steadySize = minimal ? { fontSize: 38, letterSpacing: 3 } : styles.textSteadySize;
  const bangSize = minimal
    ? { fontSize: 52, letterSpacing: 4, ...minimalTextShadow }
    : styles.textBangSize;

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, flashStyle]}
      />
      <View style={[styles.woodPanel, minimal && styles.woodPanelMinimal]}>
        {!minimal ? <Text style={styles.duelLabel}>DUEL ★ ★</Text> : null}
        {showLabel ? (
          <Animated.View style={styles.signalBlock}>
            {phase === '집중' || phase === '페이크' ? (
              <Animated.View style={[pulseStyle, styles.pulseWrap]}>
                <Text style={[textStyle, steadySize, minimalTextShadow]}>{label}</Text>
              </Animated.View>
            ) : (
              <Text
                style={[
                  textStyle,
                  phase === '뱅' ? bangSize : readySize,
                  minimalTextShadow,
                ]}
              >
                {label}
              </Text>
            )}
            {echoReady && phase === '준비' ? (
              <Animated.Text
                pointerEvents="none"
                style={[
                  textStyle,
                  readySize,
                  minimalTextShadow,
                  styles.echoReady,
                  echoStyle,
                ]}
              >
                {label}
              </Animated.Text>
            ) : null}
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
  woodPanelMinimal: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 0,
    paddingHorizontal: 0,
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
  echoReady: {
    position: 'absolute',
  },
  textReady: {
    color: DUEL_SIGNAL_SPEC.ready.color,
    fontWeight: '800',
  },
  textReadySize: {
    fontSize: DUEL_SIGNAL_SPEC.ready.fontSize,
    letterSpacing: 2,
  },
  textSteady: {
    color: DUEL_SIGNAL_SPEC.steady.color,
    fontWeight: '900',
  },
  textSteadySize: {
    fontSize: DUEL_SIGNAL_SPEC.steady.fontSize,
    letterSpacing: 2,
  },
  textBang: {
    color: DUEL_SIGNAL_SPEC.bang.color,
    fontWeight: '900',
  },
  textBangBlind: {
    color: BG,
    fontWeight: '900',
  },
  textBangSize: {
    fontSize: DUEL_SIGNAL_SPEC.bang.fontSize,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  placeholder: {
    minHeight: 52,
  },
});
