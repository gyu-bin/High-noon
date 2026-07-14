import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';

import {
  PlayerCharacterSprite,
  type SpritePose,
} from '@/components/game/CharacterSprites';
import { DuelFigureSlot } from '@/components/game/DuelFigureSlot';
import {
  DuelSignalBoard,
  enginePhaseToSignalBoardPhase,
  type DuelSignalBoardPhase,
} from '@/components/game/DuelSignalBoard';
import { HeartStrip } from '@/components/game/HeartStrip';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import {
  DUEL_PLAYER_DEFEAT_LIFT_PX,
  duelFigureSize,
  duelFlipHorizontal,
} from '@/constants/duelArena';
import { DUEL_ARENA_SHADE } from '@/constants/duelPresentation';
import { DUEL_VISUAL_THEME, MINIMAL_DUEL } from '@/constants/duelTheme';
import { colors } from '@/constants/theme';
import type { DuelPhase } from '@/hooks/useDuelEngine';
import type { LocalPlayerId } from '@/hooks/useLocalDuelEngine';

const INK_THEME = DUEL_VISUAL_THEME === 'minimal';

type Props = {
  width: number;
  height: number;
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  phase: DuelPhase;
  signalPhase?: DuelSignalBoardPhase;
  p1CharacterId: number;
  p2CharacterId: number;
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
  /** landscape — 좌(P1)·우(P2) 정면 대치 (기본 portrait 상하 분할) */
  orientation?: 'portrait' | 'landscape';
};

