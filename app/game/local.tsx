import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  BackHandler,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PlayerCharacterSprite } from '@/components/game/CharacterSprites';
import { HeartStrip } from '@/components/game/HeartStrip';
import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { SceneBackground } from '@/components/game/SceneBackground';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { NpcSignalStage } from '@/components/game/NpcSignalStage';
import { colors } from '@/constants/theme';
import type { DuelPhase } from '@/hooks/useDuelEngine';
import {
  type LocalPlayerId,
  type LocalRoundOutcome,
  useLocalDuelEngine,
} from '@/hooks/useLocalDuelEngine';
import {
  phoneStageSafeOffsets,
  usePhoneStageMetrics,
} from '@/hooks/usePhoneStageMetrics';
import { gameImages } from '@/constants/gameImages';
import { useProgressStore } from '@/store/progressStore';
import { preloadSceneImages } from '@/utils/preloadSceneImages';
import { RM_GAME } from '@/constants/reanimatedGame';
import { play, playBangShotDuel } from '@/utils/audioService';
import { speakDuelCue, stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';
import { formatReactionMs } from '@/utils/formatReactionMs';
import { trigger } from '@/utils/hapticService';

export type LocalMatchTypeProp = '3' | '5' | '7';

function parseMatchType(raw: string | string[] | undefined): LocalMatchTypeProp {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === '3' || v === '7') return v;
  return '5';
}

function heartsForMatchType(m: LocalMatchTypeProp): number {
  if (m === '3') return 2;
  if (m === '5') return 3;
  return 4;
}

