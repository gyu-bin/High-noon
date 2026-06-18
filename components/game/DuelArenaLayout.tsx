import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';

import {
  NpcCharacterSprite,
  PlayerCharacterSprite,
  type SpritePose,
} from '@/components/game/CharacterSprites';
import {
  DuelSignalBoard,
  type DuelSignalBoardPhase,
} from '@/components/game/DuelSignalBoard';
import { FONT_RYE } from '@/constants/fonts';
import {
  duelFigureSize,
  duelFigureTransform,
  duelFlipHorizontal,
  type DuelCorner,
} from '@/constants/duelArena';
import { colors } from '@/constants/theme';

const HEART_FULL = '#E11D48';
const HEART_EMPTY = 'rgba(245, 230, 200, 0.55)';
const WINS_TO_END = 3;

function HeartRow({ filled, max }: { filled: number; max: number }) {
  return (
    <View style={styles.heartRow}>
      {Array.from({ length: max }).map((_, i) => (
        <Text
          key={i}
          style={[styles.heartGlyph, i < filled ? styles.heartFull : styles.heartEmpty]}
        >
          {i < filled ? '♥' : '♡'}
        </Text>
      ))}
    </View>
  );
}

type Props = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingRight: number;
  npcId: number;
  npcTitle: string;
  npcName: string;
  tierLabel: string;
  bossFlag: boolean;
  npcPose: SpritePose;
  playerCharacterId: number;
  playerPose: SpritePose;
  signalPhase: DuelSignalBoardPhase;
  blindBangText: boolean;
  invertSignalColors: boolean;
  opponentHearts: number;
  playerHearts: number;
  playerScore: number;
  opponentScore: number;
  shootCapturesEarly: boolean;
  shootActive: boolean;
  onShootPress: () => void;
  onPause: () => void;
  pauseDisabled: boolean;
  playerTapAckStyle: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  hideBottomHud?: boolean;
};

