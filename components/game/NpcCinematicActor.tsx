import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, type ImageSourcePropType } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { scaledArtStyle } from '@/constants/characterArtMetadata';
import { V3_DUEL_VFX } from '@/constants/v3DuelAssets';
import { cinematicLayerTop, cinematicShotEdge, CINEMATIC_TIMING, type ShotLatch } from '@/utils/npcCinematicPresentation';

export type CinematicArt = {
  source: ImageSourcePropType;
  groundFraction: number;
  muzzle: { x: number; y: number };
  artScale: number;
  flipHorizontal: boolean;
  /** Post-mirror horizontal registration, relative to the locked actor size. */
  offsetX?: number;
};
type Props = {
  readyArt: CinematicArt; preparationArt: CinematicArt; drawArt: CinematicArt; aimArt: CinematicArt; fireArt: CinematicArt;
  size: number; groundFraction: number; preparation: boolean; bang: boolean; shotActive: boolean;
  scope: string; direction: 'left' | 'right'; hidden?: boolean; holding?: boolean;
};
type HeldStage = 'ready' | 'preparation' | 'draw' | 'aim';

/**
 * Fixed-foot pose switches and actual-shot-only local effects.
 *
 * Every body layer stays mounted (its texture is already decoded) and exactly one is visible. The
 * visible body comes from React state, so a switch lands in a single commit: the outgoing and the
 * incoming layer change on the same frame. Separate JS-driven Animated values per layer are applied
 * view by view on Fabric and could leave a frame with both layers hidden.
 */