export function LocalDuelArenaLayout({
  width,
  height,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  phase,
  signalPhase,
  p1CharacterId,
  p2CharacterId,
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
  orientation = 'portrait',
}: Props) {
  const landscape = orientation === 'landscape';
  const { width: figW, height: figH } = duelFigureSize(landscape ? height : width);
  const boardPhase = signalPhase ?? enginePhaseToSignalBoardPhase(phase);
  // P1 쓰러짐 — 하단 점수 바·화면 밖으로 몸이 잘리지 않게 존을 올림 (NPC전과 동일)
  const p1DefeatLift = !landscape && p1Pose === 'defeat' ? DUEL_PLAYER_DEFEAT_LIFT_PX : 0;

  return (
    <View style={[styles.root, { width, height }]}>
      {!INK_THEME ? (
        <LinearGradient
          pointerEvents="none"
          colors={[...DUEL_ARENA_SHADE.colors]}
          locations={[...DUEL_ARENA_SHADE.locations]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}

      {/* P2 — 상단 50% (portrait) / 우측 50% (landscape), NPC전과 같은 좌향 */}
      <View pointerEvents="none" style={landscape ? styles.rightHalfShell : styles.topHalfShell}>
        {INK_THEME ? <View style={[styles.groundLine, { bottom: 66 }]} /> : null}
        <View style={styles.p2Zone}>
          <DuelFigureSlot corner="topRight" pose={p2Pose} figW={figW} figH={figH}>
            <PlayerCharacterSprite
              characterId={p2CharacterId}
              width={figW}
              height={figH}
              flipHorizontal={duelFlipHorizontal('topRight')}
              pose={p2Pose}
              duelCorner="topRight"
            />
          </DuelFigureSlot>
        </View>

        <View style={[styles.hudP2, { paddingTop: paddingTop + 52 }]}>
          <Text style={[styles.playerLabel, INK_THEME && styles.playerLabelInk]}>P2</Text>
          <HeartStrip filled={p2Hearts} max={winsNeeded} />
          {p2LiveMs != null ? (
            <Text style={[styles.liveMs, INK_THEME && styles.liveMsInk]}>
              {Math.round(p2LiveMs)} ms
            </Text>
          ) : null}
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            INK_THEME ? styles.tapFlashInk : styles.tapFlash,
            p2TapAckStyle,
          ]}
        />
      </View>

      {/* P1 — 하단 50% (portrait) / 좌측 50% (landscape) */}
      <View pointerEvents="none" style={landscape ? styles.leftHalfShell : styles.bottomHalfShell}>
        {INK_THEME ? <View style={[styles.groundLine, { bottom: 22 }]} /> : null}
        <View style={[styles.p1Zone, { paddingBottom: 28 + p1DefeatLift }]}>
          <DuelFigureSlot corner="bottomLeft" pose={p1Pose} figW={figW} figH={figH}>
            <PlayerCharacterSprite
              characterId={p1CharacterId}
              width={figW}
              height={figH}
              flipHorizontal={duelFlipHorizontal('bottomLeft')}
              pose={p1Pose}
            />
          </DuelFigureSlot>
        </View>

        <View
          style={[
            styles.hudP1,
            { paddingBottom: paddingBottom + 72, paddingLeft: paddingLeft + 14 },
          ]}
        >
          <Text style={[styles.playerLabel, INK_THEME && styles.playerLabelInk]}>P1</Text>
          <HeartStrip filled={p1Hearts} max={winsNeeded} />
          {p1LiveMs != null ? (
            <Text style={[styles.liveMs, INK_THEME && styles.liveMsInk]}>
              {Math.round(p1LiveMs)} ms
            </Text>
          ) : null}
        </View>

        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            INK_THEME ? styles.tapFlashInk : styles.tapFlash,
            p1TapAckStyle,
          ]}
        />
      </View>

      {/* 중앙 신호 — 두 플레이어 공용 */}
      <View pointerEvents="none" style={styles.signalWrapCenter}>
        <DuelSignalBoard variant="minimal" phase={boardPhase} />
      </View>

      {/* 점수·네비 */}
      {!hideBottomHud ? (
        <View
          pointerEvents="none"
          style={[styles.scoreBar, { paddingBottom: paddingBottom + 8 }]}
        >
          <Text style={[styles.scoreLine, INK_THEME && styles.scoreLineInk]}>
            P1 {p1Wins} — {p2Wins} P2 · 선 {winsNeeded}승
          </Text>
          {phase === '뱅' ? (
            <Text style={[styles.tapHint, INK_THEME && styles.tapHintInk]}>TAP YOUR HALF</Text>
          ) : phase !== '대기' && phase !== '결과' ? (
            <Text style={[styles.waitHint, INK_THEME && styles.waitHintInk]}>
              WAIT FOR BANG…
            </Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="P2 탭 영역"
        onPressIn={() => onHalfPressIn('p2')}
        style={
          landscape
            ? [styles.halfPressV, styles.halfPressRight, { width: width / 2 }]
            : [styles.halfPress, styles.halfPressTop, { height: height / 2 }]
        }
      />
      <Pressable
        accessibilityLabel="P1 탭 영역"
        onPressIn={() => onHalfPressIn('p1')}
        style={
          landscape
            ? [styles.halfPressV, styles.halfPressLeft, { width: width / 2 }]
            : [styles.halfPress, styles.halfPressBottom, { height: height / 2 }]
        }
      />

      <MenuBackButton
        variant="overlay"
        onPress={onBack}
        style={[styles.navBtn, { top: paddingTop + 4, left: paddingLeft + 8 }]}
      />

      <Pressable
        accessibilityLabel="일시정지"
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
  topHalfShell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 4,
    overflow: 'visible',
  },
  bottomHalfShell: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 4,
    overflow: 'visible',
  },
  /* landscape — 좌우 분할 */
  leftHalfShell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
    zIndex: 4,
    overflow: 'visible',
  },
  rightHalfShell: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '50%',
    zIndex: 4,
    overflow: 'visible',
  },
  p2Zone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    paddingRight: 10,
    paddingBottom: 30,
    overflow: 'visible',
  },
  p1Zone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingLeft: 8,
    overflow: 'visible',
  },
  hudP2: {
    position: 'absolute',
    top: 0,
    right: 14,
    alignItems: 'flex-end',
    gap: 6,
    zIndex: 8,
  },
  hudP1: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    alignItems: 'flex-start',
    gap: 6,
    zIndex: 8,
  },
  playerLabel: {
    color: colors.ochre,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  liveMs: {
    color: colors.cream,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  halfPress: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 25,
  },
  halfPressTop: {
    top: 0,
  },
  halfPressBottom: {
    bottom: 0,
  },
  /* landscape — 좌·우 탭 영역 */
  halfPressV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 25,
  },
  halfPressLeft: {
    left: 0,
  },
  halfPressRight: {
    right: 0,
  },
  signalWrapCenter: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '40%',
    height: 120,
    zIndex: 6,
  },
  scoreBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 8,
    gap: 4,
  },
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
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.ochre,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  waitHint: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: 'rgba(245, 230, 200, 0.65)',
  },
  tapFlash: {
    backgroundColor: 'rgba(255, 236, 200, 0.55)',
    zIndex: 20,
  },
  /* 미니멀(잉크) 테마 */
  groundLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: MINIMAL_DUEL.line,
    zIndex: 2,
  },
  playerLabelInk: {
    color: MINIMAL_DUEL.ink,
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
  liveMsInk: {
    color: MINIMAL_DUEL.inkSoft,
    textShadowColor: 'transparent',
    textShadowRadius: 0,
  },
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
  navBtn: {
    position: 'absolute',
    zIndex: 30,
  },
  pauseBtn: {
    position: 'absolute',
    zIndex: 30,
    padding: 4,
  },
});
