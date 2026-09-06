import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
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
import {
  enginePhaseToSignalBoardPhase,
  type DuelSignalBoardPhase,
} from '@/components/game/DuelSignalBoard';
import { LocalMatchModal } from '@/components/game/LocalMatchModal';
import { LocalRoundModal } from '@/components/game/LocalRoundModal';
import { PauseMenuModal } from '@/components/game/PauseMenuModal';
import { DuelFullBackground } from '@/components/game/DuelFullBackground';
import { DuelSplitBackground } from '@/components/game/DuelSplitBackground';
import {
  DUEL_DEFEAT_MODAL_DELAY_MS,
  DUEL_DEFEAT_REVEAL_DELAY_MS,
} from '@/constants/duelPresentation';
import { DUEL_VISUAL_THEME, MINIMAL_DUEL } from '@/constants/duelTheme';
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
import { preloadSceneImages } from '@/utils/preloadSceneImages';
import { RM_GAME } from '@/constants/reanimatedGame';
import {
  parseLocalDuelSkin,
} from '@/constants/localDuelSkin';
import { play, playGunshot } from '@/utils/audioService';
import { speakDuelCue, stopDuelSignalSpeech, warmupDuelSpeech } from '@/utils/duelSignalSpeech';
import { trigger } from '@/utils/hapticService';
import { prefetchLocalDuelSprites } from '@/utils/preloadDuelSprites';
import { localPlayerSpritePoseFromPhase } from '@/utils/spritePose';
import { useSettingsStore } from '@/store/settingsStore';

