import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { HeartStrip } from '@/components/game/HeartStrip';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import {
  NpcRoundModal,
  type NpcRoundModalData,
} from '@/components/game/NpcRoundModal';
import {
  NpcCharacterSprite,
  PlayerCharacterSprite,
} from '@/components/game/CharacterSprites';
import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { SceneBackground } from '@/components/game/SceneBackground';
import { NpcSignalStage } from '@/components/game/NpcSignalStage';
import { gameImages } from '@/constants/gameImages';
import { RM_GAME } from '@/constants/reanimatedGame';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { getNpcById } from '@/constants/npcs';
import { useDuelEngine, type DuelPhase } from '@/hooks/useDuelEngine';
import {
  phoneStageSafeOffsets,
  usePhoneStageMetrics,
} from '@/hooks/usePhoneStageMetrics';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { simulateNpcReaction } from '@/utils/npcAI';
import { preloadSceneImages } from '@/utils/preloadSceneImages';
import { play, playBangShotDuel } from '@/utils/audioService';
import { speakDuelCue, stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';
import { trigger } from '@/utils/hapticService';

const WINS_TO_END = 3;
const HEARTS = 3;

const TIER_KO: Record<string, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  diamond: '다이아',
  master: '마스터',
  legend: '레전드',
};