export default function LocalGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ matchType?: string }>();
  const matchType = parseMatchType(params.matchType);
  const winsNeeded = heartsForMatchType(matchType);
  const stage = usePhoneStageMetrics();
  const { stageWidth: winW, stageHeight: winH } = stage;
  const halfH = winH / 2;
  const overlayPad = useMemo(
    () =>
      phoneStageSafeOffsets(stage, {
        top: insets.top,
        right: insets.right,
        bottom: insets.bottom,
        left: insets.left,
      }),
    [stage, insets.top, insets.right, insets.bottom, insets.left],
  );

  const {
    phase,
    signalText,
    outcome,
    start,
    commitLocalTouches,
    isBangReactionArmed,
    reset,
    pauseTimers,
    resumeTimers,
  } = useLocalDuelEngine();

  const [p1Hearts, setP1Hearts] = useState(winsNeeded);
  const [p2Hearts, setP2Hearts] = useState(winsNeeded);
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [modalStep, setModalStep] = useState<'round' | 'match' | null>(null);
  const [matchWinner, setMatchWinner] = useState<'p1' | 'p2' | null>(null);
  const [paused, setPaused] = useState(false);
  const [fxBurstId, setFxBurstId] = useState(0);
  const wasPausedRef = useRef(false);

  const winsRef = useRef({ p1: 0, p2: 0 });
  const redFlash = useSharedValue(0);
  const p1TapAck = useSharedValue(0);
  const p2TapAck = useSharedValue(0);
  const bangHapticDone = useRef(false);
  const processedKey = useRef('');
  const roundIdx = useRef(0);
  const prevPhaseRef = useRef<DuelPhase>(phase);

  const triggerBangFlash = useCallback(() => {
    if (bangHapticDone.current) return;
    bangHapticDone.current = true;
    redFlash.value = withSequence(
      RM_GAME,
      withTiming(0.52, {
        duration: 40,
        easing: Easing.out(Easing.quad),
        reduceMotion: RM_GAME,
      }),
      withTiming(0, {
        duration: 240,
        easing: Easing.in(Easing.quad),
        reduceMotion: RM_GAME,
      }),
    );
    speakDuelCue('bang');
    void playBangShotDuel();
    void trigger('heavy');
  }, [redFlash]);

  const redStyle = useAnimatedStyle(() => ({ opacity: redFlash.value }));

  const p1TapAckStyle = useAnimatedStyle(() => ({ opacity: p1TapAck.value }));
  const p2TapAckStyle = useAnimatedStyle(() => ({ opacity: p2TapAck.value }));

  const pulseHalfTapAck = useCallback((sv: SharedValue<number>, kind: 'bang' | 'other') => {
    cancelAnimation(sv);
    sv.value = 0;
    const peak = kind === 'bang' ? 0.92 : 0.52;
    const upMs = kind === 'bang' ? 55 : 42;
    const downMs = kind === 'bang' ? 280 : 190;
    sv.value = withSequence(
      withTiming(peak, {
        duration: upMs,
        easing: Easing.out(Easing.quad),
        reduceMotion: RM_GAME,
      }),
      withTiming(0, {
        duration: downMs,
        easing: Easing.in(Easing.quad),
        reduceMotion: RM_GAME,
      }),
    );
  }, []);

  /**
   * 멀티터치: changedTouches를 모아 `commitLocalTouches` 한 번으로 처리
   * (준비/집중 동시 얼리도 한 라운드로 합침).
   */
  const onLocalDuelTouchStart = useCallback(
    (e: GestureResponderEvent) => {
      if (paused) return;
      const { changedTouches } = e.nativeEvent;
      const raw: LocalPlayerId[] = [];
      for (let i = 0; i < changedTouches.length; i += 1) {
        const touch = changedTouches[i];
        if (!touch) continue;
        raw.push(touch.locationY < halfH ? 'p2' : 'p1');
      }
      if (raw.length === 0) return;
      const uniq = [...new Set(raw)];
      const bangGlow = isBangReactionArmed();
      if (phase !== '대기' && phase !== '결과') {
        for (const id of uniq) {
          if (id === 'p2') {
            pulseHalfTapAck(p2TapAck, bangGlow ? 'bang' : 'other');
          } else {
            pulseHalfTapAck(p1TapAck, bangGlow ? 'bang' : 'other');
          }
          void trigger(bangGlow ? 'selection' : 'light');
        }
      }
      commitLocalTouches(raw);
    },
    [paused, phase, halfH, pulseHalfTapAck, commitLocalTouches, isBangReactionArmed],
  );

  useEffect(() => {
    if (phase !== '뱅') bangHapticDone.current = false;
  }, [phase]);

  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (phase === '준비' && prev !== '준비') {
      speakDuelCue('ready');
      void trigger('light');
    }
    if (phase === '집중' && prev !== '집중') {
      speakDuelCue('steady');
      void trigger('light');
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (paused) {
      stopDuelSignalSpeech();
      pauseTimers();
      wasPausedRef.current = true;
    } else if (wasPausedRef.current) {
      resumeTimers();
      wasPausedRef.current = false;
    }
  }, [paused, pauseTimers, resumeTimers]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        await preloadSceneImages();
        if (cancelled) return;
        const h = heartsForMatchType(matchType);
        winsRef.current = { p1: 0, p2: 0 };
        setP1Hearts(h);
        setP2Hearts(h);
        setP1Wins(0);
        setP2Wins(0);
        setModalStep(null);
        setMatchWinner(null);
        processedKey.current = '';
        roundIdx.current = 0;
        reset();
        start();
      })();
      return () => {
        cancelled = true;
        reset();
      };
    }, [matchType, reset, start]),
  );

  useEffect(() => {
    if (phase !== '결과' || !outcome) return;
    const key = `${roundIdx.current}:${outcome.p1.reactionMs}:${outcome.p2.reactionMs}:${outcome.p1.earlyTap}:${outcome.p2.earlyTap}:${outcome.p1.timeout}:${outcome.p2.timeout}`;
    if (processedKey.current === key) return;
    processedKey.current = key;

    const { recordGlobalReactionSample } = useProgressStore.getState();
    if (outcome.p1.reactionMs != null) {
      recordGlobalReactionSample(outcome.p1.reactionMs);
    }
    if (outcome.p2.reactionMs != null) {
      recordGlobalReactionSample(outcome.p2.reactionMs);
    }

    if (outcome.winner === 'p1' || outcome.winner === 'p2') {
      setFxBurstId((n) => n + 1);
    }

    if (outcome.p1.earlyTap || outcome.p2.earlyTap) {
      void play('early_tap');
      void trigger('error');
    }

    if (outcome.winner === 'p1') {
      winsRef.current.p1 += 1;
      setP2Hearts((x) => Math.max(0, x - 1));
    } else if (outcome.winner === 'p2') {
      winsRef.current.p2 += 1;
      setP1Hearts((x) => Math.max(0, x - 1));
    }

    if (outcome.winner === 'p1' && p2Hearts > 0) {
      void play('heart_break');
      void trigger('medium');
    } else if (outcome.winner === 'p2' && p1Hearts > 0) {
      void play('heart_break');
      void trigger('medium');
    }

    setP1Wins(winsRef.current.p1);
    setP2Wins(winsRef.current.p2);

    const matchOver =
      winsRef.current.p1 >= winsNeeded || winsRef.current.p2 >= winsNeeded;

    if (
      (outcome.winner === 'p1' || outcome.winner === 'p2') &&
      !matchOver
    ) {
      void play('win_fanfare');
      void trigger('success');
    }

    if (matchOver) {
      void play('level_clear');
      void trigger('success');
      setMatchWinner(winsRef.current.p1 >= winsNeeded ? 'p1' : 'p2');
      setModalStep('match');
    } else {
      setModalStep('round');
    }
  }, [phase, outcome, winsNeeded, p1Hearts, p2Hearts]);

  const continueAfterRound = useCallback(() => {
    setModalStep(null);
    roundIdx.current += 1;
    processedKey.current = '';
    reset();
    start();
  }, [reset, start]);

  const exitMatch = useCallback(() => {
    setModalStep(null);
    router.back();
  }, [router]);

  const leaveLocalDuel = useCallback(() => {
    setPaused(false);
    reset();
    router.back();
  }, [reset, router]);

  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (paused || modalStep != null) return false;
        leaveLocalDuel();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [paused, modalStep, leaveLocalDuel]),
  );

  const leaveToMainMenu = useCallback(() => {
    setPaused(false);
    reset();
    router.replace('/menu');
  }, [reset, router]);

  const summary = outcome
    ? formatRoundSummary(outcome)
    : { title: '', p1line: '', p2line: '' };

  const showResultFx = phase === '결과' && outcome != null;
  const p1Highlight =
    showResultFx &&
    (outcome.winner === 'p1' ||
      (modalStep === 'match' && matchWinner === 'p1'));
  const p2Highlight =
    showResultFx &&
    (outcome.winner === 'p2' ||
      (modalStep === 'match' && matchWinner === 'p2'));
  const p1Loser =
    showResultFx &&
    (outcome.winner === 'p2' || (modalStep === 'match' && matchWinner === 'p2'));
  const p2Loser =
    showResultFx &&
    (outcome.winner === 'p1' || (modalStep === 'match' && matchWinner === 'p1'));

  const p1Fall = useSharedValue(0);
  const p2Fall = useSharedValue(0);
  useEffect(() => {
    if (p1Loser) {
      p1Fall.value = 0;
      p1Fall.value = withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      });
    } else {
      cancelAnimation(p1Fall);
      p1Fall.value = 0;
    }
  }, [p1Loser, p1Fall]);
  useEffect(() => {
    if (p2Loser) {
      p2Fall.value = 0;
      p2Fall.value = withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      });
    } else {
      cancelAnimation(p2Fall);
      p2Fall.value = 0;
    }
  }, [p2Loser, p2Fall]);

  const p1FallStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: p1Fall.value * 70 },
      { rotate: `${p1Fall.value * -86}deg` },
    ],
    opacity: 1 - p1Fall.value * 0.25,
  }));
  const p2FallStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: p2Fall.value * 70 },
      { rotate: `${p2Fall.value * 86}deg` },
    ],
    opacity: 1 - p2Fall.value * 0.25,
  }));

  /** 모달이 떠 있을 때만 — phase와 무관하게 승자 기준(매치는 matchWinner) */
  const fireworksP1 =
    outcome != null &&
    (modalStep === 'round'
      ? outcome.winner === 'p1'
      : modalStep === 'match'
        ? matchWinner === 'p1'
        : false);
  const fireworksP2 =
    outcome != null &&
    (modalStep === 'round'
      ? outcome.winner === 'p2'
      : modalStep === 'match'
        ? matchWinner === 'p2'
        : false);

  return (
    <PhoneStageShell>
    <SceneBackground
      source={gameImages.duelBackground}
      style={{ width: winW, height: winH }}
      contentWidth={winW}
      contentHeight={winH}
    >
      <Animated.View pointerEvents="none" style={[styles.redFlash, redStyle]} />

      {/* 구분선만 오버레이 — 신호는 각 반쪽 중앙 */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.divider, { top: halfH, width: winW }]} />
      </View>

      {/*
        각 반쪽 전체(높이 halfH × 너비 winW)가 탭 영역. 바깥 Pressable + 안쪽 View로
        이전처럼 View 가장자리에서 탭이 빠지지 않게 함.
      */}
      <Pressable
        accessibilityLabel="뒤로"
        onPress={leaveLocalDuel}
        style={[styles.pauseBtn, { top: overlayPad.top, left: overlayPad.left }]}
        hitSlop={12}
      >
        <Ionicons name="chevron-back" size={40} color={colors.cream} />
      </Pressable>

      <Pressable
        accessibilityLabel="일시정지"
        onPress={() => setPaused(true)}
        style={[styles.pauseBtn, { top: overlayPad.top, right: overlayPad.right }]}
        hitSlop={12}
      >
        <Ionicons name="pause-circle" size={40} color={colors.cream} />
      </Pressable>

      <View style={styles.duelStack} pointerEvents="box-none">
        <View
          pointerEvents="none"
          style={[
            styles.half,
            { height: halfH, width: winW, transform: [{ rotate: '180deg' }] },
            p2Loser && styles.halfLose,
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.halfTapGlow, p2TapAckStyle]}
          />
          <View style={styles.halfInner}>
            <Text style={styles.playerLabel}>P2</Text>
            <Animated.View style={p2FallStyle}>
              <PlayerCharacterSprite
                width={180}
                height={100}
                flipHorizontal
                style={styles.localFigMatte}
              />
            </Animated.View>
            <HeartStrip filled={p2Hearts} max={winsNeeded} />
          </View>
          <View style={styles.halfSignalOverlay} pointerEvents="none">
            <NpcSignalStage
              phase={phase}
              signalText={signalText}
              onBangPhaseEnter={triggerBangFlash}
              wrapStyle={styles.halfSignalWrap}
            />
          </View>
        </View>
        <View
          pointerEvents="none"
          style={[styles.half, { height: halfH, width: winW }, p1Loser && styles.halfLose]}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.halfTapGlow, p1TapAckStyle]}
          />
          <View style={styles.halfInner}>
            <Text style={styles.playerLabel}>P1</Text>
            <Animated.View style={p1FallStyle}>
              <PlayerCharacterSprite
                width={180}
                height={100}
                style={styles.localFigMatte}
              />
            </Animated.View>
            <HeartStrip filled={p1Hearts} max={winsNeeded} />
          </View>
          <View style={styles.halfSignalOverlay} pointerEvents="none">
            <NpcSignalStage
              phase={phase}
              signalText={signalText}
              wrapStyle={styles.halfSignalWrap}
            />
          </View>
        </View>
        <View
          style={styles.duelTouchLayer}
          onTouchStart={onLocalDuelTouchStart}
          accessible
          accessibilityLabel="결투 영역. 화면 위쪽은 P2, 아래쪽은 P1 탭."
        />
      </View>

      <Modal
        transparent
        visible={modalStep === 'round'}
        animationType="fade"
        onRequestClose={leaveLocalDuel}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalDim} />
          <View style={styles.modalForeground} pointerEvents="box-none">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{summary.title}</Text>
              <Text style={styles.modalLine}>{summary.p1line}</Text>
              <Text style={styles.modalLine}>{summary.p2line}</Text>
              <Pressable onPress={continueAfterRound} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>다음 라운드</Text>
              </Pressable>
            </View>
          </View>
          {fireworksP1 ? (
            <LocalDuelFireworks
              origin="bottom"
              width={winW}
              height={winH}
              halfH={halfH}
              burstId={fxBurstId}
            />
          ) : null}
          {fireworksP2 ? (
            <LocalDuelFireworks
              origin="top"
              width={winW}
              height={winH}
              halfH={halfH}
              burstId={fxBurstId}
            />
          ) : null}
        </View>
      </Modal>

      <Modal
        transparent
        visible={modalStep === 'match'}
        animationType="fade"
        onRequestClose={exitMatch}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalDim} />
          <View style={styles.modalForeground} pointerEvents="box-none">
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>
                {matchWinner === 'p1' ? 'P1 최종 승리' : 'P2 최종 승리'}
              </Text>
              <Text style={styles.modalLine}>
                최종 {p1Wins} — {p2Wins}
              </Text>
              {outcome ? (
                <>
                  <Text style={[styles.modalLine, styles.modalSub]}>마지막 라운드</Text>
                  <Text style={styles.modalLine}>{summary.p1line}</Text>
                  <Text style={styles.modalLine}>{summary.p2line}</Text>
                </>
              ) : null}
              <Pressable onPress={exitMatch} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>나가기</Text>
              </Pressable>
            </View>
          </View>
          {fireworksP1 ? (
            <LocalDuelFireworks
              origin="bottom"
              width={winW}
              height={winH}
              halfH={halfH}
              burstId={fxBurstId}
            />
          ) : null}
          {fireworksP2 ? (
            <LocalDuelFireworks
              origin="top"
              width={winW}
              height={winH}
              halfH={halfH}
              burstId={fxBurstId}
            />
          ) : null}
        </View>
      </Modal>

      <PauseMenuModal
        visible={paused}
        onResume={() => setPaused(false)}
        onSecondaryExit={leaveLocalDuel}
        secondaryLabel="대결 나가기"
        onMainMenu={leaveToMainMenu}
      />
    </SceneBackground>
    </PhoneStageShell>
  );
}

