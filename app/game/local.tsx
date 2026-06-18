import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  StyleSheet,
  View,
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

import { LocalDuelArenaLayout } from '@/components/game/LocalDuelArenaLayout';
import { LocalMatchModal } from '@/components/game/LocalMatchModal';
import { LocalRoundModal } from '@/components/game/LocalRoundModal';
import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { DuelSplitBackground } from '@/components/game/DuelSplitBackground';
import { pickBattleDayNight } from '@/constants/gameImages';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import type { DuelPhase } from '@/hooks/useDuelEngine';
import {
  type LocalBangTapEvent,
  type LocalPlayerId,
  useLocalDuelEngine,
} from '@/hooks/useLocalDuelEngine';
import {
  phoneStageSafeOffsets,
  usePhoneStageMetrics,
} from '@/hooks/usePhoneStageMetrics';
import { useDuelBgmDuck } from '@/hooks/useDuelBgmDuck';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { useProgressStore } from '@/store/progressStore';
import { preloadSceneImages } from '@/utils/preloadSceneImages';
import { prefetchDuelSprites } from '@/utils/preloadDuelSprites';
import { RM_GAME } from '@/constants/reanimatedGame';
import { play, playBangShotDuel } from '@/utils/audioService';
import { speakDuelCue, stopDuelSignalSpeech } from '@/utils/duelSignalSpeech';
import { trigger } from '@/utils/hapticService';
import { localPlayerSpritePoseFromPhase } from '@/utils/spritePose';
import { useSettingsStore } from '@/store/settingsStore';

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

  const [p1Hearts, setP1Hearts] = useState(winsNeeded);
  const [p2Hearts, setP2Hearts] = useState(winsNeeded);
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [modalStep, setModalStep] = useState<'round' | 'match' | null>(null);
  const [matchWinner, setMatchWinner] = useState<'p1' | 'p2' | null>(null);
  const [paused, setPaused] = useState(false);
  const [fxBurstId, setFxBurstId] = useState(0);
  const [p1ShootFlash, setP1ShootFlash] = useState(false);
  const [p2ShootFlash, setP2ShootFlash] = useState(false);
  const [p1LiveMs, setP1LiveMs] = useState<number | null>(null);
  const [p2LiveMs, setP2LiveMs] = useState<number | null>(null);
  const [roundDefeated, setRoundDefeated] = useState<'p1' | 'p2' | null>(null);
  const wasPausedRef = useRef(false);
  const pausedRef = useRef(false);
  const phaseRef = useRef<DuelPhase>('대기');
  const touchBatchRef = useRef<LocalPlayerId[]>([]);
  const touchFlushScheduledRef = useRef(false);
  const commitRef = useRef<(players: readonly LocalPlayerId[]) => void>(() => {});
  const isBangArmedRef = useRef<() => boolean>(() => false);
  const selectedCharacterId = useSettingsStore((s) => s.selectedCharacterId);

  const winsRef = useRef({ p1: 0, p2: 0 });
  const redFlash = useSharedValue(0);
  const p1TapAck = useSharedValue(0);
  const p2TapAck = useSharedValue(0);
  const bangHapticDone = useRef(false);
  const processedKey = useRef('');
  const roundIdx = useRef(0);

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

  const pulseHalfTapAck = useCallback((sv: SharedValue<number>, kind: 'bang' | 'other') => {
    cancelAnimation(sv);
    if (kind === 'bang') {
      sv.value = 0.92;
      sv.value = withTiming(0, {
        duration: 160,
        easing: Easing.in(Easing.quad),
        reduceMotion: RM_GAME,
      });
      return;
    }
    sv.value = 0;
    sv.value = withSequence(
      withTiming(0.52, {
        duration: 42,
        easing: Easing.out(Easing.quad),
        reduceMotion: RM_GAME,
      }),
      withTiming(0, {
        duration: 190,
        easing: Easing.in(Easing.quad),
        reduceMotion: RM_GAME,
      }),
    );
  }, []);

  const handleBangTap = useCallback(
    ({ player, ms }: LocalBangTapEvent) => {
      if (player === 'p2') {
        pulseHalfTapAck(p2TapAck, 'bang');
        setP2ShootFlash(true);
        setP2LiveMs(ms);
      } else {
        pulseHalfTapAck(p1TapAck, 'bang');
        setP1ShootFlash(true);
        setP1LiveMs(ms);
      }
      void trigger('selection');
    },
    [pulseHalfTapAck, p1TapAck, p2TapAck],
  );

  const {
    phase,
    outcome,
    start,
    commitLocalTouches,
    isBangReactionArmed,
    reset,
    pauseTimers,
    resumeTimers,
  } = useLocalDuelEngine({
    onBangEnter: triggerBangFlash,
    onBangTap: handleBangTap,
  });

  commitRef.current = commitLocalTouches;
  isBangArmedRef.current = isBangReactionArmed;

  const flushTouchBatch = useCallback(() => {
    touchFlushScheduledRef.current = false;
    if (touchBatchRef.current.length === 0) return;
    const players = [...new Set(touchBatchRef.current)];
    touchBatchRef.current = [];
    const bangGlow = isBangArmedRef.current();
    commitRef.current(players);
    if (!bangGlow && phaseRef.current !== '대기' && phaseRef.current !== '결과') {
      for (const id of players) {
        pulseHalfTapAck(id === 'p2' ? p2TapAck : p1TapAck, 'other');
        void trigger('light');
      }
    }
  }, [pulseHalfTapAck, p1TapAck, p2TapAck]);

  const onHalfPressIn = useCallback(
    (player: LocalPlayerId) => {
      if (pausedRef.current) return;
      touchBatchRef.current.push(player);
      if (!touchFlushScheduledRef.current) {
        touchFlushScheduledRef.current = true;
        queueMicrotask(flushTouchBatch);
      }
    },
    [flushTouchBatch],
  );

  const prevPhaseRef = useRef<DuelPhase>(phase);

  useScreenBgm('duel', true);
  useDuelBgmDuck(phase);

  const redStyle = useAnimatedStyle(() => ({ opacity: redFlash.value }));
  const p1TapAckStyle = useAnimatedStyle(() => ({ opacity: p1TapAck.value }));
  const p2TapAckStyle = useAnimatedStyle(() => ({ opacity: p2TapAck.value }));

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === '준비') {
      setP1LiveMs(null);
      setP2LiveMs(null);
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== '뱅') bangHapticDone.current = false;
    if (phase !== '뱅' && phase !== '결과') {
      setP1ShootFlash(false);
      setP2ShootFlash(false);
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
      let cancelled = false;
      void (async () => {
        await Promise.all([
          preloadSceneImages(),
          prefetchDuelSprites(1, selectedCharacterId),
        ]);
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
    }, [matchType, reset, start, selectedCharacterId]),
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
      if (outcome.winner === 'p1') setRoundDefeated('p2');
      else if (outcome.winner === 'p2') setRoundDefeated('p1');
      else setRoundDefeated(null);
      setModalStep('round');
    }
  }, [phase, outcome, winsNeeded, p1Hearts, p2Hearts]);

  const continueAfterRound = useCallback(() => {
    setModalStep(null);
    setRoundDefeated(null);
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

  const p1Pose = useMemo(() => {
    if (roundDefeated === 'p1') return 'defeat' as const;
    return localPlayerSpritePoseFromPhase(phase, p1ShootFlash);
  }, [roundDefeated, phase, p1ShootFlash]);
  const p2Pose = useMemo(() => {
    if (roundDefeated === 'p2') return 'defeat' as const;
    return localPlayerSpritePoseFromPhase(phase, p2ShootFlash);
  }, [roundDefeated, phase, p2ShootFlash]);

  const hideBottomHud = modalStep != null;

  const battleDayNight = useMemo(
    () => pickBattleDayNight(0),
    [matchType],
  );

  return (
    <PhoneStageShell>
    <DuelSplitBackground
      variant={battleDayNight}
      style={{ width: winW, height: winH }}
      contentWidth={winW}
      contentHeight={winH}
    >
      <Animated.View pointerEvents="none" style={[styles.redFlash, redStyle]} />

      <LocalDuelArenaLayout
        width={winW}
        height={winH}
        paddingTop={overlayPad.top}
        paddingBottom={insets.bottom}
        paddingLeft={overlayPad.left}
        paddingRight={overlayPad.right}
        phase={phase}
        p1CharacterId={selectedCharacterId}
        p2CharacterId={selectedCharacterId}
        p1Pose={p1Pose}
        p2Pose={p2Pose}
        p1Hearts={p1Hearts}
        p2Hearts={p2Hearts}
        p1Wins={p1Wins}
        p2Wins={p2Wins}
        winsNeeded={winsNeeded}
        p1TapAckStyle={p1TapAckStyle}
        p2TapAckStyle={p2TapAckStyle}
        p1LiveMs={p1LiveMs}
        p2LiveMs={p2LiveMs}
        hideBottomHud={hideBottomHud}
        onHalfPressIn={onHalfPressIn}
        onBack={leaveLocalDuel}
        onPause={() => setPaused(true)}
      />

      <LocalRoundModal
        visible={modalStep === 'round'}
        outcome={outcome}
        onContinue={continueAfterRound}
        fxBurstId={fxBurstId}
        paddingBottom={insets.bottom}
      />

      <LocalMatchModal
        visible={modalStep === 'match' && matchWinner != null}
        matchWinner={matchWinner ?? 'p1'}
        p1Wins={p1Wins}
        p2Wins={p2Wins}
        lastOutcome={outcome}
        onExit={exitMatch}
        fxBurstId={fxBurstId}
        paddingBottom={insets.bottom}
      />

      <PauseMenuModal
        visible={paused}
        onResume={() => setPaused(false)}
        onSecondaryExit={leaveLocalDuel}
        secondaryLabel="대결 나가기"
        onMainMenu={leaveToMainMenu}
      />
    </DuelSplitBackground>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  redFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8B1A1A',
    zIndex: 40,
  },
});
