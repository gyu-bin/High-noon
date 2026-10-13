import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { PlayerCharacterSprite } from './CharacterSprites';
import { DuelCoverImage } from './DuelCoverImage';
import { DevNpcDuelInput } from './DevNpcDuelInput';
import { DuelSignalBoard } from './DuelSignalBoard';
import type { NpcDuelArenaProps } from './NpcDuelArenaProps';
import { characterArtDisplayScale, scaledArtStyle } from '@/constants/characterArtMetadata';
import { CLARITY_NPCS, CLARITY_PLAYERS } from '@/constants/clarityCharacterAssets';
import { faceoffStandingArt } from '@/constants/npcFaceoffPoseArt';
import { DUEL_SPRITE_TIMING } from '@/lib/duelSprite/poseSpecs';
import { NPC_COMBAT_POSES } from '@/constants/combatPoses';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { faceoffContainedLeft, faceoffFlip, faceoffGroundFraction, faceoffMuzzleAnchor, faceoffOutwardPlacement, faceoffPairLayout } from '@/constants/npcFaceoffPresentation';
import type { PlayerCharacterId } from '@/constants/characters';
import type { SpritePose } from '@/constants/sprites';
import { uiV3Colors } from '@/constants/theme';
import { APPROVED_DUEL_BACKGROUNDS, getV3NpcPose, V3_DUEL_VFX, type V3NpcPose } from '@/constants/v3DuelAssets';
import { isLethalHit, npcPoseForStage, npcTimeline, playerTimeline, type NpcReactionStage, type PlayerReactionStage } from '@/utils/combatReaction';
import { getCharacterLabels } from '@/utils/characterLabels';
import { pickDuelBackground } from '@/utils/duelBackgroundSelection';
import { getNpcDisplayName } from '@/utils/npcLabels';

function Hearts({ value, max }: { value: number; max: number }) {
  return <Text accessibilityLabel={`${value} hearts`} style={styles.hearts}>{Array.from({ length: max }, (_, index) => index < value ? '♥' : '♡').join(' ')}</Text>;
}

function Portrait({ kind, id }: { kind: 'player' | 'npc'; id: number }) {
  const source = (kind === 'player' ? CLARITY_PLAYERS : CLARITY_NPCS)[id]?.idle;
  return <View style={styles.portrait}><Image source={source} style={[scaledArtStyle(86, 86, characterArtDisplayScale(kind, id)), styles.portraitArt]} contentFit="contain" transition={0} /></View>;
}