export default function NpcGameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const stage = usePhoneStageMetrics();
  const { stageWidth: winW, stageHeight: winH } = stage;
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
  const { npcId: npcIdRaw } = useLocalSearchParams<{ npcId?: string | string[] }>();
  const npcIdStr = useMemo(() => {
    const v = npcIdRaw;
    if (v == null) return undefined;
    const s = Array.isArray(v) ? v[0] : v;
    return s === '' ? undefined : s;
  }, [npcIdRaw]);
  const npcId = useMemo(() => {
    if (npcIdStr == null) return NaN;
    const n = Number(npcIdStr);
    return Number.isFinite(n) ? n : NaN;
  }, [npcIdStr]);
  const npc = useMemo(
    () => (Number.isFinite(npcId) ? getNpcById(npcId) : undefined),
    [npcId],
  );
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);

  const currentRound = useGameStore((s) => s.currentRound);
  const playerScore = useGameStore((s) => s.playerScore);
  const opponentScore = useGameStore((s) => s.opponentScore);
  const playerHearts = useGameStore((s) => s.playerHearts);
  const opponentHearts = useGameStore((s) => s.opponentHearts);
  const startMatch = useGameStore((s) => s.startMatch);
  const setScores = useGameStore((s) => s.setScores);
  const setHearts = useGameStore((s) => s.setHearts);
  const nextRound = useGameStore((s) => s.nextRound);

  const {
    phase,
    signalText,
    outcome,
    lastSteadyToBangDelayMs,
    start: startDuel,
    tap,
    reset: resetDuel,
    pauseTimers,
    resumeTimers,
  } = useDuelEngine();

  const [modal, setModal] = useState<NpcRoundModalData | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [earlyOverlay, setEarlyOverlay] = useState(false);
  const [animatePlayerLoss, setAnimatePlayerLoss] = useState(false);
  const [animateNpcLoss, setAnimateNpcLoss] = useState(false);
  const [paused, setPaused] = useState(false);
  const [npcRoundWinBurstId, setNpcRoundWinBurstId] = useState(0);
  const wasPausedRef = useRef(false);

  const redFlash = useSharedValue(0);
  const blueRing = useSharedValue(0);
  /** 플레이어 탭 인식(특히 뱅 직후 heavy 진동과 구분) */
  const playerTapAck = useSharedValue(0);

  const playerStreakRef = useRef(0);
  const prevBangDelayRef = useRef<number | null>(null);
  const processedOutcomeKey = useRef<string>('');
  const bangHapticDoneRef = useRef(false);
  const prevPhaseRef = useRef<DuelPhase>(phase);

  const triggerBangFlash = useCallback(() => {
    if (bangHapticDoneRef.current) return;
    bangHapticDoneRef.current = true;
    redFlash.value = withSequence(
      RM_GAME,
      withTiming(0.5, {
        duration: 45,
        easing: Easing.out(Easing.quad),
        reduceMotion: RM_GAME,
      }),
      withTiming(0, {
        duration: 220,
        easing: Easing.in(Easing.quad),
        reduceMotion: RM_GAME,
      }),
    );
    speakDuelCue('bang');
    void playBangShotDuel();
    void trigger('heavy');
  }, [redFlash]);

  const redStyle = useAnimatedStyle(() => ({
    opacity: redFlash.value,
  }));

  const blueStyle = useAnimatedStyle(() => ({
    opacity: blueRing.value,
  }));

  const playerTapAckStyle = useAnimatedStyle(() => ({
    opacity: playerTapAck.value,
  }));

  const pulsePlayerTapAck = useCallback(
    (kind: 'bang' | 'other') => {
      cancelAnimation(playerTapAck);
      playerTapAck.value = 0;
      const peak = kind === 'bang' ? 1 : 0.62;
      const upMs = kind === 'bang' ? 55 : 42;
      const downMs = kind === 'bang' ? 300 : 200;
      playerTapAck.value = withSequence(
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
    },
    [playerTapAck],
  );

  const npcFall = useSharedValue(0);
  useEffect(() => {
    if (animateNpcLoss) {
      npcFall.value = 0;
      npcFall.value = withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
        reduceMotion: RM_GAME,
      });
    } else {
      cancelAnimation(npcFall);
      npcFall.value = 0;
    }
  }, [animateNpcLoss, npcFall]);

  const npcFallStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: npcFall.value * 72 },
      { rotate: `${npcFall.value * 88}deg` },
    ],
    opacity: 1 - npcFall.value * 0.22,
  }));

  useEffect(() => {
    if (phase !== '뱅') {
      bangHapticDoneRef.current = false;
    }
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
      if (npcIdStr == null) {
        return () => {
          resetDuel();
        };
      }
      if (!npc || !Number.isFinite(npcId) || npcId < 1 || npcId > highestUnlocked) {
        router.replace('/npc-select');
        return undefined;
      }
      let cancelled = false;
      void (async () => {
        await preloadSceneImages();
        if (cancelled) return;
        startMatch({ mode: 'npc', playerHearts: HEARTS, opponentHearts: HEARTS });
        playerStreakRef.current = 0;
        prevBangDelayRef.current = null;
        processedOutcomeKey.current = '';
        resetDuel();
        startDuel();
      })();
      return () => {
        cancelled = true;
        resetDuel();
      };
    }, [
      npcIdStr,
      npc,
      npcId,
      highestUnlocked,
      router,
      startMatch,
      resetDuel,
      startDuel,
    ]),
  );

  useEffect(() => {
    if (!animatePlayerLoss && !animateNpcLoss) return;
    const t = setTimeout(() => {
      setAnimatePlayerLoss(false);
      setAnimateNpcLoss(false);
    }, 520);
    return () => clearTimeout(t);
  }, [animatePlayerLoss, animateNpcLoss]);

  useEffect(() => {
    if (phase !== '결과' || !outcome || !npc) return;

    const key = `${currentRound}:${outcome.earlyTap}:${outcome.timeout}:${outcome.reactionMs}`;
    if (processedOutcomeKey.current === key) return;
    processedOutcomeKey.current = key;

    const o = outcome;
    const streakBefore = playerStreakRef.current;
    const npcSim = simulateNpcReaction({
      npc,
      playerWinStreak: streakBefore,
      previousSteadyToBangDelayMs: prevBangDelayRef.current,
    });

    let data: NpcRoundModalData;

    if (o.earlyTap) {
      setEarlyOverlay(true);
      blueRing.value = withSequence(
        RM_GAME,
        withTiming(1, { duration: 60, reduceMotion: RM_GAME }),
        withTiming(0, { duration: 720, reduceMotion: RM_GAME }),
      );
      setTimeout(() => setEarlyOverlay(false), 800);
      data = {
        kind: 'loss',
        reason: 'early',
        playerMs: null,
        npcMs: npcSim.reactionMs,
      };
    } else if (o.timeout) {
      data = {
        kind: 'loss',
        reason: 'timeout',
        playerMs: null,
        npcMs: npcSim.reactionMs,
      };
    } else if (o.reactionMs != null) {
      if (npcSim.npcEarlyTap) {
        data = {
          kind: 'win',
          playerMs: o.reactionMs,
          npcMs: null,
          npcMisfire: true,
        };
      } else if (npcSim.reactionMs != null) {
        if (o.reactionMs < npcSim.reactionMs) {
          data = {
            kind: 'win',
            playerMs: o.reactionMs,
            npcMs: npcSim.reactionMs,
          };
        } else {
          data = {
            kind: 'loss',
            reason: 'slower',
            playerMs: o.reactionMs,
            npcMs: npcSim.reactionMs,
          };
        }
      } else {
        data = {
          kind: 'win',
          playerMs: o.reactionMs,
          npcMs: null,
          npcMisfire: true,
        };
      }
    } else {
      data = {
        kind: 'loss',
        reason: 'timeout',
        playerMs: null,
        npcMs: npcSim.reactionMs,
      };
    }

    const ps = useGameStore.getState().playerScore;
    const ns = useGameStore.getState().opponentScore;
    const ph = useGameStore.getState().playerHearts;
    const oh = useGameStore.getState().opponentHearts;

    setAnimatePlayerLoss(false);
    setAnimateNpcLoss(false);

    if (data.kind === 'win') {
      setScores(ps + 1, ns);
      if (oh > 0) {
        setAnimateNpcLoss(true);
        setHearts(ph, oh - 1);
      }
      playerStreakRef.current = streakBefore + 1;
    } else {
      setScores(ps, ns + 1);
      if (ph > 0) {
        setAnimatePlayerLoss(true);
        setHearts(ph - 1, oh);
      }
      playerStreakRef.current = 0;
    }

    if (lastSteadyToBangDelayMs != null) {
      prevBangDelayRef.current = lastSteadyToBangDelayMs;
    }

    if (o.reactionMs != null) {
      const ms = o.reactionMs;
      const { recordGlobalReactionSample, recordNpcBestReaction } =
        useProgressStore.getState();
      recordGlobalReactionSample(ms);
      recordNpcBestReaction(npc.id, ms);
    }

    if (o.earlyTap) {
      void play('early_tap');
      void trigger('error');
    } else if (data.kind === 'win') {
      void play('win_fanfare');
      void trigger('success');
    } else {
      void play('lose_sad');
    }

    const playerLostHeart = data.kind === 'loss' && ph > 0;
    const npcLostHeart = data.kind === 'win' && oh > 0;
    if (playerLostHeart || npcLostHeart) {
      void play('heart_break');
      void trigger('medium');
    }

    if (data.kind === 'win') {
      setNpcRoundWinBurstId((n) => n + 1);
    }
    setModal(data);
    setModalVisible(true);
  }, [
    phase,
    outcome,
    npc,
    currentRound,
    lastSteadyToBangDelayMs,
    blueRing,
    setScores,
    setHearts,
  ]);

  const onContinue = useCallback(() => {
    setModalVisible(false);
    setModal(null);

    const ps = useGameStore.getState().playerScore;
    const ns = useGameStore.getState().opponentScore;

    if (ps >= WINS_TO_END || ns >= WINS_TO_END) {
      if (ps >= WINS_TO_END) {
        void play('level_clear');
        void trigger('success');
        useProgressStore.getState().markNpcCleared(npc!.id);
      }
      router.replace({
        pathname: '/result/npc',
        params: {
          npcId: String(npc!.id),
          won: ps >= WINS_TO_END ? '1' : '0',
          playerWins: String(ps),
          npcWins: String(ns),
        },
      });
      return;
    }

    processedOutcomeKey.current = '';
    nextRound();
    resetDuel();
    startDuel();
  }, [npc, nextRound, resetDuel, router, startDuel]);

  const onScreenTap = useCallback(() => {
    if (modalVisible || paused) return;
    if (phase !== '대기' && phase !== '결과') {
      pulsePlayerTapAck(phase === '뱅' ? 'bang' : 'other');
      void trigger(phase === '뱅' ? 'selection' : 'light');
    }
    tap();
  }, [modalVisible, paused, phase, pulsePlayerTapAck, tap]);

  const leaveToNpcSelect = useCallback(() => {
    setPaused(false);
    resetDuel();
    router.back();
  }, [resetDuel, router]);

  const leaveToMainMenu = useCallback(() => {
    setPaused(false);
    resetDuel();
    router.replace('/menu');
  }, [resetDuel, router]);

  const tierLabel = npc ? (TIER_KO[npc.tier] ?? npc.tier) : '';

  return (
    <PhoneStageShell>
    <SceneBackground
      source={gameImages.duelBackground}
      style={{ width: winW, height: winH }}
      contentWidth={winW}
      contentHeight={winH}
    >
      <Animated.View pointerEvents="none" style={[styles.redFlash, redStyle]} />
      <Animated.View
        pointerEvents="none"
        style={[styles.blueRing, blueStyle]}
      />

      {earlyOverlay ? (
        <View pointerEvents="none" style={styles.earlyLabelWrap}>
          <Text style={styles.earlyLabel}>EARLY!</Text>
        </View>
      ) : null}

      {npc ? (
        <>
      {/*
        터치: 맨 아래 전면 Pressable이 탭을 받고, 그 위 UI 레이어는 pointerEvents="none"이라
        텍스트·하트·스프라이트에 막히지 않음. 일시정지만 별도 Pressable로 위에 둠.
      */}
      <View style={styles.gameTouchRoot}>
        <Pressable
          accessibilityLabel="결투 반응"
          android_disableSound
          disabled={modalVisible || paused}
          onPress={onScreenTap}
          style={[StyleSheet.absoluteFillObject, styles.tapPlane]}
        />
        <View style={styles.fillOverlay} pointerEvents="none">
          <View style={styles.topBar}>
            <View style={styles.nameRow}>
              <View style={styles.nameBlock}>
                <Text style={[styles.npcName, { fontFamily: FONT_RYE }]} numberOfLines={1}>
                  {npc.title} {npc.name}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tierLabel}</Text>
                </View>
              </View>
            </View>
            <HeartStrip
              filled={opponentHearts}
              max={HEARTS}
              animateLoss={animateNpcLoss}
            />
          </View>

          <View style={styles.opponentFigWrap}>
            <Animated.View style={npcFallStyle}>
              <NpcCharacterSprite
                npcId={npc.id}
                width={200}
                height={120}
                flipHorizontal
                style={styles.duelFigMatte}
              />
            </Animated.View>
          </View>

          <View style={styles.center}>
            <NpcSignalStage
              phase={phase}
              signalText={signalText}
              onBangPhaseEnter={triggerBangFlash}
            />
          </View>

          <View style={styles.playerFigWrap}>
            <PlayerCharacterSprite
              width={200}
              height={120}
              style={styles.duelFigMatte}
            />
          </View>

          <View style={styles.bottomBar}>
            <Text style={styles.bottomLabel}>나의 하트</Text>
            <HeartStrip
              filled={playerHearts}
              max={HEARTS}
              animateLoss={animatePlayerLoss}
            />
            <Text style={styles.scoreHint}>
              {playerScore} — {opponentScore} (선 {WINS_TO_END}승)
            </Text>
          </View>
          <Animated.View
            pointerEvents="none"
            style={[styles.playerTapAckGlow, playerTapAckStyle]}
          />
        </View>
      </View>

      <Pressable
        accessibilityLabel="일시정지"
        onPress={() => setPaused(true)}
        style={[styles.pauseBtn, { top: overlayPad.top, right: overlayPad.right }]}
        hitSlop={12}
      >
        <Ionicons name="pause-circle" size={40} color={colors.cream} />
      </Pressable>

      <NpcRoundModal
        visible={modalVisible}
        data={modal}
        onContinue={onContinue}
        winBurstId={npcRoundWinBurstId}
      />

      <PauseMenuModal
        visible={paused}
        onResume={() => setPaused(false)}
        onSecondaryExit={leaveToNpcSelect}
        secondaryLabel="NPC 선택으로"
        onMainMenu={leaveToMainMenu}
      />
        </>
      ) : null}
    </SceneBackground>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  pauseBtn: {
    position: 'absolute',
    zIndex: 200,
    padding: 4,
    borderRadius: 22,
    backgroundColor: 'rgba(20, 12, 8, 0.55)',
  },
  gameTouchRoot: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    position: 'relative',
  },
  tapPlane: {
    zIndex: 0,
  },
  fillOverlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 28,
    zIndex: 10,
  },
  playerTapAckGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '44%',
    backgroundColor: 'rgba(255, 236, 200, 0.88)',
    zIndex: 80,
  },
  redFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8B1A1A',
    zIndex: 20,
  },
  blueRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 10,
    borderColor: '#4A90D9',
    zIndex: 25,
  },
  earlyLabelWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  earlyLabel: {
    fontSize: 42,
    fontWeight: '900',
    color: '#B8DCFF',
    letterSpacing: 4,
    textShadowColor: '#1A3A6E',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  topBar: {
    gap: 10,
    zIndex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'nowrap',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  npcName: {
    flex: 1,
    minWidth: 120,
    fontSize: 22,
    color: colors.ochre,
  },
  opponentFigWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 130,
    marginTop: 4,
  },
  playerFigWrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: 130,
    marginBottom: 4,
  },
  duelFigMatte: {
    borderRadius: 12,
    backgroundColor: 'rgba(20, 12, 8, 0.45)',
    borderWidth: 2,
    borderColor: colors.sand,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#3D2414',
    borderWidth: 1,
    borderColor: colors.sand,
  },
  badgeText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  bottomBar: {
    gap: 8,
    alignItems: 'center',
    zIndex: 1,
  },
  bottomLabel: {
    color: colors.sand,
    fontSize: 12,
    letterSpacing: 1,
  },
  scoreHint: {
    marginTop: 4,
    color: colors.cream,
    opacity: 0.85,
    fontSize: 13,
  },
});