// 네이티브 모듈 미포함 구버전 빌드에서도 동작하도록 lazy 로드
let ScreenOrientation: typeof import('expo-screen-orientation') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ScreenOrientation = require('expo-screen-orientation');
} catch {
  ScreenOrientation = null;
}

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
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    matchType?: string;
    p1Skin?: string;
    p2Skin?: string;
  }>();
  const matchType = parseMatchType(params.matchType);
  const winsNeeded = heartsForMatchType(matchType);
  const storedP1Skin = useSettingsStore((s) => s.localP1Skin);
  const storedP2Skin = useSettingsStore((s) => s.localP2Skin);
  const p1Skin = useMemo(
    () => parseLocalDuelSkin(params.p1Skin, storedP1Skin),
    [params.p1Skin, storedP1Skin],
  );
  const p2Skin = useMemo(
    () => parseLocalDuelSkin(params.p2Skin, storedP2Skin),
    [params.p2Skin, storedP2Skin],
  );
  const stage = usePhoneStageMetrics();
  const isLandscape = stage.windowWidth > stage.windowHeight;
  // NPC 결투와 동일하게 실제 창 크기 사용 (가로 회전 시 화면 전체 채움)
  const winW = stage.windowWidth;
  const winH = stage.windowHeight;

  // 전 화면 회전 허용 — NPC 결투와 동일
  useFocusEffect(
    useCallback(() => {
      const so = ScreenOrientation;
      if (!so) return;
      void so.unlockAsync().catch(() => {});
    }, []),
  );

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
  const [signalBoardPhase, setSignalBoardPhase] = useState<DuelSignalBoardPhase>('idle');
  const wasPausedRef = useRef(false);
  const pausedRef = useRef(false);
  const phaseRef = useRef<DuelPhase>('대기');
  const touchBatchRef = useRef<LocalPlayerId[]>([]);
  const touchFlushScheduledRef = useRef(false);
  const commitRef = useRef<(players: readonly LocalPlayerId[]) => void>(() => {});
  const isBangArmedRef = useRef<() => boolean>(() => false);

  const winsRef = useRef({ p1: 0, p2: 0 });
  const redFlash = useSharedValue(0);
  const p1TapAck = useSharedValue(0);
  const p2TapAck = useSharedValue(0);
  const bangHapticDone = useRef(false);
  const processedKey = useRef('');
  const roundIdx = useRef(0);
  const defeatRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundModalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerBangFlash = useCallback(() => {
    if (bangHapticDone.current) return;
    bangHapticDone.current = true;
    redFlash.value = withSequence(
      withTiming(0.16, {
        duration: 100,
        easing: Easing.out(Easing.quad),
        reduceMotion: RM_GAME,
      }),
      withTiming(0, {
        duration: 360,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: RM_GAME,
      }),
    );
    speakDuelCue('bang');
    void trigger('heavy');
  }, [redFlash]);

  const pulseHalfTapAck = useCallback((sv: SharedValue<number>, kind: 'bang' | 'other') => {
    cancelAnimation(sv);
    sv.value = 0;
    const peak = kind === 'bang' ? 0.2 : 0.14;
    const upMs = kind === 'bang' ? 90 : 70;
    const downMs = kind === 'bang' ? 340 : 240;
    sv.value = withSequence(
      withTiming(peak, {
        duration: upMs,
        easing: Easing.out(Easing.quad),
        reduceMotion: RM_GAME,
      }),
      withTiming(0, {
        duration: downMs,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: RM_GAME,
      }),
    );
  }, []);

  const handleBangTap = useCallback(
    ({ player, ms }: LocalBangTapEvent) => {
      playGunshot();
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
  const spokenCuesRef = useRef({ ready: false, steady: false });

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
      spokenCuesRef.current = { ready: false, steady: false };
    }
    if (phase === '준비' && prev !== '준비' && !spokenCuesRef.current.ready) {
      spokenCuesRef.current.ready = true;
      speakDuelCue('ready');
      void trigger('light');
    }
    if (phase === '집중' && prev === '준비' && !spokenCuesRef.current.steady) {
      spokenCuesRef.current.steady = true;
      speakDuelCue('steady');
      void trigger('light');
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (phase === '결과') {
      setSignalBoardPhase('결과');
      return;
    }
    setSignalBoardPhase(enginePhaseToSignalBoardPhase(phase));
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
      warmupDuelSpeech();
      let cancelled = false;
      void (async () => {
        await Promise.all([
          preloadSceneImages(),
          prefetchLocalDuelSprites(p1Skin, p2Skin),
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
        if (defeatRevealTimerRef.current != null) {
          clearTimeout(defeatRevealTimerRef.current);
          defeatRevealTimerRef.current = null;
        }
        if (roundModalTimerRef.current != null) {
          clearTimeout(roundModalTimerRef.current);
          roundModalTimerRef.current = null;
        }
        reset();
      };
    }, [matchType, reset, start, p1Skin, p2Skin]),
  );

  useEffect(() => {
    if (phase !== '결과' || !outcome) return;
    const key = `${roundIdx.current}:${outcome.p1.reactionMs}:${outcome.p2.reactionMs}:${outcome.p1.earlyTap}:${outcome.p2.earlyTap}:${outcome.p1.timeout}:${outcome.p2.timeout}`;
    if (processedKey.current === key) return;
    processedKey.current = key;

    // 2인 대결은 개인 평균(`reactionAggregate`)에 넣지 않는다.
    // 한 기기를 번갈아 쓰는 모드라 p2는 애초에 다른 사람이고, p1이 기기 주인이라는
    // 보장도 없다. 예전에는 양쪽 기록을 모두 넣어서 "내 평균 반응"에 친구의 탭이
    // 섞였고, 여기에 걸려 있는 페일 라이더 해금(평균 ≤200ms)이 누구와 플레이했느냐로
    // 갈렸다.

    if (outcome.winner === 'p1' || outcome.winner === 'p2') {
      setFxBurstId((n) => n + 1);
    }

    if (outcome.p1.earlyTap || outcome.p2.earlyTap) {
      void play('early_tap');
      void trigger('error');
    }

    let nextP1Hearts = p1Hearts;
    let nextP2Hearts = p2Hearts;

    if (outcome.winner === 'p1') {
      winsRef.current.p1 += 1;
      nextP2Hearts = Math.max(0, p2Hearts - 1);
      setP2Hearts(nextP2Hearts);
    } else if (outcome.winner === 'p2') {
      winsRef.current.p2 += 1;
      nextP1Hearts = Math.max(0, p1Hearts - 1);
      setP1Hearts(nextP1Hearts);
    }

    setP1Wins(winsRef.current.p1);
    setP2Wins(winsRef.current.p2);

    const p1WinsByScore = winsRef.current.p1 >= winsNeeded;
    const p2WinsByScore = winsRef.current.p2 >= winsNeeded;
    const p1WinsByHearts = nextP2Hearts <= 0;
    const p2WinsByHearts = nextP1Hearts <= 0;
    const matchOver =
      p1WinsByScore || p2WinsByScore || p1WinsByHearts || p2WinsByHearts;

    if (
      (outcome.winner === 'p1' || outcome.winner === 'p2') &&
      !matchOver
    ) {
      void trigger('success');
    }

    const nextRoundDefeated =
      outcome.winner === 'p1' ? ('p2' as const) : outcome.winner === 'p2' ? ('p1' as const) : null;
    const heartLost =
      (outcome.winner === 'p1' && p2Hearts > 0) || (outcome.winner === 'p2' && p1Hearts > 0);
    if (defeatRevealTimerRef.current != null) {
      clearTimeout(defeatRevealTimerRef.current);
      defeatRevealTimerRef.current = null;
    }
    if (roundModalTimerRef.current != null) {
      clearTimeout(roundModalTimerRef.current);
      roundModalTimerRef.current = null;
    }

    if (matchOver) {
      void trigger('success');
      const winner: 'p1' | 'p2' =
        p1WinsByScore || p1WinsByHearts
          ? 'p1'
          : p2WinsByScore || p2WinsByHearts
            ? 'p2'
            : winsRef.current.p1 >= winsRef.current.p2
              ? 'p1'
              : 'p2';
      setMatchWinner(winner);
    }

    // 매치 종료 포함 — 라운드 결과 먼저 → 탭 후 매치 결과(LocalMatchModal)
    if (nextRoundDefeated == null) {
      setRoundDefeated(null);
      setModalStep('round');
    } else {
      defeatRevealTimerRef.current = setTimeout(() => {
        setRoundDefeated(nextRoundDefeated);
        requestAnimationFrame(() => {
          setTimeout(() => void play('defeat_thud'), 170);
          void trigger('medium');
          if (heartLost) {
            setTimeout(() => void play('heart_break'), 130);
          }
        });
        defeatRevealTimerRef.current = null;
      }, DUEL_DEFEAT_REVEAL_DELAY_MS);
      roundModalTimerRef.current = setTimeout(() => {
        setModalStep('round');
        roundModalTimerRef.current = null;
      }, DUEL_DEFEAT_MODAL_DELAY_MS);
    }
  }, [phase, outcome, winsNeeded, p1Hearts, p2Hearts]);

  const continueAfterRound = useCallback(() => {
    if (defeatRevealTimerRef.current != null) {
      clearTimeout(defeatRevealTimerRef.current);
      defeatRevealTimerRef.current = null;
    }
    if (roundModalTimerRef.current != null) {
      clearTimeout(roundModalTimerRef.current);
      roundModalTimerRef.current = null;
    }
    setModalStep(null);
    setRoundDefeated(null);

    if (matchWinner != null) {
      setModalStep('match');
      return;
    }

    roundIdx.current += 1;
    processedKey.current = '';
    reset();
    start();
  }, [matchWinner, reset, start]);

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

  const holdResultShoot = phase === '결과' && roundDefeated == null;

  const p1Pose = useMemo(() => {
    if (roundDefeated === 'p1') return 'defeat' as const;
    return localPlayerSpritePoseFromPhase(phase, p1ShootFlash, holdResultShoot);
  }, [roundDefeated, phase, p1ShootFlash, holdResultShoot]);
  const p2Pose = useMemo(() => {
    if (roundDefeated === 'p2') return 'defeat' as const;
    return localPlayerSpritePoseFromPhase(phase, p2ShootFlash, holdResultShoot);
  }, [roundDefeated, phase, p2ShootFlash, holdResultShoot]);

  const battleDayNight = useMemo(
    () => pickBattleDayNight(0),
    [matchType],
  );

  const minimalTheme = DUEL_VISUAL_THEME === 'minimal';

  const duelBody = (
    <>
      {modalStep !== 'match' ? (
        <>
          <Animated.View pointerEvents="none" style={[styles.redFlash, redStyle]} />

          <LocalDuelArenaLayout
            width={winW}
            height={winH}
            paddingTop={overlayPad.top}
            paddingBottom={insets.bottom}
            paddingLeft={overlayPad.left}
            paddingRight={overlayPad.right}
            phase={phase}
            signalPhase={signalBoardPhase}
            p1Skin={p1Skin}
            p2Skin={p2Skin}
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
            hideBottomHud={false}
            onHalfPressIn={onHalfPressIn}
            onBack={leaveLocalDuel}
            onPause={() => {
              // BANG 중 pause→resume은 반응 시계만 밀려 "보고 준비했다 탭" 악용이 가능
              if (phase === '뱅') return;
              setPaused(true);
            }}
            pauseDisabled={phase === '뱅'}
            orientation={isLandscape ? 'landscape' : 'portrait'}
          />
        </>
      ) : null}

      <LocalRoundModal
        visible={modalStep === 'round'}
        outcome={outcome}
        onContinue={continueAfterRound}
        fxBurstId={fxBurstId}
        width={winW}
        height={winH}
        paddingBottom={insets.bottom}
        paddingTop={overlayPad.top}
      />

      <LocalMatchModal
        visible={modalStep === 'match' && matchWinner != null}
        matchWinner={matchWinner ?? 'p1'}
        p1Wins={p1Wins}
        p2Wins={p2Wins}
        winsNeeded={winsNeeded}
        onExit={exitMatch}
        fxBurstId={fxBurstId}
        backgroundVariant={battleDayNight}
        width={winW}
        height={winH}
        paddingBottom={insets.bottom}
        paddingTop={overlayPad.top}
      />

      <PauseMenuModal
        visible={paused}
        onResume={() => setPaused(false)}
        onSecondaryExit={leaveLocalDuel}
        secondaryLabel={t('game.exitLocalDuel')}
        onMainMenu={leaveToMainMenu}
      />
    </>
  );

  return (
    <PhoneStageShell
      edgeToEdge
      backgroundColor={minimalTheme ? MINIMAL_DUEL.stageEdge : undefined}
    >
      {minimalTheme ? (
        <View
          style={{
            width: winW,
            height: winH,
            backgroundColor: MINIMAL_DUEL.bg,
            overflow: 'hidden',
          }}
        >
          {duelBody}
        </View>
      ) : isLandscape ? (
        <DuelFullBackground
          variant={battleDayNight}
          style={{ width: winW, height: winH }}
          contentWidth={winW}
          contentHeight={winH}
        >
          {duelBody}
        </DuelFullBackground>
      ) : (
        <DuelSplitBackground
          variant={battleDayNight}
          style={{ width: winW, height: winH }}
          contentWidth={winW}
          contentHeight={winH}
        >
          {duelBody}
        </DuelSplitBackground>
      )}
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  redFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(80, 24, 16, 0.55)',
    zIndex: 40,
  },
});
