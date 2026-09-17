import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';

import { LocalDuelSkinSprite, type SpritePose } from '@/components/game/CharacterSprites';
import { DuelFigureSlot } from '@/components/game/DuelFigureSlot';
import {
  enginePhaseToSignalBoardPhase,
  type DuelSignalBoardPhase,
} from '@/components/game/DuelSignalBoard';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { FONT_RYE } from '@/constants/fonts';
import type { LocalDuelSkin } from '@/constants/localDuelSkin';
import { colors, uiV3Colors } from '@/constants/theme';
import type { DuelPhase } from '@/hooks/useDuelEngine';
import type { LocalPlayerId } from '@/hooks/useLocalDuelEngine';

type Props = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  phase: DuelPhase;
  signalPhase?: DuelSignalBoardPhase;
  p1Skin: LocalDuelSkin;
  p2Skin: LocalDuelSkin;
  p1Pose: SpritePose;
  p2Pose: SpritePose;
  p1Hearts: number;
  p2Hearts: number;
  p1Wins: number;
  p2Wins: number;
  winsNeeded: number;
  p1TapAckStyle: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  p2TapAckStyle: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  p1LiveMs: number | null;
  p2LiveMs: number | null;
  hideBottomHud?: boolean;
  onHalfPressIn: (player: LocalPlayerId) => void;
  onBack: () => void;
  onPause: () => void;
  pauseDisabled?: boolean;
  orientation?: 'portrait' | 'landscape';
};

function signalLabel(phase: DuelSignalBoardPhase): string {
  if (phase === '준비') return 'READY';
  if (phase === '집중' || phase === '페이크') return 'STEADY…';
  if (phase === '뱅') return 'BANG!';
  return '';
}

function CompactHearts({ filled, max }: { filled: number; max: number }) {
  return (
    <Text accessibilityLabel={`${filled} hearts`} style={styles.hearts}>
      {Array.from({ length: max }, (_, index) => index < filled ? '♥' : '♡').join(' ')}
    </Text>
  );
}

function PlayerHalf({
  player,
  skin,
  pose,
  hearts,
  wins,
  winsNeeded,
  liveMs,
  figureWidth,
  figureHeight,
  paddingOuter,
  tapAckStyle,
}: {
  player: LocalPlayerId;
  skin: LocalDuelSkin;
  pose: SpritePose;
  hearts: number;
  wins: number;
  winsNeeded: number;
  liveMs: number | null;
  figureWidth: number;
  figureHeight: number;
  paddingOuter: number;
  tapAckStyle: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
}) {
  return (
    <View pointerEvents="none" style={styles.playerHalfContent}>
      <LinearGradient
        colors={['rgba(8,4,2,0.5)', 'transparent', 'rgba(8,4,2,0.42)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.hud, { top: paddingOuter + 8 }]}>
        <View>
          <Text style={styles.playerLabel}>{player.toUpperCase()}</Text>
          <Text style={styles.winLabel}>{wins} WIN</Text>
        </View>
        <View style={styles.hudRight}>
          <CompactHearts filled={hearts} max={winsNeeded} />
          {liveMs == null ? null : <Text style={styles.liveMs}>{Math.round(liveMs)} ms</Text>}
        </View>
      </View>

      <View style={[styles.figureZone, { paddingBottom: Math.max(34, paddingOuter + 16) }]}>
        <DuelFigureSlot corner="bottomLeft" pose={pose} figW={figureWidth} figH={figureHeight}>
          <LocalDuelSkinSprite
            skin={skin}
            width={figureWidth}
            height={figureHeight}
            pose={pose}
            duelCorner="bottomLeft"
            defeatDropPx={Math.round(figureHeight * 0.1)}
          />
        </DuelFigureSlot>
      </View>

      <View style={styles.groundRule} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.tapFlash, tapAckStyle]} />
    </View>
  );
}

