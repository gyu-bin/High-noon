import { useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTranslation } from 'react-i18next';

import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';
import { play } from '@/utils/audioService';
import { abilityOverlayLabel } from '@/utils/characterLabels';
import { trigger } from '@/utils/hapticService';

export type AbilityOverlayType = 'last_stand' | 'headshot' | 'revive' | null;

type Props = {
  abilityType: AbilityOverlayType;
  onComplete: () => void;
};

const DURATION_MS = 1100;
const REVIVE_TOTAL_MS = 2100;

/**
 * 캐릭터 능력 발동 전면 연출 (NPC 결투 위에 표시)
 */
export function AbilityOverlay({ abilityType, onComplete }: Props) {
  const { t } = useTranslation();
  const scale = useSharedValue(0.75);
  const opacity = useSharedValue(0);
  const deathOpacity = useSharedValue(0);
  const deathScale = useSharedValue(1);
  const deathY = useSharedValue(0);
  const reviveAura = useSharedValue(0);
  const reviveGlow = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  useEffect(() => {
    if (abilityType == null) return;

    if (abilityType === 'revive') {
      deathOpacity.value = 0;
      deathScale.value = 1;
      deathY.value = 0;
      reviveAura.value = 0;
      reviveGlow.value = 0;
      labelOpacity.value = 0;
      scale.value = 1;
      opacity.value = 1;

      void play('ghost_revive_death');
      const thudTimer = setTimeout(() => {
        void play('defeat_thud');
        void trigger('heavy');
      }, 120);

      deathOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.quad),
        reduceMotion: RM_GAME,
      });
      deathY.value = withTiming(28, {
        duration: 420,
        easing: Easing.in(Easing.cubic),
        reduceMotion: RM_GAME,
      });
      deathScale.value = withSequence(
        withTiming(0.92, { duration: 420, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
        withTiming(0.72, { duration: 200, easing: Easing.in(Easing.quad), reduceMotion: RM_GAME }),
      );
      deathOpacity.value = withDelay(
        380,
        withTiming(0.15, {
          duration: 220,
          easing: Easing.in(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );

      const riseTimer = setTimeout(() => {
        void play('ghost_revive_rise');
        void trigger('success');
      }, 520);

      reviveAura.value = withDelay(
        520,
        withSequence(
          withTiming(1.15, {
            duration: 380,
            easing: Easing.out(Easing.back(1.4)),
            reduceMotion: RM_GAME,
          }),
          withTiming(1, {
            duration: 240,
            easing: Easing.inOut(Easing.quad),
            reduceMotion: RM_GAME,
          }),
        ),
      );
      reviveGlow.value = withDelay(
        520,
        withTiming(1, {
          duration: 420,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );
      deathY.value = withDelay(
        520,
        withTiming(-8, {
          duration: 520,
          easing: Easing.out(Easing.cubic),
          reduceMotion: RM_GAME,
        }),
      );
      deathScale.value = withDelay(
        520,
        withTiming(1, {
          duration: 520,
          easing: Easing.out(Easing.back(1.1)),
          reduceMotion: RM_GAME,
        }),
      );
      deathOpacity.value = withDelay(
        520,
        withTiming(1, {
          duration: 280,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );
      labelOpacity.value = withDelay(
        780,
        withTiming(1, {
          duration: 260,
          easing: Easing.out(Easing.quad),
          reduceMotion: RM_GAME,
        }),
      );

      const doneTimer = setTimeout(() => {
        opacity.value = withTiming(0, {
          duration: 280,
          easing: Easing.in(Easing.quad),
          reduceMotion: RM_GAME,
        });
        setTimeout(onComplete, 300);
      }, REVIVE_TOTAL_MS);

      return () => {
        clearTimeout(thudTimer);
        clearTimeout(riseTimer);
        clearTimeout(doneTimer);
      };
    }

    if (abilityType === 'last_stand') {
      void play('ability_shield');
      void trigger('heavy');
    } else if (abilityType === 'headshot') {
      void play('ability_headshot');
      void trigger('heavy');
    }

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
  }, [abilityType, onComplete, deathOpacity, deathScale, deathY, labelOpacity, opacity, reviveAura, reviveGlow, scale]);

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const deathStyle = useAnimatedStyle(() => ({
    opacity: deathOpacity.value,
    transform: [{ translateY: deathY.value }, { scale: deathScale.value }],
  }));

  const auraStyle = useAnimatedStyle(() => ({
    opacity: reviveGlow.value * 0.85,
    transform: [{ scale: reviveAura.value }],
  }));

  const reviveLabelStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: 0.9 + labelOpacity.value * 0.1 }],
  }));

  const visible = abilityType != null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      {visible && abilityType ? (
        <View pointerEvents="none" style={styles.root}>
          <View style={[styles.backdrop, abilityType === 'revive' && styles.backdropRevive]} />
          {abilityType === 'last_stand' ? (
            <View style={styles.fxRow}>
              <View style={styles.shield}>
                <Text style={styles.shieldGlyph}>🛡</Text>
              </View>
              <Animated.Text style={[styles.label, styles.labelGold, textStyle]}>
                {abilityOverlayLabel(t, 'lastStand')}
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
                {abilityOverlayLabel(t, 'headshot')}
              </Animated.Text>
            </View>
          ) : null}
          {abilityType === 'revive' ? (
            <View style={styles.fxCol}>
              <Animated.View style={[styles.aura, auraStyle]} />
              <Animated.View style={[styles.ghostBody, deathStyle]}>
                <View style={styles.ghostHood} />
                <View style={styles.ghostCoat} />
              </Animated.View>
              <Animated.Text style={[styles.label, styles.labelRevive, reviveLabelStyle]}>
                {abilityOverlayLabel(t, 'revive')}
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
    backgroundColor: 'rgba(12, 0, 24, 0.72)',
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
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(180, 60, 255, 0.28)',
    borderWidth: 3,
    borderColor: 'rgba(220, 180, 255, 0.95)',
    shadowColor: '#C084FC',
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  ghostBody: {
    width: 88,
    height: 112,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  ghostHood: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(200, 210, 230, 0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: -8,
    zIndex: 2,
  },
  ghostCoat: {
    width: 72,
    height: 64,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: 'rgba(120, 130, 160, 0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
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
    color: '#E9D5FF',
  },
});