function formatRoundSummary(o: LocalRoundOutcome): {
  title: string;
  p1line: string;
  p2line: string;
} {
  const line = (id: 'p1' | 'p2', s: LocalRoundOutcome['p1']) => {
    const tag = id === 'p1' ? 'P1' : 'P2';
    if (s.earlyTap) return `${tag}: 얼리`;
    if (s.timeout) return `${tag}: 타임아웃`;
    if (s.reactionMs != null) return `${tag}: ${formatReactionMs(s.reactionMs)} ms`;
    return `${tag}: —`;
  };
  let title = '라운드 종료';
  if (o.winner === 'p1') title = 'P1 라운드 승';
  else if (o.winner === 'p2') title = 'P2 라운드 승';
  else title = '무승부';
  return {
    title,
    p1line: line('p1', o.p1),
    p2line: line('p2', o.p2),
  };
}

const styles = StyleSheet.create({
  duelStack: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  duelTouchLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 32,
  },
  half: {
    justifyContent: 'center',
  },
  halfLose: {
    opacity: 0.48,
  },
  halfInner: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'center',
    gap: 12,
    zIndex: 5,
  },
  halfTapGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 236, 200, 0.78)',
    zIndex: 2,
  },
  playerLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ochre,
    letterSpacing: 2,
  },
  divider: {
    position: 'absolute',
    marginTop: -0.5,
    height: 1,
    backgroundColor: colors.ochre,
    opacity: 0.95,
  },
  halfSignalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 6,
  },
  halfSignalWrap: {
    minHeight: 0,
    paddingHorizontal: 8,
  },
  pauseBtn: {
    position: 'absolute',
    zIndex: 150,
    padding: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 12, 8, 0.55)',
  },
  redFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8B1A1A',
    zIndex: 40,
  },
  localFigMatte: {
    alignSelf: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(20, 12, 8, 0.45)',
    borderWidth: 1,
    borderColor: colors.sand,
  },
  modalRoot: {
    flex: 1,
    position: 'relative',
  },
  modalDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
    zIndex: 0,
  },
  modalForeground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: 24,
    zIndex: 2,
  },
  modalCard: {
    borderRadius: 14,
    padding: 20,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ochre,
    marginBottom: 10,
  },
  modalLine: {
    fontSize: 16,
    color: colors.cream,
    marginTop: 4,
  },
  modalSub: {
    marginTop: 14,
    opacity: 0.85,
    fontSize: 13,
    color: colors.sand,
  },
  modalBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.ochre,
  },
  modalBtnText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
});
