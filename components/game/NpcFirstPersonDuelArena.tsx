import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
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

import { PlayerCharacterSprite } from '@/components/game/CharacterSprites';
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
import { characterArtDisplayScale, scaledArtStyle } from '@/constants/characterArtMetadata';
import { NPC_COMBAT_POSES, PLAYER_GROUND_REVOLVER } from '@/constants/combatPoses';
import { uiV3Colors } from '@/constants/theme';
import type { SpritePose } from '@/constants/sprites';
import type { NpcTier } from '@/types/npc';
import {
  isLethalHit,
  NPC_DUEL_SCALE,
  NPC01_DUEL_SCALE,
  NPC01_DUEL_FOOT_Y,
  npcLaneBox,
  npcPoseForStage,
  npcTimeline,
  playerTimeline,
  type NpcReactionStage,
  type PlayerReactionStage,
} from '@/utils/combatReaction';
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
  opponentCharacterId?: number;
  opponentName?: string;
  opponentTierLabel?: string;
  recordDuelLabel?: string;
  heartsMax?: number;
  earlyWarning: boolean;
  onShootPress: () => void;
  onPause: () => void;
  pauseDisabled: boolean;
  contentShakeStyle?: StyleProp<ViewStyle>;
  /** Development-only renderer replay; ignored by release builds. */
  combatPreview?: {
    scale?: number;
    npcStage?: NpcReactionStage;
    playerStage?: PlayerReactionStage;
  };
};

function toV3NpcPose(pose: SpritePose): V3NpcPose {
  if (pose === 'aim') return 'draw';
  if (pose === 'shoot') return 'fire';
  if (pose === 'defeat') return 'hit';
  return 'idle';
}

