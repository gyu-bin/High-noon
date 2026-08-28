import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
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
import { DuelFigureSlot } from '@/components/game/DuelFigureSlot';
import { FONT_RYE } from '@/constants/fonts';
import {
  DUEL_PLAYER_DEFEAT_LIFT_PX,
  duelFigureSize,
  duelFigureSizeLandscape,
  duelFlipHorizontal,
  type DuelCorner,
} from '@/constants/duelArena';
import { DUEL_ARENA_SHADE } from '@/constants/duelPresentation';
import { DUEL_VISUAL_THEME, MINIMAL_DUEL } from '@/constants/duelTheme';
import { colors } from '@/constants/theme';
import type { NpcTier } from '@/types/npc';
import { getNpcDisplayName, getNpcTierLabel } from '@/utils/npcLabels';

const HEART_FULL = '#E11D48';
const HEART_EMPTY = 'rgba(245, 230, 200, 0.55)';
const WINS_TO_END = 3;
const INK_THEME = DUEL_VISUAL_THEME === 'minimal';

function HeartRow({ filled, max }: { filled: number; max: number }) {
  return (
    <View style={styles.heartRow}>
      {Array.from({ length: max }).map((_, i) => (
        <Text
          key={i}
          style={[
            styles.heartGlyph,
            INK_THEME && styles.heartGlyphInk,
            i < filled ? styles.heartFull : INK_THEME ? styles.heartEmptyInk : styles.heartEmpty,
          ]}
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
  tier: NpcTier;
  bossFlag: boolean;
  npcPose: SpritePose;
  npcVictoryActive?: boolean;
  playerVictoryActive?: boolean;
  playerCharacterId: number;
  playerPose: SpritePose;
  signalPhase: DuelSignalBoardPhase;
  blindBangText: boolean;
  invertSignalColors: boolean;
  echoReadySignal?: boolean;
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
  /** landscape — 좌우 정면 대치 (기본 portrait 대각선) */
  orientation?: 'portrait' | 'landscape';
};

export function DuelArenaLayout({
  width,
  height,
  paddingTop,
  paddingBottom,
  paddingRight,
  npcId,
  tier,
  bossFlag,
  npcPose,
  npcVictoryActive = false,
  playerVictoryActive = false,
  playerCharacterId,
  playerPose,
  signalPhase,
  blindBangText,
  invertSignalColors,
  echoReadySignal = false,
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
  orientation = 'portrait',
}: Props) {
  const { t } = useTranslation();
  const landscape = orientation === 'landscape';
  const { width: figW, height: figH } = landscape
    ? duelFigureSizeLandscape(height)
    : duelFigureSize(width);

  const npcCorner: DuelCorner = 'topRight';
  const playerCorner: DuelCorner = 'bottomLeft';
  const npcLabel = getNpcDisplayName(t, npcId);
  const tierLabel = getNpcTierLabel(t, tier);
  // 가로 — 서부극 정면 대치: 같은 지면선, 좌(플레이어)·우(NPC)
  const groundBottom = Math.max(paddingBottom + 30, Math.round(height * 0.09));
  const sideInset = Math.round(width * 0.07);
  const playerDefeatLift =
    !landscape && playerPose === 'defeat' ? DUEL_PLAYER_DEFEAT_LIFT_PX : 0;
  // landscape — 이미 같은 지면선이므로 낮게 제자리 착지 (portrait은 기본: 앞쪽 지면으로 추락)
  const defeatDropPx = landscape ? Math.round(figH * 0.05) : undefined;

  return (
    <View style={[styles.root, { width, height }]}>
      <Pressable
        accessibilityLabel={t('game.duelTapArea')}
        accessibilityRole="button"
        accessibilityState={{ disabled: !shootCapturesEarly }}
        accessibilityHint={
          shootActive ? t('game.tapHintShoot') : t('game.tapHintEarly')
        }
        disabled={!shootCapturesEarly}
        onPress={onShootPress}
        style={StyleSheet.absoluteFill}
      />

      {!INK_THEME ? (
        <LinearGradient
          pointerEvents="none"
          colors={[...DUEL_ARENA_SHADE.colors]}
          locations={[...DUEL_ARENA_SHADE.locations]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* 미니멀 — 캐릭터 발밑 지면선 */}
      {INK_THEME ? (
        landscape ? (
          <View
            pointerEvents="none"
            style={[
              styles.groundLine,
              { bottom: groundBottom - 4, left: sideInset * 0.5, right: sideInset * 0.5 },
            ]}
          />
        ) : (
          <>
            <View
              pointerEvents="none"
              style={[
                styles.groundLine,
                { top: height * 0.52 - 6, right: 0, width: '58%' },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                styles.groundLine,
                { bottom: 90, left: 0, width: '58%' },
              ]}
            />
          </>
        )
      ) : null}

      {/* NPC — portrait 우상단 대각선 · landscape 우측 정면 */}
      <View
        pointerEvents="none"
        style={
          landscape
            ? [styles.npcZoneLandscape, { paddingRight: sideInset, paddingBottom: groundBottom }]
            : [styles.npcZone, { width, height: height * 0.52 }]
        }
      >
        <DuelFigureSlot corner={npcCorner} pose={npcPose} figW={figW} figH={figH}>
          <NpcCharacterSprite
            npcId={npcId}
            width={figW}
            height={figH}
            flipHorizontal={duelFlipHorizontal(npcCorner)}
            pose={npcPose}
            victoryActive={npcVictoryActive}
            duelCorner={npcCorner}
            defeatDropPx={defeatDropPx}
          />
        </DuelFigureSlot>
      </View>

      {/* 플레이어 — portrait 좌하단 대각선 · landscape 좌측 정면 */}
      <View
        pointerEvents="none"
        style={
          landscape
            ? [
                styles.playerZoneLandscape,
                { paddingLeft: sideInset, paddingBottom: groundBottom },
              ]
            : [
                styles.playerZone,
                {
                  width,
                  height: height * 0.52,
                  bottom: 0,
                  paddingBottom: 96 + playerDefeatLift,
                },
              ]
        }
      >
        <DuelFigureSlot corner={playerCorner} pose={playerPose} figW={figW} figH={figH}>
          <PlayerCharacterSprite
            characterId={playerCharacterId}
            width={figW}
            height={figH}
            flipHorizontal={duelFlipHorizontal(playerCorner)}
            pose={playerPose}
            victoryActive={playerVictoryActive}
            duelCorner={playerCorner}
            defeatDropPx={defeatDropPx}
          />
        </DuelFigureSlot>
      </View>

      {/* 중앙 신호 */}
      <View
        pointerEvents="none"
        style={landscape ? styles.signalWrapLandscape : styles.signalWrap}
      >
        <DuelSignalBoard
          variant="minimal"
          phase={signalPhase}
          blindBangText={blindBangText}
          invertSignalColors={invertSignalColors}
          echoReady={echoReadySignal}
        />
      </View>

      {/* HUD 상단 */}
      <View
        pointerEvents="none"
        style={[styles.hudTop, { paddingTop: paddingTop + 8, paddingRight: paddingRight + 52 }]}
      >
        <View style={styles.nameRow}>
          <Text
            style={[styles.npcName, INK_THEME && styles.npcNameInk, { fontFamily: FONT_RYE }]}
            numberOfLines={1}
          >
            {npcLabel}
          </Text>
          {bossFlag ? (
            <Ionicons
              name="skull"
              size={20}
              color={INK_THEME ? MINIMAL_DUEL.ink : colors.cream}
              style={styles.bossSkull}
            />
          ) : null}
        </View>
        <View style={styles.metaRow}>
          <Text style={[styles.tierPill, INK_THEME && styles.tierPillInk]}>{tierLabel}</Text>
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
          <Text style={[styles.scoreLine, INK_THEME && styles.scoreLineInk]}>
            {t('game.scoreLine', {
              p1: playerScore,
              p2: opponentScore,
              wins: WINS_TO_END,
            })}
          </Text>
          {shootActive ? (
            <Text style={[styles.tapHint, INK_THEME && styles.tapHintInk]}>
              {t('game.tapAnywhere')}
            </Text>
          ) : shootCapturesEarly ? (
            <Text style={[styles.waitHint, INK_THEME && styles.waitHintInk]}>
              {t('game.waitForBang')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          INK_THEME ? styles.tapFlashInk : styles.tapFlash,
          playerTapAckStyle,
        ]}
      />

      <Pressable
        accessibilityLabel={t('game.pauseA11y')}
        disabled={pauseDisabled}
        onPress={onPause}
        style={[styles.pauseBtn, { top: paddingTop + 4, right: paddingRight + 8 }]}
        hitSlop={12}
      >
        <Ionicons
          name="pause-circle"
          size={38}
          color={INK_THEME ? 'rgba(28, 26, 21, 0.72)' : 'rgba(245, 230, 200, 0.92)'}
        />
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
    paddingRight: 10,
    paddingTop: 48,
    overflow: 'visible',
  },
  playerZone: {
    position: 'absolute',
    left: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingLeft: 8,
    paddingBottom: 96,
    overflow: 'visible',
  },
  npcZoneLandscape: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  playerZoneLandscape: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
  },
  signalWrap: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '38%',
    height: 120,
    zIndex: 6,
  },
  signalWrapLandscape: {
    position: 'absolute',
    left: '30%',
    right: '30%',
    top: '16%',
    height: 110,
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
    backgroundColor: 'rgba(120, 48, 28, 0.14)',
    zIndex: 20,
  },
  pauseBtn: {
    position: 'absolute',
    zIndex: 30,
    padding: 4,
  },
  /* 미니멀(잉크) 테마 */
  groundLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: MINIMAL_DUEL.line,
    zIndex: 2,
  },
  npcNameInk: {
    color: MINIMAL_DUEL.ink,
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
  tierPillInk: {
    color: MINIMAL_DUEL.inkSoft,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: MINIMAL_DUEL.line,
  },
  heartGlyphInk: {
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
  heartEmptyInk: { color: MINIMAL_DUEL.heartEmpty },
  scoreLineInk: {
    color: MINIMAL_DUEL.inkSoft,
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
  tapHintInk: {
    color: MINIMAL_DUEL.ink,
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
  waitHintInk: {
    color: MINIMAL_DUEL.inkFaint,
  },
  tapFlashInk: {
    backgroundColor: MINIMAL_DUEL.flash,
    zIndex: 20,
  },
});
