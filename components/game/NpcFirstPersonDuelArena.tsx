import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DuelSignalBoard, type DuelSignalBoardPhase } from '@/components/game/DuelSignalBoard';
import { DuelCoverImage } from '@/components/game/DuelCoverImage';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import {
  getV3DuelBackground,
  getV3NpcPose,
  V3_DUEL_VFX,
  CINEMATIC_REVOLVER,
  type V3NpcPose,
} from '@/constants/v3DuelAssets';
import { uiV3Colors } from '@/constants/theme';
import type { SpritePose } from '@/constants/sprites';
import type { NpcTier } from '@/types/npc';
import { getNpcDisplayName } from '@/utils/npcLabels';

type Props = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  npcId: number;
  tier: NpcTier;
  bossFlag: boolean;
  dayNight: 'day' | 'night';
  npcPose: SpritePose;
  npcVictoryActive: boolean;
  playerDefeated: boolean;
  signalPhase: DuelSignalBoardPhase;
  blindBangText: boolean;
  hideBangText: boolean;
  voidShroud: boolean;
  echoBangMiddleSignal: boolean;
  specialPresentation: 'mirror' | 'thunderbolt' | 'redEye' | 'void' | 'echo' | null;
  opponentHearts: number;
  playerHearts: number;
  currentRound: number;
  shootCapturesEarly: boolean;
  shootActive: boolean;
  playerShotActive: boolean;
  npcShotActive?: boolean;
  earlyWarning: boolean;
  onShootPress: () => void;
  onPause: () => void;
  pauseDisabled: boolean;
  contentShakeStyle?: StyleProp<ViewStyle>;
};

function toV3NpcPose(pose: SpritePose): V3NpcPose {
  if (pose === 'aim') return 'draw';
  if (pose === 'shoot') return 'fire';
  if (pose === 'defeat') return 'hit';
  return 'idle';
}

function Hearts({ value }: { value: number }) {
  return (
    <Text accessibilityLabel={`${value} hearts`} style={styles.hearts}>
      {Array.from({ length: 3 }, (_, index) => (index < value ? '♥' : '♡')).join(' ')}
    </Text>
  );
}

/**
 * NPC 1P duel presentation. It intentionally accepts already-authoritative
 * engine state and has no timing, scoring, or input-validity logic of its own.
 */
