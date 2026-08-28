import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DUEL_VISUAL_THEME, MINIMAL_DUEL } from '@/constants/duelTheme';
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
  const bangScale = useSharedValue(1);
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
    if (phase === '뱅') {
      bangScale.value = withSequence(
        withTiming(1.1, {
          duration: 90,
          easing: Easing.out(Easing.back(1.4)),
          reduceMotion: RM_GAME,
        }),
        withTiming(1, {
          duration: 260,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );
    } else {
      cancelAnimation(bangScale);
      bangScale.value = 1;
    }
  }, [phase, bangScale]);

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
    if (phase === '페이크') {
      cancelAnimation(flashOpacity);
      flashOpacity.value = withSequence(
        withTiming(0.14, {
          duration: 70,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
        withTiming(0, {
          duration: 200,
          easing: Easing.inOut(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );
    } else if (phase === '뱅') {
      cancelAnimation(flashOpacity);
      flashOpacity.value = 0;
      fireComplete();
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

  const bangPopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bangScale.value }],
  }));

  const echoStyle = useAnimatedStyle(() => ({
    opacity: echoOpacity.value,
    transform: [{ translateX: 6 }, { scale: 1.04 }],
  }));

  const label = signalLabel(phase);
  const showLabel = label.length > 0;
  const inkTheme = DUEL_VISUAL_THEME === 'minimal';

  // 색 결정을 kind로 먼저 정리 — 테마별 팔레트로 매핑
  const textKind = (() => {
    if (blindBangText && (phase === '뱅' || phase === '페이크')) return 'bangBlind';
    if (invertSignalColors) {
      if (phase === '준비') return 'steady';
      return 'ready'; // 집중/페이크/뱅
    }
    if (phase === '뱅') return 'bang';
    if (phase === '집중' || phase === '페이크') return 'steady';
    return 'ready';
  })();

  const textStyle = (() => {
    if (inkTheme) {
      switch (textKind) {
        case 'bang':
          return styles.inkBang;
        case 'bangBlind':
          return styles.inkBangBlind;
        case 'steady':
          return styles.inkSteady;
        default:
          return styles.inkReady;
      }
    }
    switch (textKind) {
      case 'bang':
        return styles.textBang;
      case 'bangBlind':
        return styles.textBangBlind;
      case 'steady':
        return styles.textSteady;
      default:
        return styles.textReady;
    }
  })();

  // 잉크 테마 — 밝은 배경이라 텍스트 섀도 불필요
  const minimalTextShadow =
    minimal && !inkTheme
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
            ) : phase === '뱅' ? (
              <Animated.View style={bangPopStyle}>
                <Text
                  style={[
                    textStyle,
                    bangSize,
                    minimalTextShadow,
                  ]}
                >
                  {label}
                </Text>
              </Animated.View>
            ) : (
              <Text
                style={[
                  textStyle,
                  readySize,
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
    backgroundColor: 'rgba(200, 72, 48, 0.55)',
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
  /* 미니멀(잉크) 테마 — 웜 화이트 배경 위 */
  inkReady: {
    color: MINIMAL_DUEL.inkSoft,
    fontWeight: '800',
  },
  inkSteady: {
    color: MINIMAL_DUEL.ink,
    fontWeight: '900',
  },
  inkBang: {
    color: MINIMAL_DUEL.bang,
    fontWeight: '900',
  },
  inkBangBlind: {
    color: MINIMAL_DUEL.bg,
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
