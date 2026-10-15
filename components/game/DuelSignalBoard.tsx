import { useCallback, useEffect, useRef, useState } from 'react';
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
  /** #14 썬더볼트 — BANG 글자 숨김, 번개 플래시만 */
  hideBangText?: boolean;
  /** #19 보이드 — 집중 중 신호를 공허에 삼킴, 뱅 때 균열 */
  voidShroud?: boolean;
  /** #21 카오스 등 — READY↔STEADY 글자 교환 */
  swapSignalLabels?: boolean;
  /** 카오스 등 — 준비↔집중·뱅 색 교환 */
  invertSignalColors?: boolean;
  /** #20 에코 — BANG 3연속, 2번째만 진짜(3번째는 잔상) */
  echoBangMiddle?: boolean;
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

function signalLabel(phase: DuelSignalBoardPhase, swapLabels: boolean): string {
  if (swapLabels) {
    switch (phase) {
      case '준비':
        return DUEL_SIGNAL_SPEC.steady.text;
      case '집중':
      case '페이크':
        return DUEL_SIGNAL_SPEC.ready.text;
      case '뱅':
        return DUEL_SIGNAL_SPEC.bang.text;
      default:
        return '';
    }
  }
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
  hideBangText = false,
  voidShroud = false,
  swapSignalLabels = false,
  invertSignalColors = false,
  echoBangMiddle = false,
  variant = 'panel',
}: DuelSignalBoardProps) {
  const minimal = variant === 'minimal';
  const flashOpacity = useSharedValue(0);
  const pulse = useSharedValue(1);
  const bangScale = useSharedValue(1);
  const voidShroudOpacity = useSharedValue(0);
  const echoTailOpacity = useSharedValue(0);
  const prevPhaseRef = useRef(phase);
  const [echoTailVisible, setEchoTailVisible] = useState(false);

  const fireComplete = useCallback(() => {
    onFlashComplete?.();
  }, [onFlashComplete]);

  useEffect(() => {
    if (!echoBangMiddle || phase !== '뱅') {
      setEchoTailVisible(false);
      cancelAnimation(echoTailOpacity);
      echoTailOpacity.value = 0;
      return;
    }

    setEchoTailVisible(false);
    const show = setTimeout(() => {
      setEchoTailVisible(true);
      echoTailOpacity.value = withSequence(
        withTiming(0.52, { duration: 70, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
        withTiming(0.18, { duration: 260, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
        withTiming(0, { duration: 180, reduceMotion: RM_GAME }),
      );
    }, 280);

    return () => {
      clearTimeout(show);
      setEchoTailVisible(false);
      cancelAnimation(echoTailOpacity);
      echoTailOpacity.value = 0;
    };
  }, [echoBangMiddle, phase, echoTailOpacity]);

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
    if (!voidShroud) {
      cancelAnimation(voidShroudOpacity);
      voidShroudOpacity.value = 0;
      return;
    }

    if (phase === '집중' || phase === '페이크') {
      voidShroudOpacity.value = withRepeat(
        withSequence(
          withTiming(0.82, { duration: 520, easing: Easing.inOut(Easing.sin), reduceMotion: RM_GAME }),
          withTiming(0.58, { duration: 680, easing: Easing.inOut(Easing.sin), reduceMotion: RM_GAME }),
          withTiming(0.74, { duration: 380, easing: Easing.out(Easing.quad), reduceMotion: RM_GAME }),
          withTiming(0.5, { duration: 540, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
        ),
        -1,
        false,
        undefined,
        RM_GAME,
      );
      return;
    }

    cancelAnimation(voidShroudOpacity);
    voidShroudOpacity.value = 0;
  }, [voidShroud, phase, voidShroudOpacity]);

  useEffect(() => {
    if (phase === '페이크') {
      cancelAnimation(flashOpacity);
      if (hideBangText) {
        flashOpacity.value = withSequence(
          withTiming(0.38, {
            duration: 55,
            easing: Easing.out(Easing.quad),
            reduceMotion: RM_GAME,
          }),
          withTiming(0, {
            duration: 160,
            easing: Easing.in(Easing.quad),
            reduceMotion: RM_GAME,
          }),
        );
      } else {
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
      }
    } else if (phase === '뱅') {
      cancelAnimation(flashOpacity);
      if (hideBangText) {
        flashOpacity.value = withSequence(
          withTiming(0.55, {
            duration: 50,
            easing: Easing.out(Easing.quad),
            reduceMotion: RM_GAME,
          }),
          withTiming(0.22, {
            duration: 120,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: RM_GAME,
          }),
          withTiming(0, {
            duration: 180,
            easing: Easing.in(Easing.quad),
            reduceMotion: RM_GAME,
          }),
        );
      } else if (voidShroud) {
        flashOpacity.value = withSequence(
          withTiming(0.72, {
            duration: 60,
            easing: Easing.out(Easing.quad),
            reduceMotion: RM_GAME,
          }),
          withTiming(0.28, {
            duration: 140,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: RM_GAME,
          }),
          withTiming(0, {
            duration: 220,
            easing: Easing.in(Easing.quad),
            reduceMotion: RM_GAME,
          }),
        );
      } else {
        flashOpacity.value = 0;
      }
      fireComplete();
    } else {
      cancelAnimation(flashOpacity);
      flashOpacity.value = 0;
    }
  }, [phase, flashOpacity, fireComplete, hideBangText, voidShroud]);

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const voidShroudStyle = useAnimatedStyle(() => ({
    opacity: voidShroudOpacity.value,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const bangPopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bangScale.value }],
  }));

  const echoTailStyle = useAnimatedStyle(() => ({
    opacity: echoTailOpacity.value,
    transform: [{ translateX: -12 }, { translateY: 9 }, { scale: 0.94 }],
  }));

  const label = signalLabel(phase, swapSignalLabels);
  const echoDecoyBang = echoBangMiddle && phase === '페이크';
  const displayLabel = echoDecoyBang ? DUEL_SIGNAL_SPEC.bang.text : label;
  const suppressBangText = hideBangText && (phase === '뱅' || phase === '페이크');
  const voidSwallowsSignal = voidShroud && (phase === '집중' || phase === '페이크');
  const showLabel = displayLabel.length > 0 && !suppressBangText && !voidSwallowsSignal;
  const inkTheme = DUEL_VISUAL_THEME === 'minimal';

  const textKind = (() => {
    if (blindBangText && (phase === '뱅' || phase === '페이크')) return 'bangBlind';
    if (echoDecoyBang) return 'echoDecoyBang';
    if (invertSignalColors) {
      if (phase === '준비') return 'steady';
      return 'ready';
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
        case 'echoDecoyBang':
          return styles.inkEchoDecoyBang;
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
      case 'echoDecoyBang':
        return styles.textEchoDecoyBang;
      case 'steady':
        return styles.textSteady;
      default:
        return styles.textReady;
    }
  })();

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

  const thunderFlash = hideBangText && (phase === '뱅' || phase === '페이크');
  const voidRuptureFlash = voidShroud && phase === '뱅';

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.flashOverlay,
          thunderFlash && styles.thunderFlashOverlay,
          voidRuptureFlash && styles.voidRuptureFlashOverlay,
          flashStyle,
        ]}
      />
      {voidSwallowsSignal ? (
        <Animated.View pointerEvents="none" style={[styles.voidShroudOverlay, voidShroudStyle]} />
      ) : null}
      <View style={[styles.woodPanel, minimal && styles.woodPanelMinimal]}>
        {!minimal ? <Text style={styles.duelLabel}>DUEL ★ ★</Text> : null}
        {showLabel ? (
          <Animated.View style={styles.signalBlock}>
            {phase === '집중' || phase === '페이크' ? (
              <Animated.View style={[pulseStyle, styles.pulseWrap]}>
                <Text
                  style={[
                    textStyle,
                    echoDecoyBang ? bangSize : steadySize,
                    minimalTextShadow,
                  ]}
                >
                  {displayLabel}
                </Text>
              </Animated.View>
            ) : phase === '뱅' ? (
              <Animated.View style={[bangPopStyle, echoBangMiddle && styles.bangStack]}>
                <Text style={[textStyle, bangSize, minimalTextShadow]}>{displayLabel}</Text>
                {echoBangMiddle && echoTailVisible ? (
                  <Animated.Text
                    pointerEvents="none"
                    style={[textStyle, bangSize, minimalTextShadow, styles.echoBangTail, echoTailStyle]}
                  >
                    {displayLabel}
                  </Animated.Text>
                ) : null}
              </Animated.View>
            ) : (
              <Text style={[textStyle, readySize, minimalTextShadow]}>{displayLabel}</Text>
            )}
          </Animated.View>
        ) : voidSwallowsSignal ? (
          <View style={styles.voidHintWrap}>
            <Text style={[styles.voidHint, minimal && styles.voidHintMinimal]}>···</Text>
          </View>
        ) : suppressBangText ? (
          <View style={styles.placeholder} />
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
  thunderFlashOverlay: {
    backgroundColor: 'rgba(180, 220, 255, 0.72)',
  },
  voidRuptureFlashOverlay: {
    backgroundColor: 'rgba(220, 200, 255, 0.85)',
  },
  voidShroudOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 4, 28, 0.92)',
    zIndex: 5,
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
  bangStack: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 56,
  },
  echoBangTail: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  textEchoDecoyBang: {
    color: DUEL_SIGNAL_SPEC.bang.color,
    opacity: 0.42,
    fontWeight: '900',
  },
  inkEchoDecoyBang: {
    color: MINIMAL_DUEL.bang,
    opacity: 0.4,
    fontWeight: '900',
  },
  voidHintWrap: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voidHint: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 6,
    color: 'rgba(180, 160, 220, 0.35)',
  },
  voidHintMinimal: {
    color: 'rgba(80, 60, 120, 0.45)',
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
    opacity: 0.02,
    fontWeight: '900',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
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
    opacity: 0.025,
    fontWeight: '900',
    textShadowColor: 'transparent',
    textShadowRadius: 0,
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