export function NpcFirstPersonDuelArena({
  width,
  height,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  npcId,
  tier,
  bossFlag,
  dayNight,
  npcPose,
  npcVictoryActive,
  playerDefeated,
  signalPhase,
  blindBangText,
  hideBangText,
  voidShroud,
  echoBangMiddleSignal,
  specialPresentation,
  opponentHearts,
  playerHearts,
  currentRound,
  shootCapturesEarly,
  shootActive,
  playerShotActive,
  npcShotActive = false,
  earlyWarning,
  onShootPress,
  onPause,
  pauseDisabled,
  contentShakeStyle,
}: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const landscape = width > height;
  const [fallPose, setFallPose] = useState<'hit' | 'down'>('hit');
  const smokeOpacity = useSharedValue(0);
  const fxOpacity = useSharedValue(0);
  const fall = useSharedValue(0);
  const cameraFall = useSharedValue(0);
  const muzzle = useSharedValue(0);
  const npcMuzzle = useSharedValue(0);
  const recoil = useSharedValue(0);

  useEffect(() => {
    fall.value = npcPose === 'defeat'
      ? withTiming(1, { duration: reduceMotion ? 120 : 760, easing: Easing.out(Easing.cubic) })
      : 0;
    return () => cancelAnimation(fall);
  }, [fall, npcPose, reduceMotion]);

  useEffect(() => {
    cameraFall.value = playerDefeated
      ? withTiming(1, { duration: reduceMotion ? 160 : 900, easing: Easing.inOut(Easing.cubic) })
      : 0;
    return () => cancelAnimation(cameraFall);
  }, [cameraFall, playerDefeated, reduceMotion]);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [
      { scale: 1 + cameraFall.value * 0.48 },
      { translateY: -height * 0.06 * cameraFall.value },
      { rotate: `${-9 * cameraFall.value}deg` },
    ],
  }));
  const collapseStyle = useAnimatedStyle(() => ({
    transform: reduceMotion ? [] : [
      { translateY: 12 * fall.value },
    ],
  }));
  const weaponStyle = useAnimatedStyle(() => ({
    opacity: 1 - cameraFall.value,
    transform: reduceMotion ? [] : [
      { translateY: height * 0.32 * cameraFall.value + recoil.value * 14 },
      { rotate: `${28 * cameraFall.value - recoil.value * 6}deg` },
    ],
  }));
  const defeatShadeStyle = useAnimatedStyle(() => ({ opacity: cameraFall.value * 0.48 }));
  const dustStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - fall.value) }));
  const muzzleStyle = useAnimatedStyle(() => ({ opacity: muzzle.value }));
  const npcMuzzleStyle = useAnimatedStyle(() => ({ opacity: npcMuzzle.value }));
  const shotFlashStyle = useAnimatedStyle(() => ({ opacity: muzzle.value * 0.2 }));

  const npcRenderPose = useMemo<V3NpcPose>(() => {
    if (npcPose === 'defeat') return fallPose;
    return toV3NpcPose(npcPose);
  }, [fallPose, npcPose]);

  useEffect(() => {
    if (npcPose !== 'defeat') {
      setFallPose('hit');
      return;
    }
    const timer = setTimeout(() => setFallPose('down'), reduceMotion ? 80 : 280);
    return () => clearTimeout(timer);
  }, [npcPose, reduceMotion]);

  useEffect(() => {
    if (!playerShotActive) {
      smokeOpacity.value = 0;
      return;
    }
    smokeOpacity.value = withSequence(
      withTiming(0.9, { duration: reduceMotion ? 1 : 45, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: reduceMotion ? 130 : 440, easing: Easing.in(Easing.quad) }),
    );
    muzzle.value = withSequence(
      withTiming(1, { duration: 12, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: reduceMotion ? 90 : 180, easing: Easing.in(Easing.quad) }),
    );
    recoil.value = withSequence(
      withTiming(reduceMotion ? 0 : 1, { duration: 65 }),
      withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }),
    );
    return () => {
      cancelAnimation(smokeOpacity);
      cancelAnimation(muzzle);
      cancelAnimation(recoil);
      muzzle.value = 0;
    };
  }, [playerShotActive, reduceMotion, smokeOpacity, muzzle, recoil]);

  useEffect(() => {
    if (!npcShotActive) {
      npcMuzzle.value = 0;
      return;
    }
    npcMuzzle.value = withSequence(
      withTiming(1, { duration: 12, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: reduceMotion ? 90 : 180, easing: Easing.in(Easing.quad) }),
    );
    return () => cancelAnimation(npcMuzzle);
  }, [npcMuzzle, npcShotActive, reduceMotion]);

  const specialFxActive =
    (specialPresentation === 'thunderbolt' && (signalPhase === '페이크' || signalPhase === '뱅')) ||
    (specialPresentation === 'void' && signalPhase === '뱅') ||
    (specialPresentation === 'redEye' && (signalPhase === '집중' || signalPhase === '페이크'));

  useEffect(() => {
    if (!specialFxActive) {
      fxOpacity.value = 0;
      return;
    }
    fxOpacity.value = withSequence(
      withTiming(1, { duration: reduceMotion ? 1 : 70, easing: Easing.out(Easing.quad) }),
      withTiming(specialPresentation === 'redEye' ? 0.35 : 0, {
        duration: reduceMotion ? 180 : specialPresentation === 'redEye' ? 600 : 160,
        easing: Easing.in(Easing.quad),
      }),
    );
    return () => cancelAnimation(fxOpacity);
  }, [fxOpacity, reduceMotion, specialFxActive, specialPresentation]);

  const smokeStyle = useAnimatedStyle(() => ({
    opacity: smokeOpacity.value,
    transform: [{ translateY: -16 * smokeOpacity.value }, { scale: 0.85 + smokeOpacity.value * 0.3 }],
  }));
  const specialFxStyle = useAnimatedStyle(() => ({ opacity: fxOpacity.value }));

  const npcSize = landscape
    ? Math.min(height * 0.32, width * 0.18)
    : Math.min(width * 0.48, height * 0.29);
  const weaponSize = landscape
    ? Math.min(height * 0.78, width * 0.34)
    : Math.min(width * 0.67, height * 0.36);
  const npcName = getNpcDisplayName(t, npcId);
  const weaponSource = CINEMATIC_REVOLVER;
  const abilityEcho = specialPresentation === 'echo' && (signalPhase === '페이크' || signalPhase === '뱅');
  const abilityMirror = specialPresentation === 'mirror' && (signalPhase === '집중' || signalPhase === '페이크');
  const specialAsset = specialPresentation === 'thunderbolt'
    ? V3_DUEL_VFX.thunderbolt
    : specialPresentation === 'void'
      ? V3_DUEL_VFX.voidCrack
      : V3_DUEL_VFX.redEye;

  return (
    <View style={[styles.root, { width, height, backgroundColor: uiV3Colors.background }]}> 
      {/* The tap target remains outside the shaken visual tree, so visual shake
          never moves or reshapes the authoritative touch surface. */}
      <Pressable
        accessibilityLabel={t('game.duelTapArea')}
        accessibilityRole="button"
        accessibilityState={{ disabled: !shootCapturesEarly }}
        accessibilityHint={shootActive ? t('game.tapHintShoot') : t('game.tapHintEarly')}
        disabled={!shootCapturesEarly}
        onPressIn={onShootPress}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, contentShakeStyle]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, cameraStyle]}>
        <DuelCoverImage
          source={getV3DuelBackground(tier, npcId, dayNight)}
          width={width}
          height={height}
          bleed={1.18}
        />
        <View pointerEvents="none" style={[styles.vignette, { top: -height, bottom: -height, left: -width, right: -width }]} />
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(10, 5, 2, 0.26)', 'transparent', 'rgba(8, 4, 2, 0.64)']}
          locations={[0, 0.48, 1]}
          style={[StyleSheet.absoluteFillObject, { top: -height * 0.25, bottom: -height * 0.25, left: -width, right: -width }]}
        />

        <Animated.View pointerEvents="none" style={[styles.npcLane, {
          top: height * (landscape ? 0.7 : 0.58) - npcSize,
          left: (width - npcSize) / 2,
          width: npcSize,
          height: npcSize,
        }, collapseStyle]}>
          {abilityEcho || abilityMirror ? (
            <Image
              source={getV3NpcPose(npcId, npcRenderPose)}
              style={[styles.afterImage, { width: npcSize, height: npcSize }]}
              contentFit="contain"
              transition={0}
            />
          ) : null}
          <Image
            source={getV3NpcPose(npcId, npcRenderPose)}
            style={{ width: npcSize, height: npcSize }}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={0}
          />
          <Animated.View style={[styles.npcMuzzle, npcMuzzleStyle]}>
            <Image source={V3_DUEL_VFX.muzzleFlash} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
          </Animated.View>
          {npcRenderPose === 'hit' ? (
            <Image source={V3_DUEL_VFX.bulletImpact} style={styles.impact} contentFit="contain" transition={0} />
          ) : null}
          {npcRenderPose === 'down' ? (
            <Animated.View style={[styles.fallDust, dustStyle]}>
              <Image source={V3_DUEL_VFX.fallDust} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
            </Animated.View>
          ) : null}
        </Animated.View>
        </Animated.View>

        {specialFxActive ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.specialFx, specialFxStyle]}>
            <Image source={specialAsset} style={styles.specialImage} contentFit="contain" transition={0} />
          </Animated.View>
        ) : null}

        {voidShroud && (signalPhase === '집중' || signalPhase === '페이크') ? (
          <View pointerEvents="none" style={styles.voidShade} />
        ) : null}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { backgroundColor: '#100906' }, defeatShadeStyle]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.shotFlash, shotFlashStyle]} />
        {earlyWarning ? <View pointerEvents="none" style={styles.earlyEdge} /> : null}

        <View pointerEvents="box-none" style={[styles.hud, { top: paddingTop, left: paddingLeft, right: paddingRight }]}>
          <View style={styles.hudSide}>
            <Text style={styles.hudLabel}>YOU</Text>
            <Hearts value={playerHearts} />
          </View>
          <View style={styles.roundBlock}>
            <Text style={styles.roundLabel}>ROUND</Text>
            <Text style={styles.roundValue}>{currentRound}</Text>
          </View>
          <View style={[styles.hudSide, styles.hudRight]}>
            <Text numberOfLines={1} style={[styles.hudLabel, { fontFamily: usesCjkFont(npcName) ? FONT_WESTERN_SERIF : FONT_RYE }]}>{npcName}</Text>
            <Hearts value={opponentHearts} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('game.pause')}
            disabled={pauseDisabled}
            onPress={onPause}
            style={[styles.pause, pauseDisabled && styles.pauseDisabled]}
          >
            <Ionicons color={uiV3Colors.cream} name="pause" size={16} />
          </Pressable>
        </View>

        <View pointerEvents="none" style={[styles.cue, { top: landscape ? height * 0.17 : height * 0.21 }]}> 
          <DuelSignalBoard
            phase={signalPhase}
            variant="cinematic"
            blindBangText={blindBangText}
            hideBangText={hideBangText}
            voidShroud={voidShroud}
            echoBangMiddle={echoBangMiddleSignal}
          />
        </View>

        <Animated.View pointerEvents="none" style={[styles.weapon, { width: weaponSize, height: weaponSize, right: -weaponSize * 0.06, bottom: -weaponSize * 0.1 }, weaponStyle]}>
          <Image source={weaponSource} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} priority="high" />
          <Animated.View style={[styles.weaponMuzzle, muzzleStyle]}>
            <Image source={V3_DUEL_VFX.muzzleFlash} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
          </Animated.View>
          <Animated.View style={[styles.weaponSmoke, smokeStyle]}>
            <Image source={V3_DUEL_VFX.gunSmoke} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
          </Animated.View>
        </Animated.View>

        {bossFlag ? <View pointerEvents="none" style={styles.bossRule} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 5, 2, 0.20)' },
  npcLane: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  afterImage: { position: 'absolute', opacity: 0.24, transform: [{ translateX: -18 }, { translateY: 8 }], tintColor: uiV3Colors.diamondBlue },
  npcMuzzle: { position: 'absolute', width: '50%', height: '34%', left: '-10%', top: '32%' },
  impact: { position: 'absolute', width: 88, height: 88, top: '36%', left: '38%' },
  fallDust: { position: 'absolute', width: '98%', height: '45%', bottom: '-10%' },
  specialFx: { alignItems: 'center', justifyContent: 'center' },
  specialImage: { width: '72%', height: '72%' },
  voidShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 10, 10, 0.55)' },
  playerHitEdge: { ...StyleSheet.absoluteFillObject, borderWidth: 4, borderColor: 'rgba(139, 37, 0, 0.42)', backgroundColor: 'rgba(139, 37, 0, 0.06)' },
  earlyEdge: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderColor: 'rgba(239, 68, 68, 0.8)' },
  hud: { position: 'absolute', height: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hudSide: { maxWidth: '37%', minWidth: 82, paddingVertical: 5, paddingHorizontal: 9, borderBottomWidth: 1, borderColor: 'rgba(201, 166, 107, 0.42)', backgroundColor: 'rgba(16, 10, 6, 0.62)' },
  hudRight: { alignItems: 'flex-end' },
  hudLabel: { color: uiV3Colors.cream, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  hearts: { marginTop: 2, color: '#D45342', fontSize: 15, letterSpacing: 1 },
  roundBlock: { alignItems: 'center', paddingTop: 3 },
  roundLabel: { color: uiV3Colors.cream, fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  roundValue: { color: uiV3Colors.gold, fontFamily: FONT_RYE, fontSize: 25, lineHeight: 28 },
  pause: { position: 'absolute', right: 0, top: 58, padding: 9, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.4)', backgroundColor: 'rgba(26, 12, 6, 0.60)' },
  pauseDisabled: { opacity: 0.35 },
  cue: { position: 'absolute', left: '8%', right: '8%', height: 76, alignItems: 'center', justifyContent: 'center' },
  weapon: { position: 'absolute' },
  weaponMuzzle: { position: 'absolute', width: '52%', height: '42%', left: '-7%', top: '-7%' },
  weaponSmoke: { position: 'absolute', width: '40%', height: '40%', left: '7%', top: '2%' },
  shotFlash: { backgroundColor: '#FFD08A' },
  bossRule: { position: 'absolute', left: '35%', right: '35%', top: 0, height: 2, backgroundColor: uiV3Colors.gold, opacity: 0.68 },
});