export function NpcCinematicActor({ readyArt, preparationArt, drawArt, aimArt, fireArt, size, groundFraction, preparation, bang, shotActive, scope, direction, hidden = false, holding = false }: Props) {
  const reducedMotion = useReducedMotion();
  const [held, setHeld] = useState<HeldStage>(preparation && !bang ? 'preparation' : 'ready');
  const [firing, setFiring] = useState(false);
  const flash = useRef(new Animated.Value(0)).current;
  const smoke = useRef(new Animated.Value(0)).current;
  const smokeTravel = useRef(new Animated.Value(0)).current;
  const recoil = useRef(new Animated.Value(0)).current;
  const latch = useRef<ShotLatch>({ scope, active: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drawTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseScope = useRef(scope);
  const hasDrawn = useRef(false);
  useEffect(() => {
    const scopeChanged = phaseScope.current !== scope;
    phaseScope.current = scope;
    if (scopeChanged) {
      hasDrawn.current = false;
      // A round may advance while the legacy HIT renderer is still visible.
      // Reset the underlying pose too, so uncovering it cannot reveal old AIM.
      setHeld('ready');
    }
    // Outcome presentation holds the ongoing draw/aim. It cannot holster a
    // non-shooting loser before the existing HIT/down renderer takes over.
    if (holding && !hidden && !scopeChanged) return;
    if (drawTimer.current) clearTimeout(drawTimer.current);
    drawTimer.current = null;
    if (hidden) {
      if (hasDrawn.current) setHeld('aim');
      return;
    }
    if (hasDrawn.current && latch.current.scope === scope && latch.current.active) {
      // Result/temporary HIT visibility must not send a fired survivor back to
      // the holster or restart a draw while the shot flag remains latched.
      setHeld('aim');
      return;
    }
    if (bang) {
      hasDrawn.current = true;
      // A true engine BANG starts only the draw. Effects remain entirely gated
      // by the independent actual-shot edge below.
      if (reducedMotion) { setHeld('aim'); return; }
      setHeld('draw');
      drawTimer.current = setTimeout(() => {
        drawTimer.current = null;
        setHeld('aim');
      }, CINEMATIC_TIMING.quickDraw);
      return;
    }
    setHeld(preparation ? 'preparation' : 'ready');
  }, [preparation, bang, reducedMotion, scope, hidden, holding]);
  useEffect(() => {
    const reset = latch.current.scope !== scope || hidden;
    const edge = cinematicShotEdge(latch.current, { scope, active: shotActive }, hidden);
    latch.current = edge.latch;
    if (reset) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setFiring(false);
      for (const value of [flash, smoke, smokeTravel, recoil]) { value.stopAnimation(); value.setValue(0); }
    }
    if (!edge.fire) return;
    if (timer.current) clearTimeout(timer.current);
    if (drawTimer.current) clearTimeout(drawTimer.current);
    drawTimer.current = null;
    for (const value of [flash, smoke, smokeTravel, recoil]) value.stopAnimation();
    // A fast input interrupts the draw immediately. FIRE and its measured
    // barrel appear in the same commit; combat never waits on presentation.
    hasDrawn.current = true;
    setHeld('aim');
    setFiring(true);
    flash.setValue(1); smoke.setValue(.32); smokeTravel.setValue(0);
    recoil.setValue(reducedMotion ? 0 : 1);
    Animated.timing(recoil, { toValue: 0, duration: 110, useNativeDriver: true }).start();
    Animated.timing(flash, { toValue: 0, duration: 115, useNativeDriver: true }).start();
    Animated.timing(smoke, { toValue: 0, duration: CINEMATIC_TIMING.smoke, useNativeDriver: true }).start();
    Animated.timing(smokeTravel, { toValue: reducedMotion ? 0 : 1, duration: CINEMATIC_TIMING.smoke, useNativeDriver: true }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      setFiring(false);
    }, CINEMATIC_TIMING.fireEnter + CINEMATIC_TIMING.fireHold + (reducedMotion ? 0 : CINEMATIC_TIMING.recover));
  }, [scope, hidden, shotActive, reducedMotion, flash, smoke, smokeTravel, recoil]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (drawTimer.current) clearTimeout(drawTimer.current);
    for (const value of [flash, smoke, smokeTravel, recoil]) value.stopAnimation();
  }, [flash, smoke, smokeTravel, recoil]);
  const visible = firing ? 'fire' : held;
  const muzzleX = size * ((fireArt.offsetX ?? 0) + (fireArt.flipHorizontal ? 1 - fireArt.muzzle.x : fireArt.muzzle.x));
  const muzzleY = cinematicLayerTop(size, groundFraction, fireArt.groundFraction) + size * fireArt.muzzle.y;
  const flameWidth = size * .15, flameHeight = size * .085;
  const right = direction === 'right';
  const layer = (art: CinematicArt, stage: HeldStage | 'fire') => (
    <Animated.View pointerEvents="none" style={[styles.layer, { left: size * (art.offsetX ?? 0), top: cinematicLayerTop(size, groundFraction, art.groundFraction), width: size, height: size, opacity: visible === stage ? 1 : 0, transform: [{ scaleX: art.flipHorizontal ? -1 : 1 }] }]}>
      <Image source={art.source} style={scaledArtStyle(size, size, art.artScale)} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={0} />
    </Animated.View>
  );
  return <Animated.View pointerEvents="none" style={{ width: size, height: size, opacity: hidden ? 0 : 1, transform: [{ translateX: recoil.interpolate({ inputRange: [0, 1], outputRange: [0, (right ? -1 : 1) * size * .014] }) }, { translateY: recoil.interpolate({ inputRange: [0, 1], outputRange: [0, -size * .006] }) }] }}>
    {layer(readyArt, 'ready')}
    {layer(preparationArt, 'preparation')}
    {layer(drawArt, 'draw')}
    {layer(aimArt, 'aim')}
    {layer(fireArt, 'fire')}
    <Animated.View style={[styles.glow, { width: size * .19, height: size * .19, borderRadius: size * .095, left: muzzleX - size * .095, top: muzzleY - size * .095, opacity: Animated.multiply(flash, .2) }]} />
    <Animated.View style={[styles.layer, { left: right ? muzzleX - flameWidth * .08 : muzzleX - flameWidth * .92, top: muzzleY - flameHeight / 2, width: flameWidth, height: flameHeight, opacity: flash, transform: [{ scaleX: right ? 1 : -1 }] }]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 56"><Path d="M8 28 L31 13 L39 20 L68 7 L58 23 L96 28 L61 33 L70 47 L38 36 L28 44 Z" fill="#D8892D" /><Path d="M8 28 L38 22 L62 28 L36 34 Z" fill="#FFE4A0" /><Path d="M6 28 L28 24 L39 28 L27 32 Z" fill="#FFF9E5" /></Svg>
    </Animated.View>
    <Animated.View style={[styles.layer, { left: muzzleX - size * .07, top: muzzleY - size * .08, width: size * .16, height: size * .16, opacity: smoke, transform: [{ translateX: smokeTravel.interpolate({ inputRange: [0, 1], outputRange: [0, (right ? 1 : -1) * size * .045] }) }, { translateY: smokeTravel.interpolate({ inputRange: [0, 1], outputRange: [0, -size * .035] }) }] }]}>
      <Image source={V3_DUEL_VFX.gunSmoke} style={styles.smoke} contentFit="contain" transition={0} cachePolicy="memory-disk" />
    </Animated.View>
  </Animated.View>;
}
const styles = StyleSheet.create({ layer: { position: 'absolute', left: 0, top: 0 }, glow: { position: 'absolute', backgroundColor: '#F7B34D' }, smoke: { width: '100%', height: '100%' } });
