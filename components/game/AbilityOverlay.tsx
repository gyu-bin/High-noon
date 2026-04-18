import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';

export type AbilityOverlayType = 'last_stand' | 'headshot' | 'revive' | null;

type Props = {
  abilityType: AbilityOverlayType;
  onComplete: () => void;
};

const DURATION_MS = 1100;

/**
 * 캐릭터 능력 발동 전면 연출 (NPC 결투 위에 표시)
 */
export function AbilityOverlay({ abilityType, onComplete }: Props) {
  const scale = useSharedValue(0.75);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (abilityType == null) return;

    scale.value = 0.75;
    opacity.value = 0;
    scale.value = withSequence(
      withTiming(1.08, {
        duration: 220,
        easing: Easing.out(Easing.back(1.2)),
        reduceMotion: RM_GAME,
      }),
      withTiming(1, {
        duration: 180,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: RM_GAME,
      }),
    );
    opacity.value = withTiming(1, {
      duration: 200,
      easing: Easing.out(Easing.quad),
      reduceMotion: RM_GAME,
    });

    let t2: ReturnType<typeof setTimeout> | undefined;
    const t1 = setTimeout(() => {
      opacity.value = withTiming(0, {
        duration: 280,
        easing: Easing.in(Easing.quad),
        reduceMotion: RM_GAME,
      });
      t2 = setTimeout(() => {
        onComplete();
      }, 300);
    }, DURATION_MS);

    return () => {
      clearTimeout(t1);
      if (t2 != null) clearTimeout(t2);
    };
  }, [abilityType, onComplete, opacity, scale]);

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const visible = abilityType != null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      {visible && abilityType ? (
    <View pointerEvents="none" style={styles.root}>
      <View style={[styles.backdrop, abilityType === 'revive' && styles.backdropRevive]} />
      {abilityType === 'last_stand' ? (
        <View style={styles.fxRow}>
          <View style={styles.shield}>
            <Text style={styles.shieldGlyph}>🛡</Text>
          </View>
          <Animated.Text style={[styles.label, styles.labelGold, textStyle]}>
            LAST STAND!
          </Animated.Text>
        </View>
      ) : null}
      {abilityType === 'headshot' ? (
        <View style={styles.fxCol}>
          <View style={styles.crosshair}>
            <View style={[styles.chLine, styles.chH]} />
            <View style={[styles.chLine, styles.chV]} />
            <View style={styles.chDot} />
          </View>
          <Animated.Text style={[styles.label, styles.labelRed, textStyle]}>
            HEADSHOT!
          </Animated.Text>
        </View>
      ) : null}
      {abilityType === 'revive' ? (
        <View style={styles.fxCol}>
          <View style={styles.aura} />
          <Animated.Text style={[styles.label, styles.labelRevive, textStyle]}>
            REVIVE!
          </Animated.Text>
        </View>
      ) : null}
    </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  backdropRevive: {
    backgroundColor: 'rgba(80, 0, 0, 0.5)',
  },
  fxRow: {
    alignItems: 'center',
    gap: 12,
  },
  fxCol: {
    alignItems: 'center',
    gap: 16,
  },
  shield: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(212, 165, 32, 0.35)',
    borderWidth: 4,
    borderColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldGlyph: {
    fontSize: 36,
  },
  crosshair: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chLine: {
    position: 'absolute',
    backgroundColor: colors.rustRed,
  },
  chH: {
    width: 120,
    height: 4,
    borderRadius: 2,
  },
  chV: {
    width: 4,
    height: 120,
    borderRadius: 2,
  },
  chDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.rustRed,
  },
  aura: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(220, 38, 38, 0.35)',
    borderWidth: 3,
    borderColor: 'rgba(255, 200, 200, 0.9)',
  },
  label: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  labelGold: {
    color: '#F5E6A8',
  },
  labelRed: {
    color: '#FF6B6B',
  },
  labelRevive: {
    color: '#FFB4B4',
  },
});