export function DuelArenaLayout({
  width,
  height,
  paddingTop,
  paddingBottom,
  paddingRight,
  npcId,
  npcTitle,
  npcName,
  tierLabel,
  bossFlag,
  npcPose,
  playerCharacterId,
  playerPose,
  signalPhase,
  blindBangText,
  invertSignalColors,
  opponentHearts,
  playerHearts,
  playerScore,
  opponentScore,
  shootCapturesEarly,
  shootActive,
  onShootPress,
  onPause,
  pauseDisabled,
  playerTapAckStyle,
  hideBottomHud = false,
}: Props) {
  const { width: figW, height: figH } = duelFigureSize(width);

  const npcCorner: DuelCorner = 'topRight';
  const playerCorner: DuelCorner = 'bottomLeft';

  return (
    <View style={[styles.root, { width, height }]}>
      <Pressable
        accessibilityLabel="결투 화면 탭"
        accessibilityRole="button"
        accessibilityState={{ disabled: !shootCapturesEarly }}
        accessibilityHint={
          shootActive
            ? '화면 아무 곳이나 탭해 발사합니다'
            : '뱅 신호 전 탭 시 즉시 패배합니다'
        }
        disabled={!shootCapturesEarly}
        onPress={onShootPress}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        pointerEvents="none"
        colors={['rgba(8, 4, 2, 0.45)', 'rgba(8, 4, 2, 0.04)', 'rgba(8, 4, 2, 0.04)', 'rgba(8, 4, 2, 0.5)']}
        locations={[0, 0.22, 0.72, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* NPC — 우상단, 플레이어 쪽을 향해 대각선 */}
      <View pointerEvents="none" style={[styles.npcZone, { width, height: height * 0.52 }]}>
        <View style={styles.groundShadowNpc} />
        <View style={{ transform: duelFigureTransform(npcCorner, npcPose) }}>
          <NpcCharacterSprite
            npcId={npcId}
            width={figW}
            height={figH}
            flipHorizontal={duelFlipHorizontal(npcCorner)}
            pose={npcPose}
          />
        </View>
      </View>

      {/* 플레이어 — 좌하단, NPC 쪽을 향해 대각선 */}
      <View
        pointerEvents="none"
        style={[styles.playerZone, { width, height: height * 0.52, bottom: 0 }]}
      >
        <View style={styles.groundShadowPlayer} />
        <View style={{ transform: duelFigureTransform(playerCorner, playerPose) }}>
          <PlayerCharacterSprite
            characterId={playerCharacterId}
            width={figW}
            height={figH}
            flipHorizontal={duelFlipHorizontal(playerCorner)}
            pose={playerPose}
          />
        </View>
      </View>

      {/* 중앙 신호 */}
      <View pointerEvents="none" style={styles.signalWrap}>
        <DuelSignalBoard
          variant="minimal"
          phase={signalPhase}
          blindBangText={blindBangText}
          invertSignalColors={invertSignalColors}
        />
      </View>

      {/* HUD 상단 */}
      <View
        pointerEvents="none"
        style={[styles.hudTop, { paddingTop: paddingTop + 8, paddingRight: paddingRight + 52 }]}
      >
        <View style={styles.nameRow}>
          <Text style={[styles.npcName, { fontFamily: FONT_RYE }]} numberOfLines={1}>
            {npcTitle} {npcName}
          </Text>
          {bossFlag ? (
            <Ionicons name="skull" size={20} color={colors.cream} style={styles.bossSkull} />
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.tierPill}>{tierLabel}</Text>
          <HeartRow filled={opponentHearts} max={3} />
        </View>
      </View>

      {/* HUD 하단 */}
      {!hideBottomHud ? (
        <View
          pointerEvents="none"
          style={[styles.hudBottom, { paddingBottom: paddingBottom + 12 }]}
        >
          <HeartRow filled={playerHearts} max={3} />
          <Text style={styles.scoreLine}>
            {playerScore} — {opponentScore} · 선 {WINS_TO_END}승
          </Text>
          {shootActive ? (
            <Text style={styles.tapHint}>TAP ANYWHERE</Text>
          ) : shootCapturesEarly ? (
            <Text style={styles.waitHint}>WAIT FOR BANG…</Text>
          ) : null}
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, styles.tapFlash, playerTapAckStyle]}
      />

      <Pressable
        accessibilityLabel="일시정지"
        disabled={pauseDisabled}
        onPress={onPause}
        style={[styles.pauseBtn, { top: paddingTop + 4, right: paddingRight + 8 }]}
        hitSlop={12}
      >
        <Ionicons name="pause-circle" size={38} color="rgba(245, 230, 200, 0.92)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  npcZone: {
    position: 'absolute',
    top: 0,
    right: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 4,
    paddingTop: 72,
  },
  playerZone: {
    position: 'absolute',
    left: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingLeft: 4,
    paddingBottom: 64,
  },
  groundShadowNpc: {
    position: 'absolute',
    right: 28,
    bottom: 18,
    width: 120,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    transform: [{ scaleX: 1.4 }],
  },
  groundShadowPlayer: {
    position: 'absolute',
    left: 24,
    bottom: 52,
    width: 120,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    transform: [{ scaleX: 1.4 }],
  },
  signalWrap: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '38%',
    height: 120,
    zIndex: 6,
  },
  hudTop: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 0,
    zIndex: 8,
    gap: 6,
  },
  hudBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 8,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  npcName: {
    flexShrink: 1,
    fontSize: 22,
    color: colors.ochre,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bossSkull: {
    opacity: 0.95,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierPill: {
    color: colors.cream,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
    backgroundColor: 'rgba(44, 26, 14, 0.55)',
    borderRadius: 999,
  },
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heartGlyph: {
    fontSize: 26,
    lineHeight: 30,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heartFull: { color: HEART_FULL },
  heartEmpty: { color: HEART_EMPTY },
  scoreLine: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    opacity: 0.92,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  tapHint: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4,
    color: colors.ochre,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  waitHint: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(245, 230, 200, 0.65)',
  },
  tapFlash: {
    backgroundColor: 'rgba(255, 236, 200, 0.55)',
    zIndex: 20,
  },
  pauseBtn: {
    position: 'absolute',
    zIndex: 30,
    padding: 4,
  },
});
