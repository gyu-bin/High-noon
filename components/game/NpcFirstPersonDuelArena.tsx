import { Ionicons } from '@expo/vector-icons';
import MaskedView from '@react-native-masked-view/masked-view';
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
  APPROVED_DUEL_BACKGROUNDS,
  getV3NpcPose,
  V3_DUEL_VFX,
  V3_FIRST_PERSON_WEAPON,
  V3_PLAYER_OVER_SHOULDER,
  V3_NPC_DIAGONAL_FIRE,
  V3_PLAYER_OVER_SHOULDER_STAGES,
  type V3NpcPose,
} from '@/constants/v3DuelAssets';
import { characterArtDisplayScale, npcMuzzleStyle, scaledArtStyle } from '@/constants/characterArtMetadata';
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
import { getCharacterLabels } from '@/utils/characterLabels';
import type { PlayerCharacterId } from '@/constants/characters';
import { pickDuelBackground, type DuelBackgroundId } from '@/utils/duelBackgroundSelection';

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
  backgroundId?: DuelBackgroundId;
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
  playerCharacterId?: number;
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
  backgroundId,
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
  playerCharacterId = 1,
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
  // Capture previews may inject an ID; normal screens own selection per match.
  const [fallbackBackgroundId] = useState(() => backgroundId ?? pickDuelBackground());
  const { t } = useTranslation();
  const playerLabels = getCharacterLabels(t, playerCharacterId as PlayerCharacterId);
  const reduceMotion = useReducedMotion();
  const landscape = width > height;
  // Feet stay on the same ground line; the body grows upward (NPC_DUEL_SCALE).
  const baseNpcSize = landscape
    ? Math.min(height * 0.32, width * 0.18)
    : Math.min(width * 0.56, height * 0.34);
  // Diagonal face-off (portrait): player lower-left from behind, opponent upper-right.
  const diagonal = !landscape;
  const npcBox = npcLaneBox({
    baseSize: baseNpcSize,
    // Portrait: every opponent stands on the same ground line and at the same scale as NPC01.
    footY: height * (landscape ? 0.7 : diagonal ? 0.66 : NPC01_DUEL_FOOT_Y),
    scale: (__DEV__ ? combatPreview?.scale : undefined) ?? (landscape && npcId !== 1 ? NPC_DUEL_SCALE : NPC01_DUEL_SCALE),
  });
  const npcSize = npcBox.size;
  const npcOffsetX = diagonal ? width * 0.18 : 0;
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
  const playerBodyStyle = useAnimatedStyle(() => ({
    opacity: 1 - ground.value,
    transform: [
      { translateX: -width * 0.06 * gunDrop.value + kickX.value * 1.05 },
      { translateY: height * 0.035 * gunDip.value + height * 0.48 * gunDrop.value + kickY.value * 1.05 },
      { rotate: `${7 * gunDip.value + 42 * gunDrop.value - recoil.value * 2}deg` },
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
  const npcMuzzleOpacityStyle = useAnimatedStyle(() => ({ opacity: npcMuzzle.value }));
  const shotFlashStyle = useAnimatedStyle(() => ({ opacity: muzzle.value * 0.2 }));

  const dedicatedPoses = NPC_COMBAT_POSES[npcId];
  const npcRenderPose = useMemo(() => {
    if (!npcDefeated) return toV3NpcPose(npcPose);
    return npcPoseForStage(npcStage === 'none' ? 'hit' : npcStage, {
      fall: dedicatedPoses?.fall != null,
      down: dedicatedPoses?.down != null,
    });
  }, [dedicatedPoses, npcDefeated, npcPose, npcStage]);
  const diagonalFire = diagonal ? V3_NPC_DIAGONAL_FIRE[npcId] : undefined;
  const npcFlashStyle = diagonalFire
    ? { left: npcSize * (diagonalFire.muzzle.x - 0.175), top: npcSize * (diagonalFire.muzzle.y - 0.119), width: npcSize * 0.35, height: npcSize * 0.238 }
    : npcMuzzleStyle(npcId, npcSize);
  const npcImageSource = useMemo(() => {
    if (npcRenderPose === 'fall' && dedicatedPoses?.fall) return dedicatedPoses.fall;
    if (npcRenderPose === 'down' && dedicatedPoses?.down) return dedicatedPoses.down;
    if (npcRenderPose === 'fire' && diagonalFire) return diagonalFire.source;
    // The clarity "down" frame is the kneel.
    return getV3NpcPose(npcId, npcRenderPose === 'kneel' ? 'down' : (npcRenderPose as V3NpcPose));
  }, [dedicatedPoses, diagonalFire, npcId, npcRenderPose]);

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
  const playerBodyWidth = landscape ? width * 0.32 : width * 0.76;
  const playerBodyHeight = landscape ? height * 0.62 : height * 0.5;
  // Over-shoulder read: the revolver arm is drawn first and sits to the left of the player, and the
  // rear three-quarter body is drawn on top so the arm appears to come from behind the shoulder.
  // The body runs off the bottom/right screen edges, so only a soft fade at its very bottom is needed.
  const npcName = opponentName ?? getNpcDisplayName(t, npcId);
  const weaponAiming = signalPhase === '집중' || signalPhase === '페이크' || signalPhase === '뱅';
  const weaponSource = playerShotActive
    ? V3_FIRST_PERSON_WEAPON.fire
    : weaponAiming || !landscape
      // Portrait over-shoulder: the idle art's arm enters from the top, which cannot come from the
      // player's shoulder, so the lowered gun reuses the draw art turned downward instead.
      ? V3_FIRST_PERSON_WEAPON.draw
      : V3_FIRST_PERSON_WEAPON.idle;
  // Portrait over-shoulder aim: the source art points up-left; turn it so the barrel points at the
  // opponent in the middle of the screen. Lowered (READY) keeps the gun down beside the body.
  const weaponPose = landscape
    ? { rotate: '0deg', right: -weaponSize * 0.06, bottom: -weaponSize * 0.1 }
    : playerShotActive || weaponAiming
      ? { rotate: '30deg', right: width * 0.2, bottom: -weaponSize * 0.2 }
      : { rotate: '-62deg', right: width * 0.2, bottom: -weaponSize * 0.42 };
  // Staged over-shoulder art (portrait only) has the gun arm painted in, so the floating weapon is
  // not drawn and the flash/smoke sit on the FIRE frame's barrel tip instead.
  const playerStages = landscape ? undefined : V3_PLAYER_OVER_SHOULDER_STAGES[playerCharacterId];
  const playerArtStage = playerShotActive ? 'fire' : weaponAiming ? 'aim' : 'ready';
  const playerArtHeight = Math.min(playerBodyHeight, playerBodyWidth * 1.5);
  const playerArtWidth = playerArtHeight / 1.5;
  const stagedMuzzle = playerStages && {
    left: playerBodyWidth - playerArtWidth + playerArtWidth * playerStages.muzzle.x,
    top: playerBodyHeight - playerArtHeight + playerArtHeight * playerStages.muzzle.y,
  };
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
          source={APPROVED_DUEL_BACKGROUNDS[backgroundId ?? fallbackBackgroundId]}
          width={width}
          height={height}
          bleed={1.18}
        />
        {/* Approved backgrounds contain their own lighting. No static central dim;
            impact/ability treatments below remain transient gameplay feedback. */}

        <Animated.View pointerEvents="none" style={[styles.npcLane, {
          top: npcBox.top,
          // The player takes the lower-left, so the opponent stands right of centre.
          left: (width - npcSize) / 2 + npcOffsetX,
          width: npcSize,
          height: npcSize,
        }, collapseStyle]}>
          {(abilityEcho || abilityMirror) && opponentCharacterId == null ? (
            <Image
              source={npcImageSource}
              style={[styles.afterImage, npcArtStyle, npcId === 20 && styles.afterImageBakedEcho]}
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
              <Animated.View style={[styles.npcMuzzle, npcFlashStyle, npcMuzzleOpacityStyle]}>
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
            <Text numberOfLines={1} style={styles.hudLabel}>YOU · {playerLabels.name}</Text>
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

        {/* Portrait is a diagonal face-off: the player (art mirrored) stands lower-left, on the side every NPC faces and fires toward. */}
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, diagonal ? styles.mirrored : null]}>
        {!playerStages ? <Animated.View pointerEvents="none" style={[styles.weapon, { width: weaponSize, height: weaponSize, right: weaponPose.right, bottom: weaponPose.bottom }, weaponStyle]}>
          <View style={[StyleSheet.absoluteFillObject, { transform: [{ rotate: weaponPose.rotate }] }]}>
            <Image source={weaponSource} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} priority="high" />
            <Animated.View style={[styles.weaponMuzzle, muzzleStyle]}>
              <Image source={V3_DUEL_VFX.muzzleFlash} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
            </Animated.View>
            <Animated.View style={[styles.weaponSmoke, smokeStyle]}>
              <Image source={V3_DUEL_VFX.gunSmoke} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
            </Animated.View>
          </View>
        </Animated.View> : null}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.playerBody,
            {
              width: playerBodyWidth,
              height: playerBodyHeight,
              right: landscape ? -width * 0.015 : -width * 0.06,
              bottom: landscape ? -height * 0.18 : -height * 0.12,
            },
            playerBodyStyle,
          ]}
        >
          <MaskedView
            style={StyleSheet.absoluteFillObject}
            maskElement={(
              <LinearGradient
                colors={['#000', '#000', 'transparent']}
                locations={[0, landscape ? 0.56 : 0.9, landscape ? 0.88 : 1]}
                style={StyleSheet.absoluteFillObject}
              />
            )}
          >
            {playerStages ? (['ready', 'aim', 'fire'] as const).map((stage) => (
              // All frames stay mounted so a stage change is an opacity swap, never a decode gap.
              <Image
                key={stage}
                source={playerStages[stage]}
                style={[StyleSheet.absoluteFillObject, { opacity: stage === playerArtStage ? 1 : 0 }]}
                contentFit="contain"
                contentPosition="bottom right"
                transition={0}
                priority="high"
              />
            )) : (
              <Image
                source={V3_PLAYER_OVER_SHOULDER[playerCharacterId as keyof typeof V3_PLAYER_OVER_SHOULDER] ?? V3_PLAYER_OVER_SHOULDER[1]}
                style={StyleSheet.absoluteFillObject}
                contentFit="contain"
                contentPosition="bottom right"
                transition={0}
                priority="high"
              />
            )}
          </MaskedView>
          {stagedMuzzle ? (
            <>
              <Animated.View style={[styles.stagedMuzzle, { width: weaponSize * 0.52, height: weaponSize * 0.42, left: stagedMuzzle.left - weaponSize * 0.26, top: stagedMuzzle.top - weaponSize * 0.21 }, muzzleStyle]}>
                <Image source={V3_DUEL_VFX.muzzleFlash} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
              </Animated.View>
              <Animated.View style={[styles.stagedMuzzle, { width: weaponSize * 0.4, height: weaponSize * 0.4, left: stagedMuzzle.left - weaponSize * 0.2, top: stagedMuzzle.top - weaponSize * 0.3 }, smokeStyle]}>
                <Image source={V3_DUEL_VFX.gunSmoke} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} />
              </Animated.View>
            </>
          ) : null}
        </Animated.View>
        </View>

        {bossFlag ? <View pointerEvents="none" style={styles.bossRule} /> : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  vignette: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 5, 2, 0.20)' },
  npcLane: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  // NPC20's art already carries baked echoes; keep the runtime cue but at half strength.
  afterImageBakedEcho: { opacity: 0.12 },
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
  playerBody: { position: 'absolute' },
  weapon: { position: 'absolute' },
  stagedMuzzle: { position: 'absolute' },
  mirrored: { transform: [{ scaleX: -1 }] },
  weaponMuzzle: { position: 'absolute', width: '52%', height: '42%', left: '-7%', top: '-7%' },
  weaponSmoke: { position: 'absolute', width: '40%', height: '40%', left: '7%', top: '2%' },
  shotFlash: { backgroundColor: '#FFD08A' },
  bossRule: { position: 'absolute', left: '35%', right: '35%', top: 0, height: 2, backgroundColor: uiV3Colors.gold, opacity: 0.68 },
});