/** NPC-only third-person presentation of authoritative engine props. */
export function NpcFaceoffDuelArena({
  width, height, paddingTop, paddingBottom, paddingLeft, paddingRight,
  npcId, backgroundId, npcPose, playerDefeated,
  signalPhase, blindBangText, hideBangText, voidShroud, echoBangMiddleSignal,
  specialPresentation, opponentHearts, playerHearts, currentRound,
  shootCapturesEarly, shootActive, playerShotActive, playerCharacterId = 1,
  npcShotActive = false, opponentName, opponentTierLabel, recordDuelLabel,
  heartsMax = 3, earlyWarning, onShootPress, onPause, pauseDisabled,
  contentShakeStyle, combatPreview, bossFlag,
}: NpcDuelArenaProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [fallbackBackgroundId] = useState(() => backgroundId ?? pickDuelBackground());
  const landscape = width > height;
  const preferredSize = (landscape ? Math.min(height * 0.60, width * 0.32) : Math.min(width * 0.62, height * 0.40)) * ((__DEV__ ? combatPreview?.scale : undefined) ?? 1);
  const fittedPair = faceoffPairLayout({ playerId: playerCharacterId, npcId, width, preferredSize, paddingLeft, paddingRight, portrait: !landscape });
  // Whole-screen shake needs the original actor margins for its existing travel.
  const pairLayout = faceoffOutwardPlacement(fittedPair, { width, paddingLeft, paddingRight, portrait: !landscape && contentShakeStyle == null });
  const size = pairLayout.size;
  const groundY = Math.min(height * (landscape ? 0.82 : 0.75), height - paddingBottom - 18);
  const playerTop = groundY - size * faceoffGroundFraction('player', playerCharacterId);
  const npcTop = groundY - size * faceoffGroundFraction('npc', npcId);
  const playerLabels = getCharacterLabels(t, playerCharacterId as PlayerCharacterId);
  const npcName = opponentName ?? getNpcDisplayName(t, npcId);
  const [timedNpcStage, setNpcStage] = useState<NpcReactionStage>('none');
  const [timedPlayerStage, setPlayerStage] = useState<PlayerReactionStage>('none');
  const npcStage = (__DEV__ ? combatPreview?.npcStage : undefined) ?? timedNpcStage;
  const playerStage = (__DEV__ ? combatPreview?.playerStage : undefined) ?? timedPlayerStage;
  const npcHitLethal = isLethalHit(opponentHearts);
  const playerHitLethal = isLethalHit(playerHearts);
  const defeatScope = `${npcId}:${playerCharacterId}:${currentRound}`;
  const [finalNpcScope, holdFinalNpc] = useState<string | null>(null);
  const [finalPlayerScope, holdFinalPlayer] = useState<string | null>(null);
  // Continue clears the reveal flags before navigation. Hold only a defeat
  // already revealed by the engine, until a new round/identity or restored heart.
  useEffect(() => {
    holdFinalNpc(previous => !isLethalHit(opponentHearts) ? null
      : npcPose === 'defeat' ? defeatScope : previous === defeatScope ? previous : null);
  }, [defeatScope, npcPose, opponentHearts]);
  useEffect(() => {
    holdFinalPlayer(previous => !isLethalHit(playerHearts) ? null
      : playerDefeated ? defeatScope : previous === defeatScope ? previous : null);
  }, [defeatScope, playerDefeated, playerHearts]);
  const npcDefeated = npcPose === 'defeat' || (finalNpcScope === defeatScope && isLethalHit(opponentHearts));
  const playerDefeatActive = playerDefeated || (finalPlayerScope === defeatScope && isLethalHit(playerHearts));
  const finalPlayerHit = playerDefeatActive && isLethalHit(playerHearts);
  // Reactions start at the same approved resting origin; only pose containment may shift them.
  const playerStandingLeft = pairLayout.playerLeft;
  const npcStandingLeft = pairLayout.npcLeft;

  // Use the same presentation timelines as the legacy renderer. Results/timing
  // arrive from the engine and this layer never writes them back.
  useEffect(() => {
    if (!npcDefeated) { setNpcStage('none'); return; }
    const timers = npcTimeline(npcHitLethal ? 0 : 1).map(step => setTimeout(() => setNpcStage(step.stage), reduceMotion ? step.at / 3 : step.at));
    return () => timers.forEach(clearTimeout);
  }, [npcDefeated, npcHitLethal, defeatScope, reduceMotion]);
  useEffect(() => {
    if (!playerDefeatActive) { setPlayerStage('none'); return; }
    const timers = playerTimeline(playerHitLethal ? 0 : 1).map(step => setTimeout(() => setPlayerStage(step.stage), step.at));
    return () => timers.forEach(clearTimeout);
  }, [playerDefeatActive, playerHitLethal, defeatScope]);

  const aiming = signalPhase === '집중' || signalPhase === '페이크' || signalPhase === '뱅';
  const playerStandingArt = faceoffStandingArt('player', playerCharacterId, playerShotActive ? 'fire' : aiming ? 'aim' : 'ready');
  const npcStandingArt = faceoffStandingArt('npc', npcId, npcShotActive ? 'fire' : npcPose === 'aim' || npcPose === 'shoot' || aiming ? 'aim' : 'ready');
  const dedicated = NPC_COMBAT_POSES[npcId];
  const npcArtPose = npcDefeated
    ? npcPoseForStage(npcStage === 'none' ? 'hit' : npcStage, { fall: dedicated?.fall != null, down: dedicated?.down != null })
    : npcStandingArt.pose === 'faceoff' ? 'fire' : npcStandingArt.pose;
  const npcReactionVisible = npcDefeated && npcArtPose !== 'idle';
  const npcSource = npcArtPose === 'fall' && dedicated?.fall ? dedicated.fall
    : npcArtPose === 'down' && dedicated?.down ? dedicated.down
      : npcReactionVisible ? getV3NpcPose(npcId, npcArtPose === 'kneel' ? 'down' : npcArtPose as V3NpcPose) : npcStandingArt.source;
  const playerPose: SpritePose = playerDefeatActive
    ? !finalPlayerHit && playerStage === 'recover' ? 'idle' : 'defeat'
    : playerShotActive ? 'shoot' : aiming ? 'aim' : 'idle';
  const playerReactionVisible = playerDefeatActive && playerPose === 'defeat';
  const playerFlip = playerReactionVisible ? faceoffFlip('player', playerCharacterId, playerPose) : playerStandingArt.flipHorizontal;
  const npcFlip = npcReactionVisible ? faceoffFlip('npc', npcId, npcArtPose) : npcStandingArt.flipHorizontal;
  const playerBoundsPose = playerReactionVisible ? playerPose : playerStandingArt.pose === 'draw' ? 'draw' : 'fire';
  const npcBoundsPose = npcReactionVisible ? npcArtPose : npcStandingArt.pose === 'draw' ? 'draw' : 'fire';
  const playerLeft = faceoffContainedLeft({ kind: 'player', id: playerCharacterId, pose: playerBoundsPose, left: playerStandingLeft, size, width, paddingLeft: pairLayout.actorPaddingLeft, paddingRight: pairLayout.actorPaddingRight });
  const npcLeft = faceoffContainedLeft({ kind: 'npc', id: npcId, pose: npcBoundsPose, left: npcStandingLeft, size, width, paddingLeft: pairLayout.actorPaddingLeft, paddingRight: pairLayout.actorPaddingRight });
  const playerGroundOffset = playerReactionVisible ? 0 : faceoffGroundFraction('player', playerCharacterId) - playerStandingArt.groundFraction;
  const npcGroundOffset = npcReactionVisible ? 0 : faceoffGroundFraction('npc', npcId) - npcStandingArt.groundFraction;
  const playerAnchor = playerReactionVisible ? faceoffMuzzleAnchor('player', playerCharacterId) : playerStandingArt.muzzle;
  const npcAnchor = npcReactionVisible ? faceoffMuzzleAnchor('npc', npcId) : npcStandingArt.muzzle;
  const playerMuzzleX = (playerFlip ? 1 - playerAnchor.x : playerAnchor.x) * size;
  const npcMuzzleX = (npcFlip ? 1 - npcAnchor.x : npcAnchor.x) * size;

  const playerRecoil = useSharedValue(0);
  const npcRecoil = useSharedValue(0);
  useEffect(() => {
    if (!playerShotActive) { playerRecoil.value = 0; return; }
    playerRecoil.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: DUEL_SPRITE_TIMING.shootKickInMs, easing: Easing.out(Easing.cubic) }), withTiming(0.35, { duration: DUEL_SPRITE_TIMING.shootKickHoldMs, easing: Easing.out(Easing.quad) }));
    return () => cancelAnimation(playerRecoil);
  }, [playerRecoil, playerShotActive]);
  useEffect(() => {
    if (!npcShotActive) { npcRecoil.value = 0; return; }
    npcRecoil.value = withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: DUEL_SPRITE_TIMING.shootKickInMs, easing: Easing.out(Easing.cubic) }), withTiming(0.35, { duration: DUEL_SPRITE_TIMING.shootKickHoldMs, easing: Easing.out(Easing.quad) }));
    return () => cancelAnimation(npcRecoil);
  }, [npcRecoil, npcShotActive]);
  const playerFlash = useSharedValue(0);
  const playerSmoke = useSharedValue(0);
  const npcFlash = useSharedValue(0);
  const npcSmoke = useSharedValue(0);
  const impact = useSharedValue(0);
  const dust = useSharedValue(0);
  const knockX = useSharedValue(0);
  const knockY = useSharedValue(0);
  const knockRot = useSharedValue(0);
  const kick = useSharedValue(0);
  const vignette = useSharedValue(0);
  const specialFx = useSharedValue(0);
  useEffect(() => {
    if (!playerShotActive) { playerFlash.value = 0; playerSmoke.value = 0; return; }
    playerFlash.value = withSequence(withTiming(1, { duration: 12 }), withTiming(0, { duration: reduceMotion ? 90 : 180 }));
    playerSmoke.value = withSequence(withTiming(0.9, { duration: reduceMotion ? 1 : 45 }), withTiming(0, { duration: reduceMotion ? 130 : 440 }));
    return () => { cancelAnimation(playerFlash); cancelAnimation(playerSmoke); };
  }, [playerFlash, playerShotActive, playerSmoke, reduceMotion]);
  useEffect(() => {
    if (!npcShotActive) { npcFlash.value = 0; npcSmoke.value = 0; return; }
    npcFlash.value = withSequence(withTiming(1, { duration: 12 }), withTiming(0, { duration: reduceMotion ? 90 : 180 }));
    npcSmoke.value = withSequence(withTiming(0.9, { duration: reduceMotion ? 1 : 45 }), withTiming(0, { duration: reduceMotion ? 130 : 440 }));
    return () => { cancelAnimation(npcFlash); cancelAnimation(npcSmoke); };
  }, [npcFlash, npcShotActive, npcSmoke, reduceMotion]);
  useEffect(() => {
    const timing = (value: number, duration: number) => withTiming(value, { duration: reduceMotion ? 1 : duration, easing: Easing.out(Easing.cubic) });
    switch (npcStage) {
      case 'none': knockX.value = 0; knockY.value = 0; knockRot.value = 0; impact.value = 0; dust.value = 0; break;
      case 'hit': impact.value = withSequence(timing(1, 30), timing(0, 260)); knockX.value = timing(0.045, 90); knockY.value = timing(-0.012, 90); knockRot.value = timing(3.5, 90); break;
      case 'stagger': knockX.value = withSequence(timing(-0.03, 120), timing(0.02, 120)); knockRot.value = withSequence(timing(-2.5, 120), timing(1.5, 120)); knockY.value = timing(0, 200); break;
      case 'recover': knockX.value = timing(0, 260); knockY.value = timing(0, 260); knockRot.value = timing(0, 260); break;
      case 'kneel': knockX.value = timing(0, 160); knockRot.value = timing(0, 160); knockY.value = withSequence(timing(0.025, 140), timing(0, 160)); dust.value = withSequence(timing(0.8, 90), timing(0, 700)); break;
      case 'down': dust.value = withSequence(timing(1, 80), timing(0, 900)); break;
    }
  }, [dust, impact, knockRot, knockX, knockY, npcStage, reduceMotion]);
  useEffect(() => {
    if (playerStage === 'none' || playerStage === 'recover') { kick.value = 0; vignette.value = withTiming(0, { duration: 200 }); return; }
    if (playerStage === 'impact') {
      if (!reduceMotion) kick.value = withSequence(withTiming(1, { duration: 45 }), withTiming(0, { duration: 180 }));
      vignette.value = withSequence(withTiming(finalPlayerHit ? 0.6 : 0.42, { duration: 60 }), withTiming(0, { duration: 360 }));
    }
  }, [finalPlayerHit, kick, playerStage, reduceMotion, vignette]);

  const specialFxActive = (specialPresentation === 'thunderbolt' && (signalPhase === '페이크' || signalPhase === '뱅')) || (specialPresentation === 'void' && signalPhase === '뱅') || (specialPresentation === 'redEye' && (signalPhase === '집중' || signalPhase === '페이크'));
  useEffect(() => {
    if (!specialFxActive) { specialFx.value = 0; return; }
    specialFx.value = withSequence(withTiming(1, { duration: reduceMotion ? 1 : 70 }), withTiming(specialPresentation === 'redEye' ? 0.35 : 0, { duration: reduceMotion ? 180 : specialPresentation === 'redEye' ? 600 : 160 }));
    return () => cancelAnimation(specialFx);
  }, [reduceMotion, specialFx, specialFxActive, specialPresentation]);
  const playerRecoilStyle = useAnimatedStyle(() => reduceMotion ? {} : { transform: [{ translateY: -2 * playerRecoil.value }] });
  const npcRecoilStyle = useAnimatedStyle(() => reduceMotion ? {} : { transform: [{ translateY: -2 * npcRecoil.value }] });
  const playerFlashStyle = useAnimatedStyle(() => ({ opacity: playerFlash.value }));
  const npcFlashStyle = useAnimatedStyle(() => ({ opacity: npcFlash.value }));
  const playerSmokeStyle = useAnimatedStyle(() => ({ opacity: playerSmoke.value, transform: [{ translateY: -16 * playerSmoke.value }, { scale: 0.85 + playerSmoke.value * 0.3 }] }));
  const npcSmokeStyle = useAnimatedStyle(() => ({ opacity: npcSmoke.value, transform: [{ translateY: -16 * npcSmoke.value }, { scale: 0.85 + npcSmoke.value * 0.3 }] }));
  const npcReactionStyle = useAnimatedStyle(() => ({ transformOrigin: 'center bottom', transform: [{ translateX: knockX.value * size }, { translateY: knockY.value * size }, { rotate: `${knockRot.value}deg` }] }));
  const impactStyle = useAnimatedStyle(() => ({ opacity: impact.value }));
  const dustStyle = useAnimatedStyle(() => ({ opacity: dust.value }));
  const kickStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -4 * kick.value }, { translateY: 5 * kick.value }] }));
  const vignetteStyle = useAnimatedStyle(() => ({ opacity: vignette.value }));
  const specialStyle = useAnimatedStyle(() => ({ opacity: specialFx.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: playerFlash.value * 0.2 }));
  const abilityAfterImage = (specialPresentation === 'echo' && (signalPhase === '페이크' || signalPhase === '뱅')) || (specialPresentation === 'mirror' && (signalPhase === '집중' || signalPhase === '페이크'));
  const specialAsset = specialPresentation === 'thunderbolt' ? V3_DUEL_VFX.thunderbolt : specialPresentation === 'void' ? V3_DUEL_VFX.voidCrack : V3_DUEL_VFX.redEye;
  const playerStandingStyle = [scaledArtStyle(size, size, playerStandingArt.artScale), { transform: [{ translateY: playerGroundOffset * size }] }];
  const npcArtStyle = [scaledArtStyle(size, size, npcReactionVisible ? characterArtDisplayScale('npc', npcId) : npcStandingArt.artScale), { transform: [{ translateY: npcGroundOffset * size }] }];
  const flashBox = (x: number, y: number) => ({ left: x - size * 0.175, top: y * size - size * 0.119, width: size * 0.35, height: size * 0.238 });
  const smokeBox = (x: number, y: number) => ({ left: x - size * 0.16, top: y * size - size * 0.20, width: size * 0.32, height: size * 0.32 });

  return <View style={[styles.root, { width, height }]}>
    {__DEV__ ? <DevNpcDuelInput signalPhase={signalPhase} shootActive={shootActive} onShootPress={onShootPress} scope={defeatScope} /> : null}
    <Pressable accessibilityLabel={t('game.duelTapArea')} accessibilityRole="button" accessibilityState={{ disabled: !shootCapturesEarly }} accessibilityHint={shootActive ? t('game.tapHintShoot') : t('game.tapHintEarly')} disabled={!shootCapturesEarly} onPressIn={onShootPress} style={StyleSheet.absoluteFill} />
    <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, contentShakeStyle]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, kickStyle]}>
        <DuelCoverImage source={APPROVED_DUEL_BACKGROUNDS[backgroundId ?? fallbackBackgroundId]} width={width} height={height} bleed={1.18} />
        <View style={[styles.lane, { left: playerLeft, top: playerTop, width: size, height: size }]}>
          {playerReactionVisible ? <PlayerCharacterSprite characterId={playerCharacterId} width={size} height={size} pose={playerPose} flipHorizontal={playerFlip} defeatSettlesDown={finalPlayerHit} defeatDropPx={0} muzzleFlashEnabled={false} downOffsetY={playerCharacterId === 2 ? size * (1221 / 1254 - 0.9378) : 0} /> : (
            <Animated.View style={[{ width: size, height: size }, playerRecoilStyle]}>
              <View style={[{ width: size, height: size }, playerFlip && styles.flipped]}>
                <Image source={playerStandingArt.source} style={playerStandingStyle} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={0} />
              </View>
            </Animated.View>
          )}
          <Animated.View style={[styles.effect, flashBox(playerMuzzleX, playerAnchor.y + playerGroundOffset), playerFlashStyle]}><Image source={V3_DUEL_VFX.muzzleFlash} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} /></Animated.View>
          <Animated.View style={[styles.effect, smokeBox(playerMuzzleX, playerAnchor.y + playerGroundOffset), playerSmokeStyle]}><Image source={V3_DUEL_VFX.gunSmoke} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} /></Animated.View>
        </View>
        <Animated.View style={[styles.lane, { left: npcLeft, top: npcTop, width: size, height: size }, npcReactionStyle]}>
          <Animated.View style={[{ width: size, height: size }, !npcReactionVisible && npcRecoilStyle]}>
            <View style={[{ width: size, height: size }, npcFlip && styles.flipped]}>
            {abilityAfterImage ? <Image source={npcSource} style={[styles.afterImage, npcArtStyle, { transform: [{ translateX: -18 }, { translateY: 8 + npcGroundOffset * size }] }, npcId === 20 && styles.bakedEcho]} contentFit="contain" transition={0} /> : null}
            <Image source={npcSource} style={npcArtStyle} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={0} />
            </View>
          </Animated.View>
          <Animated.View style={[styles.effect, flashBox(npcMuzzleX, npcAnchor.y + npcGroundOffset), npcFlashStyle]}><Image source={V3_DUEL_VFX.muzzleFlash} style={[StyleSheet.absoluteFillObject, styles.flipped]} contentFit="contain" transition={0} /></Animated.View>
          <Animated.View style={[styles.effect, smokeBox(npcMuzzleX, npcAnchor.y + npcGroundOffset), npcSmokeStyle]}><Image source={V3_DUEL_VFX.gunSmoke} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} /></Animated.View>
          {npcDefeated ? <><Animated.View style={[styles.impact, impactStyle]}><Image source={V3_DUEL_VFX.bulletImpact} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} /></Animated.View><Animated.View style={[styles.dust, dustStyle]}><Image source={V3_DUEL_VFX.fallDust} style={StyleSheet.absoluteFillObject} contentFit="contain" transition={0} /></Animated.View></> : null}
        </Animated.View>
      </Animated.View>
      {specialFxActive ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.specialFx, specialStyle]}><Image source={specialAsset} style={styles.specialImage} contentFit="contain" transition={0} /></Animated.View> : null}
      {voidShroud && (signalPhase === '집중' || signalPhase === '페이크') ? <View pointerEvents="none" style={styles.voidShade} /> : null}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, vignetteStyle]}><LinearGradient colors={['rgba(8,4,2,0.85)', 'transparent', 'transparent', 'rgba(8,4,2,0.9)']} locations={[0, 0.22, 0.7, 1]} style={StyleSheet.absoluteFillObject} /><LinearGradient start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} colors={['rgba(8,4,2,0.8)', 'transparent', 'transparent', 'rgba(8,4,2,0.8)']} locations={[0, 0.2, 0.8, 1]} style={StyleSheet.absoluteFillObject} /></Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.shotFlash, flashStyle]} />
      {earlyWarning ? <View pointerEvents="none" style={styles.earlyEdge} /> : null}
      <View pointerEvents="box-none" style={[styles.hud, { top: paddingTop, left: paddingLeft, right: paddingRight }]}>
        <View style={[styles.hudSide, styles.hudInfoRow]}><Portrait kind="player" id={playerCharacterId} /><View style={styles.hudText}><Text numberOfLines={1} style={styles.hudLabel}>YOU · {playerLabels.name}</Text><Hearts value={playerHearts} max={heartsMax} /></View></View>
        <View style={styles.roundBlock}><Text style={styles.roundLabel}>ROUND</Text><Text style={styles.roundValue}>{currentRound}</Text></View>
        <View style={[styles.hudSide, styles.hudInfoRow]}><View style={[styles.hudText, styles.hudRight]}>{opponentTierLabel ? <Text style={styles.tierLabel}>{opponentTierLabel}</Text> : null}<Text numberOfLines={1} style={[styles.hudLabel, { fontFamily: usesCjkFont(npcName) ? FONT_WESTERN_SERIF : FONT_RYE }]}>{npcName}</Text><Hearts value={opponentHearts} max={heartsMax} /></View><Portrait kind="npc" id={npcId} /></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('game.pause')} disabled={pauseDisabled} onPress={onPause} style={[styles.pause, pauseDisabled && styles.pauseDisabled]}><Ionicons color={uiV3Colors.cream} name="pause" size={16} /></Pressable>
      </View>
      {recordDuelLabel ? <View pointerEvents="none" style={[styles.recordTag, { top: paddingTop + 58 }]}><Text style={styles.recordTagText}>{recordDuelLabel}</Text></View> : null}
      <View pointerEvents="none" style={[styles.cue, { top: Math.max(paddingTop + 90, height * (landscape ? 0.20 : 0.24)) }]}><DuelSignalBoard phase={signalPhase} variant="cinematic" blindBangText={blindBangText} hideBangText={hideBangText} voidShroud={voidShroud} echoBangMiddle={echoBangMiddleSignal} /></View>
      {bossFlag ? <View pointerEvents="none" style={styles.bossRule} /> : null}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: uiV3Colors.background },
  lane: { position: 'absolute' }, flipped: { transform: [{ scaleX: -1 }] }, effect: { position: 'absolute' },
  afterImage: { position: 'absolute', opacity: 0.24, transform: [{ translateX: -18 }, { translateY: 8 }], tintColor: uiV3Colors.diamondBlue }, bakedEcho: { opacity: 0.12 },
  impact: { position: 'absolute', width: 88, height: 88, top: '36%', left: '38%' }, dust: { position: 'absolute', width: '98%', height: '45%', bottom: '-10%' },
  specialFx: { alignItems: 'center', justifyContent: 'center' }, specialImage: { width: '72%', height: '72%' }, voidShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 10, 10, 0.55)' },
  shotFlash: { backgroundColor: '#FFD08A' }, earlyEdge: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderColor: 'rgba(239, 68, 68, 0.8)' },
  hud: { position: 'absolute', height: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  hudSide: { maxWidth: '37%', minWidth: 82, paddingVertical: 5, paddingHorizontal: 9, borderBottomWidth: 1, borderColor: 'rgba(201, 166, 107, 0.42)', backgroundColor: 'rgba(16, 10, 6, 0.62)' }, hudRight: { alignItems: 'flex-end' },
  hudInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, hudText: { flexShrink: 1 }, portrait: { width: 24, height: 30, overflow: 'hidden' }, portraitArt: { position: 'absolute', left: -31, top: -1 },
  hudLabel: { color: uiV3Colors.cream, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 }, tierLabel: { color: uiV3Colors.gold, fontSize: 7, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' }, hearts: { marginTop: 2, color: '#D45342', fontSize: 15, letterSpacing: 1 },
  roundBlock: { alignItems: 'center', minWidth: 64, paddingVertical: 3, paddingHorizontal: 8, backgroundColor: 'rgba(16, 10, 6, 0.72)', borderBottomWidth: 1, borderColor: 'rgba(201, 166, 107, 0.42)' }, roundLabel: { color: uiV3Colors.cream, fontSize: 9, fontWeight: '800', letterSpacing: 2 }, roundValue: { color: uiV3Colors.gold, fontFamily: FONT_RYE, fontSize: 25, lineHeight: 28 },
  pause: { position: 'absolute', right: 0, top: 58, padding: 9, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.4)', backgroundColor: 'rgba(26, 12, 6, 0.60)' }, pauseDisabled: { opacity: 0.35 },
  recordTag: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 11, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(201, 166, 107, 0.4)', backgroundColor: 'rgba(16, 10, 6, 0.68)' }, recordTagText: { color: uiV3Colors.ochre, fontFamily: FONT_RYE, fontSize: 8, letterSpacing: 1.8 },
  cue: { position: 'absolute', left: '8%', right: '8%', height: 76, alignItems: 'center', justifyContent: 'center' }, bossRule: { position: 'absolute', left: '35%', right: '35%', top: 0, height: 2, backgroundColor: uiV3Colors.gold, opacity: 0.68 },
});