export function LocalDuelArenaLayout({
  width,
  height,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  phase,
  signalPhase,
  p1Skin,
  p2Skin,
  p1Pose,
  p2Pose,
  p1Hearts,
  p2Hearts,
  p1Wins,
  p2Wins,
  winsNeeded,
  p1TapAckStyle,
  p2TapAckStyle,
  p1LiveMs,
  p2LiveMs,
  hideBottomHud = false,
  onHalfPressIn,
  onBack,
  onPause,
  pauseDisabled = false,
  orientation: _orientation = 'portrait',
}: Props) {
  const { t } = useTranslation();
  const boardPhase = signalPhase ?? enginePhaseToSignalBoardPhase(phase);
  const label = signalLabel(boardPhase);
  const halfHeight = height / 2;
  const maxFigureHeight = Math.max(190, halfHeight - 124);
  const figureWidth = Math.min(width * 0.61, maxFigureHeight / 1.08, 270);
  const figureHeight = figureWidth * 1.08;
  const bandHeight = Math.min(96, Math.max(88, height * 0.1));
  const showInstruction = !hideBottomHud && phase !== '대기' && phase !== '결과';
  const instruction = phase === '뱅' ? 'TAP YOUR HALF' : t('game.waitForBang');

  return (
    <View style={[styles.root, { width, height }]}>
      <View style={styles.topHalf}>
        <View style={styles.p2Rotated}>
          <PlayerHalf
            player="p2"
            skin={p2Skin}
            pose={p2Pose}
            hearts={p2Hearts}
            wins={p2Wins}
            winsNeeded={winsNeeded}
            liveMs={p2LiveMs}
            figureWidth={figureWidth}
            figureHeight={figureHeight}
            paddingOuter={paddingTop}
            tapAckStyle={p2TapAckStyle}
          />
        </View>
      </View>

      <View style={styles.bottomHalf}>
        <PlayerHalf
          player="p1"
          skin={p1Skin}
          pose={p1Pose}
          hearts={p1Hearts}
          wins={p1Wins}
          winsNeeded={winsNeeded}
          liveMs={p1LiveMs}
          figureWidth={figureWidth}
          figureHeight={figureHeight}
          paddingOuter={paddingBottom}
          tapAckStyle={p1TapAckStyle}
        />
      </View>

      <View pointerEvents="none" style={[styles.signalBand, { top: halfHeight - bandHeight / 2, height: bandHeight }]}>
        <LinearGradient
          colors={['rgba(12,7,4,0.94)', 'rgba(55,31,16,0.97)', 'rgba(12,7,4,0.94)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.bandInset} />
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.signalText, styles.signalP2]}>{label}</Text>
        <View style={styles.signalDiamond} />
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.signalText, styles.signalP1]}>{label}</Text>
      </View>

      {showInstruction ? (
        <View pointerEvents="none" style={[styles.instruction, { top: halfHeight + bandHeight / 2 + 7 }]}>
          <Text style={[styles.instructionText, phase === '뱅' && styles.instructionBang]}>{instruction}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityLabel={t('game.p2TapArea')}
        accessibilityRole="button"
        onPressIn={() => onHalfPressIn('p2')}
        style={[styles.tapHalf, styles.tapTop, { height: halfHeight }]}
      />
      <Pressable
        accessibilityLabel={t('game.p1TapArea')}
        accessibilityRole="button"
        onPressIn={() => onHalfPressIn('p1')}
        style={[styles.tapHalf, styles.tapBottom, { height: halfHeight }]}
      />

      <MenuBackButton
        variant="overlay"
        onPress={onBack}
        style={[styles.back, { top: halfHeight + bandHeight / 2 + 10, left: paddingLeft + 10 }]}
      />
      <Pressable
        accessibilityLabel={t('game.pauseA11y')}
        accessibilityRole="button"
        accessibilityState={{ disabled: pauseDisabled }}
        disabled={pauseDisabled}
        onPress={onPause}
        hitSlop={12}
        style={[styles.pause, { top: halfHeight + bandHeight / 2 + 10, right: paddingRight + 10 }]}
      >
        <Ionicons name="pause" size={18} color={uiV3Colors.cream} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  topHalf: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', overflow: 'hidden' },
  bottomHalf: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', overflow: 'hidden' },
  p2Rotated: { ...StyleSheet.absoluteFillObject, transform: [{ rotate: '180deg' }] },
  playerHalfContent: { flex: 1, overflow: 'hidden' },
  hud: {
    position: 'absolute', left: 18, right: 18, zIndex: 8,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
  },
  hudRight: { alignItems: 'flex-end', gap: 2 },
  playerLabel: {
    color: colors.ochre, fontFamily: FONT_RYE, fontSize: 19, letterSpacing: 2,
    textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 5,
  },
  winLabel: { marginTop: 1, color: uiV3Colors.cream, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  hearts: {
    color: '#EF3340', fontSize: 24, fontWeight: '900', letterSpacing: 3,
    textShadowColor: '#48100E', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3,
  },
  liveMs: { color: uiV3Colors.cream, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  figureZone: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-end' },
  groundRule: {
    position: 'absolute', bottom: 17, left: '24%', right: '24%', height: 1,
    backgroundColor: 'rgba(240,190,116,0.32)',
  },
  tapFlash: { backgroundColor: 'rgba(255,122,45,0.18)', zIndex: 15 },
  signalBand: {
    position: 'absolute', left: 0, right: 0, zIndex: 18,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(224,168,90,0.85)',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 10, elevation: 12,
  },
  bandInset: {
    ...StyleSheet.absoluteFillObject, top: 4, bottom: 4, left: 7, right: 7,
    borderWidth: 1, borderColor: 'rgba(245,230,200,0.14)',
  },
  signalText: {
    position: 'absolute', color: uiV3Colors.cream, fontFamily: FONT_RYE,
    fontSize: 22, letterSpacing: 3, textAlign: 'center', width: '44%',
    textShadowColor: '#7A2608', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 7,
  },
  signalP2: { top: 6, transform: [{ rotate: '180deg' }] },
  signalP1: { bottom: 6 },
  signalDiamond: { width: 7, height: 7, backgroundColor: uiV3Colors.gold, transform: [{ rotate: '45deg' }] },
  instruction: { position: 'absolute', left: 90, right: 90, zIndex: 19, alignItems: 'center' },
  instructionText: {
    color: 'rgba(245,230,200,0.72)', fontSize: 9, fontWeight: '900', letterSpacing: 1.8,
    textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  instructionBang: { color: uiV3Colors.gold },
  tapHalf: { position: 'absolute', left: 0, right: 0, zIndex: 22 },
  tapTop: { top: 0 },
  tapBottom: { bottom: 0 },
  back: { position: 'absolute', zIndex: 30 },
  pause: {
    position: 'absolute', zIndex: 30, width: 42, height: 42,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: 'rgba(224,168,90,0.7)', backgroundColor: 'rgba(28,15,8,0.88)', borderRadius: 4,
  },
});
