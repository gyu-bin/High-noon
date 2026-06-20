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
  duelFigureSize,
  duelFlipHorizontal,
} from '@/constants/duelArena';
import { DUEL_ARENA_SHADE } from '@/constants/duelPresentation';
import { colors } from '@/constants/theme';
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
}: Props) {
  const { width: figW, height: figH } = duelFigureSize(width);
  const boardPhase = signalPhase ?? enginePhaseToSignalBoardPhase(phase);

  return (
    <View style={[styles.root, { width, height }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[...DUEL_ARENA_SHADE.colors]}
        locations={[...DUEL_ARENA_SHADE.locations]}
        style={StyleSheet.absoluteFill}
      />

      {/*
        P2 — 상단 50% 전체 180° 회전.
        맞은편(위쪽) 플레이어에게 캐릭터·HUD·탭 피드백이 정상 방향으로 보임.
        내부 좌하 배치 → 회전 후 화면상 우상(대각선)에 위치.
      */}
      <View pointerEvents="none" style={styles.topHalfRotated}>
        <View style={styles.topHalfInner}>
          <View style={styles.p2Zone}>
            <DuelFigureSlot corner="bottomLeft" pose={p2Pose} figW={figW} figH={figH}>
              <PlayerCharacterSprite
                characterId={p2CharacterId}
                width={figW}
                height={figH}
                flipHorizontal={duelFlipHorizontal('bottomLeft')}
                pose={p2Pose}
              />
            </DuelFigureSlot>
          </View>

          <View style={styles.p2SignalWrap}>
            <DuelSignalBoard variant="minimal" phase={boardPhase} />
          </View>

          <View style={[styles.hudP2Inner, { paddingTop: paddingTop + 4 }]}>
            <Text style={styles.playerLabel}>P2</Text>
            <HeartStrip filled={p2Hearts} max={winsNeeded} />
            {p2LiveMs != null ? (
              <Text style={styles.liveMs}>{Math.round(p2LiveMs)} ms</Text>
            ) : null}
          </View>

          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFillObject, styles.tapFlash, p2TapAckStyle]}
          />
        </View>
      </View>

      {/* P1 — 하단 50% 정상 방향 */}
      <View pointerEvents="none" style={styles.bottomHalfShell}>
        <View style={styles.p1Zone}>
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

        <View style={styles.p1SignalWrap}>
          <DuelSignalBoard variant="minimal" phase={boardPhase} />
        </View>

        <View
          style={[
            styles.hudP1,
            { paddingBottom: paddingBottom + 72, paddingLeft: paddingLeft + 14 },
          ]}
        >
          <Text style={styles.playerLabel}>P1</Text>
          <HeartStrip filled={p1Hearts} max={winsNeeded} />
          {p1LiveMs != null ? (
            <Text style={styles.liveMs}>{Math.round(p1LiveMs)} ms</Text>
          ) : null}
        </View>

        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, styles.tapFlash, p1TapAckStyle]}
        />
      </View>

      {/* 점수·네비 */}
      {!hideBottomHud ? (
        <View
          pointerEvents="none"
          style={[styles.scoreBar, { paddingBottom: paddingBottom + 8 }]}
        >
          <Text style={styles.scoreLine}>
            P1 {p1Wins} — {p2Wins} P2 · 선 {winsNeeded}승
          </Text>
          {phase === '뱅' ? (
            <Text style={styles.tapHint}>TAP YOUR HALF</Text>
          ) : phase !== '대기' && phase !== '결과' ? (
            <Text style={styles.waitHint}>WAIT FOR BANG…</Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="P2 탭 영역"
        onPressIn={() => onHalfPressIn('p2')}
        style={[styles.halfPress, styles.halfPressTop, { height: height / 2 }]}
      />
      <Pressable
        accessibilityLabel="P1 탭 영역"
        onPressIn={() => onHalfPressIn('p1')}
        style={[styles.halfPress, styles.halfPressBottom, { height: height / 2 }]}
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
        <Ionicons name="pause-circle" size={38} color="rgba(245, 230, 200, 0.92)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  topHalfRotated: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    transform: [{ rotate: '180deg' }],
    zIndex: 4,
    overflow: 'hidden',
  },
  topHalfInner: {
    flex: 1,
  },
  bottomHalfShell: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 4,
    overflow: 'hidden',
  },
  p2Zone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    paddingLeft: 8,
    paddingBottom: 72,
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
    paddingBottom: 28,
  },
  hudP2Inner: {
    position: 'absolute',
    top: 0,
    left: 14,
    alignItems: 'flex-start',
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
  p2SignalWrap: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '34%',
    height: 96,
    zIndex: 6,
  },
  p1SignalWrap: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    top: '18%',
    height: 96,
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