function Hearts({ value, max = 3 }: { value: number; max?: number }) {
  return (
    <Text accessibilityLabel={`${value} hearts`} style={styles.hearts}>
      {Array.from({ length: max }, (_, index) => (index < value ? '♥' : '♡')).join(' ')}
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
  opponentCharacterId,
  opponentName,
  opponentTierLabel,
  recordDuelLabel,
  heartsMax = 3,
  earlyWarning,
  onShootPress,
  onPause,
  pauseDisabled,
  contentShakeStyle,
  combatPreview,
}: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const landscape = width > height;
  // Feet stay on the same ground line; the body grows upward (NPC_DUEL_SCALE).
  const baseNpcSize = landscape
    ? Math.min(height * 0.32, width * 0.18)
    : Math.min(width * 0.48, height * 0.29);
  const npcBox = npcLaneBox({
    baseSize: baseNpcSize,
    footY: height * (landscape ? 0.7 : npcId === 1 ? NPC01_DUEL_FOOT_Y : 0.58),
    scale: __DEV__ ? combatPreview?.scale ?? (npcId === 1 ? NPC01_DUEL_SCALE : NPC_DUEL_SCALE)
      : npcId === 1 ? NPC01_DUEL_SCALE : NPC_DUEL_SCALE,
  });
  const npcSize = npcBox.size;
  const npcArtStyle = scaledArtStyle(npcSize, npcSize, characterArtDisplayScale('npc', npcId));
  const smokeOpacity = useSharedValue(0);
  const fxOpacity = useSharedValue(0);
  const muzzle = useSharedValue(0);
  const npcMuzzle = useSharedValue(0);
  const recoil = useSharedValue(0);

  // ---- Combat reaction (presentation of an already-decided result) --------
  const [timedNpcStage, setNpcStage] = useState<NpcReactionStage>('none');
  const [timedPlayerStage, setPlayerStage] = useState<PlayerReactionStage>('none');
  const npcStage = (__DEV__ ? combatPreview?.npcStage : undefined) ?? timedNpcStage;
  const playerStage = (__DEV__ ? combatPreview?.playerStage : undefined) ?? timedPlayerStage;
  const opponentHeartsRef = useRef(opponentHearts);
  opponentHeartsRef.current = opponentHearts;
  const playerHeartsRef = useRef(playerHearts);
  playerHeartsRef.current = playerHearts;

  // NPC lane: offsets are fractions of the lane size; rotation pivots at the feet.
  const npcX = useSharedValue(0);
  const npcY = useSharedValue(0);
  const npcRot = useSharedValue(0);
  const dust = useSharedValue(0);
  const impactFx = useSharedValue(0);
  // Player camera + weapon.
  const kickX = useSharedValue(0);
  const kickY = useSharedValue(0);
  const kickRot = useSharedValue(0);
  const roll = useSharedValue(0);
  const lift = useSharedValue(0);
  const zoom = useSharedValue(0);
  const gunDip = useSharedValue(0);
  const gunDrop = useSharedValue(0);
  const ground = useSharedValue(0);
  const vignette = useSharedValue(0);
  const shade = useSharedValue(0);

  const npcDefeated = npcPose === 'defeat';
  /** Final vs non-final hit — the engine has already taken the heart before this pose is shown. */
  const npcHitFinal = npcDefeated && isLethalHit(opponentHearts);
  useEffect(() => {
    if (!npcDefeated) {
      setNpcStage('none');
      return;
    }
    // Hearts were settled by the engine before this pose was revealed.
    const timeline = npcTimeline(opponentHeartsRef.current);
    const timers = timeline.map((step) =>
      setTimeout(() => setNpcStage(step.stage), reduceMotion ? step.at / 3 : step.at),
    );
    return () => timers.forEach(clearTimeout);
  }, [npcDefeated, reduceMotion]);

  useEffect(() => {
    if (!playerDefeated) {
      setPlayerStage('none');
      return;
    }
    const timeline = playerTimeline(playerHeartsRef.current);
    const timers = timeline.map((step) =>
      setTimeout(() => setPlayerStage(step.stage), step.at),
    );
    return () => timers.forEach(clearTimeout);
  }, [playerDefeated]);

  useEffect(() => {
    const t = (v: number, duration: number, easing = Easing.out(Easing.cubic)) =>
      withTiming(v, { duration: reduceMotion ? 1 : duration, easing });
    switch (npcStage) {
      case 'none':
        npcX.value = 0; npcY.value = 0; npcRot.value = 0;
        dust.value = 0; impactFx.value = 0;
        return;
      case 'hit':
        // Upper body snaps back (hit frame) + short knock-back of the lane.
        impactFx.value = withSequence(t(1, 30), t(0, 260, Easing.in(Easing.quad)));
        npcX.value = t(0.045, 90);
        npcY.value = t(-0.012, 90);
        npcRot.value = t(3.5, 90);
        return;
      case 'stagger':
        // Losing balance: weight swings to one side and back.
        npcX.value = withSequence(t(-0.03, 120, Easing.inOut(Easing.quad)), t(0.02, 120, Easing.inOut(Easing.quad)));
        npcRot.value = withSequence(t(-2.5, 120, Easing.inOut(Easing.quad)), t(1.5, 120, Easing.inOut(Easing.quad)));
        npcY.value = t(0, 200);
        return;
      case 'recover':
        npcX.value = t(0, 260); npcY.value = t(0, 260); npcRot.value = t(0, 260);
        return;
      case 'kneel':
        // Knees give way: the kneel frame lands with a small settle + dust.
        npcX.value = t(0, 160); npcRot.value = t(0, 160);
        npcY.value = withSequence(t(0.025, 140, Easing.in(Easing.quad)), t(0, 160));
        dust.value = withSequence(t(0.8, 90), t(0, 700, Easing.in(Easing.quad)));
        return;
      case 'fall':
      case 'down':
        // FALL / DOWN are dedicated art (constants/combatPoses.ts). Without it
        // the kneel frame simply holds — it is never rotated or scaled to fake
        // a fall.
        if (npcStage === 'down') {
          dust.value = withSequence(t(1, 80), t(0, 900, Easing.in(Easing.quad)));
        }
        return;
    }
  }, [dust, impactFx, npcRot, npcStage, npcX, npcY, reduceMotion]);

  useEffect(() => {
    const t = (v: number, duration: number, easing = Easing.out(Easing.cubic)) =>
      withTiming(v, { duration: reduceMotion ? 1 : duration, easing });
    switch (playerStage) {
      case 'none':
        kickX.value = 0; kickY.value = 0; kickRot.value = 0; roll.value = 0; lift.value = 0;
        zoom.value = 0; gunDip.value = 0; gunDrop.value = 0; ground.value = 0;
        vignette.value = 0; shade.value = 0;
        return;
      case 'impact': {
        const lethal = playerHeartsRef.current <= 0;
        const k = lethal ? 1.6 : 1;
        if (!reduceMotion) {
          kickX.value = withSequence(withTiming(-7 * k, { duration: 45 }), withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) }));
          kickY.value = withSequence(withTiming(9 * k, { duration: 45 }), withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) }));
          kickRot.value = withSequence(withTiming(1.6 * k, { duration: 45 }), withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) }));
        }
        // Hand loses aim with the camera, then (if alive) recovers.
        gunDip.value = withSequence(t(1, 70), t(lethal ? 1 : 0, 260));
        vignette.value = withSequence(t(lethal ? 0.6 : 0.42, 60), t(lethal ? 0.35 : 0, 360, Easing.in(Easing.quad)));
        return;
      }
      case 'recover':
        gunDip.value = t(0, 200);
        return;
      case 'loseGrip':
        // Grip gives out: the revolver slides down and out of frame (never vanishes in place).
        gunDrop.value = t(1, 560, Easing.in(Easing.quad));
        return;
      case 'collapse':
        // The body falls to one side: camera drops and rolls.
        roll.value = t(24, 400, Easing.inOut(Easing.cubic));
        lift.value = t(1, 400, Easing.in(Easing.cubic));
        zoom.value = t(0.5, 400);
        vignette.value = t(0.5, 400);
        return;
      case 'groundPov':
        // Face on the dirt: horizon settles almost level, opponent still standing,
        // the fallen revolver in the foreground.
        roll.value = t(6, 320);
        gunDrop.value = 1;
        lift.value = t(1.35, 320);
        zoom.value = t(1, 320);
        ground.value = t(1, 260);
        return;
      case 'defeat':
        gunDrop.value = 1;
        ground.value = 1;
        roll.value = 6;
        lift.value = 1.35;
        zoom.value = 1;
        shade.value = t(0.55, 210, Easing.inOut(Easing.quad));
        vignette.value = t(0.75, 210);
        return;
    }
  }, [gunDip, gunDrop, ground, kickRot, kickX, kickY, lift, playerStage, reduceMotion, roll, shade, vignette, zoom]);

  const cameraStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: kickX.value },
      { translateY: kickY.value - height * 0.11 * lift.value },
      { scale: 1 + 0.14 * zoom.value },
      { rotate: `${roll.value + kickRot.value}deg` },
    ],
  }));
  const weaponStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -width * 0.08 * gunDrop.value + kickX.value * 1.4 },
      { translateY: height * 0.05 * gunDip.value + height * 0.55 * gunDrop.value + kickY.value * 1.4 + recoil.value * 14 },
      { rotate: `${9 * gunDip.value + 55 * gunDrop.value - recoil.value * 6}deg` },
    ],
  }));
  const groundStyle = useAnimatedStyle(() => ({ opacity: ground.value }));
  const fallenGunStyle = useAnimatedStyle(() => ({
    opacity: ground.value,
    transform: [{ translateY: (1 - ground.value) * 40 }],
  }));
  const vignetteStyle = useAnimatedStyle(() => ({ opacity: vignette.value }));
  const defeatShadeStyle = useAnimatedStyle(() => ({ opacity: shade.value }));
  const collapseStyle = useAnimatedStyle(() => ({
    transformOrigin: 'center bottom',
    transform: [
      { translateX: npcX.value * npcBox.size },
      { translateY: npcY.value * npcBox.size },
      { rotate: `${npcRot.value}deg` },
    ],
  }));
  const dustStyle = useAnimatedStyle(() => ({ opacity: dust.value }));
  const impactStyle = useAnimatedStyle(() => ({ opacity: impactFx.value }));
  const muzzleStyle = useAnimatedStyle(() => ({ opacity: muzzle.value }));
  const npcMuzzleStyle = useAnimatedStyle(() => ({ opacity: npcMuzzle.value }));
  const shotFlashStyle = useAnimatedStyle(() => ({ opacity: muzzle.value * 0.2 }));

  const dedicatedPoses = NPC_COMBAT_POSES[npcId];
  const npcRenderPose = useMemo(() => {
    if (!npcDefeated) return toV3NpcPose(npcPose);
    return npcPoseForStage(npcStage === 'none' ? 'hit' : npcStage, {
      fall: dedicatedPoses?.fall != null,
      down: dedicatedPoses?.down != null,
    });
  }, [dedicatedPoses, npcDefeated, npcPose, npcStage]);
  const npcImageSource = useMemo(() => {
    if (npcRenderPose === 'fall' && dedicatedPoses?.fall) return dedicatedPoses.fall;
    if (npcRenderPose === 'down' && dedicatedPoses?.down) return dedicatedPoses.down;
    // The clarity "down" frame is the kneel.
    return getV3NpcPose(npcId, npcRenderPose === 'kneel' ? 'down' : (npcRenderPose as V3NpcPose));
  }, [dedicatedPoses, npcId, npcRenderPose]);

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

  const weaponSize = landscape
    ? Math.min(height * 0.78, width * 0.34)
    : Math.min(width * 0.67, height * 0.36);
  const npcName = opponentName ?? getNpcDisplayName(t, npcId);
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
          top: npcBox.top,
          left: (width - npcSize) / 2,
          width: npcSize,
          height: npcSize,
        }, collapseStyle]}>
          {(abilityEcho || abilityMirror) && opponentCharacterId == null ? (
            <Image
              source={npcImageSource}
              style={[styles.afterImage, npcArtStyle]}
              contentFit="contain"
              transition={0}
            />
          ) : null}
          {opponentCharacterId != null ? (
            <PlayerCharacterSprite
              characterId={opponentCharacterId}
              width={npcSize}
              height={npcSize}
              flipHorizontal
              // Same combat language as NPC duels: a non-final hit holds the hit
              // frame and returns to idle (RECOVER); only a final hit settles down.
              pose={npcDefeated && npcStage === 'recover' ? 'idle' : npcPose}
              defeatSettlesDown={npcHitFinal}
              victoryActive={npcVictoryActive}
              duelCorner="topRight"
            />
          ) : (
            <>
              <Image
                source={npcImageSource}
                style={npcArtStyle}
                contentFit="contain"
                cachePolicy="memory-disk"
                priority="high"
                transition={0}
              />
              <Animated.View style={[styles.npcMuzzle, npcMuzzleStyle]}>
                <Image source={V3_DUEL_VFX.muzzleFlash} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
              </Animated.View>
            </>
          )}
          {npcDefeated ? (
            <>
              {/* Impact spark only — no blood. */}
              <Animated.View style={[styles.impact, impactStyle]}>
                <Image source={V3_DUEL_VFX.bulletImpact} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
              </Animated.View>
              <Animated.View style={[styles.fallDust, dustStyle]}>
                <Image source={V3_DUEL_VFX.fallDust} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
              </Animated.View>
            </>
          ) : null}
        </Animated.View>
        </Animated.View>

        {playerDefeated ? (
          <>
            {/* GROUND POV: dirt close to the lens + the fallen revolver in the foreground. */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, groundStyle]}>
              <LinearGradient
                colors={['transparent', 'rgba(38, 20, 9, 0.55)', 'rgba(22, 11, 5, 0.92)']}
                locations={[0.55, 0.78, 1]}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[styles.fallenGun, { width: width * 0.92, height: width * 0.92, left: width * 0.04, bottom: height * 0.04 - width * 0.92 * (1 - 838 / 1254) }, fallenGunStyle]}
            >
              <Image source={PLAYER_GROUND_REVOLVER} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
            </Animated.View>
          </>
        ) : null}

        {specialFxActive ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.specialFx, specialFxStyle]}>
            <Image source={specialAsset} style={styles.specialImage} contentFit="contain" transition={0} />
          </Animated.View>
        ) : null}

        {voidShroud && (signalPhase === '집중' || signalPhase === '페이크') ? (
          <View pointerEvents="none" style={styles.voidShade} />
        ) : null}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, defeatShadeStyle]}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#100906' }]} />
        </Animated.View>
        {/* Dark edge vignette for hits (no red flash). */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, vignetteStyle]}>
          <LinearGradient colors={['rgba(8,4,2,0.85)', 'transparent', 'transparent', 'rgba(8,4,2,0.9)']} locations={[0, 0.22, 0.7, 1]} style={StyleSheet.absoluteFillObject} />
          <LinearGradient start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} colors={['rgba(8,4,2,0.8)', 'transparent', 'transparent', 'rgba(8,4,2,0.8)']} locations={[0, 0.2, 0.8, 1]} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.shotFlash, shotFlashStyle]} />
        {earlyWarning ? <View pointerEvents="none" style={styles.earlyEdge} /> : null}

        <View pointerEvents="box-none" style={[styles.hud, { top: paddingTop, left: paddingLeft, right: paddingRight }]}>
          <View style={styles.hudSide}>
            <Text style={styles.hudLabel}>YOU</Text>
            <Hearts value={playerHearts} max={heartsMax} />
          </View>
          <View style={styles.roundBlock}>
            <Text style={styles.roundLabel}>ROUND</Text>
            <Text style={styles.roundValue}>{currentRound}</Text>
          </View>
          <View style={[styles.hudSide, styles.hudRight]}>
            {opponentTierLabel ? <Text style={styles.tierLabel}>{opponentTierLabel}</Text> : null}
            <Text numberOfLines={1} style={[styles.hudLabel, { fontFamily: usesCjkFont(npcName) ? FONT_WESTERN_SERIF : FONT_RYE }]}>{npcName}</Text>
            <Hearts value={opponentHearts} max={heartsMax} />
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

        {recordDuelLabel ? (
          <View pointerEvents="none" style={[styles.recordTag, { top: paddingTop + 58 }]}>
            <Text style={styles.recordTagText}>{recordDuelLabel}</Text>
          </View>
        ) : null}

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
  fallenGun: { position: 'absolute' },
  specialFx: { alignItems: 'center', justifyContent: 'center' },
  specialImage: { width: '72%', height: '72%' },
  voidShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 10, 10, 0.55)' },
  playerHitEdge: { ...StyleSheet.absoluteFillObject, borderWidth: 4, borderColor: 'rgba(139, 37, 0, 0.42)', backgroundColor: 'rgba(139, 37, 0, 0.06)' },
  earlyEdge: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderColor: 'rgba(239, 68, 68, 0.8)' },
  hud: { position: 'absolute', height: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hudSide: { maxWidth: '37%', minWidth: 82, paddingVertical: 5, paddingHorizontal: 9, borderBottomWidth: 1, borderColor: 'rgba(201, 166, 107, 0.42)', backgroundColor: 'rgba(16, 10, 6, 0.62)' },
  hudRight: { alignItems: 'flex-end' },
  hudLabel: { color: uiV3Colors.cream, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  tierLabel: { color: uiV3Colors.gold, fontSize: 7, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  hearts: { marginTop: 2, color: '#D45342', fontSize: 15, letterSpacing: 1 },
  roundBlock: { alignItems: 'center', minWidth: 64, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: 'rgba(16, 10, 6, 0.72)', borderBottomWidth: 1, borderColor: 'rgba(201, 166, 107, 0.42)' },
  roundLabel: { color: uiV3Colors.cream, fontSize: 9, fontWeight: '800', letterSpacing: 2 },
  roundValue: { color: uiV3Colors.gold, fontFamily: FONT_RYE, fontSize: 25, lineHeight: 28 },
  pause: { position: 'absolute', right: 0, top: 58, padding: 9, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.4)', backgroundColor: 'rgba(26, 12, 6, 0.60)' },
  pauseDisabled: { opacity: 0.35 },
  recordTag: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 11, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(201, 166, 107, 0.4)', backgroundColor: 'rgba(16, 10, 6, 0.68)' },
  recordTagText: { color: uiV3Colors.ochre, fontFamily: FONT_RYE, fontSize: 8, letterSpacing: 1.8 },
  cue: { position: 'absolute', left: '8%', right: '8%', height: 76, alignItems: 'center', justifyContent: 'center' },
  weapon: { position: 'absolute' },
  weaponMuzzle: { position: 'absolute', width: '52%', height: '42%', left: '-7%', top: '-7%' },
  weaponSmoke: { position: 'absolute', width: '40%', height: '40%', left: '7%', top: '2%' },
  shotFlash: { backgroundColor: '#FFD08A' },
  bossRule: { position: 'absolute', left: '35%', right: '35%', top: 0, height: 2, backgroundColor: uiV3Colors.gold, opacity: 0.68 },
});
